import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="h-16 w-16 text-warning mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-foreground mb-3">404</h1>
            <p className="text-xl text-muted-foreground mb-2">Page Not Found</p>
            <p className="text-sm text-muted-foreground mb-8">
              The page <code className="bg-muted px-2 py-1 rounded text-xs">
                {location.pathname}
              </code>{" "}
              doesn't exist.
            </p>
            <Link to="/">
              <Button className="w-full">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
