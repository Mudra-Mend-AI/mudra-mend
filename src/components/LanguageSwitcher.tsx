import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const LANG_OPTIONS: { value: 'en' | 'hi' | 'mr'; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: 'EN' },
  { value: 'hi', label: 'हिन्दी', flag: 'हि' },
  { value: 'mr', label: 'मराठी', flag: 'मृ' },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find((l) => l.value === lang)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost px-2.5 py-2 text-sm"
        aria-label="Select language"
      >
        <span className="font-semibold">{current.flag}</span>
        {!compact && <span className="ml-1">{current.label}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 animate-slide-up">
            {LANG_OPTIONS.map((l) => (
              <button
                key={l.value}
                onClick={() => { setLang(l.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  lang === l.value ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="w-6 font-semibold">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
