import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// Increase JSON and URL-encoded body size limits to support image data URLs
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../dist')));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.VITE_MONGODB_URI;
const JWT_SECRET = process.env.VITE_JWT_SECRET || 'change-me';

if (!MONGODB_URI) {
  console.error('Missing VITE_MONGODB_URI in environment');
  process.exit(1);
}

let db;
let client;

async function initDb() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('quizburst');
  console.log('Connected to MongoDB');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;
    const users = db.collection('users');
    const existing = await users.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const now = new Date();
    const result = await users.insertOne({ email, password: hash, name, role, createdAt: now, updatedAt: now });
    const user = await users.findOne({ _id: result.insertedId }, { projection: { password: 0 } });
    const token = jwt.sign({ userId: String(result.insertedId), email, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ userId: String(user._id), email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _p, ...userSafe } = user;
    res.json({ user: userSafe, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  console.log('Auth middleware - token:', token ? 'present' : 'missing'); // Debug log
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Auth middleware - decoded user:', decoded); // Debug log
    req.user = decoded;
    next();
  } catch (e) {
    console.log('Auth middleware - token verification failed:', e.message); // Debug log
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Get current user
app.get('/auth/me', authMiddleware, async (req, res) => {
  const users = db.collection('users');
  const user = await users.findOne({ _id: new ObjectId(req.user.userId) }, { projection: { password: 0 } });
  res.json({ user });
});

// Create quiz with questions
app.post('/quizzes', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, timeLimit, questions } = req.body;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const quizzes = db.collection('quizzes');
    const questionsCol = db.collection('questions');
    const quizResult = await quizzes.insertOne({
      adminId: req.user.userId,
      title,
      description,
      category,
      timeLimit: timeLimit || 20, // Default to 20 seconds if not provided
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    const quizId = String(quizResult.insertedId);
    if (Array.isArray(questions) && questions.length) {
      await questionsCol.insertMany(
        questions.map((q, idx) => ({
          quizId,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          points: q.points ?? 100,
          hint: q.hint ?? null,
          explanation: q.explanation ?? null,
          explanationImage: q.explanationImage ?? null,
          orderIndex: q.orderIndex ?? idx,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }
    res.json({ id: quizId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create quiz' });
  }
});

// List quizzes for admin
app.get('/quizzes', authMiddleware, async (req, res) => {
  const quizzes = db.collection('quizzes');
  const list = await quizzes
    .find({ adminId: req.user.userId })
    .project({})
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ quizzes: list });
});

// Get latest session for a quiz (host only)
app.get('/quizzes/:quizId/latest-session', authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    // verify quiz belongs to host
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.adminId !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    const session = await db.collection('quizSessions')
      .find({ quizId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    if (!session.length) return res.status(404).json({ message: 'No sessions found' });
    res.json({ session: { _id: session[0]._id.toString(), code: session[0].code, status: session[0].status } });
  } catch (e) {
    console.error('Error getting latest session:', e);
    res.status(500).json({ message: 'Failed to get latest session' });
  }
});

// Delete quiz (admin only)
app.delete('/quizzes/:quizId', authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('[DELETE /quizzes/:quizId] requested by', req.user?.userId, 'for quiz', quizId);
    const quizzes = db.collection('quizzes');
    
    // Verify the quiz belongs to the admin
    const quiz = await quizzes.findOne({ _id: new ObjectId(quizId) });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    if (quiz.adminId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }
    
    // Delete related participants and answers for all sessions of this quiz
    const sessions = await db.collection('quizSessions').find({ quizId }).toArray();
    console.log('[DELETE quiz] sessions found:', sessions.length);
    for (const session of sessions) {
      const sid = session._id.toString();
      const delP = await db.collection('participants').deleteMany({ sessionId: sid });
      const delA = await db.collection('userAnswers').deleteMany({ sessionId: sid });
      console.log('[DELETE quiz] removed participants:', delP.deletedCount, 'answers:', delA.deletedCount, 'for session', sid);
    }

    // Now delete sessions and questions
    const delS = await db.collection('quizSessions').deleteMany({ quizId });
    const delQn = await db.collection('questions').deleteMany({ quizId });
    console.log('[DELETE quiz] removed sessions:', delS.deletedCount, 'questions:', delQn.deletedCount);

    // Finally delete the quiz
    await quizzes.deleteOne({ _id: new ObjectId(quizId) });
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (e) {
    console.error('Error deleting quiz:', e);
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

// Get questions by quizId
app.get('/quizzes/:quizId/questions', authMiddleware, async (req, res) => {
  const { quizId } = req.params;
  const questions = db.collection('questions');
  const list = await questions.find({ quizId }).sort({ orderIndex: 1 }).toArray();
  console.log(`Questions for quiz ${quizId}:`, list);
  res.json({ questions: list });
});

// Public endpoint for participants to get quiz details
app.get('/quizzes/:quizId/public', async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('Loading quiz for participant:', quizId);
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });
    if (!quiz) {
      console.log('Quiz not found:', quizId);
      return res.status(404).json({ message: 'Quiz not found' });
    }
    console.log('Quiz found:', quiz);
    res.json(quiz);
  } catch (e) {
    console.error('Error loading quiz:', e);
    res.status(500).json({ message: 'Failed to load quiz' });
  }
});

// Public endpoint for participants to get quiz questions
app.get('/quizzes/:quizId/questions/public', async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('Loading questions for participant:', quizId);
    const questions = db.collection('questions');
    const list = await questions.find({ quizId }).sort({ orderIndex: 1 }).toArray();
    console.log(`Questions for quiz ${quizId}:`, list.length);
    res.json({ questions: list });
  } catch (e) {
    console.error('Error loading questions:', e);
    res.status(500).json({ message: 'Failed to load questions' });
  }
});

// Get current question for a session (synchronized)
app.get('/sessions/:sessionId/current-question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Getting current question for session:', sessionId);
    
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({ 
        message: 'Session is not active', 
        status: session.status,
        isComplete: true 
      });
    }
    
    const currentQuestionIndex = session.currentQuestionIndex || 0;
    const questions = await db.collection('questions').find({ quizId: session.quizId }).sort({ orderIndex: 1 }).toArray();
    
    if (currentQuestionIndex >= questions.length) {
      return res.json({ 
        question: null, 
        isComplete: true, 
        totalQuestions: questions.length,
        currentQuestionIndex 
      });
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    res.json({ 
      question: currentQuestion, 
      isComplete: false,
      totalQuestions: questions.length,
      currentQuestionIndex,
      timeLimit: session.timeLimit || 20
    });
  } catch (e) {
    console.error('Error getting current question:', e);
    res.status(500).json({ message: 'Failed to get current question' });
  }
});

