import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Download, TrendingUp, Container as ContainerIcon, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#2563EB', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#10B981', '#F97316', '#06B6D4'];
const MONTH_LABELS = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };

function FYSelector({ fy, setFy }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  return (
    <Select value={String(fy)} onValueChange={v => setFy(parseInt(v))}>
      <SelectTrigger className="w-44 bg-[#121212] border-[#27272A]" data-testid="fy-selector-reports">
        <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#121212] border-[#27272A]">
        {years.map(y => <SelectItem key={y} value={String(y)}>FY {y}-{y + 1}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const [fy, setFy] = useState(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/commission?fy=${fy}`);
      setData(res.data);
    } catch { toast.error("Failed to load report"); }
    finally { setLoading(false); }
  }, [fy]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = () => {
    window.open(`${API}/reports/commission/export?fy=${fy}`, '_blank');
  };

  if (loading) return <div className="text-muted-foreground text-sm text-center py-12">Loading report...</div>;
  if (!data) return <div className="text-muted-foreground text-sm text-center py-12">No report data available.</div>;

  const monthlyChart = data.monthly.map(m => ({
    ...m,
    label: MONTH_LABELS[m.month.split('-')[1]] || m.month,
  }));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold tracking-tight">Commission Report</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.fy_label} - Monthly breakdown & analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <FYSelector fy={fy} setFy={setFy} />
          <Button onClick={handleExport} variant="outline" className="gap-2 border-[#27272A]" data-testid="export-csv-btn">
            <Download className="h-4 w-4" strokeWidth={1.5} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="report-total-commission">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Commission</span>
          </div>
          <p className="font-mono text-2xl font-bold text-emerald-400">${data.total_commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="report-total-trades">
          <div className="flex items-center gap-2 mb-2">
            <ContainerIcon className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Trades</span>
          </div>
          <p className="font-mono text-2xl font-bold">{data.total_trades}</p>
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="report-total-cbm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-yellow-400" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Volume</span>
          </div>
          <p className="font-mono text-2xl font-bold">{data.total_cbm.toLocaleString()} CBM</p>
        </div>
      </div>

      {/* Monthly Commission Chart */}
      <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="monthly-chart">
        <h2 className="font-barlow text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Monthly Commission</h2>
        {monthlyChart.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No monthly data for this financial year</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="label" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={{ stroke: '#27272A' }} />
                <YAxis tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#27272A' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <ReTooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px', color: '#FAFAFA', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  formatter={(value, name) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name === 'commission' ? 'Commission' : name]} />
                <Bar dataKey="commission" fill="#22C55E" radius={[4, 4, 0, 0]} name="Commission" />
                <Bar dataKey="cash_collected" fill="#2563EB" radius={[4, 4, 0, 0]} name="Cash Collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By Supplier & Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="report-by-supplier">
          <h2 className="font-barlow text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Commission by Supplier</h2>
          {data.by_supplier.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No data</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.by_supplier} dataKey="commission" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                      {data.by_supplier.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <ReTooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px', color: '#FAFAFA', fontSize: 12 }}
                      formatter={v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {data.by_supplier.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs py-1.5 border-b border-[#27272A] last:border-0">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span>{s.name}</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{s.trades} trades</span>
                      <span className="font-mono font-semibold text-emerald-400">${s.commission.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5" data-testid="report-by-customer">
          <h2 className="font-barlow text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Commission by Customer</h2>
          {data.by_customer.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No data</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.by_customer} dataKey="commission" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                      {data.by_customer.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <ReTooltip contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px', color: '#FAFAFA', fontSize: 12 }}
                      formatter={v => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {data.by_customer.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs py-1.5 border-b border-[#27272A] last:border-0">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span>{c.name}</span></div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{c.trades} trades</span>
                      <span className="font-mono font-semibold text-emerald-400">${c.commission.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
