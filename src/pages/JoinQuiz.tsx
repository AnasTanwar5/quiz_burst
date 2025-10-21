import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Hash } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

const JoinQuiz = () => {
  const navigate = useNavigate();
  const [quizCode, setQuizCode] = useState("");
  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Clear any old session data when component mounts
  useEffect(() => {
    localStorage.removeItem("sessionId");
    localStorage.removeItem("participantId");
  }, []);

  const handleJoin = async () => {
    if (!quizCode.trim() || !userName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsJoining(true);
    
    try {
      console.log("Attempting to join quiz with code:", quizCode); // Debug log
      const token = localStorage.getItem('authToken');
      console.log("Auth token present:", !!token); // Debug log
      const res = await api.post('/sessions/join', { code: quizCode.toUpperCase(), name: userName.trim(), token });
      console.log("Join response:", res); // Debug log
      
      localStorage.setItem('sessionId', res.sessionId);
      localStorage.setItem('participantId', res.participantId);
      localStorage.setItem('playerName', userName.trim());
      console.log("Stored in localStorage:", { sessionId: res.sessionId, participantId: res.participantId }); // Debug log
      toast.success("Successfully joined the quiz!");
      console.log("Navigating to waiting screen"); // Debug log
      navigate('/waiting');
    } catch (error: any) {
      console.error("Error joining quiz:", error);
      toast.error(error.message || "Failed to join quiz");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-scale-in">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8 shadow-neumorphic gradient-card border-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Join Quiz</h1>
            <p className="text-muted-foreground">
              Enter the quiz code and your name to get started
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="quizCode" className="text-base font-medium">
                Quiz Code
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="quizCode"
                  placeholder="Enter quiz code (e.g., QB-123456)"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  className="pl-10 h-12 text-lg font-semibold shadow-neumorphic-inset border-0 rounded-2xl"
                  maxLength={9}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName" className="text-base font-medium">
                Your Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="userName"
                  placeholder="Enter your nickname"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="pl-10 h-12 text-lg shadow-neumorphic-inset border-0 rounded-2xl"
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? "Joining..." : "Join Now"}
            </Button>
          </div>

          <div className="mt-8 p-4 bg-accent/20 rounded-2xl">
            <p className="text-sm text-center text-muted-foreground">
              💡 <strong>Tip:</strong> Get ready to answer quickly! Speed matters in scoring.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinQuiz;
