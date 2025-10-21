import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import JoinQuiz from "./pages/JoinQuiz";
import CreateQuiz from "./pages/CreateQuiz";
import QuizPlay from "./pages/QuizPlay";
import LiveQuizPlay from "./pages/LiveQuizPlay";
import Results from "./pages/Results";
import QuizReview from "./pages/QuizReview";
import Leaderboard from "./pages/Leaderboard";
import HostDashboard from "./pages/HostDashboard";
import WaitingScreen from "./pages/WaitingScreen";
import ParticipantHistory from "./pages/ParticipantHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/join" element={<JoinQuiz />} />
          <Route path="/create" element={<CreateQuiz />} />
          <Route path="/quiz-play" element={<QuizPlay />} />
          <Route path="/live-quiz" element={<LiveQuizPlay />} />
          <Route path="/results" element={<Results />} />
          <Route path="/quiz-review" element={<QuizReview />} />
          <Route path="/leaderboard/:sessionId?" element={<Leaderboard />} />
          <Route path="/host-dashboard/:sessionId" element={<HostDashboard />} />
          <Route path="/waiting" element={<WaitingScreen />} />
          <Route path="/participant-history" element={<ParticipantHistory />} />
          <Route path="/quiz-review/:sessionId" element={<QuizReview />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
