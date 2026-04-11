import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSpeedRun, getBestSpeedRun, getSpeedRunLeaderboard, getNextProblem } from '../services/api';
import { useLocale } from '../store/localeContext';
import type { ProblemDTO } from '../types';

const TIME_LIMITS = [
  { value: 60, label: '60秒', icon: '⚡' },
  { value: 120, label: '120秒', icon: '🔥' },
];

const OPERATIONS = ['+', '-', '*', '/'];

const DIFFICULTIES = [
  { value: 'easy', label: 'easy', icon: '🌟', color: '#4CAF50' },
  { value: 'medium', label: 'medium', icon: '🌙', color: '#FF9800' },
  { value: 'hard', label: 'hard', icon: '🔥', color: '#f44336' },
];

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
  const [difficulty, setDifficulty] = useState<string>('medium');

  // Use refs for values needed inside timer/setTimeout closures (always fresh)
  const scoreRef = useRef(0);
  const problemCountRef = useRef(0);
  const timeLimitRef = useRef<60 | 120>(60);
  const difficultyRef = useRef('medium');
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
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [allLeaderboards, setAllLeaderboards] = useState<Record<string, { user_id: number; username: string; score: number }[]>>({});
  const [allBestScores, setAllBestScores] = useState<Record<string, any>>({});
  const [lastResult, setLastResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load best scores and leaderboard on mount
  useEffect(() => {
    loadAllForTimeLimit(60);
    loadAllForTimeLimit(120);
  }, []);

  const loadLeaderboard = (limit: 60 | 120, diff: string) => {
    getSpeedRunLeaderboard(limit, diff, 10).then((data) => {
      setLeaderboard(data.leaderboard);
      setMyRank(data.my_rank);
      setTotalParticipants(data.total_participants);
    }).catch(() => {});
  };

  const getBestScoreAndLeaderboard = (limit: 60 | 120, diff: string) => {
    Promise.all([
      getBestSpeedRun(limit, diff),
      getSpeedRunLeaderboard(limit, diff, 10),
    ]).then(([best, data]) => {
      setAllBestScores((prev) => ({ ...prev, [`${limit}_${diff}`]: best }));
      setAllLeaderboards((prev) => ({ ...prev, [`${limit}_${diff}`]: data.leaderboard }));
    }).catch(() => {});
  };

  const loadAllForTimeLimit = (limit: 60 | 120) => {
    const diffs = ['easy', 'medium', 'hard'];
    diffs.forEach((diff) => getBestScoreAndLeaderboard(limit, diff));
  };

  const selectTimeLimit = (limit: 60 | 120) => {
    setTimeLimit(limit);
    timeLimitRef.current = limit;
    setTimeLeft(limit);
    loadLeaderboard(limit, difficultyRef.current);
    // Reload all leaderboards for new time limit
    const diffs = ['easy', 'medium', 'hard'];
    diffs.forEach((diff) => {
      getBestSpeedRun(limit, diff).then((best) => {
        setAllBestScores((prev) => ({ ...prev, [`${limit}_${diff}`]: best }));
      }).catch(() => {});
      getSpeedRunLeaderboard(limit, diff, 10).then((data) => {
        setAllLeaderboards((prev) => ({ ...prev, [`${limit}_${diff}`]: data.leaderboard }));
      }).catch(() => {});
    });
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
    scoreRef.current = 0;
    problemCountRef.current = 0;
    timeLimitRef.current = timeLimit;
    difficultyRef.current = difficulty;
    startTimeRef.current = Date.now();
    await loadNextProblem();
  };

  const loadNextProblem = async () => {
    try {
      const op = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
      const problem = await getNextProblem(op, difficultyRef.current);
      setCurrentProblem(problem);
      setAnswer('');
      setFeedback(null);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to load problem:', err);
    }
  };

  // Timer effect — reads refs so always calls endGame with fresh values
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // endGame reads from refs, always fresh
          doEndGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const doEndGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('result');
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const currentScore = scoreRef.current;
    const currentProblems = problemCountRef.current;
    const currentLimit = timeLimitRef.current;
    try {
      const result = await submitSpeedRun({
        time_limit_seconds: currentLimit,
        difficulty: difficultyRef.current,
        score: currentScore,
        total_problems: currentProblems,
        time_taken_seconds: timeTaken,
      });
      setLastResult(result);
      // Refresh best score
      if (currentLimit === 60) {
        const best = await getBestSpeedRun(60, difficultyRef.current);
        setBest60(best);
      } else {
        const best = await getBestSpeedRun(120, difficultyRef.current);
        setBest120(best);
      }
      loadLeaderboard(currentLimit, difficultyRef.current);
      // Refresh all leaderboards for the time limit
      const diffs = ['easy', 'medium', 'hard'];
      diffs.forEach((diff) => {
        getBestScoreAndLeaderboard(currentLimit, diff);
      });
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  };

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
      scoreRef.current += 1;
      setFeedback({ correct: true, message: '✅' });
    } else {
      setFeedback({ correct: false, message: `❌ 答案是 ${correctAnswer}` });
    }
    setProblemCount((c) => c + 1);
    problemCountRef.current += 1;
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
                  <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>{(t as unknown as Record<string, string>).selected || '✓ Selected'}</div>
                )}
              </button>
            ))}
          </div>

          {/* Difficulty Selector */}
          <h4 style={{ marginBottom: '0.75rem' }}>{t.selectDifficulty || 'Select Difficulty'}</h4>
          <div className="flex-center gap-1" style={{ marginBottom: '2rem' }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => { setDifficulty(d.value); difficultyRef.current = d.value; }}
                className={`diff-btn ${difficulty === d.value ? 'active' : ''}`}
                style={difficulty === d.value ? { background: d.color, borderColor: d.color } : {}}
              >
                <span className="diff-icon">{d.icon}</span>
                <span className="diff-label">{(t as unknown as Record<string, string>)[d.value] || d.label}</span>
              </button>
            ))}
          </div>

          {/* Leaderboard — All 3 difficulties */}
          <h4 style={{ marginBottom: '0.75rem' }}>{t.leaderboardTitle} {t.seconds(timeLimit)} — {t.top10 || 'Top 10'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {DIFFICULTIES.map((d) => {
              const lbKey = `${timeLimit}_${d.value}`;
              const lb = allLeaderboards[lbKey] || [];
              const best = allBestScores[lbKey];
              return (
                <div key={d.value} style={{ background: d.color + '15', borderRadius: '0.75rem', padding: '0.75rem', border: `2px solid ${d.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                    <span style={{ fontWeight: 700, color: d.color }}>{(t as unknown as Record<string, string>)[d.value] || d.label}</span>
                  </div>
                  {best && (
                    <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.5rem' }}>
                      {t.bestScore}: {best.score} 題
                    </div>
                  )}
                  {lb.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{t.noRecords}</div>
                  ) : (
                    <div>
                      {lb.slice(0, 5).map((entry, i) => (
                        <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', padding: '2px 0' }}>
                          <span style={{ width: 18, fontWeight: 700, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#999' }}>{i + 1}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</span>
                          <span style={{ fontWeight: 600 }}>{entry.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div className="stat-chip" style={{ marginBottom: '0.5rem' }}>{t.problemsAnswered} {problemCount} | {t.correctShort} {score}</div>
            <div className="stat-chip">
              {DIFFICULTIES.find(d => d.value === difficulty)?.icon}{' '}
              {(t as unknown as Record<string, string>)[difficulty] || difficulty}
            </div>
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

          {/* Leaderboard — All 3 difficulties */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>{t.leaderboardTitle} {t.seconds(timeLimit)} — {t.top10 || 'Top 10'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {DIFFICULTIES.map((d) => {
                const lbKey = `${timeLimit}_${d.value}`;
                const lb = allLeaderboards[lbKey] || [];
                const best = allBestScores[lbKey];
                const isCurrentDiff = difficultyRef.current === d.value;
                return (
                  <div key={d.value} style={{ background: d.color + '15', borderRadius: '0.75rem', padding: '0.75rem', border: `2px solid ${d.color}`, opacity: isCurrentDiff ? 1 : 0.75 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{d.icon}</span>
                      <span style={{ fontWeight: 700, color: d.color, fontSize: '0.85rem' }}>{(t as unknown as Record<string, string>)[d.value] || d.label}</span>
                    </div>
                    {best && isCurrentDiff && (
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>
                        {t.bestScore}: {best.score} 題
                      </div>
                    )}
                    {lb.length === 0 ? (
                      <div style={{ color: '#aaa', fontSize: '0.7rem' }}>{t.noRecords}</div>
                    ) : (
                      <div>
                        {lb.slice(0, 5).map((entry, i) => (
                          <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', padding: '2px 4px', background: entry.user_id === lastResult.id ? 'rgba(76,175,80,0.2)' : undefined, borderRadius: 4 }}>
                            <span style={{ width: 16, fontWeight: 700, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#999' }}>{i + 1}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</span>
                            <span style={{ fontWeight: 600 }}>{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
