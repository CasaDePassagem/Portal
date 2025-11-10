import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60svh] grid place-items-center text-theme-secondary">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
