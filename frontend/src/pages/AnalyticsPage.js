import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, ArrowDownRight, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function SupplierRankings() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/suppliers`).then(r => setData(r.data)).catch(() => toast.error("Failed to load suppliers")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>;
  if (data.length === 0) return <div className="text-muted-foreground text-sm py-12 text-center">No supplier data. Create trades to see rankings.</div>;

  return (
    <div className="space-y-3" data-testid="supplier-rankings">
      {data.map((s, i) => (
        <div key={s.name} className="rounded-lg border border-[#27272A] bg-[#121212] p-4 card-hover" data-testid={`supplier-card-${i}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${s.quality_score >= 80 ? 'bg-emerald-950 text-emerald-400' : s.quality_score >= 50 ? 'bg-yellow-950 text-yellow-400' : 'bg-red-950 text-red-400'}`}>
                #{i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.total_trades} trades | {s.total_volume} CBM</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className={`h-4 w-4 ${s.quality_score >= 80 ? 'text-emerald-400' : s.quality_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`} strokeWidth={1.5} />
                <span className="font-mono text-lg font-bold">{s.quality_score}</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quality Score</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Progress value={s.quality_score} className="h-1.5 flex-1" />
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="text-muted-foreground">Claims: <span className={`font-mono font-semibold ${s.claims > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{s.claims}</span></span>
              <span className="text-muted-foreground">Rate: <span className="font-mono font-semibold">{s.claim_rate}%</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerTrustScores() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/customers`).then(r => setData(r.data)).catch(() => toast.error("Failed to load customers")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>;
  if (data.length === 0) return <div className="text-muted-foreground text-sm py-12 text-center">No customer data. Create trades to see trust scores.</div>;

  const getTrustColor = (score) => score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const getTrustBg = (score) => score >= 70 ? 'bg-emerald-950 border-emerald-900' : score >= 40 ? 'bg-yellow-950 border-yellow-900' : 'bg-red-950 border-red-900';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="customer-trust-scores">
      {data.map((c, i) => (
        <div key={c.name} className="rounded-lg border border-[#27272A] bg-[#121212] p-5 card-hover" data-testid={`customer-card-${i}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.total_trades} trades</p>
            </div>
            <div className={`h-14 w-14 rounded-full border-2 flex items-center justify-center ${getTrustBg(c.trust_score)}`}>
              <span className={`font-mono text-lg font-bold ${getTrustColor(c.trust_score)}`}>{Math.round(c.trust_score)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-mono font-semibold text-emerald-400">{c.collected}/{c.total_trades}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delayed</span>
              <span className={`font-mono font-semibold ${c.delayed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{c.delayed}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-mono font-semibold">${c.total_amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Collected Amount</span>
              <span className="font-mono font-semibold text-emerald-400">${c.collected_amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
          {c.delayed > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Has {c.delayed} delayed payment{c.delayed > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CashFlowForecast() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics/cashflow`).then(r => setData(r.data)).catch(() => toast.error("Failed to load cash flow")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>;
  if (!data) return <div className="text-muted-foreground text-sm py-12 text-center">No data available.</div>;

  const chartData = [
    { name: 'Customer Inflow', value: data.total_inflow, fill: '#22C55E' },
    { name: 'Supplier Outflow', value: data.total_outflow, fill: '#EF4444' },
    { name: 'Net Position', value: Math.abs(data.net_position), fill: data.net_position >= 0 ? '#2563EB' : '#F43F5E' },
  ];

  return (
    <div className="space-y-6" data-testid="cashflow-forecast">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Expected Inflow</span>
          </div>
          <p className="font-mono text-2xl font-bold text-emerald-400" data-testid="cashflow-inflow">${data.total_inflow.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
          <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="h-4 w-4 text-red-400" strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Supplier Outflow</span>
          </div>
          <p className="font-mono text-2xl font-bold text-red-400" data-testid="cashflow-outflow">${data.total_outflow.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
          <p className="text-xs text-muted-foreground mt-1">Next 30 days</p>
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className={`h-4 w-4 ${data.net_position >= 0 ? 'text-blue-400' : 'text-rose-400'}`} strokeWidth={1.5} />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Net Position</span>
          </div>
          <p className={`font-mono text-2xl font-bold ${data.net_position >= 0 ? 'text-blue-400' : 'text-rose-400'}`} data-testid="cashflow-net">
            {data.net_position >= 0 ? '+' : '-'}${Math.abs(data.net_position).toLocaleString('en-US', {minimumFractionDigits: 2})}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Forecast balance</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
        <h3 className="font-barlow text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">30-Day Cash Flow Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: '#27272A' }} />
              <YAxis tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#27272A' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <ReTooltip
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #27272A', borderRadius: '8px', color: '#FAFAFA', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                formatter={(value) => [`$${value.toLocaleString('en-US', {minimumFractionDigits: 2})}`, '']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
          <h3 className="font-barlow text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Customer Collections
          </h3>
          {data.customer_collections.length === 0 ? (
            <p className="text-muted-foreground text-xs">No collections expected in next 30 days</p>
          ) : (
            <div className="space-y-2">
              {data.customer_collections.map(c => (
                <div key={c.trade_id} className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
                  <div>
                    <p className="text-xs font-medium">{c.container}</p>
                    <p className="text-[10px] text-muted-foreground">{c.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-emerald-400">${c.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{c.due_date ? format(parseISO(c.due_date), 'MMM dd') : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-[#27272A] bg-[#121212] p-5">
          <h3 className="font-barlow text-sm font-semibold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" strokeWidth={1.5} /> Supplier Payments
          </h3>
          {data.supplier_payments.length === 0 ? (
            <p className="text-muted-foreground text-xs">No supplier payments due in next 30 days</p>
          ) : (
            <div className="space-y-2">
              {data.supplier_payments.map(s => (
                <div key={s.trade_id} className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
                  <div>
                    <p className="text-xs font-medium">{s.container}</p>
                    <p className="text-[10px] text-muted-foreground">{s.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-red-400">${s.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{s.due_date ? format(parseISO(s.due_date), 'MMM dd') : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="font-barlow text-3xl md:text-4xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Supplier rankings, customer trust scores, and cash flow forecasts</p>
      </div>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="bg-[#121212] border border-[#27272A]">
          <TabsTrigger value="suppliers" data-testid="tab-suppliers" className="data-[state=active]:bg-[#27272A]">Suppliers</TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers" className="data-[state=active]:bg-[#27272A]">Customers</TabsTrigger>
          <TabsTrigger value="cashflow" data-testid="tab-cashflow" className="data-[state=active]:bg-[#27272A]">Cash Flow</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-4"><SupplierRankings /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomerTrustScores /></TabsContent>
        <TabsContent value="cashflow" className="mt-4"><CashFlowForecast /></TabsContent>
      </Tabs>
    </div>
  );
}
