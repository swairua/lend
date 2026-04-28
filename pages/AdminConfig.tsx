import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import {
  getCurrentUser,
  getAdminConfig,
  saveAdminConfig,
  resetAdminConfig,
  AdminConfig as AdminConfigType,
  User,
} from "@/utils/localStorage";

export default function AdminConfig() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<AdminConfigType | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/login");
      return;
    }
    setUser(currentUser);
    const adminConfig = getAdminConfig();
    setConfig(adminConfig);
    setLoading(false);
  }, [navigate]);

  if (loading || !user || !config) {
    return (
      <Layout user={null}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  const handleUpdateConfig = (updates: Partial<AdminConfigType>) => {
    setConfig({ ...config, ...updates });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    setTimeout(() => {
      saveAdminConfig(config);
      setSaving(false);
      setMessage("Configuration saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset to default configuration?")) {
      resetAdminConfig();
      const defaultConfig = getAdminConfig();
      setConfig(defaultConfig);
      setMessage("Configuration reset to defaults");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <Layout user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Loan Configuration
          </h1>
          <p className="text-muted-foreground">
            Manage interest rates, fees, and loan conditions for all categories
          </p>
        </div>

        {message && (
          <Card className="bg-success/10 border-success/20 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-success text-sm">
                <AlertCircle className="h-4 w-4" />
                {message}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Tabs */}
        <Tabs defaultValue="cat1" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="cat1">Category 1</TabsTrigger>
            <TabsTrigger value="cat2">Category 2</TabsTrigger>
            <TabsTrigger value="cat3">Category 3</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
          </TabsList>

          {/* Category 1 */}
          <TabsContent value="cat1">
            <Card>
              <CardHeader>
                <CardTitle>Asset-Backed Financing Configuration</CardTitle>
                <CardDescription>
                  Configure interest rates and fees for Category 1 loans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Annual Interest Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category1.annualInterestRate}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category1: {
                            ...config.category1,
                            annualInterestRate: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 19.5%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Processing Fee Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category1.processingFeeRate}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category1: {
                            ...config.category1,
                            processingFeeRate: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 4%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Logbook Transfer Fee (KES)
                    </label>
                    <Input
                      type="number"
                      step="100"
                      value={config.category1.logbookTransferFee}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category1: {
                            ...config.category1,
                            logbookTransferFee: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 7,000 KES
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tracking System Cost (KES)
                    </label>
                    <Input
                      type="number"
                      step="1000"
                      value={config.category1.trackingSystemCost}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category1: {
                            ...config.category1,
                            trackingSystemCost: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 25,000 KES (Optional)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category 2 */}
          <TabsContent value="cat2">
            <Card>
              <CardHeader>
                <CardTitle>Short-Term Loans Configuration</CardTitle>
                <CardDescription>
                  Configure interest rates and limits for Category 2 loans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Interest Rate for 30 Days (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category2.interestRate30Days}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category2: {
                            ...config.category2,
                            interestRate30Days: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 15%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Processing Fee Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category2.processingFeeRate}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category2: {
                            ...config.category2,
                            processingFeeRate: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 4%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Minimum Amount (KES)
                    </label>
                    <Input
                      type="number"
                      step="100"
                      value={config.category2.minAmount}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category2: {
                            ...config.category2,
                            minAmount: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 5,000 KES
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Maximum Amount (KES)
                    </label>
                    <Input
                      type="number"
                      step="100"
                      value={config.category2.maxAmount}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category2: {
                            ...config.category2,
                            maxAmount: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 50,000 KES
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category 3 */}
          <TabsContent value="cat3">
            <Card>
              <CardHeader>
                <CardTitle>LPOS (Lipa Pole Pole) Configuration</CardTitle>
                <CardDescription>
                  Configure flexible loan terms for Category 3
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Annual Interest Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category3.annualInterestRate}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category3: {
                            ...config.category3,
                            annualInterestRate: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 10%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Processing Fee Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.category3.processingFeeRate}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category3: {
                            ...config.category3,
                            processingFeeRate: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 3%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Minimum Loan Term (Months)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={config.category3.minLoanTermMonths}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category3: {
                            ...config.category3,
                            minLoanTermMonths: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 3 months
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Maximum Loan Term (Months)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={config.category3.maxLoanTermMonths}
                      onChange={(e) =>
                        handleUpdateConfig({
                          category3: {
                            ...config.category3,
                            maxLoanTermMonths: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: 36 months
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalties */}
          <TabsContent value="penalties">
            <Card>
              <CardHeader>
                <CardTitle>Late Payment Penalties</CardTitle>
                <CardDescription>
                  Configure uniform penalties for all categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Late Payment Penalty (% per annum)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.latePenaltyRate}
                    onChange={(e) =>
                      handleUpdateConfig({
                        latePenaltyRate: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Default: 2.5% per annum
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    This penalty is applied uniformly across all loan categories on the outstanding balance for each day a payment is overdue.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
