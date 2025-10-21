# QuizBurst - MongoDB Migration

## Overview
This project has been successfully migrated from Supabase to MongoDB Atlas for database operations and authentication.

## Database Schema

### Collections

#### Users
```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name?: string,
  role: 'admin' | 'user',
  createdAt: Date,
  updatedAt: Date
}
```

#### Profiles
```typescript
{
  _id: ObjectId,
  userId: string,
  name?: string,
  email?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### Quizzes
```typescript
{
  _id: ObjectId,
  adminId: string,
  title: string,
  description?: string,
  category?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### Questions
```typescript
{
  _id: ObjectId,
  quizId: string,
  questionText: string,
  options: string[],
  correctAnswerIndex: number,
  points: number,
  hint?: string,
  explanation?: string,
  orderIndex: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Quiz Sessions
```typescript
{
  _id: ObjectId,
  quizId: string,
  code: string,
  status: 'waiting' | 'active' | 'ended',
  startedAt?: Date,
  endedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Participants
```typescript
{
  _id: ObjectId,
  sessionId: string,
  userId?: string,
  name: string,
  joinedAt: Date
}
```

#### User Answers
```typescript
{
  _id: ObjectId,
  participantId: string,
  questionId: string,
  sessionId: string,
  userId?: string,
  answerIndex: number,
  points: number,
  timeTaken: number,
  createdAt: Date
}
```

#### User Roles
```typescript
{
  _id: ObjectId,
  userId: string,
  role: 'admin' | 'user',
  createdAt: Date
}
```

## Environment Variables

Create a `.env` file with the following variables:

```env
VITE_MONGODB_URI="mongodb+srv://anas:anas7860@quizburst.u40wlws.mongodb.net/"
VITE_JWT_SECRET="your-secret-key-change-in-production"
```

## Authentication

The application now uses JWT-based authentication with MongoDB:

- **Signup**: Creates a new user with hashed password
- **Login**: Validates credentials and returns JWT token
- **Session Management**: JWT tokens stored in localStorage
- **Role-based Access**: Admin and User roles supported

## Key Changes Made

1. **Removed Supabase Dependencies**:
   - Removed `@supabase/supabase-js` from package.json
   - Deleted Supabase client and types files
   - Removed Supabase migrations directory

2. **Added MongoDB Dependencies**:
   - `mongodb`: MongoDB driver
   - `bcryptjs`: Password hashing
   - `jsonwebtoken`: JWT token management
   - `@types/bcryptjs` and `@types/jsonwebtoken`: TypeScript types

3. **Created MongoDB Services**:
   - `client.ts`: Database connection management
   - `types.ts`: TypeScript interfaces for all collections
   - `auth.ts`: Authentication service with signup/login
   - `database.ts`: CRUD operations for all collections
   - `index.ts`: MongoDB client wrapper mimicking Supabase interface

4. **Updated All Components**:
   - `Auth.tsx`: Updated to use MongoDB authentication
   - `Profile.tsx`: Updated to fetch data from MongoDB
   - `CreateQuiz.tsx`: Updated to save quizzes to MongoDB
   - `JoinQuiz.tsx`: Updated to join quizzes via MongoDB
   - `QuizPlay.tsx`: Updated to load questions from MongoDB
   - `Index.tsx`: Updated authentication state management

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. The application will be available at `http://localhost:5173`

## Features

- ✅ User registration and login
- ✅ Role-based authentication (Admin/User)
- ✅ Quiz creation and management
- ✅ Quiz participation
- ✅ Real-time quiz sessions
- ✅ Score tracking and leaderboards
- ✅ Profile management

## Security Notes

- Passwords are hashed using bcryptjs with 12 salt rounds
- JWT tokens expire after 7 days
- MongoDB connection uses SSL/TLS
- Environment variables should be properly secured in production

## Migration Complete

The migration from Supabase to MongoDB Atlas is now complete. All functionality has been preserved and the application is ready for use with the new database backend.
