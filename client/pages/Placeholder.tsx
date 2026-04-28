import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/utils/localStorage";
import { useEffect, useState } from "react";
import { User } from "@/utils/localStorage";

interface PlaceholderProps {
  title: string;
  description?: string;
  message?: string;
}

export default function Placeholder({ title, description, message }: PlaceholderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) {
    return (
      <Layout user={null}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="border-2 border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="h-16 w-16 text-muted mx-auto mb-6 opacity-50" />
            <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
            {description && (
              <p className="text-lg text-muted-foreground mb-4">{description}</p>
            )}
            <p className="text-muted-foreground mb-8">
              {message || "This page is currently under development. Please continue prompting to request this feature to be built out."}
            </p>
            <Button onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
