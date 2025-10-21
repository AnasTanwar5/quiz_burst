import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Trophy, Lightbulb, Zap, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

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

interface Question {
  _id: string;
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  hint?: string;
  explanation?: string;
}

interface QuizStatus {
  status: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  participantCount: number;
  isComplete: boolean;
}

const LiveQuizPlay = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timeLimit, setTimeLimit] = useState(20);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintCounter, setHintCounter] = useState(0);

  useEffect(() => {
    if (waitingForOthers) {
      // Rotate quotes every 3 seconds
      const quoteInterval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % studyQuotes.length);
      }, 3000);
      
      return () => clearInterval(quoteInterval);
    }
  }, [waitingForOthers]);
  useEffect(() => {
    loadQuizData();
    
    // Cleanup function to save data when component unmounts
    return () => {
      if (score > 0) {
        saveFinalQuizData();
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && currentQuestion && !transitioning) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentQuestion && !transitioning) {
      // Timer ended - advance to next question
      console.log("Timer ended, advancing to next question");
      handleTimerEnd();
    }
  }, [timeLeft, currentQuestion, transitioning]);


  // Poll for quiz status and current question - ONLY when waiting for others
  useEffect(() => {
    if (!loading && waitingForOthers) {
      const interval = setInterval(async () => {
        try {
          const sessionId = localStorage.getItem("sessionId");
          if (!sessionId) return;
          
          const statusRes = await api.get(`/sessions/${sessionId}/status`);
          setQuizStatus(statusRes);
          
          if (statusRes.isComplete) {
            console.log("Quiz complete detected in polling");
            // Save final score to localStorage
            localStorage.setItem("quizScore", score.toString());
            localStorage.setItem("totalQuestions", statusRes.totalQuestions.toString());
            console.log("Navigating to results from polling");
            navigate("/results");
            return;
          }
          
          // Check if question has advanced
          const currentQuestionIndex = quizStatus?.currentQuestionIndex || 0;
          if (statusRes.currentQuestionIndex > currentQuestionIndex) {
            console.log("Question advanced, loading next question");
            setWaitingForOthers(false);
            setTransitioning(false);
            await loadCurrentQuestion();
          }
        } catch (error) {
          console.error("Error polling:", error);
        }
      }, 500); // Poll every 500ms for real-time sync

      return () => clearInterval(interval);
    }
  }, [loading, waitingForOthers, quizStatus, score]);

  const loadQuizData = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        toast.error("No active quiz session");
        navigate("/join");
        return;
      }


      // Load initial question
      await loadCurrentQuestion();
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz");
      navigate("/join");
    } finally {
      setLoading(false);
    }
  };


  const loadCurrentQuestion = async () => {
    try {
      setTransitioning(true);
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        navigate("/join");
        return;
      }

      const questionRes = await api.get(`/sessions/${sessionId}/current-question`);
      console.log("Current question response:", questionRes);
      
      if (questionRes.isComplete) {
        console.log("Quiz complete detected in loadCurrentQuestion");
        // Save final score to localStorage
        localStorage.setItem("quizScore", score.toString());
        localStorage.setItem("totalQuestions", questionRes.totalQuestions.toString());
        console.log("Navigating to results from loadCurrentQuestion");
        navigate("/results");
        return;
      }

      if (questionRes.question) {
        const question = {
          ...questionRes.question,
          id: questionRes.question._id
        };
        setCurrentQuestion(question);
        setTimeLimit(questionRes.timeLimit || 20);
        setTimeLeft(questionRes.timeLimit || 20);
        
        // Update quiz status with current question info
        if (questionRes.currentQuestionIndex !== undefined && questionRes.totalQuestions !== undefined) {
          setQuizStatus(prevStatus => ({
            ...prevStatus,
            currentQuestionIndex: questionRes.currentQuestionIndex,
            totalQuestions: questionRes.totalQuestions,
            isComplete: false
          }));
        }
        setAnswered(false);
        setSelectedAnswer(null);
        setWaitingForOthers(false);
        setTransitioning(false);
        setShowHint(false); // Reset hint state for new question
        setEliminatedOptions([]); // Reset eliminated options for new question
        setAnsweredCount(0); // Reset participant count
        setTotalParticipants(0); // Reset total participants
        
        // Reset hint availability every 10 questions
        setHintCounter(prev => prev + 1);
        if (hintCounter % 10 === 0) {
          setHintUsed(false);
        }
        
        console.log("Loaded new question:", question.questionText);
        
        // Save question to localStorage for review
        const savedQuestions = JSON.parse(localStorage.getItem("quizQuestions") || "[]");
        const questionExists = savedQuestions.find((q: any) => q.id === question.id);
        if (!questionExists) {
          savedQuestions.push({
            id: question.id,
            question: question.questionText,
            options: question.options,
            correctAnswerIndex: question.correctAnswerIndex,
            points: question.points,
            explanation: question.explanation
          });
          localStorage.setItem("quizQuestions", JSON.stringify(savedQuestions));
          console.log("Saved question to localStorage:", question.id);
        }
      } else {
        console.log("No question available, checking if quiz is complete");
        // Check if quiz is actually complete or if there's an error
        if (questionRes.isComplete) {
          console.log("Quiz is complete, navigating to results");
          navigate("/results");
        } else {
          console.log("Question not found but quiz not complete, retrying...");
          // Retry after a short delay instead of redirecting
          setTimeout(() => {
            loadCurrentQuestion();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error loading current question:", error);
      // Don't immediately redirect, try to recover
      console.log("Retrying after error...");
      setTimeout(() => {
        loadCurrentQuestion();
      }, 2000);
    }
  };

  const calculatePoints = (remainingTime: number) => {
    const basePoints = 30;
    const timeBonus = (remainingTime / timeLimit) * 70;
    return Math.round(basePoints + timeBonus);
  };

  const handleTimerEnd = async () => {
    if (!currentQuestion || transitioning) return;
    
    console.log("Timer ended, advancing to next question");
    setTransitioning(true);
    
    // Call server to advance to next question
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (sessionId) {
        await api.post(`/sessions/${sessionId}/next-question`);
        console.log("Server advanced to next question");
        
        // Check if quiz is complete after advancing
        const statusRes = await api.get(`/sessions/${sessionId}/status`);
        console.log("Status after advancing:", statusRes);
        
        if (statusRes.isComplete) {
          console.log("Quiz complete detected in handleTimerEnd");
          // Save final score to localStorage
          localStorage.setItem("quizScore", score.toString());
          localStorage.setItem("totalQuestions", statusRes.totalQuestions.toString());
          console.log("Navigating to results from handleTimerEnd");
          navigate("/results");
          return;
        }
      }
    } catch (error) {
      console.error("Error advancing question:", error);
    }
    
    // Load next question
    await loadCurrentQuestion();
  };

  // Final save function to ensure all data is stored
  const saveFinalQuizData = () => {
    const savedQuestions = JSON.parse(localStorage.getItem("quizQuestions") || "[]");
    const savedAnswers = JSON.parse(localStorage.getItem("quizAnswers") || "[]");
    
    console.log("Final quiz data save:");
    console.log("Questions saved:", savedQuestions.length);
    console.log("Answers saved:", savedAnswers.length);
    console.log("Final score:", score);
    
    // Ensure data is properly formatted
    localStorage.setItem("quizQuestions", JSON.stringify(savedQuestions));
    localStorage.setItem("quizAnswers", JSON.stringify(savedAnswers));
    localStorage.setItem("quizScore", score.toString());
  };


  const handleAnswer = async (answerIndex: number) => {
    if (answered || !currentQuestion) return;

    setSelectedAnswer(answerIndex);
    setAnswered(true);

    const timeSpent = timeLimit - timeLeft;
    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
    const points = isCorrect ? calculatePoints(timeLeft) : 0;

    console.log(`Answer: ${answerIndex}, Correct: ${currentQuestion.correctAnswerIndex}, IsCorrect: ${isCorrect}, Points: ${points}`);

    if (isCorrect) {
      setScore(prevScore => prevScore + points);
    }

    // Save answer to localStorage for review (prevent duplicates)
    const savedAnswers = JSON.parse(localStorage.getItem("quizAnswers") || "[]");
    
    // Remove any existing answer for this question
    const filteredAnswers = savedAnswers.filter((ans: any) => ans.questionId !== currentQuestion.id);
    
    // Add the new answer
    filteredAnswers.push({
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex
    });
    
    localStorage.setItem("quizAnswers", JSON.stringify(filteredAnswers));
    console.log("Saved answer:", {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      totalAnswers: filteredAnswers.length
    });

    // Submit answer to server
    try {
      const sessionId = localStorage.getItem("sessionId");
      const participantId = localStorage.getItem("participantId");
      
      if (sessionId && participantId) {
        const submitRes = await api.post(`/sessions/${sessionId}/submit-answer`, {
          participantId,
          questionId: currentQuestion.id,
          answerIndex,
          timeTaken: timeSpent,
          points
        });

        console.log("Answer submission response:", submitRes);
        
        // Always show waiting screen with timer - wait until timer ends
        console.log("Answer submitted, showing waiting screen with timer");
        setWaitingForOthers(true);
        setAnsweredCount(submitRes.answeredCount);
        setTotalParticipants(submitRes.totalParticipants);
        
        if (submitRes.allAnswered) {
          toast.success("All participants have answered! Waiting for timer to end...");
        } else {
          toast.info(`Waiting for ${submitRes.totalParticipants - submitRes.answeredCount} more participants...`);
        }
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
    }
  };

  if (loading || transitioning) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">
          {loading ? "Loading quiz..." : "Loading next question..."}
        </div>
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
          <p className="text-lg mb-6">
            {answeredCount >= totalParticipants 
              ? "All participants have answered! Moving to next question..." 
              : "Other players are still submitting their answers..."
            }
          </p>
          
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">Your Answer:</span>
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              {selectedAnswer !== null && selectedAnswer !== -1 
                ? `Option ${selectedAnswer + 1}: ${currentQuestion?.options[selectedAnswer]}`
                : "Time's up - No answer submitted"
              }
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">Time Remaining:</span>
            </div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">
              {timeLeft}s
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              {answeredCount >= totalParticipants 
                ? "All answered! Waiting for timer to end..." 
                : "Waiting for other participants..."
              }
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800 dark:text-purple-200">Fun Fact:</span>
            </div>
            <p className="text-purple-700 dark:text-purple-300 animate-pulse">
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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
          <p className="text-lg mb-6">Redirecting to results...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const progress = quizStatus ? ((quizStatus.currentQuestionIndex + 1) / quizStatus.totalQuestions) * 100 : 0;
  const timeProgress = (timeLeft / timeLimit) * 100;

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-3xl w-full animate-fade-in">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Question {quizStatus?.currentQuestionIndex + 1 || 1} of {quizStatus?.totalQuestions || 1}
            </span>
            <span className="text-sm font-medium">Score: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 shadow-neumorphic gradient-card border-0">
          {/* Timer */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">{currentQuestion.questionText}</h2>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {currentQuestion.points} points
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {quizStatus?.participantCount || 0} participants
              </span>
            </div>
            
            {/* 50-50 Hint Section */}
            <div className="mb-4">
              <Button
                onClick={() => {
                  if (!showHint && !hintUsed) {
                    // Eliminate 2 wrong options (50-50)
                    const wrongOptions = currentQuestion.options
                      .map((_, index) => index)
                      .filter(index => index !== currentQuestion.correctAnswerIndex);
                    
                    // Randomly select 2 wrong options to eliminate
                    const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
                    const toEliminate = shuffled.slice(0, 2);
                    
                    setEliminatedOptions(toEliminate);
                    setShowHint(true);
                    setHintUsed(true);
                  }
                }}
                variant="outline"
                size="sm"
                className="mb-2"
                disabled={showHint || hintUsed}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {showHint ? "50-50 Used" : hintUsed ? "50-50 Used (Next in 10 questions)" : "50-50 Hint"}
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              const isEliminated = eliminatedOptions.includes(index);
              return (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className={`h-16 text-left justify-start text-lg font-medium transition-all duration-200 ${
                    isEliminated
                      ? "opacity-30 cursor-not-allowed bg-gray-200 dark:bg-gray-800"
                      : answered
                      ? selectedAnswer === index
                        ? index === currentQuestion.correctAnswerIndex
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                        : index === currentQuestion.correctAnswerIndex
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "opacity-50"
                      : "hover:scale-105 hover:shadow-lg"
                  }`}
                  onClick={() => !isEliminated && handleAnswer(index)}
                  disabled={answered || isEliminated}
                >
                  <span className="mr-4 font-bold">{String.fromCharCode(65 + index)}.</span>
                  {option}
                  {isEliminated && <span className="ml-2 text-xs">❌</span>}
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LiveQuizPlay;