// Submit answer and check if all participants have answered
app.post('/sessions/:sessionId/submit-answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participantId, questionId, answerIndex, timeTaken, points } = req.body;
    
    console.log('Answer submission:', { sessionId, participantId, questionId, answerIndex, timeTaken, points });
    
    // Save the answer (upsert to prevent duplicates)
    const answers = db.collection('answers');
    const answerData = {
      answerIndex,
      timeTaken,
      points,
      submittedAt: new Date()
    };
    
    console.log(`Saving answer for participantId: ${participantId}, sessionId: ${sessionId}, questionId: ${questionId}`);
    console.log(`Answer data:`, answerData);
    
    await answers.updateOne(
      { sessionId, participantId, questionId },
      { $set: answerData },
      { upsert: true }
    );
    
    console.log(`Answer saved successfully for participantId: ${participantId}`);
    
    // Get session info
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get all participants for this session
    const participants = await db.collection('participants').find({ sessionId }).toArray();
    const totalParticipants = participants.length;
    
    console.log(`Session ${sessionId} has ${totalParticipants} participants:`, participants.map(p => p.name));
    
    // Count how many participants have answered the current question
    const currentQuestionIndex = session.currentQuestionIndex || 0;
    const questions = await db.collection('questions').find({ quizId: session.quizId }).sort({ orderIndex: 1 }).toArray();
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.log(`No question found at index ${currentQuestionIndex}, checking if quiz is complete`);
      // Check if we've gone past all questions
      if (currentQuestionIndex >= questions.length) {
        console.log(`Quiz complete: currentQuestionIndex ${currentQuestionIndex} >= questions.length ${questions.length}`);
        return res.json({ 
          submitted: true, 
          allAnswered: true, 
          nextQuestion: false,
          isComplete: true 
        });
      } else {
        console.log(`Question not found but quiz not complete, returning error`);
        return res.status(404).json({ 
          message: 'Question not found',
          currentQuestionIndex,
          totalQuestions: questions.length
        });
      }
    }
    
    const answeredParticipants = await answers.distinct('participantId', { 
      sessionId, 
      questionId: currentQuestion._id.toString(),
      answerIndex: { $gte: 0 } // Only count actual answers, not timeouts (-1)
    });
    const answeredCount = answeredParticipants.length;
    
    const allAnswered = answeredCount >= totalParticipants;
    
    console.log(`Answered: ${answeredCount}/${totalParticipants}, All answered: ${allAnswered}`);
    
    res.json({ 
      submitted: true, 
      allAnswered, 
      answeredCount, 
      totalParticipants,
      nextQuestion: allAnswered,
      isComplete: currentQuestionIndex >= questions.length - 1
    });
    
  } catch (e) {
    console.error('Error submitting answer:', e);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
});

