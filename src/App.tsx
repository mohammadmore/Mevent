import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Sun, Moon, MapPin, Sparkles, Search, Plane, Bell, WifiOff } from 'lucide-react';
import DockMenu from './components/DockMenu';
import { CheckoutModal } from './components/CheckoutModal';
import { PhoneLogin } from './components/PhoneLogin';
import { useAuth, rememberInviteCode } from './lib/AuthContext';
import { AppDataProvider, useAppData, RETURN_TO_KEY } from './lib/appData';
import { navigate, useLocation, matchPath, goBack } from './lib/router';
import { api, showToast } from './lib/apiClient';
import { pNum } from './lib/format';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { LegalScreen, LEGAL_PATHS } from './screens/LegalScreen';
import { FreeScreen } from './screens/FreeScreen';
import { EventRoute, PlaceRoute, VibeRoute, ChainRoute, FlowRoute, OrganizerRoute, rememberEntity } from './screens/EntityRoutes';

// Heavy, rarely used screens load on demand so the first visit stays fast on mobile.
const HubsPanel = lazy(() => import('./components/HubsPanel').then(m => ({ default: m.HubsPanel })));
const TicketsScreen = lazy(() => import('./screens/TicketsScreen').then(m => ({ default: m.TicketsScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const SupportScreen = lazy(() => import('./screens/SupportScreen').then(m => ({ default: m.SupportScreen })));
const BoredScreen = lazy(() => import('./screens/BoredScreen').then(m => ({ default: m.BoredScreen })));
const FriendsScreen = lazy(() => import('./screens/FriendsScreen').then(m => ({ default: m.FriendsScreen })));
const TogetherScreen = lazy(() => import('./screens/FriendsScreen').then(m => ({ default: m.TogetherScreen })));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OrganizerPanel = lazy(() => import('./components/OrganizerPanel'));
const CreatePanel = lazy(() => import('./components/CreatePanel'));
const MapComponent = lazy(() => import('./components/MapComponent'));
const TripPlannerModal = lazy(() => import('./components/TripPlannerModal'));
const QuickSearch = lazy(() => import('./components/QuickSearch'));
const Onboarding = lazy(() => import('./components/Onboarding'));

const OVERLAY_ROUTES: Array<[string, (p: Record<string, string>) => React.ReactNode]> = [
  ['/events/:id', p => <EventRoute id={p.id} />],
  ['/places/:id', p => <PlaceRoute id={p.id} />],
  ['/vibes/:id', p => <VibeRoute id={p.id} />],
  ['/chains/:id', p => <ChainRoute id={p.id} />],
  ['/flows/:id', p => <FlowRoute id={p.id} />],
  ['/organizers/:id', p => <OrganizerRoute id={p.id} />],
];

// Screens anyone can open (e.g. from a shared link); the rest ask for sign-in first.
const PUBLIC_PATHS = ['/', '/map', '/login', '/hubs', '/trip-planner', '/bored', '/free', ...LEGAL_PATHS];
// Screens that need an account. Anything else that is unknown gets "page not found", not a login wall.
const PRIVATE_PATHS = ['/tickets', '/saved', '/profile', '/notifications', '/support', '/friends', '/organizer', '/admin', '/create', '/onboarding'];
const isPrivatePath = (path: string) =>
  PRIVATE_PATHS.includes(path) || !!matchPath('/support/:id', path) || !!matchPath('/together/:id', path);
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.includes(path) || OVERLAY_ROUTES.some(([p]) => matchPath(p, path)) ||
  !!matchPath('/trips/:id', path) || !!matchPath('/invite/:code', path) || !!matchPath('/hubs/:id', path);

function tabForPath(path: string) {
  if (path.startsWith('/hubs')) return 'hubs';
  if (path === '/create') return 'create';
  if (path === '/friends' || path.startsWith('/together/')) return 'friends';
  if (['/profile', '/tickets', '/saved', '/organizer', '/admin', '/notifications', '/support'].includes(path) || path.startsWith('/support/')) return 'profile';
  return 'discover';
}

const TAB_PATHS: Record<string, string> = { discover: '/', hubs: '/hubs', create: '/create', friends: '/friends', profile: '/profile' };

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-[#d9ff00]" />
    </div>
  );
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function LoginScreen() {
  const { login, isLoggingIn, loginBlockedReason, config, prepareGoogle } = useAuth();
  useEffect(() => { prepareGoogle(); }, [prepareGoogle]);
  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center space-y-5 py-6">
      <div className="w-20 h-20 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-3xl flex items-center justify-center text-teal-600 dark:text-[#d9ff00] rotate-12">
        <Sparkles className="w-10 h-10" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-[#515739] dark:text-gray-100 mb-2">میونت</h1>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">هر وقت حوصله‌ت سر رفت، یه برنامه‌ی خوب و یه همراه پیدا کن</p>
      </div>

      {config?.phone !== false && <PhoneLogin />}

      {config?.google && (
        <div className="w-full max-w-sm mx-auto space-y-3">
          {config?.phone !== false && (
            <div className="flex items-center gap-3 text-xs text-gray-400"><span className="flex-1 h-px bg-gray-200 dark:bg-white/10" /> یا <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" /></div>
          )}
          {loginBlockedReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{loginBlockedReason}</p>
          ) : (
            <button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 py-3 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-100 shadow-sm disabled:opacity-50 text-sm"
            >
              {isLoggingIn ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600" /> : 'ورود با حساب گوگل'}
            </button>
          )}
        </div>
      )}

      {config && !config.phone && !config.google && (
        <p className="text-sm text-red-600">ورود به حساب موقتاً در دسترس نیست.</p>
      )}
      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
        ورود یا ثبت‌نام به معنای پذیرش{' '}
        <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }} className="text-teal-600 dark:text-[#d9ff00] font-bold">قوانین</a> و{' '}
        <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }} className="text-teal-600 dark:text-[#d9ff00] font-bold">حریم خصوصی</a> میونت است.
      </p>
      <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:underline px-4 py-2.5">فعلاً برنامه‌ها رو ببینم</button>
    </div>
  );
}

