import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppStateProvider } from '@/lib/app';
import { Private } from '@/components/shell';
import { Btn, LangPills } from '@/components/lp';
import { Check } from 'lucide-react';
import Landing from '@/pages/landing';
import Explore from '@/pages/explore';
import CampaignPage from '@/pages/campaign';
import Pricing from '@/pages/pricing';
import { TesterDashboard, Vault, ProfilePage } from '@/pages/tester';
import { FounderCampaigns, NewCampaign, FounderSubmissions } from '@/pages/founder';
import { Integrations, Docs } from '@/pages/info';
import { useLocale } from '@/lib/i18n';
import { clerkLocales } from '@/lib/clerk-localization';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'none' as const,
  },
  variables: {
    colorPrimary: '#35363b',
    colorForeground: '#242426',
    colorMutedForeground: 'rgba(36, 36, 38, 0.75)',
    colorDanger: '#a4433a',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#242426',
    colorNeutral: '#242426',
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: '!shadow-none !border-0 !bg-transparent w-full max-w-[420px] mx-auto',
    card: '!shadow-none !border-0 !bg-transparent !p-0',
    footer: '!shadow-none !border-0 !bg-transparent',
    header: 'items-start text-left',
    headerTitle: '!text-[30px] !font-normal !tracking-[-0.03em] text-[#242426]',
    headerSubtitle: '!text-[15px] text-[rgba(36,36,38,0.75)]',
    socialButtonsBlockButton: '!rounded-[12px] !border !border-[rgba(36,36,38,0.12)] !bg-white !shadow-none h-11',
    socialButtonsBlockButtonText: 'text-[#242426] text-sm',
    formFieldLabel: 'text-[13px] !font-normal text-[rgba(36,36,38,0.75)]',
    formFieldInput: '!rounded-[12px] !border !border-[rgba(36,36,38,0.12)] !bg-white !shadow-none h-11 text-[#242426]',
    formButtonPrimary: '!rounded-[12px] !bg-[#35363b] hover:!bg-[#242426] !shadow-none h-11 !text-[14px] !font-normal',
    footerActionLink: '!text-[#242426] underline underline-offset-4',
    footerActionText: 'text-[rgba(36,36,38,0.75)]',
    dividerText: 'text-[rgba(36,36,38,0.5)] text-[12px]',
    dividerLine: 'bg-[rgba(36,36,38,0.07)]',
    identityPreviewEditButton: 'text-[#242426]',
    otpCodeFieldInput: '!rounded-[10px] !border !border-[rgba(36,36,38,0.12)]',
    alert: '!rounded-[12px] !border-0 !bg-[rgba(190,70,60,0.13)]',
    alertText: 'text-[#a4433a]',
  },
};

const PITCH: [string, string][] = [
  ['Каталог закрытых бет', 'DevTools, AI, Web3, FinTech и мобильные приложения'],
  ['Четыре способа проверки', 'Код, email, запись экрана или webhook'],
  ['Награды кодами', 'Лицензии и API-кредиты за принятые отчёты'],
  ['Один аккаунт', 'Роль тестера или фаундера переключается в шапке'],
];

function AuthFrame({ children, alt }: { children: ReactNode; alt: { to: string; quiet: string; cta: string } }) {
  const { t } = useLocale();
  return (
    <div className="lp lp-auth">
      <div className="lp-auth__nav">
        <nav className="lp-nav">
          <Link className="lp-nav__brand" href="/">Betadrop</Link>
          <span className="lp-auth__gap" />
          <div className="lp-nav__right">
            <LangPills />
            <Link className="lp-nav__login" href={alt.to}>{t(alt.quiet)}</Link>
            <Btn to={alt.to} label={t(alt.cta)} size="sm" />
          </div>
        </nav>
      </div>
      <div className="lp-auth__body">
        <div className="lp-auth__card">
          <aside className="lp-auth__pitch">
            <h2 className="lp-d5">{t('Инженерный фидбек для софта. Награды за принятые отчёты.')}</h2>
            <ul className="lp-auth__list">
              {PITCH.map(([b, s]) => (
                <li key={b}>
                  <span className="lp-auth__mark"><Check strokeWidth={2.2} /></span>
                  <span><b>{t(b)}</b><span>{t(s)}</span></span>
                </li>
              ))}
            </ul>
            <p className="lp-auth__foot">Betadrop</p>
          </aside>
          <div className="lp-auth__form">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame alt={{ to: '/sign-up', quiet: 'Нет аккаунта?', cta: 'Регистрация' }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame alt={{ to: '/sign-in', quiet: 'Уже есть аккаунт?', cta: 'Войти' }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app/explore" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

const p = (C: () => ReactNode) => () => <Private><C /></Private>;
const PDash = p(TesterDashboard);
const PVault = p(Vault);
const PFCampaigns = p(FounderCampaigns);
const PNew = p(NewCampaign);
const PSubs = p(FounderSubmissions);
const PInt = p(Integrations);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  const { language, t } = useLocale();
  const [path] = useLocation();
  useEffect(() => {
    const section = path.startsWith('/sign-in') ? 'Вход'
      : path.startsWith('/sign-up') ? 'Регистрация'
      : path === '/pricing' ? 'Тарифы'
      : path === '/docs' ? 'Документация'
      : path.includes('/vault') ? 'Награды'
      : path.includes('/profile') ? 'Профиль'
      : path.includes('/submissions') ? 'Входящие'
      : path.includes('/integrations') ? 'Интеграции'
      : path.includes('/campaigns/new') ? 'Новая кампания'
      : path.startsWith('/app/founder/campaigns') ? 'Кампании'
      : path.startsWith('/app/campaigns/') ? 'Тест'
      : path.includes('/dashboard') ? 'Мои тесты'
      : path.includes('/explore') ? 'Каталог тестов' : 'Инженерный фидбек для софта.';
    const title = `${t(section)} | Betadrop`;
    const description = t('Бета-тесты для софта: баг-репорты от технических тестеров, награды за принятые отчёты.');
    document.title = title;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      document.querySelector(selector)?.setAttribute('content', description);
    }
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(selector)?.setAttribute('content', title);
    }
  }, [path, language, t]);
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/docs" component={Docs} />
        <Route path="/app/explore" component={Explore} />
        <Route path="/app/campaigns/:id" component={CampaignPage} />
        <Route path="/app/tester/dashboard" component={PDash} />
        <Route path="/app/tester/vault" component={PVault} />
        <Route path="/app/tester/profile/:username" component={ProfilePage} />
        <Route path="/app/founder/campaigns/new" component={PNew} />
        <Route path="/app/founder/campaigns" component={PFCampaigns} />
        <Route path="/app/founder/submissions" component={PSubs} />
        <Route path="/app/founder/settings/integrations" component={PInt} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const { language, t } = useLocale();
  const [, setLocation] = useLocation();
  const authLocale = clerkLocales[language];

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...authLocale,
        signIn: { ...authLocale.signIn, start: { ...authLocale.signIn?.start, title: t('Вход в Betadrop'), subtitle: t('С возвращением') } },
        signUp: { ...authLocale.signUp, start: { ...authLocale.signUp?.start, title: t('Регистрация в Betadrop'), subtitle: t('Один аккаунт для тестера и фаундера') } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppStateProvider>
          <TooltipProvider>
            <Routes />
            <Toaster />
          </TooltipProvider>
        </AppStateProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
