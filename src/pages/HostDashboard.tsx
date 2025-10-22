import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Users, Play, Trophy, Clock, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

interface Participant {
  _id: string;
  name: string;
  joinedAt: string;
}

const HostDashboard = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quizCode, setQuizCode] = useState<string>("");

  useEffect(() => {
    if (sessionId) {
      // Get code from localStorage as fallback
      const storedCode = localStorage.getItem("quizCode");
      if (storedCode) {
        setQuizCode(storedCode);
      }
      
      fetchSessionData();
      const interval = setInterval(fetchSessionData, 1000); // Poll every 1 second for real-time updates
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const sessionRes = await api.get(`/sessions/${sessionId}`);
      console.log("Session data:", sessionRes); // Debug log
      setSession(sessionRes.session);
      
      // Try to fetch participants using public endpoint
      try {
        console.log("Fetching participants for session:", sessionId); // Debug log
        const participantsRes = await api.get(`/sessions/${sessionId}/participants/public`);
        console.log("Participants data:", participantsRes); // Debug log
        console.log("Participants array:", participantsRes.participants); // Debug log
        setParticipants(participantsRes.participants || []);
      } catch (participantsError) {
        console.error("Error fetching participants:", participantsError);
        console.error("Full error details:", participantsError); // More detailed error
        // If participants fetch fails, show empty array
        setParticipants([]);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    const codeToCopy = session?.code || quizCode;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      toast.success("Quiz code copied to clipboard!");
    }
  };

  const downloadResults = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sessionId}/results/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download results');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${session?.code || sessionId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Results downloaded successfully!");
    } catch (error) {
      console.error("Error downloading results:", error);
      toast.error("Failed to download results");
    }
  };

  const startQuiz = async () => {
    try {
      await api.post(`/sessions/${sessionId}/start`);
      toast.success("Quiz started! Participants can now begin.");
      navigate(`/leaderboard/${sessionId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to start quiz");
    }
  };

  const handleNextQuestion = async () => {
    try {
      await api.post(`/sessions/${sessionId}/next-question`);
      toast.success("Moved to next question!");
      // Refresh session data to get updated question index
      await loadSessionData();
    } catch (error: any) {
      toast.error(error.message || "Failed to move to next question");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary p-4">
      <div className="max-w-4xl mx-auto animate-scale-in">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/create")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Create Quiz
        </Button>

        <Card className="p-8 shadow-neumorphic gradient-card border-0 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Host Dashboard</h1>
            <p className="text-muted-foreground">Manage your quiz session</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 rounded-2xl bg-accent/20 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Participants</p>
              <p className="text-3xl font-bold">{participants.length}</p>
            </div>
            <div className="p-6 rounded-2xl bg-accent/20 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-lg font-bold capitalize">{session?.status || 'waiting'}</p>
            </div>
            <div className="p-6 rounded-2xl bg-accent/20 text-center">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Quiz Code</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold font-mono">{session?.code || quizCode || "Loading..."}</p>
                {(session?.code || quizCode) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyCode}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <Button
              onClick={startQuiz}
              disabled={session?.status === 'active' || participants.length === 0}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl px-8 py-3"
            >
              <Play className="mr-2 h-5 w-5" />
              {session?.status === 'active' ? 'Quiz Started' : 'Start Quiz'}
            </Button>
            
            {session?.status === 'active' && (
              <div>
                <Button
                  onClick={handleNextQuestion}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl px-8 py-3"
                >
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Next Question
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Click when all participants have answered
                </p>
              </div>
            )}
          </div>
          {participants.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Wait for participants to join before starting
            </p>
          )}
        </Card>

        <Card className="p-8 shadow-neumorphic gradient-card border-0">
          <h2 className="text-2xl font-bold mb-6 text-center">Participants</h2>
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No participants yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Share the quiz code: <span className="font-mono font-bold">{session?.code || quizCode}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                Waiting for participants to join...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((participant, index) => (
                <div
                  key={participant._id}
                  className="p-4 rounded-2xl bg-accent/20 border border-accent/30 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </Card>
      </div>
    </div>
  );
};

export default HostDashboard;