// Move to next question (called by host or when all participants answered)
app.post('/sessions/:sessionId/next-question', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Moving to next question for session:', sessionId);
    
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const currentQuestionIndex = (session.currentQuestionIndex || 0) + 1;
    const questions = await db.collection('questions').find({ quizId: session.quizId }).sort({ orderIndex: 1 }).toArray();
    
    const isComplete = currentQuestionIndex >= questions.length;
    
    // Update session with new question index
    await db.collection('quizSessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { 
        $set: { 
          currentQuestionIndex,
          updatedAt: new Date(),
          ...(isComplete && { status: 'ended', endedAt: new Date() })
        }
      }
    );
    
    console.log(`Session ${sessionId} moved to question ${currentQuestionIndex}/${questions.length}`);
    
    res.json({ 
      currentQuestionIndex, 
      isComplete,
      totalQuestions: questions.length 
    });
    
  } catch (e) {
    console.error('Error moving to next question:', e);
    res.status(500).json({ message: 'Failed to move to next question' });
  }
});

// Get session status for participants
app.get('/sessions/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const participants = await db.collection('participants').find({ sessionId }).toArray();
    const currentQuestionIndex = session.currentQuestionIndex || 0;
    const questions = await db.collection('questions').find({ quizId: session.quizId }).sort({ orderIndex: 1 }).toArray();
    
    res.json({
      status: session.status,
      currentQuestionIndex,
      totalQuestions: questions.length,
      participantCount: participants.length,
      isComplete: currentQuestionIndex >= questions.length
    });
    
  } catch (e) {
    console.error('Error getting session status:', e);
    res.status(500).json({ message: 'Failed to get session status' });
  }
});

// Generate session code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Create a new session for a quiz
app.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.body;
    console.log('Creating session for quiz:', quizId); // Debug log
    const sessions = db.collection('quizSessions');
    const now = new Date();
    const code = generateCode();
    const result = await sessions.insertOne({
      quizId,
      code,
      status: 'waiting',
      currentQuestionIndex: 0,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      endedAt: null,
    });
    const sessionId = String(result.insertedId);
    console.log('Session created:', { sessionId, code, quizId }); // Debug log
    res.json({ sessionId, code });
  } catch (e) {
    console.error('Error creating session:', e);
    res.status(500).json({ message: 'Failed to start session' });
  }
});

// Validate code and join session
app.post('/sessions/join', async (req, res) => {
  try {
    const { code, name, token } = req.body;
    console.log('Join request:', { code, name }); // Debug log
    const sessions = db.collection('quizSessions');
    const participants = db.collection('participants');
    const session = await sessions.findOne({ code: code.toUpperCase() });
    if (!session) return res.status(404).json({ message: 'Invalid code' });
    if (session.status === 'ended') return res.status(400).json({ message: 'Session ended' });
    let userId = null;
    try {
      if (token) userId = jwt.verify(token, JWT_SECRET)?.userId || null;
    } catch {}
    const now = new Date();
    const result = await participants.insertOne({
      sessionId: String(session._id),
      userId,
      name,
      joinedAt: now,
    });
    console.log('Participant joined:', { sessionId: String(session._id), participantId: String(result.insertedId), name }); // Debug log
    res.json({ sessionId: String(session._id), participantId: String(result.insertedId) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to join' });
  }
});

// Load session by id
app.get('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    console.log('Loading session:', sessionId); // Debug log
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      console.log('Session not found:', sessionId); // Debug log
      return res.status(404).json({ message: 'Not found' });
    }
    console.log('Session found:', session); // Debug log
    res.json({ session });
  } catch (e) {
    console.error('Error loading session:', e);
    res.status(500).json({ message: 'Failed to load session' });
  }
});

