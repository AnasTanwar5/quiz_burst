// MongoDB Types for QuizBurst Application

export interface User {
  _id?: string;
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  _id?: string;
  userId: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  _id?: string;
  adminId: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  _id?: string;
  quizId: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  hint?: string;
  explanation?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSession {
  _id?: string;
  quizId: string;
  code: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  _id?: string;
  sessionId: string;
  userId?: string;
  name: string;
  joinedAt: Date;
}

export interface UserAnswer {
  _id?: string;
  participantId: string;
  questionId: string;
  sessionId: string;
  userId?: string;
  answerIndex: number;
  points: number;
  timeTaken: number;
  createdAt: Date;
}

export interface UserRole {
  _id?: string;
  userId: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

// Database Collections
export interface Database {
  users: User[];
  profiles: Profile[];
  quizzes: Quiz[];
  questions: Question[];
  quizSessions: QuizSession[];
  participants: Participant[];
  userAnswers: UserAnswer[];
  userRoles: UserRole[];
}

// Auth Response Types
export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'user';
}
