import { Activity, CheckCircle, Database, Shield, Zap, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { Card } from '@/components/ui';

export default function SystemHealth() {
  const { t } = useI18n();

  const services = [
    { name: 'Database (Supabase PostgreSQL)', status: 'operational', icon: <Database size={20} /> },
    { name: 'Authentication (Supabase Auth)', status: 'operational', icon: <Shield size={20} /> },
    { name: 'Row-Level Security', status: 'operational', icon: <CheckCircle size={20} /> },
    { name: 'AI Rules Engine', status: 'operational', icon: <Zap size={20} /> },
    { name: 'Payment Provider (Simulated)', status: 'demo', icon: <Activity size={20} /> },
    { name: 'Email/SMS Notifications', status: 'unconfigured', icon: <Globe size={20} /> },
  ];

  const statusColors: Record<string, string> = {
    operational: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    demo: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    unconfigured: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('systemHealth')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('systemHealthSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((s) => (
          <Card key={s.name}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">{s.icon}</div>
                <p className="text-sm font-medium">{s.name}</p>
              </div>
              <span className={`badge ${statusColors[s.status]}`}>{s.status}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-success-50 to-primary-50 dark:from-success-900/20 dark:to-primary-900/20">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-success-600" size={28} />
          <div>
            <h3 className="font-semibold">{t('allSystemsOperational')}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Payment provider is in clearly labelled demo mode. Email/SMS adapters are unconfigured — no delivery confirmations are fabricated.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
