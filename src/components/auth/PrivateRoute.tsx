import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Lock } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function PrivateRoute({ children, requireAdmin = false }: PrivateRouteProps) {
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  // Loading state
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <p className="text-slate-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check admin requirement
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-slate-600 mb-4">
            Você não tem permissão para acessar esta página.
            Esta área é restrita a administradores.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // User is inactive
  if (user && !user.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Conta Inativa
          </h2>
          <p className="text-slate-600 mb-4">
            Sua conta está temporariamente desativada.
            Entre em contato com o suporte para reativá-la.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}

// Component for public routes that should redirect if user is already authenticated
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
