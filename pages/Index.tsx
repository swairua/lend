import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Percent,
  Briefcase,
  Clock,
  Lock,
  AlertCircle,
} from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-16 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#loan-categories" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Loan Categories
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Benefits
            </a>
            <Link to="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Fast, Transparent Lending at Your Fingertips
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                JECRI BUREAU is a trusted lending institution providing flexible financing solutions tailored to your needs. Apply for loans, track repayments, and manage your finances with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    Apply for Loan <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Admin Access
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
              <Card className="relative border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Simple Application</p>
                        <p className="text-sm text-muted-foreground">Apply and track in real-time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Secure & Safe</p>
                        <p className="text-sm text-muted-foreground">Your data is protected</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Percent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Transparent Rates</p>
                        <p className="text-sm text-muted-foreground">No hidden charges</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Loan Categories Section */}
        <section id="loan-categories" className="bg-muted/30 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Three Flexible Loan Categories
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the loan category that best fits your financial needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Category 1 */}
              <Card className="border-2 hover:border-primary transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Asset-Backed Financing</CardTitle>
                  <CardDescription>Secured loans using collateral</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Key Features:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Interest Rate: <strong>19.5% per annum</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Processing Fee: <strong>4%</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Logbook Transfer: <strong>KES 7,000</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Tracking System: <strong>KES 25,000 (optional)</strong></span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">Perfect for vehicle financing or asset-based loans</p>
                </CardContent>
              </Card>

              {/* Category 2 */}
              <Card className="border-2 hover:border-primary transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-info" />
                  </div>
                  <CardTitle>Short-Term Loans</CardTitle>
                  <CardDescription>Quick cash for urgent needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Key Features:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Amount Range: <strong>KES 5,000 - KES 50,000</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Interest Rate: <strong>15% per 30 days</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Processing Fee: <strong>4%</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Security: <strong>Cheques + Collateral</strong></span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">Fast approval for short-term cash needs</p>
                </CardContent>
              </Card>

              {/* Category 3 */}
              <Card className="border-2 hover:border-primary transition-colors hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Briefcase className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>LPO (Local Purchase Orders)</CardTitle>
                  <CardDescription>Advancing against Local Purchase Orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Key Features:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Flexible Terms: <strong>Admin-configurable</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Custom Rates: <strong>Set by administrator</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Easy Repayment: <strong>Pay at your own pace</strong></span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                        <span>Best For: <strong>Larger amounts</strong></span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">Maximum flexibility for different needs</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Simple, transparent, and quick - get a loan in 4 easy steps
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  title: "Apply",
                  description: "Fill out a simple loan application form",
                  icon: "📝",
                },
                {
                  step: 2,
                  title: "Review",
                  description: "We review your application and documents",
                  icon: "✓",
                },
                {
                  step: 3,
                  title: "Approve",
                  description: "Get approval notification and terms",
                  icon: "✓",
                },
                {
                  step: 4,
                  title: "Receive",
                  description: "Funds disbursed to your account",
                  icon: "🎉",
                },
              ].map((item, index) => (
                <div key={index} className="relative">
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-12 left-[60%] w-[40%] h-1 bg-gradient-to-r from-primary to-transparent"></div>
                  )}
                  <Card className="relative">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-3xl relative z-10">
                          {item.icon}
                        </div>
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {item.step}
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="bg-muted/30 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Why Choose JECRI BUREAU?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We believe in transparent, accessible, and fair lending
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  icon: <Zap className="h-6 w-6" />,
                  title: "Fast Processing",
                  description: "Get approval decisions quickly without lengthy delays",
                },
                {
                  icon: <Shield className="h-6 w-6" />,
                  title: "Secure & Safe",
                  description: "Your information is encrypted and protected with industry standards",
                },
                {
                  icon: <Percent className="h-6 w-6" />,
                  title: "Transparent Pricing",
                  description: "No hidden charges - all fees and rates are clearly stated",
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: "Customer Support",
                  description: "Dedicated support team ready to help you anytime",
                },
                {
                  icon: <Clock className="h-6 w-6" />,
                  title: "Flexible Terms",
                  description: "Choose loan terms that work for your budget and timeline",
                },
                {
                  icon: <TrendingUp className="h-6 w-6" />,
                  title: "Track Everything",
                  description: "Monitor your loans and repayments in real-time",
                },
              ].map((benefit, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        {benefit.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Penalties Section */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-2 border-warning/20 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Late Payment Policy
                </CardTitle>
                <CardDescription>
                  To maintain a fair lending environment for all our customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-card rounded-lg p-6 border border-border">
                  <p className="text-foreground font-semibold mb-3">
                    Late Payment Penalty
                  </p>
                  <p className="text-3xl font-bold text-warning mb-3">
                    2.5% per annum
                  </p>
                  <p className="text-muted-foreground">
                    Applied uniformly across all loan categories on outstanding balance. We encourage on-time payments to avoid penalties.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary to-info text-primary-foreground py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Get a Loan?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Start your application today and join thousands of satisfied customers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" variant="secondary" className="text-secondary-foreground">
                  Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  Admin Portal
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 JECRI BUREAU. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground border-t border-border pt-6">
            <p>Fast, Transparent, Accessible Lending</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
