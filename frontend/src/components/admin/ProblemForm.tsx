import { useState } from 'react';
import { ProblemInput } from '../../services/api';

interface ProblemFormProps {
  onSave: (data: ProblemInput) => void;
}

export default function ProblemForm({ onSave }: ProblemFormProps) {
  const [operationType, setOperationType] = useState('+');
  const [difficulty, setDifficulty] = useState('easy');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer) return;

    setLoading(true);
    try {
      await onSave({
        operation_type: operationType,
        difficulty,
        question,
        answer: parseInt(answer, 10),
      });
      // Reset form
      setQuestion('');
      setAnswer('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="problem-form" onSubmit={handleSubmit}>
      <h3>➕ Add New Problem</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Operation</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
          >
            <option value="+">➕ Addition</option>
            <option value="-">➖ Subtraction</option>
            <option value="*">✖️ Multiplication</option>
            <option value="/">➗ Division</option>
          </select>
        </div>

        <div className="form-group">
          <label>Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">🌟 Easy</option>
            <option value="medium">🌙 Medium</option>
            <option value="hard">🔥 Hard</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., 5 + 3"
            required
          />
        </div>

        <div className="form-group">
          <label>Answer</label>
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="e.g., 8"
            required
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading || !question || !answer}>
        {loading ? 'Creating...' : 'Create Problem ✨'}
      </button>
    </form>
  );
}
