export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'admin' | 'parent';
  created_at: string;
  invite_code?: string;
  invite_expires_at?: string;
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

export interface LinkedStudent {
  id: number;
  username: string;
  total_sessions: number;
  total_problems: number;
  overall_accuracy: number;
}

export interface DashboardResponse {
  students: LinkedStudent[];
}

export interface OperationBreakdown {
  addition: { attempted: number; accuracy: number };
  subtraction: { attempted: number; accuracy: number };
  multiplication: { attempted: number; accuracy: number };
  division: { attempted: number; accuracy: number };
}

export interface DifficultyBreakdown {
  easy: { attempted: number; accuracy: number };
  medium: { attempted: number; accuracy: number };
  hard: { attempted: number; accuracy: number };
}

export interface StudentAnalysis {
  student_id: number;
  operation_breakdown: OperationBreakdown;
  difficulty_breakdown: DifficultyBreakdown;
  weakest_operation: string | null;
  strongest_operation: string | null;
}

export interface TrendPoint {
  date: string;
  accuracy: number;
  problems: number;
}

export interface Achievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: 'consistency' | 'operation' | 'milestone';
  earned: boolean;
  earned_at: string | null;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  earned_count: number;
  total_count: number;
}

export interface NewAchievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}
