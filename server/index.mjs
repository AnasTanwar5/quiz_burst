import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import csv from "csv-stringify/sync";
import bodyParser from "body-parser";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local dev
      "https://https://quizburst-ten.vercel.app/", // replace with your deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---------- DATABASE ----------
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ Missing MONGODB_URI in environment variables!");
  process.exit(1);
}

async function initDb() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

// ---------- MODELS ----------
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const quizSchema = new mongoose.Schema({
  title: String,
  questions: Array,
  createdBy: String,
});

const sessionSchema = new mongoose.Schema({
  code: String,
  quizId: String,
  participants: Array,
});

const User = mongoose.model("User", userSchema);
const Quiz = mongoose.model("Quiz", quizSchema);
const Session = mongoose.model("Session", sessionSchema);

// ---------- AUTH MIDDLEWARE ----------
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(400).json({ message: "Invalid token" });
  }
}

// ---------- ROUTES ----------

// Test route
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// ----- AUTH -----
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    res.json({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----- QUIZZES -----
app.post("/api/quizzes", authMiddleware, async (req, res) => {
  try {
    const quiz = new Quiz({ ...req.body, createdBy: req.user.email });
    await quiz.save();
    res.json({ message: "Quiz created", quiz });
  } catch (err) {
    res.status(500).json({ message: "Failed to create quiz" });
  }
});

app.get("/api/quizzes", authMiddleware, async (req, res) => {
  const quizzes = await Quiz.find({ createdBy: req.user.email });
  res.json(quizzes);
});

// ----- SESSIONS -----
app.post("/api/sessions", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const session = new Session({ code, quizId, participants: [] });
    await session.save();
    res.json({ message: "Session created", session });
  } catch (err) {
    res.status(500).json({ message: "Failed to create session" });
  }
});

app.get("/api/sessions/:code", async (req, res) => {
  const session = await Session.findOne({ code: req.params.code });
  if (!session) return res.status(404).json({ message: "Session not found" });
  res.json(session);
});

// ----- PARTICIPANTS -----
app.post("/api/sessions/:code/join", async (req, res) => {
  const session = await Session.findOne({ code: req.params.code });
  if (!session) return res.status(404).json({ message: "Session not found" });

  session.participants.push({ name: req.body.name, answers: [] });
  await session.save();
  res.json({ message: "Joined session" });
});

// ----- RESULTS CSV -----
app.get("/api/sessions/:id/results/download", async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const csvContent = csv.stringify(session.participants, { header: true });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quiz-results-${session.code}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    console.error("CSV error:", err);
    res.status(500).json({ message: "Failed to generate CSV" });
  }
});

// ---------- START SERVER ----------
initDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