// Submit answer
app.post('/answers', authMiddleware, async (req, res) => {
  try {
    const { sessionId, participantId, questionId, answerIndex, timeTaken, points } = req.body;
    console.log('Answer submission:', { sessionId, participantId, questionId, answerIndex, timeTaken, points });
    const now = new Date();
    await db.collection('userAnswers').insertOne({
      sessionId,
      participantId,
      questionId,
      userId: req.user.userId,
      answerIndex,
      timeTaken,
      points,
      createdAt: now,
    });
    console.log('Answer saved successfully');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
});

// Debug endpoint to list all sessions
app.get('/debug/sessions', async (req, res) => {
  try {
    const sessions = await db.collection('quizSessions').find({}).toArray();
    console.log('All sessions:', sessions);
    res.json({ sessions, count: sessions.length });
  } catch (e) {
    console.error('Error listing sessions:', e);
    res.status(500).json({ message: 'Failed to list sessions' });
  }
});

// Test endpoint to check if session exists
app.get('/sessions/:sessionId/test', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Testing session:', sessionId);
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      console.log('Session not found:', sessionId);
      return res.status(404).json({ message: 'Session not found', sessionId });
    }
    console.log('Session found:', session);
    res.json({ session, message: 'Session exists' });
  } catch (e) {
    console.error('Error testing session:', e);
    res.status(500).json({ message: 'Failed to test session', error: e.message });
  }
});

// Get participants for a session (public - for host dashboard)
app.get('/sessions/:sessionId/participants/public', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Fetching participants for session:', sessionId); // Debug log
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const participants = await db.collection('participants')
      .find({ sessionId })
      .sort({ joinedAt: 1 })
      .toArray();
    
    console.log('Found participants:', participants.length, participants); // Debug log
    res.json({ participants });
  } catch (e) {
    console.error('Error fetching participants:', e);
    res.status(500).json({ message: 'Failed to get participants' });
  }
});

// Get participants for a session (host only)
app.get('/sessions/:sessionId/participants', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    // Verify host owns this quiz
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(session.quizId) });
    if (!quiz || quiz.adminId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const participants = await db.collection('participants')
      .find({ sessionId })
      .sort({ joinedAt: 1 })
      .toArray();
    
    res.json({ participants });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get participants' });
  }
});

// Start quiz session (host only)
app.post('/sessions/:sessionId/start', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    // Verify host owns this quiz
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(session.quizId) });
    if (!quiz || quiz.adminId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await db.collection('quizSessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { status: 'active', startedAt: new Date(), updatedAt: new Date() } }
    );
    
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to start session' });
  }
});


