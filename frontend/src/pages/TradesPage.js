import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit2, ShieldAlert, CheckCircle, Banknote, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyForm = {
  container_name: "", cbm: "", supplier_name: "", customer_name: "",
  official_bill_rate: "", supplier_total_rate: "", customer_sale_rate: "",
  risk_premium: false, supplier_payment_due: null, customer_collection_date: null,
};

function TradeForm({ form, setForm, onSubmit, loading, isEdit }) {
  const calcs = useMemo(() => {
    const cbm = parseFloat(form.cbm) || 0;
    const bill = parseFloat(form.official_bill_rate) || 0;
    const sup = parseFloat(form.supplier_total_rate) || 0;
    const cust = parseFloat(form.customer_sale_rate) || 0;
    const cashToCollect = (cust - bill) * cbm;
    const supplierDue = (sup - bill) * cbm;
    const commission = (cust - sup) * cbm;
    const riskAmt = form.risk_premium ? commission * 0.1 : 0;
    return {
      cash_to_collect: cashToCollect,
      supplier_cash_due: supplierDue,
      my_commission: commission,
      risk_premium_amount: riskAmt,
      final_commission: commission + riskAmt,
    };
  }, [form]);

  const fmtMoney = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Container/Lot Name</Label>
          <Input data-testid="trade-container-name" value={form.container_name} onChange={e => setForm({...form, container_name: e.target.value})} placeholder="CNT-2025-001" className="bg-[#09090B] border-[#27272A] font-mono text-sm" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">CBM (Volume)</Label>
          <Input data-testid="trade-cbm" type="number" step="0.01" value={form.cbm} onChange={e => setForm({...form, cbm: e.target.value})} placeholder="45.00" className="bg-[#09090B] border-[#27272A] font-mono text-sm" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Supplier Name</Label>
          <Input data-testid="trade-supplier-name" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="Supplier Co." className="bg-[#09090B] border-[#27272A] text-sm" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Customer Name</Label>
          <Input data-testid="trade-customer-name" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} placeholder="Customer LLC" className="bg-[#09090B] border-[#27272A] text-sm" required />
        </div>
      </div>

      {/* Rate inputs - T-Account style */}
      <div className="border border-[#27272A] rounded-lg p-4 bg-[#09090B]">
        <h3 className="font-barlow text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Rate Configuration ($/CBM)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Official Bill Rate (LC/Invoice)</Label>
            <Input data-testid="trade-bill-rate" type="number" step="0.01" value={form.official_bill_rate} onChange={e => setForm({...form, official_bill_rate: e.target.value})} placeholder="550.00" className="bg-[#121212] border-b border-[#27272A] border-t-0 border-l-0 border-r-0 rounded-none font-mono text-sm h-10" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Supplier Total Rate</Label>
            <Input data-testid="trade-supplier-rate" type="number" step="0.01" value={form.supplier_total_rate} onChange={e => setForm({...form, supplier_total_rate: e.target.value})} placeholder="700.00" className="bg-[#121212] border-b border-[#27272A] border-t-0 border-l-0 border-r-0 rounded-none font-mono text-sm h-10" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Customer Sale Rate</Label>
            <Input data-testid="trade-sale-rate" type="number" step="0.01" value={form.customer_sale_rate} onChange={e => setForm({...form, customer_sale_rate: e.target.value})} placeholder="720.00" className="bg-[#121212] border-b border-[#27272A] border-t-0 border-l-0 border-r-0 rounded-none font-mono text-sm h-10" required />
          </div>
        </div>
      </div>

      {/* Risk Premium Toggle */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${form.risk_premium ? 'border-amber-800 bg-amber-950/30' : 'border-[#27272A] bg-[#09090B]'} transition-colors`}>
        <div className="flex items-center gap-3">
          <ShieldAlert className={`h-4 w-4 ${form.risk_premium ? 'text-amber-400' : 'text-muted-foreground'}`} strokeWidth={1.5} />
          <div>
            <Label className="text-sm font-medium">Risk Premium</Label>
            <p className="text-xs text-muted-foreground">Add 10% markup for new customers</p>
          </div>
        </div>
        <Switch data-testid="trade-risk-premium" checked={form.risk_premium} onCheckedChange={v => setForm({...form, risk_premium: v})} />
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Supplier Payment Due</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="trade-supplier-due-date" className="w-full justify-start bg-[#09090B] border-[#27272A] text-sm font-mono h-10">
                {form.supplier_payment_due ? format(typeof form.supplier_payment_due === 'string' ? parseISO(form.supplier_payment_due) : form.supplier_payment_due, 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#121212] border-[#27272A]" align="start">
              <Calendar mode="single" selected={form.supplier_payment_due ? (typeof form.supplier_payment_due === 'string' ? parseISO(form.supplier_payment_due) : form.supplier_payment_due) : undefined} onSelect={d => setForm({...form, supplier_payment_due: d ? d.toISOString() : null})} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Customer Collection Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="trade-customer-collection-date" className="w-full justify-start bg-[#09090B] border-[#27272A] text-sm font-mono h-10">
                {form.customer_collection_date ? format(typeof form.customer_collection_date === 'string' ? parseISO(form.customer_collection_date) : form.customer_collection_date, 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#121212] border-[#27272A]" align="start">
              <Calendar mode="single" selected={form.customer_collection_date ? (typeof form.customer_collection_date === 'string' ? parseISO(form.customer_collection_date) : form.customer_collection_date) : undefined} onSelect={d => setForm({...form, customer_collection_date: d ? d.toISOString() : null})} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Live Calculations */}
      <div className="border border-[#27272A] rounded-lg overflow-hidden">
        <div className="bg-[#09090B] px-4 py-2 border-b border-[#27272A]">
          <h3 className="font-barlow text-xs font-semibold uppercase tracking-wider text-muted-foreground">Triple-Ledger Calculation</h3>
        </div>
        <div className="p-4 space-y-2 bg-[#0D0D0F]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Cash to Collect</span>
            <span className="font-mono text-sm font-semibold text-blue-400" data-testid="calc-cash-to-collect">{fmtMoney(calcs.cash_to_collect)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Supplier Cash Due</span>
            <span className="font-mono text-sm font-semibold text-red-400" data-testid="calc-supplier-due">{fmtMoney(calcs.supplier_cash_due)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">My Commission</span>
            <span className="font-mono text-sm font-semibold text-emerald-400" data-testid="calc-my-commission">{fmtMoney(calcs.my_commission)}</span>
          </div>
          {form.risk_premium && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-400">Risk Premium (10%)</span>
              <span className="font-mono text-sm font-semibold text-amber-400" data-testid="calc-risk-premium">{fmtMoney(calcs.risk_premium_amount)}</span>
            </div>
          )}
          <div className="border-t border-[#27272A] pt-2 mt-2 flex justify-between items-center">
            <span className="text-sm font-semibold">Final Commission</span>
            <span className="font-mono text-lg font-bold text-emerald-400" data-testid="calc-final-commission">{fmtMoney(calcs.final_commission)}</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} data-testid="trade-submit-btn" className="w-full h-11 bg-white text-black hover:bg-white/90 font-semibold">
        {loading ? "Saving..." : isEdit ? "Update Trade" : "Create Trade"}
      </Button>
    </form>
  );
}

export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTrades = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/trades`);
      setTrades(res.data);
    } catch { toast.error("Failed to load trades"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        cbm: parseFloat(form.cbm),
        official_bill_rate: parseFloat(form.official_bill_rate),
        supplier_total_rate: parseFloat(form.supplier_total_rate),
        customer_sale_rate: parseFloat(form.customer_sale_rate),
      };
      if (editingTrade) {
        await axios.put(`${API}/trades/${editingTrade.id}`, payload);
        toast.success("Trade updated");
      } else {
        await axios.post(`${API}/trades`, payload);
        toast.success("Trade created");
      }
      setDialogOpen(false);
      setEditingTrade(null);
      setForm(emptyForm);
      fetchTrades();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save trade");
    } finally { setSaving(false); }
  };

  const handleEdit = (trade) => {
    setEditingTrade(trade);
    setForm({
      container_name: trade.container_name,
      cbm: String(trade.cbm),
      supplier_name: trade.supplier_name,
      customer_name: trade.customer_name,
      official_bill_rate: String(trade.official_bill_rate),
      supplier_total_rate: String(trade.supplier_total_rate),
      customer_sale_rate: String(trade.customer_sale_rate),
      risk_premium: trade.risk_premium,
      supplier_payment_due: trade.supplier_payment_due,
      customer_collection_date: trade.customer_collection_date,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/trades/${id}`);
      toast.success("Trade deleted");
      fetchTrades();
    } catch { toast.error("Failed to delete"); }
  };

  const handleToggleStatus = async (trade, field) => {
    try {
      await axios.put(`${API}/trades/${trade.id}`, { [field]: !trade[field] });
      toast.success("Status updated");
      fetchTrades();
    } catch { toast.error("Failed to update"); }
  };

  const handleClaimIncrement = async (trade) => {
    try {
      await axios.put(`${API}/trades/${trade.id}`, { claims: (trade.claims || 0) + 1 });
      toast.success("Claim recorded");
      fetchTrades();
    } catch { toast.error("Failed to record claim"); }
  };

  const filtered = trades.filter(t =>
    t.container_name.toLowerCase().includes(search.toLowerCase()) ||
    t.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="trades-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold tracking-tight">Trades</h1>
          <p className="text-muted-foreground text-sm mt-1">{trades.length} total trades</p>
        </div>
        <Button onClick={() => { setEditingTrade(null); setForm(emptyForm); setDialogOpen(true); }} data-testid="new-trade-btn" className="gap-2 bg-white text-black hover:bg-white/90 font-semibold">
          <Plus className="h-4 w-4" /> New Trade
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <Input data-testid="trade-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades..." className="pl-10 bg-[#121212] border-[#27272A] text-sm" />
      </div>

      {/* Trade Cards */}
      {loading ? (
        <div className="text-muted-foreground text-sm text-center py-12">Loading trades...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-[#27272A] rounded-lg bg-[#121212]">
          <p className="text-muted-foreground text-sm">No trades found. Create your first trade to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((trade) => (
            <div key={trade.id} className="rounded-lg border border-[#27272A] bg-[#121212] p-4 md:p-5 card-hover" data-testid={`trade-card-${trade.id}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{trade.container_name}</span>
                      <Badge variant={trade.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4">{trade.status}</Badge>
                      {trade.risk_premium && <Badge className="text-[10px] h-4 bg-amber-950 text-amber-400 border-amber-800">Risk+</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{trade.supplier_name}</span>
                      <span className="text-[#27272A]">|</span>
                      <span>{trade.customer_name}</span>
                      <span className="text-[#27272A]">|</span>
                      <span>{trade.cbm} CBM</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission</p>
                    <p className="font-mono text-sm font-semibold text-emerald-400">${trade.final_commission.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cash to Collect</p>
                    <p className="font-mono text-sm font-semibold text-blue-400">${trade.cash_to_collect.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleStatus(trade, 'supplier_paid')} className={`p-1.5 rounded transition-colors ${trade.supplier_paid ? 'text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`} title={trade.supplier_paid ? 'Supplier Paid' : 'Mark Supplier Paid'} data-testid={`toggle-supplier-paid-${trade.id}`}>
                      <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => handleToggleStatus(trade, 'customer_collected')} className={`p-1.5 rounded transition-colors ${trade.customer_collected ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'}`} title={trade.customer_collected ? 'Customer Collected' : 'Mark Collected'} data-testid={`toggle-customer-collected-${trade.id}`}>
                      <Banknote className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" data-testid={`trade-actions-${trade.id}`}>
                          <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#121212] border-[#27272A]">
                        <DropdownMenuItem onClick={() => handleEdit(trade)} data-testid={`edit-trade-${trade.id}`}><Edit2 className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClaimIncrement(trade)} data-testid={`claim-trade-${trade.id}`}><ShieldAlert className="h-3.5 w-3.5 mr-2" />Add Claim ({trade.claims})</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(trade.id)} className="text-red-400" data-testid={`delete-trade-${trade.id}`}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingTrade(null); setForm(emptyForm); }}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#121212] border-[#27272A]" data-testid="trade-dialog">
          <DialogHeader>
            <DialogTitle className="font-barlow text-xl font-bold tracking-tight">{editingTrade ? 'Edit Trade' : 'New Trade'}</DialogTitle>
          </DialogHeader>
          <TradeForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} isEdit={!!editingTrade} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
