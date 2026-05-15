import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { secureStorage } from "../utils/secureStorage";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "borrower";
}

export default function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await secureStorage.getToken();
      const user = await secureStorage.getUser();

      if (!token || !user) {
        setRedirect("/login");
        setIsAuthorized(false);
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        setRedirect(user.role === "admin" ? "/admin" : "/dashboard");
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
    };

    checkAuth();
  }, [requiredRole]);

  if (isAuthorized === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
