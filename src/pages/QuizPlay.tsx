import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, Lightbulb, Eye, Users, BookOpen } from "lucide-react";
import { api } from "@/integrations/mongodb";
import { toast } from "sonner";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  hint?: string;
  explanation?: string;
}

const QuizPlay = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timeLimit, setTimeLimit] = useState(20); // Dynamic time limit from quiz
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedRevealHint, setUsedRevealHint] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showHintText, setShowHintText] = useState(false);
  const [hintsAvailable, setHintsAvailable] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Array<{ questionId: string; selectedAnswer: number; timeSpent: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);

  // Funny study quotes for waiting screen
  const studyQuotes = [
    "While you wait, remember: 'The expert in anything was once a beginner!' 📚",
    "Patience is a virtue... especially when waiting for slow typers! ⌨️",
    "Did you know? The average person spends 6 months of their life waiting for red lights! 🚦",
    "While others finish, ponder this: 'Why do we call it 'after dark' when it's really 'after light'?' 🤔",
    "Waiting time = thinking time! What's the capital of Iceland? (It's Reykjavik!) 🧠",
    "Fun fact: A group of flamingos is called a 'flamboyance'! 🦩",
    "While waiting: 'I'm not arguing, I'm just explaining why I'm right!' 😄",
    "Did you know? Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs! 🍯",
    "Waiting wisdom: 'The early bird gets the worm, but the second mouse gets the cheese!' 🐭",
    "Fun fact: A jiffy is an actual unit of time - it's 1/100th of a second! ⏱️"
  ];

  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      navigate("/join");
      return;
    }

    loadQuizData();
    
    // Check session status every 2 seconds
    const statusInterval = setInterval(checkSessionStatus, 2000);
    
    return () => clearInterval(statusInterval);
  }, [navigate]);

  const checkSessionStatus = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) return;
      
      const statusRes = await api.get(`/sessions/${sessionId}/status`);
      if (statusRes?.isEnded) {
        setSessionEnded(true);
        toast.info("Quiz has been ended by the host");
        setTimeout(() => {
          navigate("/results");
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking session status:", error);
    }
  };

  useEffect(() => {
    if (waitingForOthers) {
      // Rotate quotes every 3 seconds
      const quoteInterval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % studyQuotes.length);
      }, 3000);
      
      return () => clearInterval(quoteInterval);
    }
  }, [waitingForOthers]);

  const loadQuizData = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        toast.error("No active quiz session");
        navigate("/join");
        return;
      }

      // Get session and questions via backend
      const sessionRes = await api.get(`/sessions/${sessionId}`);
      if (!sessionRes?.session) throw new Error('Session not found');
      
      if (sessionRes.session.status !== 'active') {
        toast.error("Quiz has not started yet");
        navigate("/waiting");
        return;
      }
      
      // Get quiz details to get time limit
      const quizRes = await api.get(`/quizzes/${sessionRes.session.quizId}/public`);
      const quizTimeLimit = quizRes?.timeLimit || 20;
      setTimeLimit(quizTimeLimit);
      setTimeLeft(quizTimeLimit);
      
      const questionsRes = await api.get(`/quizzes/${sessionRes.session.quizId}/questions/public`);
      const questionsData = questionsRes?.questions || [];
      console.log("Loaded questions:", questionsData);
      console.log("Questions count:", questionsData.length);
      console.log("Time limit:", quizTimeLimit);
      
      // Map _id to id for frontend compatibility
      const mappedQuestions = questionsData.map(q => ({
        ...q,
        id: q._id
      }));
      setQuestions(mappedQuestions);
      
      // Calculate available hints (1 hint per 10 questions)
      const availableHints = Math.floor(questionsData.length / 10);
      setHintsAvailable(availableHints);
      console.log("Available hints:", availableHints);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/join");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && !answered && questions.length > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !answered && questions.length > 0) {
      handleNext();
    }
  }, [timeLeft, answered, questions]);

  const calculatePoints = (remainingTime: number) => {
    const basePoints = 30;
    const timeBonus = (remainingTime / timeLimit) * 70;
    return Math.round(basePoints + timeBonus);
  };

  const handleAnswer = async (answerIndex: number) => {
    if (answered) return;

    setSelectedAnswer(answerIndex);
    setAnswered(true);

    const timeSpent = timeLimit - timeLeft;
    const isCorrect = answerIndex === questions[currentQuestion].correctAnswerIndex;
    const points = isCorrect ? calculatePoints(timeLeft) : 0;

    console.log(`Answer: ${answerIndex}, Correct: ${questions[currentQuestion].correctAnswerIndex}, IsCorrect: ${isCorrect}, Points: ${points}, TimeLeft: ${timeLeft}`);
    console.log("Current question data:", questions[currentQuestion]);

    if (isCorrect) {
      setScore(prevScore => {
        const newScore = prevScore + points;
        console.log(`Score updated: ${prevScore} + ${points} = ${newScore}`);
        return newScore;
      });
    }

    // Save answer for review
    setQuizAnswers([
      ...quizAnswers,
      { 
        questionId: questions[currentQuestion].id, 
        selectedAnswer: answerIndex,
        timeSpent 
      },
    ]);

    // Save to database
    try {
      const sessionId = localStorage.getItem("sessionId");
      const participantId = localStorage.getItem("participantId");
      const token = localStorage.getItem('authToken');
      if (sessionId && participantId && token) {
        await api.post('/answers', {
          sessionId,
          participantId,
          questionId: questions[currentQuestion].id,
          answerIndex,
          timeTaken: timeSpent,
          points
        });
      }
    } catch (error) {
      console.error("Error saving answer:", error);
    }

    // Show waiting screen - wait for remaining time or minimum 3 seconds
    const remainingTime = Math.max(timeLeft, 3);
    setWaitingForOthers(true);
    setTimeout(() => {
      setWaitingForOthers(false);
      handleNext(score + (isCorrect ? points : 0), [
        ...quizAnswers,
        { 
          questionId: questions[currentQuestion].id, 
          selectedAnswer: answerIndex,
          timeSpent 
        },
      ]);
    }, remainingTime * 1000);
  };

  const handleNext = (updatedScore?: number, updatedAnswers?: any[]) => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeLeft(timeLimit); // Use dynamic time limit
      setAnswered(false);
      setHiddenOptions([]);
      setShowHintText(false);
    } else {
      // Use the passed values or current state
      const finalScore = updatedScore !== undefined ? updatedScore : score;
      const finalAnswers = updatedAnswers || quizAnswers;
      
      // Save results to localStorage
      console.log("Quiz completed! Final score:", finalScore);
      console.log("Total questions:", questions.length);
      console.log("Quiz answers:", finalAnswers);
      localStorage.setItem("quizScore", finalScore.toString());
      localStorage.setItem("totalQuestions", questions.length.toString());
      localStorage.setItem("quizQuestions", JSON.stringify(questions));
      localStorage.setItem("quizAnswers", JSON.stringify(finalAnswers));
      console.log("Saved to localStorage - navigating to results");
      navigate("/results");
    }
  };

  const handleFiftyFifty = () => {
    if (usedFiftyFifty || answered || hintsUsed >= hintsAvailable) return;
    
    const correctAnswer = questions[currentQuestion].correctAnswerIndex;
    const wrongOptions = questions[currentQuestion].options
      .map((_, idx) => idx)
      .filter((idx) => idx !== correctAnswer);
    
    // Randomly select 2 wrong options to hide
    const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
    const toHide = shuffled.slice(0, 2);
    
    setHiddenOptions(toHide);
    setUsedFiftyFifty(true);
    setHintsUsed(hintsUsed + 1);
    toast.success(`50-50 used! Two wrong options removed. (${hintsUsed + 1}/${hintsAvailable} hints used)`);
  };

  const handleRevealHint = () => {
    if (usedRevealHint || answered) return;
    setShowHintText(true);
    setUsedRevealHint(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading quiz...</div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-bold mb-4">Quiz Ended!</h2>
          <p className="text-lg mb-6">The host has ended this quiz session.</p>
          <p className="text-sm text-gray-600">Redirecting to results...</p>
        </Card>
      </div>
    );
  }

  if (waitingForOthers) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md animate-fade-in">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Users className="w-6 h-6" />
            Waiting for Others
          </h2>
          <p className="text-lg mb-6">Other players are still submitting their answers...</p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">Fun Fact:</span>
            </div>
            <p className="text-blue-700 dark:text-blue-300 animate-pulse">
              {studyQuotes[currentQuote]}
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">No questions found</p>
          <Button onClick={() => navigate("/join")}>Back to Join</Button>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const timeProgress = (timeLeft / timeLimit) * 100;

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-3xl w-full animate-fade-in">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium">Score: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-neumorphic gradient-card border-0">
          {/* Hints */}
          {questions.length >= 10 && (
            <div className="flex justify-center gap-3 mb-6">
              <Button
                onClick={handleFiftyFifty}
                disabled={usedFiftyFifty || answered || hintsUsed >= hintsAvailable}
                variant="outline"
                className={`rounded-2xl shadow-neumorphic transition-all ${
                  !usedFiftyFifty && !answered && hintsUsed < hintsAvailable ? "animate-glow" : "opacity-50"
                }`}
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                50-50 ({hintsUsed}/{hintsAvailable}) {usedFiftyFifty && "✓"}
              </Button>
              {questions.length >= 20 && (
                <Button
                  onClick={handleRevealHint}
                  disabled={usedRevealHint || answered || !questions[currentQuestion].hint}
                  variant="outline"
                  className={`rounded-2xl shadow-neumorphic transition-all ${
                    !usedRevealHint && !answered && questions[currentQuestion].hint ? "animate-glow" : "opacity-50"
                  }`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Reveal Hint {usedRevealHint && "✓"}
                </Button>
              )}
            </div>
          )}

          {showHintText && questions[currentQuestion].hint && (
            <div className="mb-6 p-4 bg-accent/20 rounded-2xl border border-accent animate-fade-in">
              <p className="text-sm font-medium text-center">
                💡 Hint: {questions[currentQuestion].hint}
              </p>
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={timeLeft > 10 ? "hsl(var(--success))" : "hsl(var(--warning))"}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(timeProgress / 100) * 251.2} 251.2`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{timeLeft}</span>
              </div>
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-center mb-8 min-h-[4rem] flex items-center justify-center">
            {questions[currentQuestion].questionText}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions[currentQuestion].options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === questions[currentQuestion].correctAnswerIndex;
              const showCorrect = answered && isCorrect;
              const showWrong = answered && isSelected && !isCorrect;
              const isHidden = hiddenOptions.includes(index);

              if (isHidden) {
                return (
                  <div
                    key={index}
                    className="h-20 rounded-2xl bg-muted/30 flex items-center justify-center opacity-30 animate-fade-out"
                  >
                    <span className="text-muted-foreground">Hidden</span>
                  </div>
                );
              }

              return (
                <Button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={answered}
                  className={`h-20 text-lg font-medium rounded-2xl transition-all ${
                    showCorrect
                      ? "bg-success hover:bg-success text-white"
                      : showWrong
                      ? "bg-destructive hover:bg-destructive text-white"
                      : "bg-card hover:bg-muted text-card-foreground shadow-neumorphic hover:shadow-xl"
                  }`}
                >
                  <span className="mr-3 font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                  {showCorrect && <CheckCircle className="ml-auto h-5 w-5" />}
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QuizPlay;
