import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui';
import type { Role } from '@/lib/supabase';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, profile, loading, isDemoMode } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState />;
  if (!user && !isDemoMode) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // Pending users can only see the app shell (which shows AccountPending via DashboardRouter).
  // Block them from all sub-routes — they get redirected to /app which shows the pending screen.
  if (profile?.status === 'pending' && location.pathname !== '/app') {
    return <Navigate to="/app" replace />;
  }
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
