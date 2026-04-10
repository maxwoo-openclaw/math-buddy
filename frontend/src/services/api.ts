const API_BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// Auth
export const login = (username: string, password: string) =>
  request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });

export const register = (username: string, email: string, password: string, role: string = 'student') =>
  request<{ access_token: string; token_type: string; user: User }>('/auth/register', {
    method: 'POST',
    body: { username, email, password, role },
  });

// Users
export const getMe = () => request<User>('/users/me');

export const getUsers = () => request<User[]>('/users/');

export const deleteUser = (id: number) =>
  request<{ message: string }>(`/users/${id}`, { method: 'DELETE' });

// Problems
export const getProblems = (operation?: string, difficulty?: string) => {
  const params = new URLSearchParams();
  if (operation) params.append('operation', operation);
  if (difficulty) params.append('difficulty', difficulty);
  const query = params.toString();
  return request<Problem[]>(`/problems/${query ? `?${query}` : ''}`);
};

export const createProblem = (data: ProblemInput) =>
  request<Problem>('/problems', { method: 'POST', body: data });

export const updateProblem = (id: number, data: Partial<ProblemInput>) =>
  request<Problem>(`/problems/${id}`, { method: 'PUT', body: data });

export const deleteProblem = (id: number) =>
  request<{ message: string }>(`/problems/${id}`, { method: 'DELETE' });

// Practice
export const startSession = (operationFilter?: string, difficultyFilter?: string) =>
  request<{ session_id: number; started_at: string }>('/practice/session', {
    method: 'POST',
    body: { operation_filter: operationFilter, difficulty_filter: difficultyFilter },
  });

export const getNextProblem = (operation?: string, difficulty?: string, operandA?: number, operandB?: number) => {
  const params = new URLSearchParams();
  if (operation) params.append('operation', operation);
  if (difficulty) params.append('difficulty', difficulty);
  if (operandA != null) params.append('operand_a', String(operandA));
  if (operandB != null) params.append('operand_b', String(operandB));
  const query = params.toString();
  return request<ProblemDTO>(`/practice/problem${query ? `?${query}` : ''}`);
};

export const submitAnswer = (sessionId: number, problemId: number, userAnswer: number) =>
  request<AnswerResult>(`/practice/session/${sessionId}/answer`, {
    method: 'POST',
    body: { problem_id: problemId, user_answer: userAnswer },
  });

export const getSessionStats = (sessionId: number) =>
  request<SessionStats>(`/practice/session/${sessionId}/stats`);

export const completeSession = (sessionId: number) =>
  request<{ message: string }>(`/practice/session/${sessionId}/complete`, { method: 'POST' });

export const getUserSessions = () =>
  request<SessionStats[]>('/practice/sessions');

export const recordWeakness = (
  operation: string,
  operandA: number,
  operandB: number,
  userAnswer: number,
  correctAnswer: number,
) =>
  request<{ weakness_confirmed: boolean; weakness: any }>('/weaknesses/record', {
    method: 'POST',
    body: { operation, operand_a: operandA, operand_b: operandB, user_answer: userAnswer, correct_answer: correctAnswer },
  });

// Achievements
export const getAchievements = () =>
  request<{ achievements: Achievement[]; earned_count: number; total_count: number }>('/achievements/');

export const checkAchievements = (sessionId?: number) =>
  request<{ new_achievements: NewAchievement[] }>('/achievements/check' + (sessionId ? `?session_id=${sessionId}` : ''), { method: 'POST' });

export const getStudentAchievements = (studentId: number) =>
  request<{ achievements: Achievement[]; earned_count: number; total_count: number }>(`/achievements/parent/${studentId}`);

// Leaderboard
export const getLeaderboard = (filter: 'all' | 'weekly' = 'all') =>
  request<LeaderboardResponse>(`/leaderboard/?filter=${filter}`);

export const getMyRank = (filter: 'all' | 'weekly' = 'all') =>
  request<{ rank: LeaderboardEntry | null }>(`/leaderboard/me?filter=${filter}`);

// ─── Gamification ───────────────────────────────────────────────

export const getStreak = () =>
  request<StreakInfo>('/gamification/streak');

export const submitDailyChallenge = (score: number, totalProblems: number, timeTakenSeconds?: number) =>
  request<{ attempt_id: number; is_new_record: boolean; challenge_id: number }>('/gamification/daily-challenge/submit', {
    method: 'POST',
    body: { score, total_problems: totalProblems, time_taken_seconds: timeTakenSeconds },
  });

export const getDailyChallengeStatus = () =>
  request<DailyChallengeStatus>('/gamification/daily-challenge');

export const getSkillTree = () =>
  request<{ skills: any[]; operation_stats: any }>('/gamification/skill-tree');

export const getOperationAccuracy = () =>
  request<Record<string, { accuracy: number; total_attempts: number }>>('/weaknesses/operation-accuracy');

export const getWeaknesses = (limit = 5) =>
  request<any[]>('/weaknesses/?' + new URLSearchParams({ limit: String(limit) }).toString());

// ─── Types ──────────────────────────────────────────────────────

export interface Achievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: 'consistency' | 'operation' | 'milestone';
  earned: boolean;
  earned_at: string | null;
}

export interface NewAchievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'admin' | 'parent';
  created_at: string;
  invite_code?: string;
  invite_expires_at?: string;
}

export interface Problem {
  id: number;
  operation_type: string;
  difficulty: string;
  question: string;
  answer: number;
  created_by?: number;
  created_at: string;
}

export interface ProblemInput {
  operation_type: string;
  difficulty: string;
  question: string;
  answer: number;
}

export interface ProblemDTO {
  id: number;
  operation_type: string;
  difficulty: string;
  question: string;
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

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  stars: number;
  tier: string;
  tier_icon: string;
}

export interface LeaderboardResponse {
  filter: 'all' | 'weekly';
  entries: LeaderboardEntry[];
  total_participants: number;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  streak_dates: string[];
}

export interface DailyChallengeStatus {
  challenge: {
    id: number;
    target_date: string;
    title: string;
    description: string;
    total_problems: number;
  };
  attempt: {
    completed: boolean;
    score: number | null;
    total_problems: number | null;
    time_taken_seconds: number | null;
  } | null;
}