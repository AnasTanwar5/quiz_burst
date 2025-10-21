import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/mongodb";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"admin" | "user">("user");

  useEffect(() => {
    // If token exists, treat as logged in
    const token = localStorage.getItem("authToken");
    if (token) {
      navigate("/profile");
    }
  }, [navigate]);

  const handleEmailAuth = async (isSignUp: boolean) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await api.post('/auth/signup', { email, password, role: userType });
        localStorage.setItem('authToken', res.token);
        localStorage.setItem('userType', res.user?.role || userType);
        toast.success("Account created! Welcome!");
        navigate(res.user?.role === 'admin' ? '/create' : '/join');
      } else {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('authToken', res.token);
        localStorage.setItem('userType', res.user?.role || 'user');
        toast.success("Welcome back!");
        navigate(res.user?.role === 'admin' ? '/create' : '/join');
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Google OAuth not implemented for MongoDB version
      toast.error("Google authentication not available. Please use email/password.");
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
      setLoading(false);
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
            <h1 className="text-3xl font-bold mb-2">Welcome to QuizBurst</h1>
            <p className="text-muted-foreground">Sign in to continue</p>
          </div>

          {/* User Type Selection */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">I am a:</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={userType === "user" ? "default" : "outline"}
                onClick={() => setUserType("user")}
                className="rounded-2xl"
              >
                Participant
              </Button>
              <Button
                variant={userType === "admin" ? "default" : "outline"}
                onClick={() => setUserType("admin")}
                className="rounded-2xl"
              >
                Quiz Creator
              </Button>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full mb-6 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-2xl h-12 font-medium shadow-neumorphic hover:shadow-xl transition-all"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Auth */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="shadow-neumorphic-inset border-0 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="shadow-neumorphic-inset border-0 rounded-2xl"
                  />
                </div>
                <Button
                  onClick={() => handleEmailAuth(false)}
                  disabled={loading || !email || !password}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-12 font-semibold"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="shadow-neumorphic-inset border-0 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="shadow-neumorphic-inset border-0 rounded-2xl"
                  />
                </div>
                <Button
                  onClick={() => handleEmailAuth(true)}
                  disabled={loading || !email || !password}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-12 font-semibold"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
