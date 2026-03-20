import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Container, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.name, form.email, form.password);
        toast.success("Account created successfully");
      } else {
        await login(form.email, form.password);
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#09090B]" data-testid="login-page">
      {/* Left: Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1771756743992-bc772a4f8d7e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxkYXJrJTIwY29udGFpbmVyJTIwc2hpcCUyMHBvcnQlMjBuaWdodHxlbnwwfHx8fDE3NzQwMDQxODV8MA&ixlib=rb-4.1.0&q=85"
          alt="Container ship at night"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-12 left-12 right-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Container className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-barlow text-2xl font-bold text-white tracking-tight">
              THE INVISIBLE AGENT
            </span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed max-w-md">
            Track your back-to-back international trades, manage cash-split commissions, 
            and monitor payment collections — all in one secure dashboard.
          </p>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-[#121212] border border-[#27272A] flex items-center justify-center">
              <Container className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-barlow text-xl font-bold tracking-tight">
              THE INVISIBLE AGENT
            </span>
          </div>

          <h1 className="font-barlow text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            {isRegister ? "Set up your secure trade tracking dashboard" : "Sign in to your trade dashboard"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="name"
                    data-testid="register-name-input"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-10 bg-[#121212] border-[#27272A] h-11 text-sm"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="email"
                  type="email"
                  data-testid="login-email-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-10 bg-[#121212] border-[#27272A] h-11 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="login-password-input"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-10 pr-10 bg-[#121212] border-[#27272A] h-11 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="toggle-password-btn"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full h-11 bg-white text-black hover:bg-white/90 font-semibold"
            >
              {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
              data-testid="toggle-auth-mode-btn"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
