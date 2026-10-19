import { languages, useLocale, type Language } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLocale();
  return (
    <select
      aria-label={t('Язык')}
      title={t('Язык')}
      data-testid="select-language"
      className="inp mono !h-7 !py-0 !px-2 !w-[112px] text-[11px] shrink-0"
      value={language}
      onChange={event => setLanguage(event.target.value as Language)}
    >
      {languages.map(item => <option key={item.value} value={item.value} lang={item.value}>{item.label}</option>)}
    </select>
  );
}
