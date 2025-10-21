import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Copy, Trophy, PlayCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
  hint?: string;
  explanation?: string;
  explanationImage?: string;
}

interface SavedQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  questionCount: number;
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizCategory, setQuizCategory] = useState("");
  const [timeLimit, setTimeLimit] = useState("20"); // Default 20 seconds
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 100,
      hint: "",
      explanation: "",
    },
  ]);
  const [quizCode, setQuizCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchQuizHistory();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) navigate("/auth");
  };

  const fetchQuizHistory = async () => {
    try {
      const res = await api.get('/quizzes');
      const quizzes = res?.quizzes || [];
      const quizzesWithCounts = quizzes.map((q: any) => ({
        id: q._id,
        title: q.title,
        description: q.description,
        category: q.category,
        created_at: q.createdAt,
        questionCount: q.questionCount || 0,
      }));
      setSavedQuizzes(quizzesWithCounts);
    } catch (error: any) {
      console.error("Error fetching quiz history:", error);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 100,
      hint: "",
      explanation: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleImageUpload = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateQuestion(questionId, "explanationImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const saveQuizToDatabase = async () => {
    setIsLoading(true);
    try {
      const payload = {
        title: quizTitle,
        description: quizDescription,
        category: quizCategory,
        timeLimit: parseInt(timeLimit), // Add time limit to payload
        questions: questions.map((q, index) => ({
          questionText: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswer,
          points: q.points,
          hint: q.hint || null,
          explanation: q.explanation || null,
          explanationImage: q.explanationImage || null,
          orderIndex: index,
        })),
      };
      const quizRes = await api.post('/quizzes', payload);
      const startRes = await api.post('/sessions', { quizId: quizRes.id });
      localStorage.setItem("sessionId", startRes.sessionId);
      localStorage.setItem("quizCode", startRes.code);
      toast.success("Quiz saved and code generated!");
      navigate(`/host-dashboard/${startRes.sessionId}`);
    } catch (error: any) {
      console.error("Error saving quiz:", error);
      toast.error(error.message || "Failed to save quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const startExistingQuiz = async (quizId: string) => {
    setIsLoading(true);
    try {
      const startRes = await api.post('/sessions', { quizId });
      localStorage.setItem("sessionId", startRes.sessionId);
      localStorage.setItem("quizCode", startRes.code);
      navigate(`/host-dashboard/${startRes.sessionId}`);
      toast.success(`New session started with code: ${startRes.code}`);
    } catch (error: any) {
      console.error("Error starting quiz:", error);
      toast.error("Failed to start quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(quizCode);
    toast.success("Code copied to clipboard!");
  };

  const startQuiz = () => {
    localStorage.setItem("activeSessionId", sessionId);
    navigate("/leaderboard");
  };

  return (
    <div className="min-h-screen gradient-primary p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {showHistory && savedQuizzes.length > 0 && (
          <Card className="p-6 shadow-neumorphic gradient-card border-0 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Quiz History</h2>
              <Button variant="ghost" onClick={() => setShowHistory(false)}>
                Hide
              </Button>
            </div>
            <div className="space-y-3">
              {savedQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-accent/20"
                >
                  <div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {quiz.questionCount} questions • {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => startExistingQuiz(quiz.id)}
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Again
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!showHistory && savedQuizzes.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowHistory(true)}
            className="mb-6 rounded-2xl"
          >
            View Quiz History ({savedQuizzes.length})
          </Button>
        )}

        <Card className="p-8 shadow-neumorphic gradient-card border-0 mb-6">
          <h1 className="text-3xl font-bold mb-6">Create Quiz</h1>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                placeholder="e.g., History Challenge"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="shadow-neumorphic-inset border-0 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your quiz..."
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                className="shadow-neumorphic-inset border-0 rounded-2xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Science, History, Math"
                value={quizCategory}
                onChange={(e) => setQuizCategory(e.target.value)}
                className="shadow-neumorphic-inset border-0 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit per Question
              </Label>
              <Select value={timeLimit} onValueChange={setTimeLimit}>
                <SelectTrigger className="shadow-neumorphic-inset border-0 rounded-2xl">
                  <SelectValue placeholder="Select time limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="45">45 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {questions.map((q, qIndex) => (
          <Card
            key={q.id}
            className="p-6 shadow-neumorphic gradient-card border-0 mb-4 animate-slide-up"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Question {qIndex + 1}</h3>
              {questions.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(q.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Enter your question"
                value={q.question}
                onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                className="shadow-neumorphic-inset border-0 rounded-2xl font-medium"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctAnswer === optIndex}
                      onChange={() => updateQuestion(q.id, "correctAnswer", optIndex)}
                      className="w-4 h-4 accent-success"
                    />
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                      value={option}
                      onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                      className={`shadow-neumorphic-inset border-0 rounded-xl ${
                        q.correctAnswer === optIndex ? "ring-2 ring-success" : ""
                      }`}
                    />
                  </div>
                ))}
              </div>


              <div className="space-y-2">
                <Label htmlFor={`explanation-${q.id}`} className="text-sm">
                  Explanation (shown after quiz)
                </Label>
                <Textarea
                  id={`explanation-${q.id}`}
                  placeholder="Optional: Explain why this is the correct answer"
                  value={q.explanation || ""}
                  onChange={(e) => updateQuestion(q.id, "explanation", e.target.value)}
                  className="shadow-neumorphic-inset border-0 rounded-xl min-h-[60px]"
                />
                
                {/* Image Upload for Explanation */}
                <div className="space-y-2">
                  <Label htmlFor={`explanation-image-${q.id}`} className="text-sm">
                    Explanation Image (optional)
                  </Label>
                  <Input
                    id={`explanation-image-${q.id}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(q.id, e)}
                    className="shadow-neumorphic-inset border-0 rounded-xl"
                  />
                  {q.explanationImage && (
                    <div className="mt-2">
                      <img 
                        src={q.explanationImage} 
                        alt="Explanation" 
                        className="max-w-full h-32 object-contain rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuestion(q.id, "explanationImage", "")}
                        className="mt-2"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        <Button
          onClick={addQuestion}
          className="w-full mb-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-2xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>

        {!quizCode ? (
          <Button
            onClick={saveQuizToDatabase}
            size="lg"
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl shadow-lg"
            disabled={
              !quizTitle ||
              questions.some((q) => !q.question || q.options.some((o) => !o)) ||
              isLoading
            }
          >
            {isLoading ? "Saving..." : "Generate Quiz Code"}
          </Button>
        ) : (
          <Card className="p-6 shadow-neumorphic gradient-card border-0 animate-scale-in">
            <div className="text-center space-y-4">
              <Trophy className="w-16 h-16 text-gold mx-auto animate-glow" />
              <h3 className="text-2xl font-bold">Quiz Ready!</h3>
              <div className="flex items-center justify-center gap-2">
                <code className="text-3xl font-bold text-primary bg-primary/10 px-6 py-3 rounded-2xl">
                  {quizCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCode}
                  className="hover:bg-primary/10"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground">
                Share this code with participants
              </p>
              <Button
                onClick={startQuiz}
                size="lg"
                className="w-full bg-success hover:bg-success/90 text-white font-semibold rounded-2xl"
              >
                Start Quiz & View Leaderboard
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreateQuiz;
