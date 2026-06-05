import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { secureStorage } from "../utils/secureStorage";
import type { UserRole } from "../config/navigationConfig";

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
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

      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(user.role)) {
          if (user.role === "admin" || user.role === "releaser" || user.role === "manager" || user.role === "agent") {
            setRedirect("/admin");
          } else {
            setRedirect("/dashboard");
          }
          setIsAuthorized(false);
          return;
        }
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