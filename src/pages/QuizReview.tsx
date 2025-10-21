import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Home, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
  explanation?: string;
  explanationImage?: string;
}

interface QuizAnswer {
  questionId: string;
  selectedAnswer: number;
}

const QuizReview = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  useEffect(() => {
    const savedQuestions = localStorage.getItem("quizQuestions");
    const savedAnswers = localStorage.getItem("quizAnswers");
    const savedScore = localStorage.getItem("quizScore");
    const savedTotal = localStorage.getItem("totalQuestions");

    if (savedQuestions) setQuestions(JSON.parse(savedQuestions));
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedScore) setScore(parseInt(savedScore));
    if (savedTotal) {
      const total = parseInt(savedTotal);
      setTotalQuestions(total);
      // Calculate correct answers
      if (savedAnswers && savedQuestions) {
        const parsedAnswers = JSON.parse(savedAnswers);
        const parsedQuestions = JSON.parse(savedQuestions);
        const correct = parsedAnswers.filter((ans: QuizAnswer, idx: number) => 
          ans.selectedAnswer === parsedQuestions[idx]?.correctAnswerIndex
        ).length;
        setCorrectAnswers(correct);
      }
    }
  }, []);

  const getUserAnswer = (questionId: string) => {
    return answers.find((a) => a.questionId === questionId);
  };

  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen gradient-primary p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Summary Header */}
        <Card className="p-6 mb-6 shadow-neumorphic gradient-card border-0">
          <h1 className="text-3xl font-bold mb-4 text-center">Quiz Review</h1>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-3xl font-bold text-success">{correctAnswers}/{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-3xl font-bold text-foreground">{Math.round(percentage)}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>
        </Card>

        {/* Questions Review */}
        {questions.map((q, index) => {
          const userAnswer = getUserAnswer(q.id);
          const isCorrect = userAnswer?.selectedAnswer === q.correctAnswerIndex;

          return (
            <Card
              key={q.id}
              className="p-6 mb-4 shadow-neumorphic gradient-card border-0 animate-fade-in"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">
                  Question {index + 1}
                  {(q.explanation || q.explanationImage) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-primary hover:text-primary/80"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="gradient-card border-0 max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Explanation</DialogTitle>
                          <DialogDescription className="text-foreground pt-4 space-y-4">
                            {q.explanation && (
                              <p className="text-base leading-relaxed">
                                {q.explanation}
                              </p>
                            )}
                            {q.explanationImage && (
                              <div className="flex justify-center">
                                <img 
                                  src={q.explanationImage} 
                                  alt="Explanation" 
                                  className="max-w-full max-h-96 object-contain rounded-lg border shadow-lg"
                                />
                              </div>
                            )}
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  )}
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCorrect
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {isCorrect ? "Correct" : "Incorrect"}
                </div>
              </div>

              <p className="text-base font-medium mb-4">{q.question}</p>

              <div className="space-y-2">
                {q.options.map((option, optIndex) => {
                  const isUserAnswer = userAnswer?.selectedAnswer === optIndex;
                  const isCorrectOption = optIndex === q.correctAnswerIndex;

                  return (
                    <div
                      key={optIndex}
                      className={`p-3 rounded-xl transition-all ${
                        isCorrectOption
                          ? "bg-success/20 border-2 border-success"
                          : isUserAnswer
                          ? "bg-destructive/20 border-2 border-destructive"
                          : "bg-card/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{option}</span>
                        {isCorrectOption && (
                          <span className="ml-auto text-success text-sm font-medium">
                            ✓ Correct Answer
                          </span>
                        )}
                        {isUserAnswer && !isCorrectOption && (
                          <span className="ml-auto text-destructive text-sm font-medium">
                            Your Answer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button
            onClick={() => navigate("/quiz-play")}
            size="lg"
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-14 font-semibold"
          >
            Play Again
          </Button>
          <Button
            onClick={() => navigate("/")}
            size="lg"
            variant="outline"
            className="flex-1 rounded-2xl h-14 font-semibold shadow-neumorphic hover:shadow-xl"
          >
            <Home className="mr-2 h-5 w-5" />
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizReview;
