import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Users, Trophy, Zap, User } from "lucide-react";
import { api } from "@/integrations/mongodb";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
    
    if (token) {
      // Decode JWT token to get role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'user');
      } catch (e) {
        setUserRole('user');
      }
    }
  }, []);

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <Button
        variant="ghost"
        className="absolute top-4 right-4"
        onClick={() => navigate(isLoggedIn ? "/profile" : "/auth")}
      >
        <User className="mr-2 h-4 w-4" />
        {isLoggedIn ? "Profile" : "Login"}
      </Button>
      
      <div className="max-w-4xl w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-primary animate-glow" />
            QuizBurst
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 font-medium">
            Engage. Compete. Learn Smarter.
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card
            className={`p-8 shadow-neumorphic transition-all duration-300 gradient-card border-0 ${
              userRole === 'admin' 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:shadow-xl cursor-pointer hover:scale-105'
            }`}
            onClick={() => {
              if (userRole === 'admin') {
                alert('You are a host! You cannot join quizzes. Please create a quiz instead.');
                return;
              }
              navigate("/join");
            }}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Join Quiz</h2>
              <p className="text-muted-foreground mb-4">
                Enter a quiz code and compete with others
              </p>
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl">
                Join Now
              </Button>
            </div>
          </Card>

          <Card
            className={`p-8 shadow-neumorphic transition-all duration-300 gradient-card border-0 ${
              userRole === 'user' 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:shadow-xl cursor-pointer hover:scale-105'
            }`}
            onClick={() => {
              if (userRole === 'user') {
                alert('You are a participant! You cannot create quizzes. Please join a quiz instead.');
                return;
              }
              navigate("/create");
            }}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/60 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Create Quiz</h2>
              <p className="text-muted-foreground mb-4">
                Design engaging quizzes for your audience
              </p>
              <Button size="lg" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-2xl">
                Create Now
              </Button>
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="p-8 shadow-neumorphic gradient-card border-0 animate-slide-up">
          <h3 className="text-2xl font-semibold text-center mb-8">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-semibold mb-2">Create Quiz</h4>
              <p className="text-sm text-muted-foreground">
                Add questions and set up your quiz in minutes
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/60 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-secondary-foreground">2</span>
              </div>
              <h4 className="font-semibold mb-2">Share Code</h4>
              <p className="text-sm text-muted-foreground">
                Get a unique code and share with participants
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/60 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-accent-foreground" />
              </div>
              <h4 className="font-semibold mb-2">Join & Compete</h4>
              <p className="text-sm text-muted-foreground">
                Players compete in real-time on the leaderboard
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