// Download quiz results as CSV
app.get('/sessions/:sessionId/results/download', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    // Get quiz info for CSV
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(session.quizId) });
    
    // Get all participants and their answers
    const participants = await db.collection('participants')
      .find({ sessionId })
      .sort({ joinedAt: 1 })
      .toArray();
    
    console.log(`CSV Download: Found ${participants.length} participants for session ${sessionId}`);
    
    const results = await Promise.all(
      participants.map(async (participant) => {
        const answers = await db.collection('answers')
          .find({ participantId: participant._id.toString(), sessionId })
          .toArray();
        
        console.log(`CSV Download: Participant ${participant.name} has ${answers.length} answers:`, answers.map(a => ({ points: a.points, questionId: a.questionId })));
        
        const totalScore = answers.reduce((sum, answer) => sum + (answer.points || 0), 0);
        const correctAnswers = answers.filter(a => (a.points || 0) > 0).length;
        const totalAnswers = answers.length;
        const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
        
        console.log(`CSV Download: ${participant.name} - Score: ${totalScore}, Correct: ${correctAnswers}, Total: ${totalAnswers}, Accuracy: ${accuracy}%`);
        
        return {
          name: participant.name,
          joinedAt: participant.joinedAt,
          totalScore,
          correctAnswers,
          totalAnswers,
          accuracy,
          answers: answers.map(answer => ({
            questionId: answer.questionId,
            selectedAnswer: answer.answerIndex,
            points: answer.points,
            timeTaken: answer.timeTaken,
            createdAt: answer.createdAt
          }))
        };
      })
    );
    
    // Generate CSV content
    const csvHeader = 'Participant Name,Joined At,Total Score,Correct Answers,Total Questions,Accuracy,Quiz Title,Session Code,Session Started At\n';
    const csvRows = results.map(result => 
      `"${(result.name || '').toString().replace(/"/g,'""')}","${result.joinedAt}","${result.totalScore}","${result.correctAnswers}","${result.totalAnswers}","${result.accuracy}%","${(quiz.title || '').toString().replace(/"/g,'""')}","${session.code}","${session.startedAt || 'Not started'}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="quiz-results-${session.code}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (e) {
    console.error('Error downloading results:', e);
    res.status(500).json({ message: 'Failed to download results' });
  }
});

// Debug endpoint to check database contents
app.get('/debug/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const participants = await db.collection('participants')
      .find({ sessionId })
      .toArray();
    
    const allAnswers = await db.collection('answers').find({}).toArray();
    
    res.json({
      sessionId,
      participants: participants.map(p => ({ 
        id: p._id.toString(), 
        name: p.name, 
        sessionId: p.sessionId 
      })),
      allAnswers: allAnswers.map(a => ({ 
        participantId: a.participantId, 
        sessionId: a.sessionId, 
        points: a.points,
        questionId: a.questionId 
      })),
      totalAnswers: allAnswers.length
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Debug failed', error: e.message });
  }
});

// Get leaderboard for a session
app.get('/sessions/:sessionId/leaderboard', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const participants = await db.collection('participants')
      .find({ sessionId })
      .toArray();
    
    console.log(`Found ${participants.length} participants for session ${sessionId}:`, participants.map(p => ({ name: p.name, id: p._id.toString() })));
    
    // Debug: Check what answers exist for this session
    const allAnswers = await db.collection('answers').find({ sessionId }).toArray();
    console.log(`Found ${allAnswers.length} total answers for session ${sessionId}:`, allAnswers.map(a => ({ participantId: a.participantId, points: a.points, questionId: a.questionId })));
    
    // Also check if there are any answers in the entire answers collection
    const totalAnswers = await db.collection('answers').countDocuments();
    console.log(`Total answers in database: ${totalAnswers}`);
    
    const leaderboard = await Promise.all(
      participants.map(async (participant) => {
        // Try multiple participantId formats
        const participantIdString = participant._id.toString();
        const participantIdObjectId = participant._id;
        
        console.log(`Looking for answers for participant ${participant.name}:`);
        console.log(`- participantId as string: ${participantIdString}`);
        console.log(`- participantId as ObjectId: ${participantIdObjectId}`);
        
        // Try finding answers with string participantId
        let answers = await db.collection('answers')
          .find({ participantId: participantIdString, sessionId })
          .toArray();
        
        console.log(`- Found ${answers.length} answers with string participantId`);
        
        // If no answers found, try with ObjectId
        if (answers.length === 0) {
          answers = await db.collection('answers')
            .find({ participantId: participantIdObjectId, sessionId })
            .toArray();
          console.log(`- Found ${answers.length} answers with ObjectId participantId`);
        }
        
        // If still no answers, try without sessionId filter
        if (answers.length === 0) {
          answers = await db.collection('answers')
            .find({ participantId: participantIdString })
            .toArray();
          console.log(`- Found ${answers.length} answers with string participantId (no sessionId filter)`);
        }
        
        console.log(`Final: Participant ${participant.name} has ${answers.length} answers`);
        
        const totalScore = answers.reduce((sum, answer) => sum + (answer.points || 0), 0);
        const correctAnswers = answers.filter(a => (a.points || 0) > 0).length;
        const totalAnswers = answers.length;
        
        return {
          participantId: participant._id.toString(),
          name: participant.name,
          totalScore,
          correctAnswers,
          totalAnswers,
          accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
        };
      })
    );
    
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    console.log(`Final leaderboard for session ${sessionId}:`, leaderboard);
    res.json({ leaderboard });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to get leaderboard' });
  }
});

// Get participant quiz history
app.get('/participant/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get all sessions where this user participated
    const participants = await db.collection('participants')
      .find({ userId })
      .sort({ joinedAt: -1 })
      .toArray();
    
    const sessions = await Promise.all(
      participants.map(async (participant) => {
        const session = await db.collection('quizSessions')
          .findOne({ _id: new ObjectId(participant.sessionId) });
        
        if (!session) return null;
        
        // If a session is still active/waiting, proactively end it to prevent reuse
        if (session.status !== 'ended') {
          await db.collection('quizSessions').updateOne(
            { _id: new ObjectId(participant.sessionId) },
            { $set: { status: 'ended', endedAt: new Date(), updatedAt: new Date() } }
          );
          session.status = 'ended';
        }
        
        const quiz = await db.collection('quizzes')
          .findOne({ _id: new ObjectId(session.quizId) });
        
        if (!quiz) return null;
        
        // Get participant's answers and calculate score
        const answers = await db.collection('userAnswers')
          .find({ participantId: participant._id.toString() })
          .toArray();
        
        const totalScore = answers.reduce((sum, answer) => sum + answer.points, 0);
        const correctAnswers = answers.filter(a => a.points > 0).length;
        const totalQuestions = answers.length;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        return {
          _id: session._id.toString(),
          quizId: session.quizId,
          code: session.code,
          status: session.status,
          createdAt: session.createdAt,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          quiz: {
            title: quiz.title,
            description: quiz.description,
            category: quiz.category
          },
          participant: {
            name: participant.name,
            joinedAt: participant.joinedAt
          },
          score: totalScore,
          totalQuestions,
          correctAnswers,
          accuracy
        };
      })
    );
    
    const validSessions = sessions.filter(session => session !== null);
    res.json({ sessions: validSessions });
  } catch (e) {
    console.error('Error fetching participant history:', e);
    res.status(500).json({ message: 'Failed to get participant history' });
  }
});

// End a quiz session
app.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`Ending session: ${sessionId}`);
    
    const session = await db.collection('quizSessions').findOne({ _id: new ObjectId(sessionId) });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Update session status
    await db.collection('quizSessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { 
        $set: { 
          status: 'ended',
          endedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    // Mark all participants as completed (force end their quiz)
    await db.collection('participants').updateMany(
      { sessionId: sessionId },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Session ${sessionId} ended successfully - all participants marked as completed`);
    res.json({ message: 'Session ended successfully' });
  } catch (e) {
    console.error('Error ending session:', e);
    res.status(500).json({ message: 'Failed to end session' });
  }
});


// Cleanup expired quizzes (run periodically)
app.post('/cleanup', async (req, res) => {
  try {
    const now = new Date();
    const expiredQuizzes = await db.collection('quizzes')
      .find({ expiresAt: { $lt: now } })
      .toArray();
    
    for (const quiz of expiredQuizzes) {
      // Delete related sessions
      await db.collection('quizSessions').deleteMany({ quizId: quiz._id.toString() });
      // Delete related questions
      await db.collection('questions').deleteMany({ quizId: quiz._id.toString() });
      // Delete related participants and answers
      const sessions = await db.collection('quizSessions').find({ quizId: quiz._id.toString() }).toArray();
      for (const session of sessions) {
        await db.collection('participants').deleteMany({ sessionId: session._id.toString() });
        await db.collection('userAnswers').deleteMany({ sessionId: session._id.toString() });
      }
    }
    
    // Delete expired quizzes
    const result = await db.collection('quizzes').deleteMany({ expiresAt: { $lt: now } });
    
    res.json({ deletedCount: result.deletedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Cleanup failed' });
  }
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to init DB', err);
  process.exit(1);
});


