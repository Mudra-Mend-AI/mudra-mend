import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Spinner className="mb-3 text-primary-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon ?? <Inbox size={40} className="mb-3 text-gray-300" />}
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="mb-3 text-error-500" size={32} />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
          Retry
        </button>
      )}
    </div>
  );
}

export function Badge({ variant = 'neutral', children }: { variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'purple'; children: ReactNode }) {
  const styles: Record<string, string> = {
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
    error: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-300',
    info: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    purple: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
  };
  return <span className={`badge ${styles[variant]}`}>{children}</span>;
}

export function statusBadge(status: string) {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    success: 'success', verified: 'success', approved: 'success', active: 'success', resolved: 'success', closed: 'neutral', delivered: 'success',
    pending: 'warning', processing: 'warning', under_review: 'warning', in_progress: 'warning', pending_review: 'warning', planned: 'warning', submitted: 'warning',
    failed: 'error', cancelled: 'error', rejected: 'error', suspended: 'error', revoked: 'error', escalated: 'error', blocked: 'error',
    unverified: 'neutral', open: 'info', reversed: 'info', under_investigation: 'info',
  };
  return <Badge variant={map[status] ?? 'neutral'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return <div className={`card p-5 ${className}`} onClick={onClick}>{children}</div>;
}

export function StatCard({ label, value, icon, trend, accent = 'primary', to }: {
  label: string; value: string | number; icon: ReactNode; trend?: string;
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'accent';
  to?: string;
}) {
  const accents: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    error: 'bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400',
    secondary: 'bg-secondary-50 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-400',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
  };
  const inner = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {trend && <p className="mt-1 text-xs text-gray-400">{trend}</p>}
      </div>
      <div className={`rounded-lg p-3 ${accents[accent]}`}>{icon}</div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="card block p-5 transition-all hover:shadow-card-hover hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }
  return <Card>{inner}</Card>;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger, hideCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean; hideCancel?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onCancel}>
      <div className="card mx-4 max-w-sm p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          {!hideCancel && <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>}
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
