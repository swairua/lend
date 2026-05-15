import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productsApi, loansApi, formatKES } from "../types/api";
import { calculateAPR } from "../utils/aprCalculator";
import { Loader2, CheckCircle, ArrowLeft, ArrowRight, AlertCircle, CreditCard, Info } from "lucide-react";
import { useAlert } from "@/hooks/use-alert";

export default function ApplyLoan() {
  const navigate = useNavigate();
  const { showAlert, AlertComponent } = useAlert();
  const [step, setStep] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [estimateError, setEstimateError] = useState("");
  const [apr, setAPR] = useState<number | null>(null);
  const [form, setForm] = useState({
    amount: 0,
    term_months: 3,
    purpose: "",
    security_details: "",
    guarantor_details: "",
  });

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (selectedCategory) loadProducts(selectedCategory); }, [selectedCategory]);
  useEffect(() => { if (selectedProduct && form.amount > 0) calculateEstimate(); }, [selectedProduct, form.amount, form.term_months]);

  const loadCategories = async () => {
    setInitialLoading(true);
    try {
      const res = await productsApi.getCategories();
      const cats = (res.data || []).filter((c: any) => c.is_active !== false);
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(String(cats[0].id));
    } catch (err: any) {
      showAlert({ type: "error", message: "Failed to load loan categories: " + (err.message || "Please try again.") });
    } finally { setInitialLoading(false); }
  };

  const loadProducts = async (catId: string) => {
    try {
      const res = await productsApi.getProducts(parseInt(catId));
      const prods = (res.data || []).filter((p: any) => p.is_active !== false);
      setProducts(prods);
      if (prods.length > 0) {
        const p = prods[0];
        setSelectedProduct(p);
        setForm(f => ({ ...f, amount: p.min_amount, term_months: p.min_term_months || 3 }));
      } else {
        setSelectedProduct(null);
        setEstimate(null);
      }
    } catch (err: any) {
      console.error("Failed to load products:", err);
    }
  };

  const calculateEstimate = async () => {
    if (!selectedProduct || form.amount <= 0) return;
    setCalculating(true);
    setEstimateError("");
    try {
      const res = await productsApi.calculate(selectedProduct.id, form.amount, form.term_months);
      setEstimate(res.data);

      // Calculate APR
      try {
        const aprResult = calculateAPR({
          principalAmount: form.amount,
          interestRate: selectedProduct.interest_rate || 0,
          loanTermMonths: form.term_months,
          processingFeePercent: selectedProduct.processing_fee_percent || 0,
          assetTransferFee: selectedProduct.asset_transfer_fee || 0,
          trackingSystemFee: selectedProduct.tracking_system_fee || 0,
        });
        setAPR(aprResult.apr);
      } catch (aprErr) {
        console.error('APR calculation error:', aprErr);
      }
    } catch (err: any) {
      setEstimateError(err.message || "Could not calculate estimate");
      setEstimate(null);
    } finally { setCalculating(false); }
  };

  const handleSelectProduct = (productId: string) => {
    const p = products.find((pr: any) => String(pr.id) === productId);
    if (!p) return;
    setSelectedProduct(p);
    setForm(f => ({
      ...f,
      amount: Math.max(p.min_amount, Math.min(f.amount || p.min_amount, p.max_amount)),
      term_months: Math.max(p.min_term_months || 1, Math.min(f.term_months, p.max_term_months || 60)),
    }));
  };

  const handleGoStep2 = () => {
    if (!selectedProduct) { showAlert({ type: "error", message: "Please select a loan product." }); return; }
    if (form.amount < selectedProduct.min_amount || form.amount > selectedProduct.max_amount) {
      showAlert({ type: "error", message: "Amount must be between " + formatKES(selectedProduct.min_amount) + " and " + formatKES(selectedProduct.max_amount) }); return;
    }
    setStep(2);
    if (!estimate) calculateEstimate();
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await loansApi.apply({
        product_id: selectedProduct.id,
        amount: form.amount,
        term_months: form.term_months,
        purpose: form.purpose || undefined,
        security_details: form.security_details || undefined,
        guarantor_details: form.guarantor_details || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      showAlert({ type: "error", message: err.message || "Failed to submit application. Please try again." });
    } finally { setSubmitting(false); }
  };

  if (initialLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (submitted) return (
    <div className="max-w-sm mx-auto text-center py-12 space-y-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-xl font-bold">Application Submitted!</h2>
      <p className="text-muted-foreground text-sm">Your loan application for {formatKES(form.amount)} has been submitted and is under review. You will be notified once processed.</p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); setEstimate(null); }}>Apply Again</Button>
        <Button onClick={() => navigate("/loans")}>View My Loans</Button>
      </div>
      {AlertComponent}
    </div>
  );

  if (categories.length === 0) return (
    <div className="text-center py-12">
      <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">No loan products are currently available.</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      {AlertComponent}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => step === 1 ? navigate("/dashboard") : setStep(1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Apply for Loan</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {[1,2].map(s => (
          <div key={s} className={"flex-1 h-1.5 rounded-full " + (s <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {/* STEP 1: Select Product & Amount */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Select Loan Product</CardTitle>
            <CardDescription>Choose a category and product, then set your amount.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Product */}
            {products.length > 0 ? (
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select value={selectedProduct?.id ? String(selectedProduct.id) : ""} onValueChange={handleSelectProduct}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.interest_rate}% p.a.</SelectItem>)}</SelectContent>
                </Select>
                {selectedProduct?.description && <p className="text-xs text-muted-foreground">{selectedProduct.description}</p>}
              </div>
            ) : selectedCategory ? (
              <div className="text-center py-4 text-sm text-muted-foreground">No products available in this category.</div>
            ) : null}

            {/* Amount & Term Sliders */}
            {selectedProduct && (
              <>
                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Loan Amount</Label>
                    <span className="text-lg font-bold text-primary">{formatKES(form.amount)}</span>
                  </div>
                  <input type="range" min={selectedProduct.min_amount} max={selectedProduct.max_amount} step={1000} value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatKES(selectedProduct.min_amount)}</span>
                    <span>{formatKES(selectedProduct.max_amount)}</span>
                  </div>
                </div>

                {/* Term */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Loan Term</Label>
                    <span className="text-lg font-bold text-primary">{form.term_months} month{form.term_months > 1 ? "s" : ""}</span>
                  </div>
                  <input type="range" min={selectedProduct.min_term_months || 1} max={selectedProduct.max_term_months || 60} step={1} value={form.term_months}
                    onChange={(e) => setForm(f => ({ ...f, term_months: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{selectedProduct.min_term_months || 1} month</span>
                    <span>{selectedProduct.max_term_months || 60} months</span>
                  </div>
                </div>

                {/* Quick estimate while on step 1 */}
                {calculating && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Calculating...</div>}
                {estimate && !calculating && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Est. Monthly Payment</span><span className="font-bold">{formatKES(estimate.monthly_payment || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Repayable</span><span className="font-medium">{formatKES(estimate.total_amount || form.amount)}</span></div>
                  </div>
                )}
              </>
            )}

            <Button className="w-full" size="lg" onClick={handleGoStep2} disabled={!selectedProduct}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Review & Additional Details */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Loan Summary - always shown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Review Your Application</CardTitle>
              <CardDescription>{selectedProduct?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {calculating ? (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Calculating loan details...
                </div>
              ) : estimateError ? (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Could not load exact estimate</p>
                    <p className="text-yellow-700 text-xs">{estimateError}</p>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                {[
                  { label: "Principal Amount", value: formatKES(form.amount), bold: false },
                  { label: "Interest Rate", value: (selectedProduct?.interest_rate || 0) + "% p.a.", bold: false },
                  { label: "Annual Percentage Rate (APR)", value: apr !== null ? apr.toFixed(2) + "%" : "—", bold: true, highlight: true },
                  { label: "Loan Term", value: form.term_months + " months", bold: false },
                  { label: "Interest Amount", value: estimate ? formatKES(estimate.interest || 0) : "—", bold: false },
                  { label: "Processing Fee", value: estimate ? formatKES(estimate.processing_fee || 0) : "—", bold: false },
                  { label: "Monthly Payment", value: estimate ? formatKES(estimate.monthly_payment || 0) : "—", bold: true },
                  { label: "Total Repayable", value: estimate ? formatKES(estimate.total_amount || form.amount) : formatKES(form.amount), bold: true },
                ].map(row => (
                  <div key={row.label} className={"flex justify-between text-sm " + (row.bold ? "font-bold border-t pt-2" : "") + (row.highlight ? " bg-blue-50 -mx-3 px-3 py-2 rounded" : "")}>
                    <span className={row.bold ? "" : "text-muted-foreground"}>{row.label}</span>
                    <span className={row.highlight ? "text-blue-700 font-bold" : ""}>{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="purpose">Loan Purpose</Label>
                <Textarea id="purpose" placeholder="What will you use this loan for?" value={form.purpose}
                  onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))} className="min-h-[80px]" />
              </div>
              {selectedProduct?.requires_security && (
                <div className="space-y-1.5">
                  <Label htmlFor="security">Security Details <span className="text-red-500">*</span></Label>
                  <Textarea id="security" placeholder="Describe the collateral/security for this loan" value={form.security_details}
                    onChange={(e) => setForm(f => ({ ...f, security_details: e.target.value }))} className="min-h-[80px]" />
                </div>
              )}
              {selectedProduct?.requires_guarantor && (
                <div className="space-y-1.5">
                  <Label htmlFor="guarantor">Guarantor Details <span className="text-red-500">*</span></Label>
                  <Textarea id="guarantor" placeholder="Guarantor full name, phone, relationship" value={form.guarantor_details}
                    onChange={(e) => setForm(f => ({ ...f, guarantor_details: e.target.value }))} className="min-h-[80px]" />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      )}

      {AlertComponent}
    </div>
  );
}
