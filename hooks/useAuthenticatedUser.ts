import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureStorage } from '../utils/secureStorage';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  borrower_id?: number | null;
  photo_url?: string;
}

interface UseAuthenticatedUserReturn {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuthenticatedUser(): UseAuthenticatedUserReturn {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await secureStorage.getToken();
        const storedUser = await secureStorage.getUser();

        if (!token || !storedUser) {
          navigate('/login');
          setLoading(false);
          return;
        }

        setUser(storedUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const logout = async () => {
    await secureStorage.clear();
    navigate('/login');
  };

  return { user, loading, logout };
}
