import { useSyncExternalStore } from 'react';
import { core } from './locales/core';
import { publicMessages } from './locales/public';
import { workspaceMessages } from './locales/workspace';
import { demoMessages } from './locales/demo';
import type { Campaign } from '@workspace/api-client-react';

export type Language = 'en' | 'ru' | 'az';
export const languages = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'az', label: 'Azərbaycanca' },
] as const;
const valid = (value: unknown): value is Language => value === 'en' || value === 'ru' || value === 'az';
function initialLanguage(): Language {
  try { const saved = localStorage.getItem('bd-language'); return valid(saved) ? saved : 'en'; }
  catch { return 'en'; }
}
let language: Language = initialLanguage();
const listeners = new Set<() => void>();
const messages = { ...core, ...publicMessages, ...workspaceMessages, ...demoMessages };
export const getLanguage = () => language;
export const getLocale = () => ({ en: 'en-US', ru: 'ru-RU', az: 'az-AZ' }[language]);
export function setLanguage(next: Language) {
  if (!valid(next)) return;
  language = next;
  try { localStorage.setItem('bd-language', next); } catch { /* Storage may be disabled. */ }
  document.documentElement.lang = next;
  listeners.forEach(listener => listener());
}
export function t(source: string, variables?: Record<string, string | number>): string {
  const entry = messages[source];
  const translated = language === 'ru' ? source : entry?.[language === 'en' ? 0 : 1] ?? source;
  return variables ? translated.replace(/\{(\w+)\}/g, (match, key) => String(variables[key] ?? match)) : translated;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useLocale() {
  const current = useSyncExternalStore(subscribe, getLanguage, () => 'en' as Language);
  return { language: current, setLanguage, t, locale: getLocale() };
}
// Only translate curated demo content. Real founder/tester content stays intact.
export function localizeCampaign(campaign: Campaign): Campaign {
  if (!campaign.demo) return campaign;
  return { ...campaign, title: t(campaign.title), description: t(campaign.description),
    reward: t(campaign.reward), instructions: t(campaign.instructions),
    screeningQuestions: campaign.screeningQuestions.map(question => t(question)) };
}
document.documentElement.lang = language;
window.addEventListener('storage', event => {
  if (event.key === 'bd-language') {
    language = valid(event.newValue) ? event.newValue : 'en';
    document.documentElement.lang = language;
    listeners.forEach(listener => listener());
  }
});
