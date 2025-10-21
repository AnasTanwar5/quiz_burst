import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './client';
import { User, AuthResponse, LoginCredentials, SignupCredentials } from './types';

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  private static async getUsersCollection() {
    const db = await connectToDatabase();
    return db.collection<User>('users');
  }

  static async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const users = await this.getUsersCollection();
      
      // Check if user already exists
      const existingUser = await users.findOne({ email: credentials.email });
      if (existingUser) {
        return {
          success: false,
          message: 'User already exists with this email'
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(credentials.password, saltRounds);

      // Create user
      const user: Omit<User, '_id'> = {
        email: credentials.email,
        password: hashedPassword,
        name: credentials.name,
        role: credentials.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await users.insertOne(user);
      const newUser = await users.findOne({ _id: result.insertedId });

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser._id, 
          email: newUser.email, 
          role: newUser.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Account created successfully'
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'Failed to create account'
      };
    }
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const users = await this.getUsersCollection();
      
      // Find user by email
      const user = await users.findOne({ email: credentials.email });
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  static async verifyToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const users = await this.getUsersCollection();
      const user = await users.findOne({ _id: userId });
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const users = await this.getUsersCollection();
      
      // If password is being updated, hash it
      if (updates.password) {
        const saltRounds = 12;
        updates.password = await bcrypt.hash(updates.password, saltRounds);
      }
      
      updates.updatedAt = new Date();
      
      const result = await users.updateOne(
        { _id: userId },
        { $set: updates }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  }
}