function Shell() {
  const { user, dbUserId, loading } = useAuth();
  const { profile, profileLoaded, unreadCount, requireLogin } = useAppData();
  const { pathname } = useLocation();
  const online = useOnline();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('mevent_theme');
      return saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    } catch { return true; }
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const lastTabPath = useRef('/');
  const onboardingChecked = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try { localStorage.setItem('mevent_theme', isDarkMode ? 'dark' : 'light'); } catch {}
  }, [isDarkMode]);

  // Custom events still dispatched by detail components ("similar events", "nearby places").
  useEffect(() => {
    const toEvent = (e: any) => { if (e.detail?.id) navigate(`/events/${e.detail.id}`); };
    const toPlace = (e: any) => { if (e.detail?.id) { rememberEntity('place', e.detail); navigate(`/places/${e.detail.id}`); } };
    window.addEventListener('navToEvent', toEvent);
    window.addEventListener('navToPlace', toPlace);
    return () => { window.removeEventListener('navToEvent', toEvent); window.removeEventListener('navToPlace', toPlace); };
  }, []);

  // /invite/CODE: remember the code for sign-up, then continue into the app.
  const invite = matchPath('/invite/:code', pathname);
  useEffect(() => {
    if (!invite || loading) return;
    rememberInviteCode(invite.code);
    if (!dbUserId) showToast('به میونت خوش آمدید! با ورود، ۵۰ امتیاز هدیه می‌گیرید.', 'success');
    // Already a member: a friend's link makes you friends.
    else api<{ message: string }>('/api/friends/by-code', { body: { code: invite.code }, silent: true })
      .then(r => showToast(r.message, 'success')).catch(() => {});
    navigate(dbUserId ? '/friends' : '/login', { replace: true });
  }, [invite?.code, loading]);

  // Sign-in wall for private screens; after sign-in, return to where the visitor was.
  useEffect(() => {
    if (loading || invite) return;
    if (!user && !isPublicPath(pathname) && isPrivatePath(pathname)) {
      try { sessionStorage.setItem(RETURN_TO_KEY, pathname + window.location.search); } catch {}
      navigate('/login', { replace: true });
    } else if (user && dbUserId && pathname === '/login') {
      let target = '/';
      try { target = sessionStorage.getItem(RETURN_TO_KEY) || '/'; sessionStorage.removeItem(RETURN_TO_KEY); } catch {}
      navigate(target, { replace: true });
    }
  }, [loading, user, dbUserId, pathname]);

  // First visit after sign-up: pick interests.
  useEffect(() => {
    if (!profile || !profileLoaded || onboardingChecked.current) return;
    onboardingChecked.current = true;
    let prefs = profile.preferences;
    if (typeof prefs === 'string') { try { prefs = JSON.parse(prefs); } catch { prefs = []; } }
    if ((!Array.isArray(prefs) || prefs.length === 0) && pathname === '/') navigate('/onboarding', { replace: true });
  }, [profile, profileLoaded]);

  const requestLocation = () => {
    if (userLocation) { setUserLocation(null); return; }
    if (!('geolocation' in navigator)) { showToast('مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.', 'warning'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); },
      (error) => {
        setIsLocating(false);
        showToast(error.code === error.PERMISSION_DENIED
          ? 'دسترسی به موقعیت مکانی داده نشد. برای پیشنهادهای نزدیک، دسترسی مکان را در مرورگر مجاز کنید.'
          : 'موقعیت شما پیدا نشد. دوباره تلاش کنید.', 'warning');
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  if (loading || (user && !dbUserId)) return <Spinner />;

  const overlay = OVERLAY_ROUTES.map(([pattern, render]) => {
    const params = matchPath(pattern, pathname);
    return params ? render(params) : null;
  }).find(Boolean);
  const tripMatch = matchPath('/trips/:id', pathname);
  const tripOpen = pathname === '/trip-planner' || !!tripMatch;
  // Keep the previous screen mounted under overlays so Back returns to the same scroll position.
  if (!overlay && !tripOpen) lastTabPath.current = pathname;
  const screenPath = overlay || tripOpen ? lastTabPath.current : pathname;
  const hubMatch = matchPath('/hubs/:id', screenPath);
  const isAdmin = profile?.role === 'ADMIN';
  const isOrganizer = profile?.role === 'ORGANIZER' || isAdmin;
  const bare = screenPath === '/login' || screenPath === '/onboarding';
  const card = 'bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 mx-auto w-full';

  const screen = (() => {
    switch (true) {
      case screenPath === '/login': return <LoginScreen />;
      case screenPath === '/onboarding':
        return dbUserId ? <div className="max-w-2xl mx-auto w-full"><Onboarding userId={dbUserId} onComplete={() => navigate('/', { replace: true })} /></div> : null;
      case screenPath === '/map':
        return (
          <div className="h-full min-h-[400px]">
            <MapComponent
              events={[]}
              userLocation={userLocation}
              onEventSelect={(e) => navigate(`/events/${e.id}`)}
              onPlaceSelect={(p) => { rememberEntity('place', p); navigate(`/places/${p.id}`); }}
              onVibeSelect={(v) => { rememberEntity('vibe', v); navigate(`/vibes/${v.id}`); }}
            />
          </div>
        );
      case screenPath === '/hubs' || !!hubMatch:
        return <HubsPanel selectedHubId={hubMatch ? Number(hubMatch.id) : null} onOpenHub={(id: number) => navigate(`/hubs/${id}`)} onBack={() => goBack('/hubs')} />;
      case screenPath === '/tickets' || screenPath === '/saved': return <TicketsScreen />;
      case screenPath === '/profile': return <ProfileScreen />;
      case screenPath === '/notifications': return <NotificationsScreen />;
      case LEGAL_PATHS.includes(screenPath): return <LegalScreen path={screenPath} />;
      case screenPath === '/support': return <SupportScreen />;
      case screenPath === '/bored': return <BoredScreen userLocation={userLocation} />;
      case screenPath === '/free': return <FreeScreen userLocation={userLocation} />;
      case screenPath === '/friends': return <FriendsScreen />;
      case !!matchPath('/together/:id', screenPath): return <TogetherScreen id={Number(matchPath('/together/:id', screenPath)!.id)} />;
      case !!matchPath('/support/:id', screenPath): return <SupportScreen ticketId={Number(matchPath('/support/:id', screenPath)!.id)} />;
      case screenPath === '/create':
        return isOrganizer
          ? <div className={`${card} max-w-2xl`}><CreatePanel onSuccess={() => navigate('/organizer')} /></div>
          : <p className="text-center text-gray-500 py-10">برای ایجاد رویداد به حساب برگزارکننده نیاز دارید. از صفحه پروفایل درخواست دهید.</p>;
      case screenPath === '/organizer':
        return isOrganizer ? <div className={`${card} max-w-5xl`}><OrganizerPanel userId={dbUserId} /></div> : <Spinner />;
      case screenPath === '/admin':
        return isAdmin ? <div className={`${card} max-w-5xl`}><AdminPanel /></div> : <Spinner />;
      case screenPath === '/':
        return (
          <DiscoverScreen
            userLocation={userLocation}
            onPlanTrip={() => navigate('/trip-planner')}
            onOpenPlace={(p) => { rememberEntity('place', p); navigate(`/places/${p.id}`); }}
            onOpenFlow={(f) => { rememberEntity('flow', f); navigate(`/flows/${f.id}`); }}
            onOpenVibe={(v) => { rememberEntity('vibe', v); navigate(`/vibes/${v.id}`); }}
            onOpenChain={(c) => { rememberEntity('chain', c); navigate(`/chains/${c.id}`); }}
          />
        );
      default:
        return (
          <div className="text-center py-16 px-4 max-w-sm mx-auto">
            <p className="text-5xl mb-4" aria-hidden>🧭</p>
            <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">این صفحه رو پیدا نکردیم</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">شاید لینک اشتباه باشه یا صفحه برداشته شده. ولی می‌تونیم یه برنامه‌ی خوب پیدا کنیم:</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/bored')} className="py-3 rounded-2xl bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black font-bold">حوصله‌م سر رفته، یه چیزی پیشنهاد بده</button>
              <button onClick={() => navigate('/')} className="py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 font-bold text-sm">صفحه اصلی</button>
            </div>
          </div>
        );
    }
  })();

  return (
    <div className="min-h-screen transition-colors duration-500 bg-white dark:bg-[#0f0f11] flex justify-center font-sans text-right text-gray-900 dark:text-gray-100" dir="rtl">
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-[#141417] h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative border-x border-gray-100 dark:border-white/5">
        {!bare && (
          <DockMenu
            activeTab={tabForPath(screenPath)}
            setActiveTab={(tab: string) => navigate(TAB_PATHS[tab] || '/')}
            profile={profile}
            setShowQuickSearch={setShowSearch}
          />
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[120px]">
          {!online && (
            <div className="bg-amber-500 text-black text-xs font-bold px-4 py-2 flex items-center gap-2 justify-center" role="status">
              <WifiOff className="w-4 h-4" /> آفلاین هستید؛ آخرین اطلاعات ذخیره‌شده نمایش داده می‌شود.
            </div>
          )}
          {!bare && (
            <header className="pt-10 md:pt-6 pb-3 px-4 sm:px-6 bg-white/90 dark:bg-[#18181b] border-b border-gray-200 dark:border-white/10 z-10 sticky top-0">
              <div className="flex justify-between items-center w-full">
                <div>
                  <button onClick={() => navigate('/')} className="text-2xl font-bold text-[#515739] dark:text-gray-100">میونت</button>
                  <button
                    onClick={requestLocation}
                    disabled={isLocating}
                    aria-pressed={!!userLocation}
                    className={`text-xs font-medium mt-1 -mr-2 px-2 min-h-[36px] rounded-full flex items-center gap-1 disabled:opacity-50 ${userLocation ? 'text-teal-700 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10' : 'text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-[#d9ff00]'}`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {isLocating ? 'در حال پیدا کردن...' : userLocation ? 'اطراف من · لغو' : 'نزدیک من'}
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => navigate('/trip-planner')} className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-[#d9ff00] dark:to-lime-400 text-white dark:text-black px-3.5 py-2 rounded-full shadow-sm shrink-0">
                    <Plane className="w-4 h-4" /> <span className="hidden sm:inline">برنامه سفر</span>
                  </button>
                  <button onClick={() => setShowSearch(true)} aria-label="جستجو" className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300">
                    <Search className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} aria-label={isDarkMode ? 'حالت روشن' : 'حالت تیره'} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300">
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  {dbUserId ? (
                    <button onClick={() => navigate('/notifications')} aria-label={`اعلان‌ها${unreadCount ? ` (${unreadCount} خوانده‌نشده)` : ''}`} className={`w-10 h-10 rounded-full flex items-center justify-center relative ${screenPath === '/notifications' ? 'bg-teal-600/20 text-teal-600 dark:bg-[#d9ff00]/20 dark:text-[#d9ff00]' : 'bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300'}`}>
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#18181b]">{pNum(Math.min(unreadCount, 99))}</span>}
                    </button>
                  ) : (
                    <button onClick={() => navigate('/login')} className="text-xs font-bold px-3 py-2 rounded-full bg-gray-100 dark:bg-[#1f1f23]">ورود</button>
                  )}
                </div>
              </div>
            </header>
          )}

          <main className="flex-1 overflow-y-auto px-6 py-6 pb-24 md:pb-6 scroll-smooth">
            <Suspense fallback={<Spinner />}>{screen}</Suspense>
          </main>
        </div>

        {showSearch && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-[#141417] flex flex-col">
            <Suspense fallback={<Spinner />}><QuickSearch onClose={() => setShowSearch(false)} /></Suspense>
          </div>
        )}

        {overlay}
        <CheckoutModal />
        {tripOpen && (
          <Suspense fallback={null}>
            <TripPlannerModal
              isOpen
              sharedTripId={tripMatch?.id}
              onClose={() => goBack('/')}
              userProfile={profile}
              onSelectEvent={(e: any) => navigate(`/events/${e.id}`)}
              onSelectPlace={(p: any) => { rememberEntity('place', p); navigate(`/places/${p.id}`); }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  );
}
