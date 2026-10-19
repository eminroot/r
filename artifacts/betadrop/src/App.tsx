import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppStateProvider } from '@/lib/app';
import { Logo, Private } from '@/components/shell';
import Landing from '@/pages/landing';
import Explore from '@/pages/explore';
import CampaignPage from '@/pages/campaign';
import Pricing from '@/pages/pricing';
import { TesterDashboard, Vault, ProfilePage } from '@/pages/tester';
import { FounderCampaigns, NewCampaign, FounderSubmissions } from '@/pages/founder';
import { Integrations, Docs } from '@/pages/info';
import { useLocale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
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
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(var(--primary))',
    colorForeground: 'hsl(var(--foreground))',
    colorMutedForeground: 'hsl(var(--muted-foreground))',
    colorDanger: 'hsl(var(--destructive))',
    colorBackground: 'hsl(var(--surface))',
    colorInput: 'hsl(var(--surface))',
    colorInputForeground: 'hsl(var(--foreground))',
    colorNeutral: 'hsl(var(--foreground))',
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, sans-serif",
    borderRadius: '0px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-surface border border-border !rounded-none w-[420px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none border-t border-border',
    headerTitle: 'text-foreground text-lg font-semibold tracking-tight',
    headerSubtitle: 'text-muted-foreground text-sm',
    socialButtonsBlockButtonText: 'text-foreground text-sm font-medium',
    formFieldLabel: 'text-foreground text-xs font-medium',
    footerActionLink: 'text-primary font-medium',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground font-mono text-[11px]',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-live',
    alertText: 'text-foreground',
    logoBox: 'h-9 justify-start',
    logoImage: 'h-9 w-9',
    socialButtonsBlockButton: '!rounded-none border border-border bg-surface',
    formButtonPrimary: '!rounded-none bg-primary text-primary-foreground !shadow-none',
    formFieldInput: '!rounded-none border border-input bg-surface text-foreground',
    footerAction: 'bg-background',
    dividerLine: 'bg-border',
    alert: '!rounded-none border border-destructive/40',
    otpCodeFieldInput: '!rounded-none border border-input',
    formFieldRow: 'gap-3',
    main: 'gap-5',
  },
};

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="relative min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-background">
      <div className="absolute top-3 right-4 z-10"><LanguageSwitcher /></div>
      <div className="hidden lg:flex flex-col justify-between border-r border-border p-10">
        <Logo />
        <div className="max-w-md">
          <h1 className="t-h1">{t('Инженерный фидбек для софта.')}</h1>
          <ul className="mt-6 flex flex-col gap-3 t-body muted">
            <li>{t('Тестеры получают лицензии и API-кредиты за принятые отчёты.')}</li>
            <li>{t('Фаундеры получают воспроизводимые баг-репорты и разборы онбординга.')}</li>
            <li>{t('Один аккаунт: роль переключается в шапке.')}</li>
          </ul>
        </div>
        <span className="meta">BETADROP</span>
      </div>
      <div className="min-w-0 flex items-center justify-center px-4 py-20">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame>
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
    const title = `${t(section)} | BETADROP`;
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
        signIn: { ...authLocale.signIn, start: { ...authLocale.signIn?.start, title: t('Вход в BETADROP'), subtitle: t('С возвращением') } },
        signUp: { ...authLocale.signUp, start: { ...authLocale.signUp?.start, title: t('Регистрация в BETADROP'), subtitle: t('Один аккаунт для тестера и фаундера') } },
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
