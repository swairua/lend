import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronLeft, AlertCircle, CreditCard, Info, ArrowRight, ArrowLeft, Check, ChevronsUpDown, Upload, X, FileText } from 'lucide-react';
import { adminApi, productsApi, formatKES, uploadsApi } from '../utils/api';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AdminCreateLoan() {
  const navigate = useNavigate();
  const { showAlert, AlertComponent } = useAlert();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [borrowerSearchTerm, setBorrowerSearchTerm] = useState('');
  const [borrowerPopoverOpen, setBorrowerPopoverOpen] = useState(false);
  const [loadingBorrowers, setLoadingBorrowers] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const [form, setForm] = useState({
    amount: 0,
    term_months: 3,
    purpose: '',
    security_details: '',
    guarantor_details: '',
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');

  const docTypes = [
    { value: 'national_id', label: 'National ID', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'kra_certificate', label: 'KRA Certificate', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'tcc_document', label: 'TCC Document', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'bank_statement', label: 'Bank Statement', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'logbook', label: 'Logbook', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'payslip', label: 'Payslip', accept: '.pdf,.jpg,.jpeg,.png' },
    { value: 'other', label: 'Other Document', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) loadProducts(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (borrowerPopoverOpen) {
      searchBorrowers(borrowerSearchTerm);
    }
  }, [borrowerPopoverOpen]);

  useEffect(() => {
    if (borrowerSearchTerm.trim()) {
      const debounce = setTimeout(() => {
        searchBorrowers(borrowerSearchTerm);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [borrowerSearchTerm]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await productsApi.getCategories();
      const cats = (res.data || []).filter((c: any) => c.is_active !== false);
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(String(cats[0].id));
    } catch (err: any) {
      showAlert({ type: 'error', message: 'Failed to load loan categories' });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (catId: string) => {
    try {
      const res = await productsApi.getProducts(parseInt(catId));
      const prods = (res.data || []).filter((p: any) => p.is_active !== false);
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProduct(prods[0]);
        setForm(f => ({ ...f, amount: prods[0].min_amount, term_months: prods[0].min_term_months || 3 }));
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  };

  const calculateEstimate = async () => {
    if (!selectedProduct || form.amount <= 0) return;
    setCalculating(true);
    try {
      const res = await productsApi.calculate(selectedProduct.id, form.amount, form.term_months);
      setEstimate(res.data);
    } catch (err: any) {
      showAlert({ type: 'error', message: 'Could not calculate estimate' });
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedProduct && form.amount > 0) {
      const debounce = setTimeout(() => {
        calculateEstimate();
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [selectedProduct, form.amount, form.term_months]);

  const searchBorrowers = async (query: string) => {
    setLoadingBorrowers(true);
    try {
      const response = await adminApi.getBorrowers({ search: query, limit: 20 });
      const borrowersList = Array.isArray(response.data?.borrowers) ? response.data.borrowers : [];
      setBorrowers(borrowersList);
    } catch (error: any) {
      console.error('Failed to search borrowers:', error);
      setBorrowers([]);
    } finally {
      setLoadingBorrowers(false);
    }
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
    if (!selectedProduct) {
      showAlert({ type: 'error', message: 'Please select a loan product' });
      return;
    }
    if (!selectedBorrower) {
      showAlert({ type: 'error', message: 'Please select or create a borrower' });
      return;
    }
    if (form.amount < selectedProduct.min_amount || form.amount > selectedProduct.max_amount) {
      showAlert({ type: 'error', message: `Amount must be between ${formatKES(selectedProduct.min_amount)} and ${formatKES(selectedProduct.max_amount)}` });
      return;
    }
    setStep(2);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!selectedDocType) {
      showAlert({ type: 'error', message: 'Please select a document type' });
      return;
    }

    setUploading(true);
    try {
      const response = await uploadsApi.upload(file, selectedDocType, selectedBorrower?.id);
      if (response.success) {
        setUploadedDocuments([...uploadedDocuments, response.data]);
        setSelectedDocType('');
        toast.success('Document uploaded successfully');
      } else {
        showAlert({ type: 'error', message: 'Failed to upload document' });
      }
    } catch (err: any) {
      showAlert({ type: 'error', message: err.message || 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = (docId: number) => {
    setUploadedDocuments(uploadedDocuments.filter(d => d.id !== docId));
  };

  const handleGoStep3 = () => {
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedBorrower) return;

    setSubmitting(true);
    try {
      const payload: any = {
        borrower_id: selectedBorrower.id,
        product_id: selectedProduct.id,
        amount: form.amount,
        term_months: form.term_months,
        purpose: form.purpose || undefined,
        security_details: form.security_details || undefined,
        guarantor_details: form.guarantor_details || undefined,
      };

      const response = await adminApi.createLoan(payload);

      if (response.success) {
        toast.success('Loan created successfully!');
        // Redirect to the new loan's repayment schedule or admin loans page
        navigate(`/admin/loans/${response.data?.id || ''}`);
      } else {
        showAlert({ type: 'error', message: response.error || 'Failed to create loan' });
      }
    } catch (err: any) {
      showAlert({ type: 'error', message: err.message || 'Failed to create loan' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">No loan products are currently available.</p>
        <Button variant="outline" onClick={() => navigate('/admin/loans')}>Back to Loans</Button>
        {AlertComponent}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => step === 1 ? navigate('/admin/loans') : setStep(1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Loan</h1>
      </div>

      {/* STEP 1: Select Borrower & Product */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Loan Details
            </CardTitle>
            <CardDescription>Select borrower and loan product</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Borrower Selection */}
            <div className="space-y-2">
              <Label htmlFor="borrower">Borrower*</Label>
              <Popover open={borrowerPopoverOpen} onOpenChange={setBorrowerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={borrowerPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedBorrower ? selectedBorrower.name || selectedBorrower.email : 'Select borrower...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or email..."
                      value={borrowerSearchTerm}
                      onValueChange={setBorrowerSearchTerm}
                    />
                    {loadingBorrowers && <div className="p-2 text-sm text-muted-foreground">Loading...</div>}
                    {!loadingBorrowers && borrowers.length === 0 && (
                      <CommandEmpty>
                        <div className="space-y-2 p-2">
                          <p className="text-sm">No borrowers found</p>
                          <p className="text-xs text-muted-foreground">Borrowers must register first to be available for loan creation.</p>
                        </div>
                      </CommandEmpty>
                    )}
                    <CommandList>
                      <CommandGroup>
                        {borrowers.map((borrower) => (
                          <CommandItem
                            key={borrower.id}
                            value={String(borrower.id)}
                            onSelect={() => {
                              setSelectedBorrower(borrower);
                              setBorrowerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedBorrower?.id === borrower.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{borrower.name || borrower.email}</div>
                              <div className="text-xs text-muted-foreground">{borrower.email}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Product*</Label>
              <Select value={selectedProduct?.id ? String(selectedProduct.id) : ''} onValueChange={handleSelectProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={String(prod.id)}>
                      {prod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Term */}
            {selectedProduct && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount ({formatKES(selectedProduct.min_amount)} - {formatKES(selectedProduct.max_amount)})
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min={selectedProduct.min_amount}
                    max={selectedProduct.max_amount}
                    value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term">
                    Term Months ({selectedProduct.min_term_months || 1} - {selectedProduct.max_term_months || 60})
                  </Label>
                  <Input
                    id="term"
                    type="number"
                    min={selectedProduct.min_term_months || 1}
                    max={selectedProduct.max_term_months || 60}
                    value={form.term_months}
                    onChange={(e) => setForm(f => ({ ...f, term_months: parseInt(e.target.value) || 3 }))}
                  />
                </div>

                {/* Estimate Summary */}
                {estimate && !calculating && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Principal</p>
                          <p className="font-semibold">{formatKES(estimate.principal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interest</p>
                          <p className="font-semibold">{formatKES(estimate.interest)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Fees</p>
                          <p className="font-semibold">{formatKES((estimate.processing_fee || 0) + (estimate.asset_transfer_fee || 0) + (estimate.tracking_system_fee || 0))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-semibold text-primary">{formatKES(estimate.total_amount)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <Button className="w-full" size="lg" onClick={handleGoStep2} disabled={!selectedProduct || !selectedBorrower}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Additional Details */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Loan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Borrower</p>
                  <p className="font-semibold">{selectedBorrower?.name || selectedBorrower?.email}</p>
                  {selectedBorrower?.phone && <p className="text-xs text-muted-foreground">{selectedBorrower.phone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-semibold">{selectedProduct?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatKES(form.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className="font-semibold">{form.term_months} months</p>
                </div>
                {estimate && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest</p>
                      <p className="font-semibold">{formatKES(estimate.interest)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-primary">{formatKES(estimate.total_amount)}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" /> Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Loan Purpose</Label>
                <Textarea
                  id="purpose"
                  placeholder="What is the loan purpose?"
                  value={form.purpose || ''}
                  onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              {selectedProduct?.requires_security && (
                <div className="space-y-2">
                  <Label htmlFor="security">Security Details</Label>
                  <Textarea
                    id="security"
                    placeholder="Describe the collateral/security"
                    value={form.security_details || ''}
                    onChange={(e) => setForm(f => ({ ...f, security_details: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {selectedProduct?.requires_guarantor && (
                <div className="space-y-2">
                  <Label htmlFor="guarantor">Guarantor Details</Label>
                  <Textarea
                    id="guarantor"
                    placeholder="Guarantor name, phone, relationship"
                    value={form.guarantor_details || ''}
                    onChange={(e) => setForm(f => ({ ...f, guarantor_details: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button className="flex-1" onClick={handleGoStep3} disabled={submitting}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Document Upload */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Upload Documents (Optional)
              </CardTitle>
              <CardDescription>Add supporting documents for the loan application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Type Selector & File Upload */}
              <div className="space-y-4 border-b pb-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="doctype">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger id="doctype">
                        <SelectValue placeholder="Select document type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {docTypes.map((doc) => (
                          <SelectItem key={doc.value} value={doc.value}>
                            {doc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Choose File</Label>
                    <div className="flex gap-2">
                      <Input
                        id="file"
                        type="file"
                        accept={docTypes.find(d => d.value === selectedDocType)?.accept || '.pdf,.doc,.docx,.jpg,.jpeg,.png'}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                        disabled={!selectedDocType || uploading}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, JPEG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents ({uploadedDocuments.length})</Label>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.original_name}</p>
                            <p className="text-xs text-muted-foreground">{docTypes.find(d => d.value === doc.doc_type)?.label}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(doc.id)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-900">
                  Document uploads are optional. You can add documents now or after the loan is created.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  Create Loan <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {AlertComponent}
    </div>
  );
}
