import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Users, Quote } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. - Aristotle",
  "The way to get started is to quit talking and begin doing. - Walt Disney",
  "Don't be afraid to give up the good to go for the great. - John D. Rockefeller",
  "Innovation distinguishes between a leader and a follower. - Steve Jobs",
  "Life is what happens to you while you're busy making other plans. - John Lennon",
  "The only impossible journey is the one you never begin. - Tony Robbins",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "Your limitation—it's only your imagination.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
];

const WaitingScreen = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      navigate("/join");
      return;
    }

    fetchSessionData();
    const interval = setInterval(fetchSessionData, 2000); // Poll every 2 seconds
    
    // Rotate quotes every 5 seconds
    const quoteInterval = setInterval(() => {
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(quoteInterval);
    };
  }, [navigate]);

  // Clear session data if session is ended
  useEffect(() => {
    if (session?.status === 'ended') {
      localStorage.removeItem("sessionId");
      localStorage.removeItem("participantId");
      navigate("/join");
    }
  }, [session, navigate]);

  const fetchSessionData = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) return;

      console.log("Fetching session data for:", sessionId); // Debug log
      const sessionRes = await api.get(`/sessions/${sessionId}`);
      console.log("Session response:", sessionRes); // Debug log
      setSession(sessionRes.session);

      if (sessionRes.session?.status === 'active') {
        console.log("Session is active, navigating to live-quiz"); // Debug log
        navigate("/live-quiz");
        return;
      }

      // Get participant count
      try {
        const participantsRes = await api.get(`/sessions/${sessionId}/participants/public`);
        setParticipantCount(participantsRes.participants?.length || 0);
      } catch (e) {
        console.log("Could not fetch participant count:", e); // Debug log
        // Ignore participant count errors for non-hosts
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      toast.error("Failed to check session status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-2xl w-full animate-scale-in">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/join")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Join Quiz
        </Button>

        <Card className="p-8 shadow-neumorphic gradient-card border-0 text-center">
          <div className="mb-8">
            <Clock className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold mb-2">Waiting for Host</h1>
            <p className="text-muted-foreground">
              The quiz will begin when the host starts it
            </p>
          </div>

          <div className="mb-8 p-6 rounded-2xl bg-accent/20">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Participants Joined</p>
            <p className="text-3xl font-bold">{participantCount}</p>
          </div>

          <div className="mb-8 p-6 rounded-2xl bg-primary/10 border border-primary/20">
            <Quote className="w-8 h-8 text-primary mx-auto mb-4" />
            <blockquote className="text-lg italic text-foreground">
              "{currentQuote}"
            </blockquote>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Stay tuned! The quiz will start automatically when the host begins it.</p>
            <p className="mt-2">You'll be redirected to the quiz page.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WaitingScreen;
