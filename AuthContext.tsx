import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile, type Role } from '@/lib/supabase';
import { DEMO_PROFILES } from '@/lib/demoData';
import { useI18n } from '@/i18n/I18nContext';
import type { TranslationKey } from '@/i18n/translations';

const DEMO_ROLE_KEY = 'mudramend_demo_role';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  enterDemoMode: (role: Role) => void;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { setLang } = useI18n();

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error.message);
      return null;
    }
    if (data) {
      const p = data as Profile;
      setProfile(p);
      if (p.preferred_language) setLang(p.preferred_language);
      return p;
    }
    return null;
  }, [setLang]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const enterDemoMode = useCallback((role: Role) => {
    const demoProfile = DEMO_PROFILES[role];
    localStorage.setItem(DEMO_ROLE_KEY, role);
    setIsDemoMode(true);
    setProfile(demoProfile as unknown as Profile);
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const exitDemoMode = useCallback(() => {
    localStorage.removeItem(DEMO_ROLE_KEY);
    setIsDemoMode(false);
    setProfile(null);
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    // Check for existing demo mode first
    const savedDemoRole = localStorage.getItem(DEMO_ROLE_KEY) as Role | null;
    if (savedDemoRole && DEMO_PROFILES[savedDemoRole]) {
      setIsDemoMode(true);
      setProfile(DEMO_PROFILES[savedDemoRole] as unknown as Profile);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      exitDemoMode();
      return;
    }
    await supabase.auth.signOut();
    localStorage.removeItem(DEMO_ROLE_KEY);
    setProfile(null);
    setUser(null);
    setSession(null);
  }, [isDemoMode, exitDemoMode]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isDemoMode, signOut, refreshProfile, enterDemoMode, exitDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleLabel(role: Role): TranslationKey {
  const labels: Record<Role, TranslationKey> = {
    customer: 'roleCustomer',
    admin: 'roleAdmin',
    fraud_analyst: 'roleFraudAnalyst',
    bank_officer: 'roleBankOfficer',
    investigator: 'roleInvestigator',
    auditor: 'roleAuditor',
    customer_support: 'roleCustomerSupport',
    ngo_coordinator: 'roleNgoCoordinator',
    gov_official: 'roleGovOfficial',
  };
  return labels[role];
}
