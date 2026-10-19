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

function AuthFrame({ children, k }: { children: ReactNode; k: string }) {
  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_1fr] bg-background">
      <div className="hidden lg:flex flex-col justify-between border-r border-border p-10 grid-bg">
        <Logo />
        <div>
          <div className="label-k">{k}</div>
          <h1 className="text-4xl font-bold tracking-tight mt-3 leading-tight">Инженерный фидбек.<br /><span className="text-primary">Реальные награды.</span></h1>
          <div className="mono text-[12px] mt-8 panel p-4 flex flex-col gap-1.5 max-w-md">
            <span><span className="text-live">auth.session</span> <span className="text-muted-foreground">ожидание входа</span></span>
            <span><span className="text-streak">trust.init</span> <span className="text-muted-foreground">50 / xp 0 / streak 0</span></span>
            <span><span className="text-primary">vault.ready</span> <span className="text-muted-foreground">награды появятся после ревью</span></span>
          </div>
        </div>
        <div className="meta">BETADROP</div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame k="вход">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame k="регистрация">
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
const PProfile = p(ProfilePage);
const PFCampaigns = p(FounderCampaigns);
const PNew = p(NewCampaign);
const PSubs = p(FounderSubmissions);
const PInt = p(Integrations);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
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
        <Route path="/app/tester/profile/:username" component={PProfile} />
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
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Вход в BETADROP', subtitle: 'Продолжите тестирование и ревью' } },
        signUp: { start: { title: 'Аккаунт BETADROP', subtitle: 'Тестируйте продукты и получайте награды' } },
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
