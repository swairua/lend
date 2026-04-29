import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productsApi, loansApi, formatKES } from '../types/api';
import { Loader2, Plus, FileText, CreditCard, CheckCircle } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';

export default function ApplyLoan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const { showAlert } = useAlert();
  
  const [form, setForm] = useState({
    amount: 10000,
    term_months: 3,
    security_details: '',
    guarantor_details: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedProduct) {
      calculateLoan();
    }
  }, [selectedProduct, form.amount, form.term_months]);

  const loadData = async () => {
    setInitialLoading(true);
    console.log('ApplyLoan: loading categories...');
    try {
      const res = await productsApi.getCategories();
      console.log('ApplyLoan: categories response:', res);
      const cats = res.data || [];
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(String(cats[0].id));
      }
    } catch (error: any) {
      console.error('ApplyLoan: failed to load categories:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadProducts = async (catId: string) => {
    try {
      const res = await productsApi.getProducts(parseInt(catId));
      const prods = res.data || [];
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProduct(prods[0]);
      } else {
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const calculateLoan = async () => {
    if (!selectedProduct) return;
    try {
      const res = await productsApi.calculate(selectedProduct.id, form.amount, form.term_months);
      setEstimate(res.data);
    } catch (error) {
      console.error('Failed to calculate:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      await loansApi.apply({
        product_id: selectedProduct.id,
        amount: form.amount,
        term_months: form.term_months,
        security_details: form.security_details || undefined,
        guarantor_details: form.guarantor_details || undefined,
      });
      setSubmitted(true);
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message || 'Failed to submit application' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Application Submitted!</h2>
        <p className="text-muted-foreground mb-4">Your loan application has been submitted successfully.</p>
        <Button onClick={() => navigate('/loans')}>View My Loans</Button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No loan categories available.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No loan products available in this category.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </Button>
        <h1 className="text-xl font-bold">Apply for Loan</h1>
      </div>

      {/* Step 1: Select Product */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Loan Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Product</Label>
              <Select 
                value={selectedProduct?.id?.toString() || ''} 
                onValueChange={(v) => {
                  const prod = products.find(p => p.id === parseInt(v));
                  setSelectedProduct(prod);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(prod => (
                    <SelectItem key={prod.id} value={String(prod.id)}>
                      {prod.name} ({prod.interest_rate}% p.a.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-muted-foreground">{selectedProduct.description}</p>
                  <p className="mt-2">Amount: {formatKES(selectedProduct.min_amount)} - {formatKES(selectedProduct.max_amount)}</p>
                  <p>Term: {selectedProduct.min_term_months} - {selectedProduct.max_term_months} months</p>
                </div>

                <div>
                  <Label>Amount: {formatKES(form.amount)}</Label>
                  <Input 
                    type="range" 
                    min={selectedProduct.min_amount} 
                    max={selectedProduct.max_amount} 
                    value={form.amount}
                    onChange={(e) => setForm({...form, amount: parseInt(e.target.value)})}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatKES(selectedProduct.min_amount)}</span>
                    <span>{formatKES(selectedProduct.max_amount)}</span>
                  </div>
                </div>

                <div>
                  <Label>Term: {form.term_months} months</Label>
                  <Input 
                    type="range" 
                    min={selectedProduct.min_term_months || 1} 
                    max={selectedProduct.max_term_months || 12} 
                    value={form.term_months}
                    onChange={(e) => setForm({...form, term_months: parseInt(e.target.value)})}
                    className="mt-2"
                  />
                </div>
              </>
            )}

            <Button className="w-full" onClick={() => setStep(2)} disabled={!selectedProduct}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & Submit */}
      {step === 2 && estimate && (
        <Card>
          <CardHeader>
            <CardTitle>Review Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Principal</span>
                <span className="font-medium">{formatKES(form.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest ({selectedProduct?.interest_rate}%)</span>
                <span>{formatKES(estimate.interest || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee</span>
                <span>{formatKES(estimate.processing_fee || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total Repayable</span>
                <span>{formatKES(estimate.total_amount || form.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Monthly Payment</span>
                <span>{formatKES(estimate.monthly_payment || 0)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}