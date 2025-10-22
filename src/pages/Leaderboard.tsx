import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Trophy, Medal, ArrowLeft, Download, Power, Wifi } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

interface Player {
  participantId: string;
  name: string;
  totalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  accuracy: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string>('active');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const currentSessionId = sessionId || localStorage.getItem("sessionId");
    if (!currentSessionId) {
      navigate("/join");
      return;
    }
    fetchLeaderboard(currentSessionId, true);
    
    // Poll for updates every 500ms for real-time responsiveness
    const interval = setInterval(() => {
      fetchLeaderboard(currentSessionId, false);
    }, 500);

    return () => clearInterval(interval);
  }, [navigate, sessionId]);

  const fetchLeaderboard = async (currentSessionId: string, isInitial = false) => {
    try {
      console.log("Fetching leaderboard for session:", currentSessionId);
      const response = await api.get(`/sessions/${currentSessionId}/leaderboard`);
      console.log("Leaderboard response:", response);
      
      if (response.leaderboard) {
        console.log("Updated leaderboard with", response.leaderboard.length, "players");
        console.log("Leaderboard data:", response.leaderboard);
        setPlayers(response.leaderboard);
        setLastUpdate(new Date());
      } else {
        console.log("No leaderboard data received");
        setPlayers([]);
      }
      
      const sess = await api.get(`/sessions/${currentSessionId}/status`);
      console.log("Session status response:", sess);
      setSessionStatus(sess?.status || 'active');
      console.log("Set session status to:", sess?.status || 'active');
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      if (isInitial) {
        toast.error(error.message || "Failed to load leaderboard");
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const downloadResults = async () => {
    const currentSessionId = sessionId || localStorage.getItem("sessionId");
    if (!currentSessionId) return;
    try {
      const resp = await fetch(`/api/sessions/${currentSessionId}/results/download`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` 
        }
      });
      if (!resp.ok) throw new Error('Server download failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${currentSessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Results downloaded');
    } catch (e) {
      console.log("Server CSV download failed, using fallback with players data:", players);
      // Fallback to client-side CSV
      const csvContent = [
        'Rank,Name,Score,Accuracy,Correct Answers,Total Answers',
        ...players.map((player, index) =>
          `${index + 1},${player.name},${player.totalScore},${player.accuracy}%,${player.correctAnswers},${player.totalAnswers}`
        )
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${currentSessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Results downloaded (fallback)');
    }
  };

  const endQuiz = async () => {
    console.log("=== END QUIZ FUNCTION CALLED ===");
    const currentSessionId = sessionId || localStorage.getItem("sessionId");
    console.log("Ending quiz for session:", currentSessionId);
    console.log("Current session status:", sessionStatus);
    console.log("sessionId from params:", sessionId);
    console.log("sessionId from localStorage:", localStorage.getItem("sessionId"));
    
    if (!currentSessionId) {
      console.error("No session ID found!");
      toast.error("No session ID found");
      return;
    }
    
    try {
      console.log("Calling API to end session...");
      const response = await api.post(`/sessions/${currentSessionId}/end`);
      console.log("End session response:", response);
      toast.success("Quiz ended successfully for all participants");
      fetchLeaderboard(currentSessionId, true);
    } catch (e: any) {
      console.error("Error ending quiz:", e);
      toast.error(e.message || "Failed to end quiz");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary p-4">
      <div className="max-w-4xl mx-auto animate-scale-in">
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
            <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              Leaderboard
              <Wifi className="w-6 h-6 text-green-500 animate-pulse" />
            </h1>
            <p className="text-muted-foreground">
              Live updates - See how you rank against other participants
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No results yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Participants need to complete the quiz first
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Debug: Session ID: {sessionId || localStorage.getItem("sessionId")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {players.map((player, index) => (
                  <div
                    key={player.participantId}
                    className={`p-6 rounded-2xl transition-all duration-300 ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/30"
                        : index === 1
                        ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-2 border-gray-400/30"
                        : index === 2
                        ? "bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-2 border-amber-600/30"
                        : "bg-accent/20 border border-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(index)}
                        </div>
            <div>
                          <h3 className="text-xl font-bold">{player.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {player.correctAnswers}/{player.totalAnswers} correct answers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {player.totalScore}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {player.accuracy}% accuracy
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Session ID: {sessionId || localStorage.getItem("sessionId") || "Not found"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const currentSessionId = sessionId || localStorage.getItem("sessionId");
                  if (currentSessionId) {
                    fetchLeaderboard(currentSessionId, true);
                  }
                }}
                variant="outline"
                className="rounded-2xl px-6 py-2"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={downloadResults}
                variant="outline"
                className="rounded-2xl px-6 py-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Results
              </Button>
              <Button
                onClick={async () => {
                  console.log("🔥 END QUIZ BUTTON CLICKED! 🔥");
                  alert("End Quiz button clicked! Check console for details.");
                  
                  const currentSessionId = sessionId || localStorage.getItem("sessionId");
                  console.log("Session ID:", currentSessionId);
                  
                  if (!currentSessionId) {
                    alert("No session ID found!");
                    return;
                  }
                  
                  try {
                    console.log("Making API call to end session...");
                    const response = await fetch(`/api/sessions/${currentSessionId}/end`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    const data = await response.json();
                    console.log("API Response:", response.status, data);
                    
                    if (response.ok) {
                      alert("✅ Quiz ended successfully!");
                      toast.success("Quiz ended successfully for all participants");
                      // Refresh the page to show updated data
                      window.location.reload();
                    } else {
                      alert(`❌ Error: ${data.message || 'Failed to end quiz'}`);
                      toast.error(data.message || "Failed to end quiz");
                    }
                  } catch (error) {
                    console.error("Error:", error);
                    alert(`❌ Network Error: ${error.message}`);
                    toast.error("Network error occurred");
                  }
                }}
                disabled={false}
                variant="destructive"
                className="rounded-2xl px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold"
                title="Click to end the quiz for all participants"
              >
                🔥 END QUIZ NOW 🔥
              </Button>
            </div>
          </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;