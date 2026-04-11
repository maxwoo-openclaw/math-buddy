import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSpeedRun, getBestSpeedRun, getSpeedRunLeaderboard, getNextProblem } from '../services/api';
import { useLocale } from '../store/localeContext';
import type { ProblemDTO } from '../types';

const TIME_LIMITS = [
  { value: 60, label: '60秒', icon: '⚡' },
  { value: 120, label: '120秒', icon: '🔥' },
];

const OPERATIONS = ['+', '-', '*', '/'];

/** Parse operands from a question string like "7 × 8 = ?" or "15 ÷ 3 = ?" */
function parseOperands(question: string): { operation: string; operandA: number; operandB: number } | null {
  const match = question.match(/^\s*([\d.]+)\s*([×÷+\-*])\s*([\d.]+)\s*=\s*\?\s*$/);
  if (!match) return null;
  return { operation: match[2], operandA: parseFloat(match[1]), operandB: parseFloat(match[3]) };
}

function computeAnswer(operation: string, a: number, b: number): number {
  switch (operation) {
    case '+': case 'addition': return a + b;
    case '-': case 'subtraction': return a - b;
    case '*': case '×': case 'multiplication': return a * b;
    case '/': case '÷': case 'division': return Math.round(a / b);
    default: return 0;
  }
}

function getOperationLabel(symbol: string): string {
  const map: Record<string, string> = { '+': 'addition', '-': 'subtraction', '*': 'multiplication', '/': 'division' };
  return map[symbol] || 'addition';
}

