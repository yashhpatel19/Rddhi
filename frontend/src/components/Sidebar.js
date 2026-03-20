import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutGrid, Container, LineChart, LogOut, Settings, FileBarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { path: "/trades", label: "Trades", icon: Container },
  { path: "/analytics", label: "Analytics", icon: LineChart },
  { path: "/reports", label: "Reports", icon: FileBarChart },
];

export default function Sidebar({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-64 h-full bg-[#09090B] border-r border-[#27272A] flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#121212] border border-[#27272A] flex items-center justify-center">
          <Container className="h-4 w-4 text-white" strokeWidth={1.5} />
        </div>
        <div>
          <span className="font-barlow text-sm font-bold tracking-tight block leading-tight">THE INVISIBLE</span>
          <span className="font-barlow text-[10px] font-medium tracking-widest uppercase text-muted-foreground">AGENT</span>
        </div>
      </div>

      <Separator className="bg-[#27272A]" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 py-2 font-medium">Navigation</p>
        {navItems.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => handleNav(path)}
            data-testid={`nav-${label.toLowerCase()}`}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              location.pathname === path
                ? "bg-[#27272A] text-white font-medium"
                : "text-muted-foreground hover:text-white hover:bg-[#121212]"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 space-y-1">
        <Separator className="bg-[#27272A] mb-2" />
        <div className="px-3 py-2">
          <p className="text-xs font-medium truncate">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
