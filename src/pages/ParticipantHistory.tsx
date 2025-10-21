import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Clock, Target, Eye } from "lucide-react";
import { api } from "@/integrations/mongodb";

interface QuizSession {
  _id: string;
  quizId: string;
  code: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  quiz: {
    title: string;
    description: string;
    category: string;
  };
  participant: {
    name: string;
    joinedAt: string;
  };
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

const ParticipantHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipantHistory();
  }, []);

  const fetchParticipantHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/auth');
        return;
      }

      // Get user's quiz sessions
      const response = await api.get('/participant/history');
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Error fetching participant history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success';
      case 'active':
        return 'text-primary';
      case 'waiting':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'In Progress';
      case 'waiting':
        return 'Waiting';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your quiz history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Quiz History</h1>
            <p className="text-muted-foreground">View all quizzes you've participated in</p>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="p-8 text-center shadow-neumorphic gradient-card border-0">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Quiz History</h3>
            <p className="text-muted-foreground mb-6">
              You haven't participated in any quizzes yet.
            </p>
            <Button onClick={() => navigate("/join")} className="rounded-2xl">
              Join a Quiz
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card
                key={session._id}
                className="p-6 shadow-neumorphic gradient-card border-0 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{session.quiz.title}</h3>
                    <p className="text-muted-foreground mb-2">{session.quiz.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {session.quiz.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(session.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getStatusColor(session.status)}`}>
                      {getStatusText(session.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Code: {session.code}
                    </div>
                  </div>
                </div>

                {session.status === 'completed' && (
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-card/50 rounded-xl">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{session.score}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{session.correctAnswers}/{session.totalQuestions}</div>
                      <div className="text-xs text-muted-foreground">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{session.accuracy}%</div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {session.status === 'completed' && (
                    <Button
                      onClick={() => navigate(`/quiz-review/${session._id}`)}
                      className="flex-1 rounded-2xl"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review Answers
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantHistory;
