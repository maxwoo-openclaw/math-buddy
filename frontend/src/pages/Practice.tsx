import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startSession, getNextProblem, submitAnswer, completeSession, getSessionStats, recordWeakness } from '../services/api';
import type { ProblemDTO, AnswerResult, SessionStats } from '../types';

const OPERATIONS = [
  { symbol: '+', label: 'Addition', icon: '➕' },
  { symbol: '-', label: 'Subtraction', icon: '➖' },
  { symbol: '*', label: 'Multiplication', icon: '✖️' },
  { symbol: '/', label: 'Division', icon: '➗' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', icon: '🌟', color: '#4CAF50' },
  { value: 'medium', label: 'Medium', icon: '🌙', color: '#FF9800' },
  { value: 'hard', label: 'Hard', icon: '🔥', color: '#f44336' },
];

const PROBLEMS_PER_SESSION = 10;

export default function Practice() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentProblem, setCurrentProblem] = useState<ProblemDTO | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [problemNumber, setProblemNumber] = useState(0);
  const [operation, setOperation] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>('easy');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load stats from localStorage for dashboard
  useEffect(() => {
    const stored = localStorage.getItem('mathbuddy_stats');
    const stats: SessionStats[] = stored ? JSON.parse(stored) : [];
    const totalProblems = stats.reduce((acc, s) => acc + s.total_problems, 0);
    const totalCorrect = stats.reduce((acc, s) => acc + s.correct_count, 0);
    setScore({ correct: totalCorrect, total: totalProblems });
  }, []);

  const startNewSession = async () => {
    setLoading(true);
    try {
      const res = await startSession(operation || undefined, difficulty);
      setSessionId(res.session_id);
      setScore({ correct: 0, total: PROBLEMS_PER_SESSION });
      setProblemNumber(0);
      setSessionComplete(false);
      await loadNextProblem();
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNextProblem = async () => {
    setLoading(true);
    try {
      const problem = await getNextProblem(operation || undefined, difficulty);
      setCurrentProblem(problem);
      setAnswer('');
      setFeedback(null);
      setProblemNumber((n) => n + 1);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error('Failed to load problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Parse operands from a question string like "7 × 8 = ?" or "15 ÷ 3 = ?" */
  function parseOperands(question: string): { operation: string; operandA: number; operandB: number } | null {
    const match = question.match(/^\s*([\d.]+)\s*([×÷+\-*])\s*([\d.]+)\s*=\s*\?\s*$/);
    if (!match) return null;
    return { operation: match[2], operandA: parseFloat(match[1]), operandB: parseFloat(match[3]) };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProblem || !sessionId || answer === '' || isSubmitting) return;

    const userAnswer = parseInt(answer, 10);
    if (isNaN(userAnswer)) return;

    setIsSubmitting(true);
    try {
      const result = await submitAnswer(sessionId, currentProblem.id, userAnswer);
      const isCorrect = result.is_correct;

      setFeedback({
        correct: isCorrect,
        message: isCorrect ? '🎉 Correct! Amazing!' : `❌ Oops! The answer was ${result.correct_answer}`,
      });

      setScore((s) => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total,
      }));

      // Record attempt for weakness tracking (non-blocking)
      if (currentProblem) {
        const parsed = parseOperands(currentProblem.question);
        if (parsed) {
          recordWeakness(
            parsed.operation,
            parsed.operandA,
            parsed.operandB,
            userAnswer,
            result.correct_answer,
          ).catch((err) => console.error('Failed to record weakness:', err));
        }
      }

      // Update localStorage stats
      const stored = localStorage.getItem('mathbuddy_stats');
      const stats: SessionStats[] = stored ? JSON.parse(stored) : [];

      // Brief delay before next problem
      const answeredCount = problemNumber;
      console.log('[handleSubmit] answeredCount:', answeredCount, 'problemNumber:', problemNumber);
      setTimeout(async () => {
        console.log('[setTimeout callback] answeredCount:', answeredCount, 'PROBLEMS_PER_SESSION:', PROBLEMS_PER_SESSION);
        if (answeredCount >= PROBLEMS_PER_SESSION) {
          try {
            // Complete session and fetch real stats from server
            await completeSession(sessionId);
            const finalStats = await getSessionStats(sessionId);
            setSessionStats(finalStats);
            setSessionComplete(true);

            // Save to localStorage
            stats.push(finalStats);
            localStorage.setItem('mathbuddy_stats', JSON.stringify(stats));
          } catch (err) {
            console.error('Failed to complete session:', err);
          } finally {
            setIsSubmitting(false);
          }
        } else {
          console.log('[setTimeout] calling loadNextProblem');
          await loadNextProblem();
          console.log('[setTimeout] loadNextProblem done');
          setIsSubmitting(false);
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setIsSubmitting(false);
    }
  };

  const buildSessionStats = (sessId: number, total: number, correct: number): SessionStats => {
    return {
      session_id: sessId,
      total_problems: total,
      correct_count: correct,
      accuracy: Math.round((correct / total) * 100),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      answers: [],
    };
  };

  const handleStartSession = () => {
    setSessionId(null);
    setCurrentProblem(null);
    setProblemNumber(0);
    setScore({ correct: 0, total: PROBLEMS_PER_SESSION });
    setSessionComplete(false);
    setFeedback(null);
    startNewSession();
  };

  // Session complete screen
  if (sessionComplete && sessionStats) {
    const stars = Math.round((sessionStats.correct_count / sessionStats.total_problems) * 3);
    return (
      <div className="practice-container">
        <div className="practice-card session-complete">
          <div className="complete-icon">
            {stars === 3 ? '🏆' : stars === 2 ? '🌟' : '💪'}
          </div>
          <h2 className="complete-title">Session Complete!</h2>
          <div className="stars-display">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`star ${i <= stars ? 'earned' : 'empty'}`}>
                {i <= stars ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          <div className="complete-score">
            <span className="score-correct">{sessionStats.correct_count}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{sessionStats.total_problems}</span>
          </div>
          <p className="complete-message">
            {stars === 3
              ? "PERFECT! You're a math champion! 🏆"
              : stars === 2
              ? 'Great job! Keep up the fantastic work! 🌟'
              : 'Good effort! Practice makes perfect! 💪'}
          </p>
          <div className="complete-actions">
            <button className="btn btn-primary" onClick={handleStartSession}>
              Practice Again! 🔄
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No active session - show start screen
  if (!sessionId) {
    return (
      <div className="practice-container">
        <h1 className="page-title">🧮 Practice Mode</h1>
        <p className="practice-intro">Choose your challenge settings and start practicing!</p>

        <div className="practice-card">
          <div className="setup-section">
            <h3>🎯 Operation</h3>
            <div className="operation-grid">
              {OPERATIONS.map((op) => (
                <button
                  key={op.symbol}
                  className={`op-btn ${operation === op.symbol ? 'active' : ''}`}
                  onClick={() => setOperation(operation === op.symbol ? null : op.symbol)}
                >
                  <span className="op-icon">{op.icon}</span>
                  <span className="op-label">{op.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <h3>⚡ Difficulty</h3>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={`diff-btn ${difficulty === d.value ? 'active' : ''}`}
                  style={difficulty === d.value ? { background: d.color, borderColor: d.color } : {}}
                  onClick={() => setDifficulty(d.value)}
                >
                  <span className="diff-icon">{d.icon}</span>
                  <span className="diff-label">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-success btn-start" onClick={handleStartSession} disabled={loading}>
            {loading ? 'Starting...' : `Start ${PROBLEMS_PER_SESSION} Problems! 🚀`}
          </button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="practice-container">
      <div className="practice-header">
        <div className="practice-progress">
          <span>Problem {problemNumber} of {PROBLEMS_PER_SESSION}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(problemNumber / PROBLEMS_PER_SESSION) * 100}%` }}
            />
          </div>
        </div>
        <div className="score-display">
          Score: <strong>{score.correct}</strong> / <strong>{score.total}</strong>
        </div>
      </div>

      {operation && difficulty && (
        <div className="current-filters">
          <span className="filter-badge">
            {OPERATIONS.find((o) => o.symbol === operation)?.icon} {OPERATIONS.find((o) => o.symbol === operation)?.label}
          </span>
          <span
            className="filter-badge"
            style={{ background: DIFFICULTIES.find((d) => d.value === difficulty)?.color }}
          >
            {DIFFICULTIES.find((d) => d.value === difficulty)?.icon} {DIFFICULTIES.find((d) => d.value === difficulty)?.label}
          </span>
        </div>
      )}

      <div className="practice-card">
        {currentProblem ? (
          <>
            <div className="question">{currentProblem.question}</div>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="number"
                className="answer-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="?"
                disabled={loading || isSubmitting}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-success btn-answer"
                disabled={loading || answer === '' || isSubmitting}
              >
                Check Answer! ✅
              </button>
            </form>

            {feedback && (
              <div className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`}>
                {feedback.message}
              </div>
            )}
          </>
        ) : (
          <div className="loading">Loading problem...</div>
        )}
      </div>
    </div>
  );
}
