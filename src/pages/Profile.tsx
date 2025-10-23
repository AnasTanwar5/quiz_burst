import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LogOut, Trophy, Target, Calendar, Trash2, Download, Power } from "lucide-react";
import { api } from "@/integrations/mongodb";
import { toast } from "sonner";

interface ProfileData {
  name: string | null;
  email: string | null;
  role: "admin" | "user" | null;
  quizzesCreated?: number;
  quizzesPlayed?: number;
  totalScore?: number;
  accuracy?: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userQuizzes, setUserQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile..."); // Debug log
      const userRes = await api.get("/auth/me");
      console.log("User response:", userRes); // Debug log
      
      if (!userRes.user) {
        console.log("No user found, redirecting to auth"); // Debug log
        setLoading(false);
        navigate("/auth");
        return;
      }

      const user = userRes.user;
      console.log("User data:", user); // Debug log

      // Try to fetch user's quizzes (only works for admins/creators)
      let quizzes = [];
      try {
        const quizzesRes = await api.get("/quizzes");
        quizzes = quizzesRes.quizzes || [];
        console.log("Quizzes fetched:", quizzes); // Debug log
      } catch (error) {
        // If user is not an admin, this will fail - that's okay
        console.log("User is not a quiz creator:", error); // Debug log
      }

      // Calculate stats
      const totalScore = 0; // Will be calculated from answers later
      const accuracy = 0; // Will be calculated from answers later

      const profileData = {
        name: user?.name || user?.email || "User",
        email: user?.email || null,
        role: quizzes.length > 0 ? "admin" : "user", // Determine role based on quizzes
        quizzesCreated: quizzes.length,
        quizzesPlayed: 0,
        totalScore,
        accuracy,
      };
      
      console.log("Setting profile data:", profileData); // Debug log
      setProfile(profileData);
      setUserQuizzes(quizzes);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      if (error.message === 'Invalid token' || error.message.includes('401')) {
        // Clear invalid token and redirect to login
        localStorage.removeItem("authToken");
        toast.error("Session expired. Please login again.");
        setLoading(false);
        navigate("/auth");
        return;
      }
      toast.error(error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("sessionId");
      localStorage.removeItem("participantId");
      localStorage.removeItem("playerName");
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone and will delete all related sessions and participant data.`)) {
      return;
    }

    try {
      await api.delete(`/quizzes/${quizId}`);
      toast.success('Quiz deleted successfully');
      fetchProfile(); // Refresh the quiz list
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast.error(error.message || 'Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Failed to load profile</p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
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
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
              {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <h1 className="text-3xl font-bold mb-2">{profile?.name || "User"}</h1>
            <p className="text-muted-foreground">{profile?.email}</p>
            <div className="mt-4">
              <span className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary font-medium">
                {profile?.role === "admin" ? "Quiz Creator" : "Participant"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {profile?.role === "admin" ? (
              <div className="p-6 rounded-2xl bg-accent/20">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Quizzes Created</h3>
                </div>
                <p className="text-3xl font-bold">{profile.quizzesCreated || 0}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-accent/20 text-center">
                  <Calendar className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Quizzes Played</p>
                  <p className="text-2xl font-bold">{profile?.quizzesPlayed || 0}</p>
                </div>
                <div className="p-6 rounded-2xl bg-accent/20 text-center">
                  <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                  <p className="text-2xl font-bold">{profile?.totalScore || 0}</p>
                </div>
                <div className="p-6 rounded-2xl bg-accent/20 text-center">
                  <Target className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                  <p className="text-2xl font-bold">{profile?.accuracy || 0}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Participant History Section - Only for Participants */}
          {profile?.role === "user" && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">My Quiz History</h2>
                <Button
                  onClick={() => navigate("/participant-history")}
                  className="rounded-2xl"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                View all the quizzes you've participated in and your performance.
              </p>
            </div>
          )}

          {/* Quiz History Section - Only for Quiz Creators */}
          {profile?.role === "admin" && userQuizzes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Quiz History</h2>
                <div className="text-sm text-muted-foreground">
                  💡 Download results from Host Dashboard
                </div>
              </div>
              <div className="space-y-4">
                {userQuizzes.map((quiz: any) => (
                  <div key={quiz._id} className="p-6 rounded-2xl bg-accent/20 border border-accent/30">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold">{quiz.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-3">{quiz.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Category: {quiz.category}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/create?quizId=${quiz._id}`)}
                          className="rounded-xl"
                        >
                          View/Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const latest = await api.get(`/quizzes/${quiz._id}/latest-session`);
                              const sid = latest?.session?._id;
                              if (!sid) {
                                toast.error('No session found for this quiz yet');
                                return;
                              }
                              const resp = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${sid}/results/download`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                              });
                              if (!resp.ok) throw new Error('Failed to download');
                              const blob = await resp.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `quiz-results-${sid}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              toast.success('Results downloaded');
                            } catch (e: any) {
                              toast.error(e.message || 'Download failed');
                            }
                          }}
                          className="rounded-xl"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const latest = await api.get(`/quizzes/${quiz._id}/latest-session`);
                              const sid = latest?.session?._id;
                              if (!sid) {
                                toast.error('No session found to end');
                                return;
                              }
                              await api.post(`/sessions/${sid}/end`);
                              toast.success('Quiz ended');
                            } catch (e: any) {
                              toast.error(e.message || 'Failed to end quiz');
                            }
                          }}
                          className="rounded-xl"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteQuiz(quiz._id, quiz.title)}
                          className="rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full rounded-2xl h-12 font-semibold"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;