export default function SpeedRunPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'select' | 'countdown' | 'playing' | 'result'>('select');
  const [timeLimit, setTimeLimit] = useState<60 | 120>(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<ProblemDTO | null>(null);
  const [answer, setAnswer] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [problemCount, setProblemCount] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [best60, setBest60] = useState<any>(null);
  const [best120, setBest120] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<{ user_id: number; username: string; score: number }[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load best scores and leaderboard on mount
  useEffect(() => {
    getBestSpeedRun(60 as 60).then(setBest60).catch(() => {});
    getBestSpeedRun(120 as 120).then(setBest120).catch(() => {});
    loadLeaderboard(60);
  }, []);

  const loadLeaderboard = (limit: 60 | 120) => {
    getSpeedRunLeaderboard(limit, 10).then(setLeaderboard).catch(() => {});
  };

  const selectTimeLimit = (limit: 60 | 120) => {
    setTimeLimit(limit);
    setTimeLeft(limit);
    loadLeaderboard(limit);
  };

  const startCountdown = () => {
    setPhase('countdown');
    setCountdown(3);
    let c = 3;
    const interval = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        startGame();
      }
    }, 1000);
  };

  const startGame = async () => {
    setPhase('playing');
    setScore(0);
    setProblemCount(0);
    setAnswer('');
    setFeedback(null);
    setTimeLeft(timeLimit);
    startTimeRef.current = Date.now();
    await loadNextProblem();
  };

  const loadNextProblem = async () => {
    try {
      const op = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
      const problem = await getNextProblem(op, 'medium');
      setCurrentProblem(problem);
      setAnswer('');
      setFeedback(null);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to load problem:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const endGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('result');
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      const result = await submitSpeedRun({
        time_limit_seconds: timeLimit,
        score,
        total_problems: problemCount,
        time_taken_seconds: timeTaken,
      });
      setLastResult(result);
      // Refresh best score
      if (timeLimit === 60) {
        const best = await getBestSpeedRun(60);
        setBest60(best);
      } else {
        const best = await getBestSpeedRun(120);
        setBest120(best);
      }
      loadLeaderboard(timeLimit);
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  }, [score, problemCount, timeLimit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem || feedback) return;
    const parsed = parseOperands(currentProblem.question);
    const userNum = parseInt(answer, 10);

    // Can't parse question — show feedback without revealing correct answer
    if (!parsed || !parsed.operation || isNaN(userNum)) {
      setFeedback({ correct: false, message: `❌ ${t.parseError || 'Answer recorded (question format unrecognized)'}` });
      setProblemCount((c) => c + 1);
      setTimeout(() => { loadNextProblem(); }, 600);
      return;
    }
    const correctAnswer = computeAnswer(parsed.operation, parsed.operandA, parsed.operandB);
    const isCorrect = userNum === correctAnswer;
    if (isCorrect) {
      setScore((s) => s + 1);
      setFeedback({ correct: true, message: '✅' });
    } else {
      setFeedback({ correct: false, message: `❌ 答案是 ${correctAnswer}` });
    }
    setProblemCount((c) => c + 1);
    setTimeout(() => {
      loadNextProblem();
    }, 400);
  };

  const getAccuracy = () => {
    if (problemCount === 0) return 0;
    return Math.round((score / problemCount) * 100);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">← 返回</button>
        <h2>⚡ Speed Run</h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Phase: Select Time Limit */}
      {phase === 'select' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>{t.selectTimeChallenge}</h3>
          <div className="flex-center gap-1" style={{ marginBottom: '2rem' }}>
            {TIME_LIMITS.map((tl) => (
              <button
                key={tl.value}
                onClick={() => selectTimeLimit(tl.value as 60 | 120)}
                className={`card-btn ${timeLimit === tl.value ? 'active' : ''}`}
                style={{ padding: '1.5rem 2rem', fontSize: '1.1rem' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tl.icon}</div>
                <div>{tl.label}</div>
                {timeLimit === tl.value && (
                  <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>已選擇</div>
                )}
              </button>
            ))}
          </div>

          {/* Best Score */}
          {(best60 || best120) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>{t.bestScore}</h4>
              {best60 && (
                <div className="stat-chip" style={{ marginBottom: '0.5rem' }}>
                  {t.seconds(60)}: {best60.score} 題 ({t.accuracyLabel} {best60.accuracy}%)
                </div>
              )}
              {best120 && (
                <div className="stat-chip">
                  {t.seconds(120)}: {best120.score} 題 ({t.accuracyLabel} {best120.accuracy}%)
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Preview */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>{t.leaderboardTitle} {t.seconds(timeLimit)}</h4>
            {leaderboard.length === 0 ? (
              <div style={{ color: '#888', fontSize: '0.9rem' }}>{t.noRecords}</div>
            ) : (
              <div style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={entry.user_id} className="leaderboard-row">
                    <span className="rank">{i + 1}</span>
                    <span className="username">{entry.username}</span>
                    <span className="score">{entry.score} 題</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startCountdown}
            className="btn-primary"
            style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}
          >
            {t.startChallenge}
          </button>
        </div>
      )}

      {/* Phase: Countdown */}
      {phase === 'countdown' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '5rem', fontWeight: 'bold', color: '#FF9800' }}>
            {countdown}
          </div>
          <div style={{ marginTop: '1rem', color: '#888' }}>{t.getReady}</div>
        </div>
      )}

      {/* Phase: Playing */}
      {phase === 'playing' && currentProblem && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Timer */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: timeLeft <= 10 ? '#f44336' : timeLeft <= 30 ? '#FF9800' : '#4CAF50',
              }}
            >
              {formatTime(timeLeft)}
            </div>
            <div className="stat-chip">{t.problemsAnswered} {problemCount} | {t.correctShort} {score}</div>
          </div>

          {/* Problem */}
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              margin: '1.5rem 0',
              color: '#333',
            }}
          >
            {currentProblem.question.replace('= ?', '')} = ?
          </div>

          {/* Answer Input */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
            <input
              ref={inputRef}
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="answer-input"
              placeholder={t.yourAnswer}
              autoFocus
              style={{
                fontSize: '2rem',
                padding: '0.75rem 1.5rem',
                width: '200px',
                textAlign: 'center',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ marginLeft: '0.5rem', padding: '0.75rem 1.5rem' }}
            >
              {t.submit}
            </button>
          </form>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                fontSize: '1.5rem',
                marginTop: '1rem',
                color: feedback.correct ? '#4CAF50' : '#f44336',
              }}
            >
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {/* Phase: Result */}
      {phase === 'result' && lastResult && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{t.challengeComplete}</h3>

          <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#FF9800', margin: '1rem 0' }}>
            {lastResult.score} 題
          </div>

          <div className="flex-center gap-1" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="stat-chip">{t.accuracyLabel} {lastResult.accuracy}%</div>
            <div className="stat-chip">{t.timeTaken} {lastResult.time_taken_seconds || timeLimit}{t.secondsUnit}</div>
          </div>

          {/* New Best */}
          {timeLimit === 60 && best60 && lastResult.score >= best60.score && (
            <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '1rem' }}>
              🏆 新紀錄！
            </div>
          )}
          {timeLimit === 120 && best120 && lastResult.score >= best120.score && (
            <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '1rem' }}>
              🏆 新紀錄！
            </div>
          )}

          {/* Leaderboard */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>{t.leaderboardTitle} {t.seconds(timeLimit)}</h4>
            {leaderboard.length === 0 ? (
              <div style={{ color: '#888' }}>{t.noRecords}</div>
            ) : (
              <div style={{ textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className="leaderboard-row"
                    style={{
                      background: entry.user_id === lastResult.id ? 'rgba(76, 175, 80, 0.2)' : undefined,
                    }}
                  >
                    <span className="rank">{i + 1}</span>
                    <span className="username">{entry.username}</span>
                    <span className="score">{entry.score} 題</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-center gap-1" style={{ justifyContent: 'center' }}>
            <button onClick={() => setPhase('select')} className="btn-secondary">
              {t.back}
            </button>
            <button onClick={startCountdown} className="btn-primary">
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .page-container {
          padding: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .flex-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .flex-center {
          display: flex;
          align-items: center;
        }
        .gap-1 {
          gap: 1rem;
        }
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .card-btn {
          background: #f5f5f5;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .card-btn.active {
          border-color: #FF9800;
          background: rgba(255, 152, 0, 0.1);
        }
        .btn-primary {
          background: #FF9800;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-secondary {
          background: #f5f5f5;
          color: #333;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          padding: 0.5rem 1rem;
        }
        .stat-chip {
          display: inline-block;
          background: #f0f0f0;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #666;
        }
        .answer-input {
          border: 2px solid #ddd;
          border-radius: 8px;
          outline: none;
        }
        .answer-input:focus {
          border-color: #FF9800;
        }
        .leaderboard-row {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          border-radius: 8px;
          margin-bottom: 0.25rem;
        }
        .leaderboard-row .rank {
          width: 30px;
          font-weight: bold;
          color: #FF9800;
        }
        .leaderboard-row .username {
          flex: 1;
          text-align: left;
        }
        .leaderboard-row .score {
          font-weight: bold;
          color: #333;
        }
        .loading {
          text-align: center;
          padding: 2rem;
          color: #888;
        }
      `}</style>
    </div>
  );
}
