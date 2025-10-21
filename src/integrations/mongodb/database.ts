import { connectToDatabase } from './client';
import { 
  Quiz, 
  Question, 
  QuizSession, 
  Participant, 
  UserAnswer, 
  Profile, 
  UserRole 
} from './types';

export class DatabaseService {
  // Quiz Operations
  static async createQuiz(quiz: Omit<Quiz, '_id'>): Promise<Quiz | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Quiz>('quizzes').insertOne(quiz);
      return await db.collection<Quiz>('quizzes').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create quiz error:', error);
      return null;
    }
  }

  static async getQuizById(quizId: string): Promise<Quiz | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Quiz>('quizzes').findOne({ _id: quizId });
    } catch (error) {
      console.error('Get quiz error:', error);
      return null;
    }
  }

  static async getQuizzesByAdmin(adminId: string): Promise<Quiz[]> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Quiz>('quizzes')
        .find({ adminId })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Get quizzes by admin error:', error);
      return [];
    }
  }

  static async updateQuiz(quizId: string, updates: Partial<Quiz>): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      updates.updatedAt = new Date();
      const result = await db.collection<Quiz>('quizzes')
        .updateOne({ _id: quizId }, { $set: updates });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Update quiz error:', error);
      return false;
    }
  }

  static async deleteQuiz(quizId: string): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Quiz>('quizzes').deleteOne({ _id: quizId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Delete quiz error:', error);
      return false;
    }
  }

  // Question Operations
  static async createQuestions(questions: Omit<Question, '_id'>[]): Promise<Question[]> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Question>('questions').insertMany(questions);
      const insertedIds = Object.values(result.insertedIds);
      return await db.collection<Question>('questions')
        .find({ _id: { $in: insertedIds } })
        .toArray();
    } catch (error) {
      console.error('Create questions error:', error);
      return [];
    }
  }

  static async getQuestionsByQuizId(quizId: string): Promise<Question[]> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Question>('questions')
        .find({ quizId })
        .sort({ orderIndex: 1 })
        .toArray();
    } catch (error) {
      console.error('Get questions error:', error);
      return [];
    }
  }

  static async updateQuestion(questionId: string, updates: Partial<Question>): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      updates.updatedAt = new Date();
      const result = await db.collection<Question>('questions')
        .updateOne({ _id: questionId }, { $set: updates });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Update question error:', error);
      return false;
    }
  }

  static async deleteQuestionsByQuizId(quizId: string): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Question>('questions').deleteMany({ quizId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Delete questions error:', error);
      return false;
    }
  }

  // Quiz Session Operations
  static async createQuizSession(session: Omit<QuizSession, '_id'>): Promise<QuizSession | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<QuizSession>('quizSessions').insertOne(session);
      return await db.collection<QuizSession>('quizSessions').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create quiz session error:', error);
      return null;
    }
  }

  static async getQuizSessionByCode(code: string): Promise<QuizSession | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<QuizSession>('quizSessions').findOne({ code });
    } catch (error) {
      console.error('Get quiz session error:', error);
      return null;
    }
  }

  static async getQuizSessionById(sessionId: string): Promise<QuizSession | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<QuizSession>('quizSessions').findOne({ _id: sessionId });
    } catch (error) {
      console.error('Get quiz session by id error:', error);
      return null;
    }
  }

  static async updateQuizSession(sessionId: string, updates: Partial<QuizSession>): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      updates.updatedAt = new Date();
      const result = await db.collection<QuizSession>('quizSessions')
        .updateOne({ _id: sessionId }, { $set: updates });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Update quiz session error:', error);
      return false;
    }
  }

  // Participant Operations
  static async createParticipant(participant: Omit<Participant, '_id'>): Promise<Participant | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Participant>('participants').insertOne(participant);
      return await db.collection<Participant>('participants').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create participant error:', error);
      return null;
    }
  }

  static async getParticipantsBySessionId(sessionId: string): Promise<Participant[]> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Participant>('participants')
        .find({ sessionId })
        .sort({ joinedAt: 1 })
        .toArray();
    } catch (error) {
      console.error('Get participants error:', error);
      return [];
    }
  }

  static async getParticipantById(participantId: string): Promise<Participant | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Participant>('participants').findOne({ _id: participantId });
    } catch (error) {
      console.error('Get participant error:', error);
      return null;
    }
  }

  // User Answer Operations
  static async createUserAnswer(answer: Omit<UserAnswer, '_id'>): Promise<UserAnswer | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<UserAnswer>('userAnswers').insertOne(answer);
      return await db.collection<UserAnswer>('userAnswers').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create user answer error:', error);
      return null;
    }
  }

  static async getUserAnswersBySession(sessionId: string): Promise<UserAnswer[]> {
    try {
      const db = await connectToDatabase();
      return await db.collection<UserAnswer>('userAnswers')
        .find({ sessionId })
        .toArray();
    } catch (error) {
      console.error('Get user answers error:', error);
      return [];
    }
  }

  static async getUserAnswersByParticipant(participantId: string): Promise<UserAnswer[]> {
    try {
      const db = await connectToDatabase();
      return await db.collection<UserAnswer>('userAnswers')
        .find({ participantId })
        .toArray();
    } catch (error) {
      console.error('Get user answers by participant error:', error);
      return [];
    }
  }

  // Profile Operations
  static async createProfile(profile: Omit<Profile, '_id'>): Promise<Profile | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<Profile>('profiles').insertOne(profile);
      return await db.collection<Profile>('profiles').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create profile error:', error);
      return null;
    }
  }

  static async getProfileByUserId(userId: string): Promise<Profile | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<Profile>('profiles').findOne({ userId });
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      updates.updatedAt = new Date();
      const result = await db.collection<Profile>('profiles')
        .updateOne({ userId }, { $set: updates });
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  }

  // User Role Operations
  static async createUserRole(userRole: Omit<UserRole, '_id'>): Promise<UserRole | null> {
    try {
      const db = await connectToDatabase();
      const result = await db.collection<UserRole>('userRoles').insertOne(userRole);
      return await db.collection<UserRole>('userRoles').findOne({ _id: result.insertedId });
    } catch (error) {
      console.error('Create user role error:', error);
      return null;
    }
  }

  static async getUserRoleByUserId(userId: string): Promise<UserRole | null> {
    try {
      const db = await connectToDatabase();
      return await db.collection<UserRole>('userRoles').findOne({ userId });
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  // Utility Functions
  static async generateQuizCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  static async getQuizStats(userId: string, role: string): Promise<any> {
    try {
      const db = await connectToDatabase();
      
      if (role === 'admin') {
        const quizzesCount = await db.collection<Quiz>('quizzes').countDocuments({ adminId: userId });
        return { quizzesCreated: quizzesCount };
      } else {
        const participantsCount = await db.collection<Participant>('participants').countDocuments({ userId });
        const answersCount = await db.collection<UserAnswer>('userAnswers').countDocuments({ userId });
        
        // Calculate accuracy
        const correctAnswers = await db.collection<UserAnswer>('userAnswers')
          .countDocuments({ userId, points: { $gt: 0 } });
        
        const accuracy = answersCount > 0 ? (correctAnswers / answersCount) * 100 : 0;
        
        return {
          quizzesParticipated: participantsCount,
          totalAnswers: answersCount,
          accuracy: Math.round(accuracy)
        };
      }
    } catch (error) {
      console.error('Get quiz stats error:', error);
      return {};
    }
  }
}
