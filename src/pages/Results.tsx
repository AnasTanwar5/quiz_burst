import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy, Home, RotateCcw, Star } from "lucide-react";

const Results = () => {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  useEffect(() => {
    const savedScore = localStorage.getItem("quizScore");
    const savedTotal = localStorage.getItem("totalQuestions");
    const savedAnswers = localStorage.getItem("quizAnswers");
    const savedQuestions = localStorage.getItem("quizQuestions");
    
    console.log("Results page loaded - localStorage data:");
    console.log("quizScore:", savedScore);
    console.log("totalQuestions:", savedTotal);
    console.log("quizAnswers:", savedAnswers);
    console.log("quizQuestions:", savedQuestions);
    
    if (savedScore && savedTotal) {
      console.log(`Results - Saved Score: ${savedScore}, Total Questions: ${savedTotal}`);
      setScore(parseInt(savedScore));
      setTotalQuestions(parseInt(savedTotal));
      
      // Calculate correct answers from actual answers and questions
      if (savedAnswers && savedQuestions) {
        try {
          const answers = JSON.parse(savedAnswers);
          const questions = JSON.parse(savedQuestions);
          
          console.log("Parsed answers:", answers);
          console.log("Parsed questions:", questions);
          
          let correctCount = 0;
          // Only count unique questions to avoid duplicates
          const uniqueQuestions = [...new Set(answers.map((a: any) => a.questionId))];
          console.log("Unique questions:", uniqueQuestions.length);
          
          uniqueQuestions.forEach((questionId: string) => {
            const answer = answers.find((a: any) => a.questionId === questionId);
            const question = questions.find((q: any) => q.id === questionId);
            
            if (question && answer && answer.selectedAnswer === question.correctAnswerIndex) {
              correctCount++;
            }
          });
          
          console.log(`Results - Correct answers calculated: ${correctCount} out of ${uniqueQuestions.length}`);
          setCorrectAnswers(correctCount);
        } catch (error) {
          console.error("Error parsing saved data:", error);
          // Fallback to score-based estimation
          setCorrectAnswers(Math.floor(parseInt(savedScore) / 70));
        }
      } else {
        // Fallback to score-based estimation
        setCorrectAnswers(Math.floor(parseInt(savedScore) / 70));
      }
    }
  }, []);

  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  
  const getBadge = () => {
    if (percentage >= 80) return { text: "Quiz Master! 🏆", color: "text-gold" };
    if (percentage >= 60) return { text: "Great Job! ⭐", color: "text-success" };
    if (percentage >= 40) return { text: "Good Effort! 👍", color: "text-primary" };
    return { text: "Keep Practicing! 💪", color: "text-warning" };
  };

  const badge = getBadge();

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-2xl w-full animate-scale-in">
        <Card className="p-8 md:p-12 shadow-neumorphic gradient-card border-0 text-center">
          {/* Celebration Icon */}
          <div className="mb-6">
            <Trophy className="w-24 h-24 mx-auto text-gold animate-glow" />
          </div>

          {/* Badge */}
          <h1 className={`text-4xl md:text-5xl font-bold mb-8 ${badge.color}`}>
            {badge.text}
          </h1>

          {/* Score Display */}
          <div className="mb-8">
            <div className="text-6xl md:text-8xl font-bold text-primary mb-2">
              {score}
            </div>
            <p className="text-xl text-muted-foreground">Total Points</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-2xl font-bold text-success">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 bg-card/50 rounded-2xl shadow-neumorphic-inset">
              <div className="text-2xl font-bold text-destructive">
                {totalQuestions - correctAnswers}
              </div>
              <div className="text-sm text-muted-foreground">Wrong</div>
            </div>
          </div>

          {/* Percentage Ring */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="hsl(var(--success))"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(percentage / 100) * 351.68} 351.68`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold">{Math.round(percentage)}%</span>
                <span className="text-xs text-muted-foreground">Accuracy</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate("/quiz-review")}
              size="lg"
              variant="outline"
              className="flex-1 rounded-2xl h-14 font-semibold shadow-neumorphic hover:shadow-xl border-primary text-primary"
            >
              <Star className="mr-2 h-5 w-5" />
              Review Your Quiz
            </Button>
            {/* Removed Play Again per product requirement */}
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

          {/* Motivational Message */}
          <div className="mt-8 p-4 bg-accent/20 rounded-2xl">
            <p className="text-sm text-muted-foreground">
              {percentage >= 80
                ? "🌟 Absolutely brilliant! You're a true quiz champion!"
                : percentage >= 60
                ? "✨ Well done! You have a strong knowledge base!"
                : percentage >= 40
                ? "💡 Good work! Keep learning and you'll improve even more!"
                : "🚀 Every quiz is a learning opportunity. Try again!"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Results;
