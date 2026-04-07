export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'admin';
  created_at: string;
}

export interface MathProblem {
  id: number;
  operation_type: '+' | '-' | '*' | '/';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  answer: number;
  created_by?: number;
  created_at: string;
}

export interface PracticeSession {
  id: number;
  user_id: number;
  score: number;
  total: number;
  started_at: string;
  completed_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AnswerResult {
  problem_id: number;
  user_answer: number;
  correct_answer: number;
  is_correct: boolean;
}

export interface SessionStats {
  session_id: number;
  total_problems: number;
  correct_count: number;
  accuracy: number;
  started_at: string;
  completed_at?: string;
  answers: AnswerResult[];
}

export interface ProblemDTO {
  id: number;
  operation_type: string;
  difficulty: string;
  question: string;
}

export type OperationType = '+' | '-' | '*' | '/';
export type Difficulty = 'easy' | 'medium' | 'hard';
