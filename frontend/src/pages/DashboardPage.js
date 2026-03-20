import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Banknote, TrendingUp, TrendingDown, Container, ArrowUpRight, Clock, Database } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ label, value, icon: Icon, color, prefix = "$", testId }) => (
  <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5 card-hover" data-testid={testId}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
    </div>
    <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
      {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
    </div>
  </div>
);

const HeatmapCell = ({ item }) => {
  const statusStyles = {
    safe: "bg-emerald-950 border-emerald-900 text-emerald-400",
    warning: "bg-yellow-950 border-yellow-900 text-yellow-400",
    danger: "bg-red-950 border-red-900 text-red-400",
  };
  const statusLabels = { safe: "Safe", warning: "Warning", danger: "Urgent" };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`rounded-md border p-3 cursor-pointer transition-transform hover:scale-[1.02] ${statusStyles[item.status]} ${item.status === 'danger' ? 'heatmap-danger' : ''}`}
          data-testid={`heatmap-cell-${item.trade_id}`}
        >
          <div className="text-xs font-mono font-semibold truncate">{item.container_name}</div>
          <div className="text-[10px] opacity-70 truncate mt-0.5">{item.customer_name}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-mono font-bold">${item.amount.toLocaleString()}</span>
            <span className="text-[10px]">{item.days_left < 0 ? `${Math.abs(item.days_left)}d late` : `${item.days_left}d`}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-[#121212] border-[#27272A] text-[#FAFAFA] max-w-xs">
        <div className="text-xs space-y-1">
          <p className="font-semibold">{item.container_name}</p>
          <p>Customer: {item.customer_name}</p>
          <p>Amount: ${item.amount.toLocaleString()}</p>
          <p>Due: {item.due_date ? format(parseISO(item.due_date), 'MMM dd, yyyy') : 'N/A'}</p>
          <p>Status: <Badge variant={item.status === 'safe' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'} className="text-[10px] h-4">{statusLabels[item.status]}</Badge></p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      await axios.post(`${API}/notifications/generate`);
      const [sumRes, heatRes] = await Promise.all([
        axios.get(`${API}/dashboard/summary`),
        axios.get(`${API}/dashboard/heatmap`),
      ]);
      setSummary(sumRes.data);
      setHeatmap(heatRes.data);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSeedDemo = async () => {
    try {
      await axios.post(`${API}/seed-demo`);
      toast.success("Demo data loaded!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load demo data");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="text-muted-foreground text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const isEmpty = summary?.total_trades === 0;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your trades, commissions, and collections</p>
        </div>
        {isEmpty && (
          <Button onClick={handleSeedDemo} variant="outline" className="gap-2 border-[#27272A]" data-testid="seed-demo-btn">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            Load Demo Data
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commission" value={summary?.total_commission || 0} icon={TrendingUp} color="bg-emerald-950 text-emerald-400" testId="stat-total-commission" />
        <StatCard label="Cash to Collect" value={summary?.total_cash_to_collect || 0} icon={Banknote} color="bg-blue-950 text-blue-400" testId="stat-cash-to-collect" />
        <StatCard label="Supplier Due" value={summary?.total_supplier_due || 0} icon={TrendingDown} color="bg-red-950 text-red-400" testId="stat-supplier-due" />
        <StatCard label="Active Trades" value={summary?.total_trades || 0} icon={Container} color="bg-[#27272A] text-[#A1A1AA]" prefix="" testId="stat-active-trades" />
      </div>

      {/* Heatmap + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Collection Heatmap */}
        <div className="lg:col-span-2 rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="collection-heatmap">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-barlow text-lg font-semibold tracking-tight">Collection Heatmap</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Customer payment urgency at a glance</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[10px] text-muted-foreground">Safe</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-yellow-500" /><span className="text-[10px] text-muted-foreground">Warning</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span className="text-[10px] text-muted-foreground">Urgent</span></div>
            </div>
          </div>
          {heatmap.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No pending collections</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {heatmap.map((item) => <HeatmapCell key={item.trade_id} item={item} />)}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="quick-stats">
          <h2 className="font-barlow text-lg font-semibold tracking-tight mb-4">Quick Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-muted-foreground">Pending Collections</span>
              <span className="font-mono text-sm font-semibold">{summary?.pending_collections || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-muted-foreground">Pending Payments</span>
              <span className="font-mono text-sm font-semibold">{summary?.pending_payments || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#27272A]">
              <span className="text-sm text-muted-foreground">Urgent Collections</span>
              <span className="font-mono text-sm font-semibold text-red-400">{heatmap.filter(h => h.status === 'danger').length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Net Position</span>
              <span className={`font-mono text-sm font-semibold ${(summary?.total_cash_to_collect - summary?.total_supplier_due) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${((summary?.total_cash_to_collect || 0) - (summary?.total_supplier_due || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Upcoming dues */}
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Upcoming Dues</h3>
            {heatmap.slice(0, 3).map((item) => (
              <div key={item.trade_id} className="flex items-center gap-3 py-2 border-b border-[#27272A] last:border-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.container_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.customer_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-xs font-semibold">${item.amount.toLocaleString()}</p>
                  <p className={`text-[10px] ${item.status === 'danger' ? 'text-red-400' : item.status === 'warning' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {item.days_left < 0 ? `${Math.abs(item.days_left)}d overdue` : `${item.days_left}d left`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
