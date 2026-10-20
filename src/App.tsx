import DockMenu from './components/DockMenu';
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Filter, Trash2, X, Shield, Activity, MapPin, Calendar, CheckCircle, Search, Compass, Heart, User, PlusCircle, Bookmark, Star, Sparkles, MessageCircle, Users, CreditCard, ExternalLink, Music, Palette, Monitor, Briefcase, Ticket, LogOut, Share2, LogIn, CalendarPlus, Settings, Map, Clock, Plane } from "lucide-react";
import { Event } from './types';
import { getEventBackgroundIcon } from './lib/icons';
import CreatePanel from './components/CreatePanel';
import OrganizerPanel from './components/OrganizerPanel';
import { OrganizerPublicProfile } from './components/OrganizerPublicProfile';
import AdminPanel from './components/AdminPanel';
import MapComponent from './components/MapComponent';
import DiscoveryHeader from './components/DiscoveryHeader';
import Onboarding from './components/Onboarding';
import AiAssistant from './components/AiAssistant';
import { EventDetail } from './components/EventDetail';
import { PlaceDetail } from './components/PlaceDetail';
import { VibeDetail } from './components/VibeDetail';
import { ChainDetail } from './components/ChainDetail';
import { FlowDetail } from './components/FlowDetail';
import { ToastContainer, useToast } from './components/Toast';
import GamificationPanel from './components/GamificationPanel';
import { useAuth } from './lib/AuthContext';
import { HubsPanel } from './components/HubsPanel';
import TripPlannerModal from './components/TripPlannerModal';



const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const p = 0.017453292519943295;    // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  const km = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  return km < 1 ? Math.round(km * 1000) + ' متر' : km.toFixed(1) + ' کیلومتر';
};
const formatEventDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'زمان نامشخص';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'زمان نامشخص';
    const parts = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', calendar: 'persian' }).formatToParts(d);
    const dict = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const datePart = `${dict.weekday} ${dict.day} ${dict.month} ${dict.year}`;
    const timePart = new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short', calendar: 'persian' }).format(d);
    return `${datePart} • ${timePart}`;
  } catch (e) {
    return 'زمان نامشخص';
  }
};
import { ProfileEditModal } from './components/ProfileEditModal';
import { PriceWidget } from './components/PriceWidget';

export default function App() {

  useEffect(() => {
    const handleNavToEvent = (e: any) => {
      setSelectedEvent(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleNavToPlace = (e: any) => {
      setSelectedPlace(e.detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('navToEvent', handleNavToEvent);
    window.addEventListener('navToPlace', handleNavToPlace);
    return () => {
      window.removeEventListener('navToEvent', handleNavToEvent);
      window.removeEventListener('navToPlace', handleNavToPlace);
    };
  }, []);
  const { user, dbUserId, loading, isLoggingIn, login, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mevent_theme');
    return saved ? saved === 'dark' : true;
  });
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mevent_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mevent_theme', 'light');
    }
  }, [isDarkMode]);

  const [events, setEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'events' | 'places'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'weekend'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  const [hubs, setHubs] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [buyingTicketId, setBuyingTicketId] = useState<number | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [paymentEvent, setPaymentEvent] = useState<Event | null>(null);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<any | null>(null);
  const [selectedChain, setSelectedChain] = useState<any | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<any | null>(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<number | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showTripPlannerModal, setShowTripPlannerModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);


  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };


  const [crawlerUrl, setCrawlerUrl] = useState('https://calendar.iranfair.com/fa');

  const handleCreateHub = async () => {
    if (!dbUserId) return;
    const name = prompt('نام جامعه را وارد کنید:');
    if (!name) return;
    try {
      const res = await fetch('/api/hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: 'جامعه جدید من', type: 'عمومی', ownerId: dbUserId })
      });
      if (res.ok) {
        fetchHubs();
      }
    } catch (e) {
      showToast('خطا در ایجاد جامعه');
    }
  };

  const runCrawler = async () => {
    setIsCrawling(true);
    try {
      const res = await fetch('/api/crawler/run', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlerUrl })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'خزشگر با موفقیت انجام شد.');
        fetchEvents();
      } else {
        showToast('خطا در اجرای خزشگر.');
      }
    } catch (e) {
      showToast('خطای شبکه.');
    } finally {
      setIsCrawling(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      setActiveTab('login');
    } else if (!loading && user && dbUserId && (activeTab === 'login' || activeTab === 'loading')) {
      fetchProfile();
    }
  }, [user, dbUserId, loading, activeTab]);

  const requestLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          if (error.code === error.PERMISSION_DENIED) {
             showToast("دسترسی به موقعیت مکانی داده نشد. برای دریافت پیشنهادهای نزدیک، دسترسی مکان را در مرورگر مجاز کنید.");
          }
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  function fetchEvents() {
    if (!dbUserId) return;
    
    setIsRefreshing(true);
    let url = `/api/events/recommendations?userId=${dbUserId}`;
    if (userLocation) {
      url = `/api/events/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=20`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setEvents(Array.isArray(data?.data) ? data.data : []);
      })
      .finally(() => {
        setTimeout(() => setIsRefreshing(false), 500); // Visual delay
      });
  };

  useEffect(() => {
    if (userLocation && activeTab === 'discover') {
      fetchEvents();
    }
  }, [userLocation]);

  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    
    if (event.cost === 0) {
      handleInteraction(event.id, 'RSVP');
      return;
    }
    
    setPaymentEvent(event);
  };

  const [buyForFriend, setBuyForFriend] = useState(false);
  const executePayment = async () => {
    if (!dbUserId || !paymentEvent) return;
    setBuyingTicketId(paymentEvent.id);
    
    // Viral feature: 10% discount on second ticket if buying for a friend.
    // The price is computed on the server; the client only says which event and whether it is for two.
    try {
      const res = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: paymentEvent.id,
          plusOne: buyForFriend
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(buyForFriend ? 'بلیت شما و دوستتان با موفقیت خریداری شد!' : 'خرید بلیت با موفقیت انجام شد', 'success');
        if (buyForFriend) {
          addToast('۲۰ امتیاز جایزه برای دعوت دوست دریافت کردید!', 'info');
        }

        // The server registers the RSVP together with the ticket.
        const boughtEvent = paymentEvent;
        if (!rsvpEvents.some(e => e.id === boughtEvent.id)) {
          setRsvpEvents(prev => [...prev, boughtEvent]);
        }
        fetchRsvpEvents();
        fetchTickets();
        setPaymentEvent(null); 
        setBuyForFriend(false);
      } else {
        addToast(data?.error || 'خطا در خرید بلیت', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setBuyingTicketId(null);
    }
  };

  function fetchSavedEvents() {
    if (!dbUserId) return;
    fetch(`/api/users/${dbUserId}/saved`)
      .then(res => res.json())
      .then(data => setSavedEvents(Array.isArray(data?.data) ? data.data : [])).catch(console.error);
  };
  function fetchRsvpEvents() {
    if (!dbUserId) return;
    fetch(`/api/users/${dbUserId}/rsvped`)
      .then(res => res.json())
      .then(data => setRsvpEvents(Array.isArray(data?.data) ? data.data : [])).catch(console.error);
  };

  function fetchTickets() {
    if (!dbUserId) return;
    fetch(`/api/users/${dbUserId}/tickets`)
      .then(res => res.json())
      .then(data => setMyTickets(Array.isArray(data?.data) ? data.data : [])).catch(console.error);
  };

  function fetchHubs() {
    fetch(`/api/hubs`)
      .then(res => res.json())
      .then(data => setHubs(Array.isArray(data?.data) ? data.data : [])).catch(console.error);
  };

  function fetchProfile() {
    if (!dbUserId) return;
    fetchSavedEvents();
    fetchRsvpEvents();
    fetch(`/api/users/${dbUserId}/profile`)
      .then(res => res.json())
      .then(data => {
        setProfile(data.data);
        if (activeTab === 'loading' || activeTab === 'login') {
          const prefs = data.data?.preferences;
          const parsedPrefs = typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
          if (!parsedPrefs || parsedPrefs.length === 0) {
            setActiveTab('onboarding');
          } else {
            setActiveTab('discover');
          }
        }
      });
  };

  useEffect(() => {
    setSelectedEvent(null);
    if (activeTab === 'loading') {
      fetchProfile();
    } else {
      if (activeTab === 'discover') fetchEvents();
      if (activeTab === 'saved') {
        fetchSavedEvents();
        fetchRsvpEvents();
        fetchTickets();
      }
      if (activeTab === 'profile') fetchProfile();
      if (activeTab === 'hubs') fetchHubs();
    }
  }, [activeTab]);

  const handleInteraction = (eventId: number, type: string) => {
    if (!dbUserId) return;

    const event = (events || []).find(e => e.id === eventId) || savedEvents.find(e => e.id === eventId) || rsvpEvents.find(e => e.id === eventId);

    if (type === 'SAVE') {
      const isSaved = savedEvents.some(e => e.id === eventId);
      if (isSaved) {
        setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      } else if (event) {
        setSavedEvents(prev => [...prev, event]);
      }
    } else if (type === 'RSVP') {
      const isRsvp = rsvpEvents.some(e => e.id === eventId);
      if (isRsvp) {
        setRsvpEvents(prev => prev.filter(e => e.id !== eventId));
        showToast('ثبت‌نام شما لغو شد.');
      } else if (event) {
        setRsvpEvents(prev => [...prev, event]);
        showToast('حضور شما ثبت شد و رویداد به قسمت ذخیره شده‌ها اضافه شد.');
      }
    }

    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type })
    }).then(res => {
      // Roll back the optimistic update if the server rejected it.
      if (!res.ok) {
        if (type === 'SAVE') fetchSavedEvents();
        if (type === 'RSVP') fetchRsvpEvents();
        showToast('ثبت تغییر با خطا مواجه شد.', 'error');
      }
    }).catch(() => {
      if (type === 'SAVE') fetchSavedEvents();
      if (type === 'RSVP') fetchRsvpEvents();
    });
  };

  const filteredEvents = (events || []).filter(e => {
    const matchesSearch = (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.tags && e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = activeCategory === 'all' || (e.tags && e.tags.includes(activeCategory));
    
    let matchesPrice = true;
    if (priceFilter === 'free') matchesPrice = e.cost === 0;
    if (priceFilter === 'paid') matchesPrice = e.cost > 0;
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      const today = new Date().setHours(0,0,0,0);
      const eventDate = new Date(e.startTime).setHours(0,0,0,0);
      matchesDate = today === eventDate;
    } else if (dateFilter === 'weekend') {
      const day = new Date(e.startTime).getDay();
      matchesDate = day === 4 || day === 5; // Thursday, Friday in Iran
    }
    
    return matchesSearch && matchesCategory && matchesPrice && matchesDate;
  });

    const categories = useMemo(() => Array.from(new Set(events.flatMap(e => {
    if (!e.tags) return [];
    if (typeof e.tags === 'string') {
      try {
        const parsed = JSON.parse(e.tags);
        return Array.isArray(parsed) ? parsed : [e.tags];
      } catch (err) {
        return [e.tags];
      }
    }
    if (Array.isArray(e.tags)) return e.tags;
    return [];
  }))).filter(Boolean), [events]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
    showToast('رویدادها بروزرسانی شدند', 'success');
  };

  return (
    <div className="min-h-screen transition-colors duration-500 bg-white dark:bg-[#0f0f11] flex justify-center font-sans text-right text-gray-900 dark:text-gray-100" dir="rtl">
      <div className="w-full max-w-7xl mx-auto bg-white dark:bg-[#141417] h-screen shadow-2xl overflow-hidden flex flex-col md:flex-row relative border-x border-gray-100 dark:border-white/5">

        {/* Responsive Navigation */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (
          <DockMenu activeTab={activeTab} setActiveTab={setActiveTab} profile={profile} setShowAiAssistant={setShowAiAssistant} />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-[120px]">
        {/* Header */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && (
          <div className="pt-10 md:pt-6 pb-4 px-6 bg-white/90 dark:bg-[#18181b] border-b border-gray-200 dark:border-white/10 flex flex-col justify-center z-10 sticky top-0 transition-all duration-300">
            <div className="flex justify-between items-center w-full">
              <div>
                <h1 className="text-2xl font-bold text-[#515739] dark:text-gray-100 md:hidden">Mevent</h1>
                <button 
                  onClick={requestLocation}
                  disabled={isLocating}
                  className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1 flex items-center gap-1 hover:text-teal-600 dark:text-[#d9ff00] transition-colors disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3" /> 
                  {isLocating ? 'در حال یافتن...' : userLocation ? 'موقعیت شما (نزدیک‌ترین‌ها)' : 'ایران، تهران (یافتن من)'}
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowTripPlannerModal(true)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-[#d9ff00] dark:to-lime-400 text-white dark:text-black px-3.5 py-2 rounded-full shadow-sm hover:opacity-90 transition-all shrink-0"
                >
                  <Plane className="w-4 h-4" />
                  برنامه سفر
                </button>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-white/5"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsSearching(!isSearching)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSearching ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00]' : 'bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-white/5'}`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setShowAiAssistant(false); setActiveTab('notifications'); }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${activeTab === 'notifications' ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00]' : 'bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-white/5'}`}
                >
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
              </div>
            </div>
            {isSearching && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <div className="relative">
                <Search className="absolute right-3 top-3 w-5 h-5 text-gray-600 dark:text-gray-400" />
                <input 
                  type="text" 
                  placeholder="جستجوی پاتوق، رویداد، دسته‌بندی و..." 
                  className="w-full bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-[#d9ff00] focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00]/30 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3 top-3 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
                {searchQuery && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSearchType('all')} className={`px-3 py-1 rounded-full text-xs ${searchType === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>همه نتایج</button>
                    <button onClick={() => setSearchType('events')} className={`px-3 py-1 rounded-full text-xs ${searchType === 'events' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>رویدادها</button>
                    <button onClick={() => setSearchType('places')} className={`px-3 py-1 rounded-full text-xs ${searchType === 'places' ? 'bg-teal-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>پاتوق‌ها</button>
                  </div>
                )}
              </div>

            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 md:pb-6 scroll-smooth animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'login' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-20 h-20 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-3xl flex items-center justify-center text-teal-600 dark:text-[#d9ff00] rotate-12">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#515739] dark:text-gray-100  mb-2">Mevent</h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">کشف هوشمند رویدادها و ارتباط با افراد</p>
              </div>
              <button
                onClick={login}
                disabled={isLoggingIn}
                className="w-full max-w-sm mx-auto bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 dark:border-[#d9ff00]"></div>
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    ورود با حساب گوگل
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'loading' && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-[#d9ff00]"></div>
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="h-full">
              <div className="max-w-2xl mx-auto w-full"><Onboarding userId={dbUserId || 1} onComplete={() => setActiveTab('discover')} /></div>
            </div>
          )}

          {activeTab === 'discover' && (
            <div className="space-y-6">
              <DiscoveryHeader onFlowSelect={setSelectedFlow} onVibeSelect={setSelectedVibe} onChainSelect={setSelectedChain} />
              
              {/* Trip Planner Promo Banner */}
              <div className="bg-gradient-to-r from-teal-800 via-emerald-700 to-teal-900 dark:from-[#d9ff00]/15 dark:via-emerald-500/10 dark:to-teal-500/15 border border-teal-600/30 dark:border-[#d9ff00]/30 rounded-2xl p-4 text-white dark:text-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-[#d9ff00]/20 flex items-center justify-center text-white dark:text-[#d9ff00] shrink-0">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white dark:text-gray-100">برنامه‌ریزی هوشمند سفر</h3>
                    <p className="text-xs text-teal-100 dark:text-gray-300 mt-0.5">شهر، تاریخ و علایقت رو بگو؛ پکیج رویدادها و پاتوق‌ها رو یکجا تحویل بگیر!</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTripPlannerModal(true)}
                  className="w-full sm:w-auto bg-white text-teal-900 hover:bg-teal-50 dark:bg-[#d9ff00] dark:text-black dark:hover:bg-lime-400 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  چیدن پکیج سفر
                </button>
              </div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 flex items-center gap-2">
                    {searchQuery ? 'نتایج جستجو' : 'پیشنهادهای ویژه شما'}
                    <button onClick={handleRefresh} className={`p-1.5 rounded-full hover:bg-teal-50 dark:hover:bg-white/5 transition-all ${isRefreshing ? 'animate-spin text-teal-600 dark:text-[#d9ff00]' : 'text-gray-600 dark:text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    </button>
                  </h2>
                  <button 
                    onClick={() => { setShowAiAssistant(false); setActiveTab('map'); }}
                    className="flex items-center gap-2 text-sm font-medium text-teal-600 dark:text-[#d9ff00] bg-teal-600/10 dark:bg-[#d9ff00]/10 px-3 py-1.5 rounded-full hover:bg-teal-600/20 dark:bg-[#d9ff00]/20 transition-colors"
                  >
                    <MapPin className="w-4 h-4" /> روی نقشه
                  </button>
                </div>
                
                {/* Advanced Filters */}
                {searchQuery && (
                  <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${showFilters ? 'bg-teal-600/10 dark:bg-[#d9ff00]/10 border-teal-600/30 dark:border-[#d9ff00]/30 text-teal-600 dark:text-[#d9ff00]' : 'bg-white/90 dark:bg-[#18181b] border-gray-200 dark:border-white/10 text-gray-700'}`}>
                      <Filter className="w-3.5 h-3.5" /> فیلترهای بیشتر
                    </button>
                  </div>
                )}
                
                {showFilters && searchQuery && (
                  <div className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <span className="text-xs font-bold text-gray-700 mb-2 block">هزینه</span>
                      <div className="flex gap-2">
                        {['all', 'free', 'paid'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setPriceFilter(t as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${priceFilter === t ? 'bg-gray-800 dark:bg-[#1f1f23] text-white' : 'bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                          >
                            {t === 'all' ? 'همه' : t === 'free' ? 'رایگان' : 'پولی'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-700 mb-2 block">زمان</span>
                      <div className="flex gap-2">
                        {['all', 'today', 'weekend'].map(t => (
                          <button 
                            key={t}
                            onClick={() => setDateFilter(t as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dateFilter === t ? 'bg-gray-800 dark:bg-[#1f1f23] text-white' : 'bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'}`}
                          >
                            {t === 'all' ? 'همه زمان‌ها' : t === 'today' ? 'امروز' : 'آخر هفته'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Chips */}
                {!searchQuery && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                    >
                      {activeCategory === 'all' && (
                         <motion.div
                            layoutId="active-category"
                            className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                         />
                      )}
                      <span className={`relative z-10 ${activeCategory === 'all' ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>همه</span>
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="relative whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium outline-none transition-colors group"
                      >
                        {activeCategory === cat && (
                           <motion.div
                              layoutId="active-category"
                              className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-full z-0 shadow-sm"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                           />
                        )}
                        <span className={`relative z-10 ${activeCategory === cat ? 'text-white dark:text-black font-bold' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{cat}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
                
                {loading && events.length === 0 && Array(6).fill(0).map((_, i) => (
                  <div key={'skeleton-'+i} className="break-inside-avoid rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b] overflow-hidden animate-pulse">
                    <div className="w-full h-40 bg-teal-100 dark:bg-white/10"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-teal-100 dark:bg-white/10 rounded w-3/4"></div>
                      <div className="h-4 bg-teal-100 dark:bg-white/10 rounded w-full"></div>
                      <div className="h-4 bg-teal-100 dark:bg-white/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
                {!loading && filteredEvents.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                    <Search className="w-16 h-16 text-gray-800 dark:text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-1">رویدادی یافت نشد</h3>
                    <p className="text-gray-600 dark:text-gray-400">با این فیلترها نتیجه‌ای پیدا نکردیم.</p>
                  </div>
                )}
                <AnimatePresence mode="popLayout">{(filteredEvents || []).map((event) => {
                  const isGoing = rsvpEvents.some(se => se.id === event.id);
                  const isSaved = savedEvents.some(se => se.id === event.id);
                  
                  return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={event.id} 
                    className={`group break-inside-avoid rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer mb-4 ${
                      rsvpEvents.some(se => se.id === event.id) 
                        ? 'bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-[#FD6F2F] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)]'
                        : savedEvents.some(se => se.id === event.id)
                        ? 'bg-[#DCE4B8] dark:bg-blue-500/10 border-[#747E4D] dark:border-blue-500/50 dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-white dark:bg-[#18181b] border-gray-300 dark:border-white/20'
                    }`}
                    onClick={() => { handleInteraction(event.id, 'VIEW'); setSelectedEvent(event); }}
                  >
                    {getEventBackgroundIcon(event.bgIcon, event.tags || [], isGoing || isSaved)}
                    {event.imageUrl && (
                      <div className="w-full h-64 overflow-hidden relative z-0">
                        <img loading="lazy" src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                      </div>
                    )}
                    <div className="p-4 relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${event.organizerId || event.title}&backgroundColor=transparent`} alt="Organizer" className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
                          <div>
                            <h3 className="font-bold text-lg mb-1 transition-colors text-[#515739] dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-[#d9ff00]">{event.title}</h3>
                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{event.description}</p>
                          </div>
                        </div>
                        <PriceWidget cost={event.cost} className={`px-2.5 py-1 rounded-xl mr-2 ${isGoing || isSaved ? "bg-white text-[#FD6F2F] dark:bg-[#d9ff00]/10 dark:text-[#d9ff00]" : "bg-teal-600/10 dark:bg-[#d9ff00]/10 text-teal-600 dark:text-[#d9ff00]"}`} />
                      </div>
                      
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-400" />
                          <span className="truncate">{event.fuzzyTime ? (event.fuzzyTime.startsWith("{") ? JSON.parse(event.fuzzyTime).label : event.fuzzyTime) : (event.startTime ? formatEventDate(event.startTime) : "زمان نامشخص")}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span dir="auto" className="truncate text-right">{event.location?.address || (event as any).address || "مکان نامشخص"}</span>
                          </div>
                          {userLocation && event.location?.lat && event.location?.lng && (
                            <div className="flex items-center gap-1.5 pl-5 font-bold text-teal-600 dark:text-[#d9ff00]">
                              {calculateDistance(userLocation.lat, userLocation.lng, event.location?.lat, event.location?.lng)} فاصله
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mb-4 flex-wrap">
                        {event.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-200 dark:border-white/10">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                          }}
                          className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                            savedEvents.some(se => se.id === event.id) 
                              ? 'bg-[#747E4D] dark:bg-[#18181b] text-white dark:text-gray-300 border-[#747E4D] dark:border-white/10 hover:bg-[#515739] dark:hover:bg-[#1f1f23]' 
                              : 'bg-white dark:bg-[#18181b] text-[#747E4D] dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1f1f23]'
                          }`}
                        >
                          {savedEvents.some(se => se.id === event.id) ? (
                            <><Bookmark className="w-4 h-4 fill-white dark:fill-blue-500 dark:text-blue-500" /> ذخیره شده</>
                          ) : (
                            <><Bookmark className="w-4 h-4" /> ذخیره</>
                          )}
                        </button>
                        {event.cost > 0 ? (
                          <button 
                            onClick={(e) => initiateBuyTicket(e, event)}
                            disabled={buyingTicketId === event.id}
                            className="flex items-center gap-2 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {buyingTicketId === event.id ? (
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                               event.ticketUrl ? <ExternalLink className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />
                            )}
                            {event.ticketUrl ? 'سایت رسمی' : 'خرید بلیت'}
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                              rsvpEvents.some(se => se.id === event.id)
                                ? 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] hover:bg-teal-600/30 dark:bg-[#d9ff00]/30'
                                : 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black hover:bg-teal-700 dark:hover:bg-[#c6eb00]'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" /> {rsvpEvents.some(se => se.id === event.id) ? 'می‌روم' : 'منم میام'}
                          </button>
                        )}
                                            </div>
                    </div>
                  </motion.div>
                  );
                })}
                </AnimatePresence>
                {filteredEvents.length === 0 && (
                   <p className="text-center text-gray-600 dark:text-gray-400 py-10">رویدادی یافت نشد.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-4">بلیت‌های من</h2>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {(myTickets || []).map((ticket, index) => (
                    <div key={`ticket-${ticket.tickets.id}-${index}`} className="break-inside-avoid bg-teal-600/10 dark:bg-[#d9ff00]/10 rounded-2xl border border-teal-600/20 dark:border-[#d9ff00]/20 p-4 shadow-sm flex items-start gap-4">
                      <div className="bg-white/90 dark:bg-[#18181b] p-3 rounded-xl shadow-sm flex-shrink-0">
                        <CreditCard className="w-6 h-6 text-teal-600 dark:text-[#d9ff00]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#515739] dark:text-gray-100 mb-1">{ticket.events.title}</h3>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">کد پیگیری: {ticket.tickets.paymentId}</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                          <Calendar className="w-4 h-4 shrink-0 text-gray-600 dark:text-gray-400" />
                          <span className="truncate">{formatEventDate(ticket.events.startTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {myTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <CreditCard className="w-16 h-16 text-gray-800 dark:text-gray-200 mb-4" />
                      <p className="text-center text-gray-600 dark:text-gray-400 font-medium">شما هنوز بلیتی نخریده‌اید.</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-4">رویدادهایی که می‌روم</h2>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {(rsvpEvents || []).map((event: any, index) => (
                    <div key={`${event.id}-${index}`} className="break-inside-avoid bg-[#FFEAD1] dark:bg-[#d9ff00]/10 border-2 border-[#FD6F2F] dark:border-[#d9ff00]/50 dark:shadow-[0_0_15px_rgba(217,255,0,0.15)] rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative" onClick={() => setSelectedEvent(event)}>
                      {getEventBackgroundIcon(event.bgIcon, event.tags || [], true)}
                      {event.imageUrl && (
                        <div className="w-full h-64 overflow-hidden relative z-0">
                          <img loading="lazy" src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                        </div>
                      )}
                      <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${event.organizerId || event.title}&backgroundColor=transparent`} alt="Organizer" className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
                        <h3 className="font-bold text-lg text-[#515739] dark:text-gray-100">{event.title}</h3>
                      </div>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] border-teal-600/40 dark:border-[#d9ff00]/40 px-2.5 py-1 rounded-lg text-xs font-bold border">منم میرم</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10">{tag}</span>
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f23] rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                      </div>
                      <p className="text-center text-gray-600 dark:text-gray-400 font-medium">هنوز برای رویدادی ثبت‌نام نکرده‌اید.</p>
                      <button onClick={() => setActiveTab('discover')} className="mt-4 text-sm font-bold text-teal-600 dark:text-[#d9ff00] hover:text-teal-700 dark:hover:text-[#c6eb00]">کشف رویدادها</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-4 mt-8">رویدادهای نشان‌شده</h2>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {(savedEvents || []).map((event: any, index) => (
                    <div key={`${event.id}-${index}`} className="break-inside-avoid bg-[#DCE4B8] dark:bg-blue-500/10 border-2 border-[#747E4D] dark:border-blue-500/50 dark:shadow-[0_0_15px_rgba(168,85,247,0.15)] rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden relative" onClick={() => setSelectedEvent(event)}>
                      {getEventBackgroundIcon(event.bgIcon, event.tags || [], true)}
                      {event.imageUrl && (
                        <div className="w-full h-64 overflow-hidden relative z-0">
                          <img loading="lazy" src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
                        </div>
                      )}
                      <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${event.organizerId || event.title}&backgroundColor=transparent`} alt="Organizer" className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 shrink-0 bg-gray-100 dark:bg-[#1f1f23]/50" />
                        <h3 className="font-bold text-lg text-[#515739] dark:text-gray-100">{event.title}</h3>
                      </div>
                      <div className="flex flex-col gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          {new Date(event.startTime).toLocaleString('fa-IR')}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-blue-200 text-blue-800 border-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold border">نشان شده</span>
                        {Array.isArray(event.tags) && event.tags.slice(0, 2).map((tag: string, i: number) => (
                           <span key={i} className="bg-gray-100 dark:bg-[#1f1f23] text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10">{tag}</span>
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 col-span-full">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f23] rounded-full flex items-center justify-center mb-4">
                        <Bookmark className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                      </div>
                      <p className="text-center text-gray-600 dark:text-gray-400 font-medium">هنوز رویدادی نشان نکرده‌اید.</p>
                      <button onClick={() => setActiveTab('discover')} className="mt-4 text-sm font-bold text-teal-600 dark:text-[#d9ff00] hover:text-teal-700 dark:hover:text-[#c6eb00]">کشف رویدادها</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-6 border-b border-gray-200 dark:border-white/10">
                <div className="w-24 h-24 bg-teal-600/20 dark:bg-[#d9ff00]/20 rounded-full flex items-center justify-center text-teal-600 dark:text-[#d9ff00] text-3xl font-bold">
                  {profile.name?.charAt(0) || 'U'}
                </div>
                <div className="text-center relative">
                  <h2 className="text-2xl font-bold text-[#515739] dark:text-gray-100">{profile.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{profile.email || 'کاربر سیستم'}</p>
                  <button onClick={() => setShowProfileEditModal(true)} className="mt-2 text-sm text-teal-600 dark:text-[#d9ff00] hover:underline">
                    ویرایش پروفایل
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                <div className="bg-orange-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-orange-100">
                  <Star className="w-8 h-8 text-orange-500 mb-2" />
                  <span className="text-2xl font-bold text-orange-600">{profile.points}</span>
                  <span className="text-sm text-orange-700">امتیاز شما</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-blue-100">
                  <User className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-sm font-bold text-blue-600">
                    {profile.role === 'ADMIN' ? 'مدیر سیستم' : profile.role === 'ORGANIZER' ? 'برگزارکننده' : 'کاربر عادی'}
                  </span>
                  <span className="text-sm text-blue-700">سطح کاربری</span>
                </div>
              </div>
              
              <GamificationPanel userPoints={profile.points || 0} addToast={addToast} />
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => setActiveTab('saved')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Heart className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">بلیت‌ها و ذخیره‌ها</span>
                </button>
                
                {(profile.role === 'ORGANIZER' || profile.role === 'ADMIN') && (
                  <button onClick={() => setActiveTab('organizer')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">پنل برگزارکننده</span>
                  </button>
                )}
                
                {profile.role === 'ADMIN' && (
                  <button onClick={() => setActiveTab('admin')} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-teal-50 dark:hover:bg-white/5 transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-teal-600/10 dark:bg-[#d9ff00]/10 flex items-center justify-center text-teal-600 dark:text-[#d9ff00] group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">مدیریت سیستم</span>
                  </button>
                )}
                
                <button onClick={() => { logout(); setActiveTab('login'); }} className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-red-500/10 hover:border-red-500/30 transition-colors group">
                  <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-red-500 group-hover:bg-red-500/20 transition-all">
                    <LogOut className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-600 dark:text-gray-400 group-hover:text-red-400 text-sm transition-colors">خروج از حساب</span>
                </button>
              </div>

              {profile.role === 'USER' && (
                <div className="bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/20 dark:border-[#d9ff00]/20 rounded-2xl p-6 mt-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#515739] dark:text-white mb-1 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                      درخواست پنل برگزارکننده
                    </h3>
                    <p className="text-sm text-teal-600 dark:text-[#d9ff00]">با ارتقا به حساب برگزارکننده، می‌توانید رویدادهای خود را ثبت کنید و بلیت بفروشید.</p>
                  </div>
                  <button 
                    onClick={() => {
                      fetch('/api/users/me/become-organizer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      }).then(res => {
                        if(res.ok) {
                          showToast('حساب شما با موفقیت به برگزارکننده ارتقا یافت! لطفا یکبار از سیستم خارج و دوباره وارد شوید.', 'success');
                          setTimeout(() => { logout(); setActiveTab('login'); }, 3000);
                        }
                      });
                    }}
                    className="whitespace-nowrap px-6 py-2.5 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black rounded-xl font-bold hover:bg-teal-700 dark:hover:bg-[#c6eb00] transition-colors shadow-sm w-full md:w-auto"
                  >
                    ثبت درخواست ارتقا
                  </button>
                </div>
              )}
              
              {/* Privacy and Settings */}
              <div className="bg-white/90 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mt-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                  حریم خصوصی و داده‌های شما
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  موتور هوش مصنوعی ما برای ارائه پیشنهادهای بهتر، تعاملات شما (بازدیدها، نشان‌کردن‌ها و ثبت‌نام‌ها) را به صورت ناشناس بررسی می‌کند. شما کنترل کامل روی داده‌های خود دارید.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      showToast('داده‌های یادگیری ماشین شما با موفقیت پاک شد.');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-300 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-white/5 group-hover:bg-red-100 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-red-700">پاک‌سازی داده‌های تعاملی</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-red-500">تاریخچه بازدیدها و لایک‌ها</div>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveTab('onboarding');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-teal-600/50 dark:hover:border-[#d9ff00]/50 hover:bg-teal-600/10 dark:bg-[#d9ff00]/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-white/5 group-hover:bg-teal-600/20 dark:bg-[#d9ff00]/20 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-teal-600 dark:text-[#d9ff00] transition-colors">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-teal-700 dark:hover:text-[#c6eb00]">ویرایش علایق من</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-teal-600 dark:text-[#d9ff00]">تغییر تگ‌های مورد علاقه</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-8 flex justify-center border-t border-gray-200 dark:border-white/10 pt-8">
                <button
                  onClick={() => { logout(); setActiveTab('login'); }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  خروج از حساب کاربری
                </button>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-[#515739] dark:text-gray-100 mb-3">مدیریت پلتفرم (خزشگر واقعی)</h3>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={crawlerUrl}
                    onChange={(e) => setCrawlerUrl(e.target.value)}
                    placeholder="لینک صفحه برای خزش (مثلا ایوند، تیوال)"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-teal-600 dark:ring-[#d9ff00] focus:border-teal-600 dark:border-[#d9ff00] outline-none text-left"
                    dir="ltr"
                  />
                  <button
                    onClick={runCrawler}
                    disabled={isCrawling || !crawlerUrl}
                    className="w-full bg-white/90 dark:bg-[#18181b] text-gray-900 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-100 dark:bg-[#1f1f23] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCrawling ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    تجمیع رویداد از این لینک (AI)
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={logout}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                >
                  خروج از حساب
                </button>
              </div>
            </div>
          )}

          {activeTab === 'hubs' && (
            <HubsPanel 
              dbUserId={dbUserId} 
              initialHubs={hubs} 
              events={events} 
              onNavigateToEvent={(event) => setSelectedEvent(event)} 
            />
          )}

                    {activeTab === 'admin' && profile?.role === 'ADMIN' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <AdminPanel />
            </div>
          )}

          {activeTab === 'organizer' && profile && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-5xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <OrganizerPanel userId={dbUserId} />
            </div>
          )}

          {activeTab === 'create' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <CreatePanel onSuccess={() => {
                setActiveTab('discover');
                fetchEvents();
              }} />
            </div>
          )}

                    {activeTab === 'notifications' && (
            <div className="h-full bg-white/90 dark:bg-[#18181b] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 max-w-2xl mx-auto w-full overflow-y-auto pb-24 md:pb-6">
              <h2 className="text-xl font-bold text-[#515739] dark:text-gray-100 mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-[#d9ff00]"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                اعلانات شما
              </h2>
              <div className="space-y-4">
                <div className="bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/20 dark:border-[#d9ff00]/20 p-4 rounded-xl flex gap-4">
                  <div className="w-10 h-10 bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">ثبت‌نام شما قطعی شد</h4>
                    <p className="text-xs text-teal-600 dark:text-[#d9ff00] leading-relaxed mb-2">بلیت رویداد "دورهمی طراحان UI/UX" صادر شد. می‌توانید در بخش بلیت‌های من آن را مشاهده کنید.</p>
                    <span className="text-[10px] text-teal-600/80 dark:text-[#d9ff00]/80 font-medium">۲ ساعت پیش</span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-[#1f1f23] border border-gray-200 dark:border-white/10 p-4 rounded-xl flex gap-4">
                  <div className="w-10 h-10 bg-teal-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">رویداد جدید در حوزه علاقه‌مندی شما</h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-2">یک رویداد جدید با تگ "هوش مصنوعی" نزدیک به موقعیت شما ثبت شده است.</p>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">۱ روز پیش</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'map' && (
            <div className="h-full min-h-[400px]">
              <MapComponent events={events} userLocation={userLocation} />
            </div>
          )}
        </div>

        </div>
        {/* AI Assistant FAB */}
        {activeTab !== 'loading' && activeTab !== 'onboarding' && activeTab !== 'login' && !showAiAssistant && (
          <button 
            onClick={() => setShowAiAssistant(true)}
            className="absolute bottom-24 left-4 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform z-30 flex items-center justify-center animate-bounce"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        {/* AI Assistant Overlay */}
        {showAiAssistant && (
          <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#18181b] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <AiAssistant onClose={() => setShowAiAssistant(false)} />
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
            onRsvp={(e, event) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}
            isRsvp={rsvpEvents.some(e => e.id === selectedEvent.id)}
            onToggleSave={() => {
              handleInteraction(selectedEvent.id, 'SAVE');
            }}
            onOrganizerClick={(id) => setSelectedOrganizerId(id)}
          />
        )}

        {/* Organizer Profile Modal */}
        {selectedOrganizerId && (
          <OrganizerPublicProfile
            organizerId={selectedOrganizerId}
            onBack={() => setSelectedOrganizerId(null)}
            onEventClick={(event) => {
              setSelectedOrganizerId(null);
              setSelectedEvent(event);
            }}
          />
        )}




        {selectedPlace && (
          <PlaceDetail place={selectedPlace} onBack={() => setSelectedPlace(null)} onEventClick={(e) => setSelectedEvent(e)} onPlaceClick={(p) => setSelectedPlace(p)} />
        )}
        {selectedVibe && (
          <VibeDetail vibe={selectedVibe} onBack={() => setSelectedVibe(null)} />
        )}
        {selectedChain && (
          <ChainDetail chain={selectedChain} onBack={() => setSelectedChain(null)} onEventClick={(e) => setSelectedEvent(e)} />
        )}
        {selectedFlow && (
          <FlowDetail flow={selectedFlow} onBack={() => setSelectedFlow(null)} onEventClick={(e) => setSelectedEvent(e)} />
        )}

        {/* Payment Modal */}
        {paymentEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex flex-col justify-end md:items-center md:justify-center">
            <div className="bg-white/90 dark:bg-[#18181b] w-full md:w-[400px] rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom-10 md:zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#515739] dark:text-gray-100">خرید بلیت</h3>
                <button onClick={() => setPaymentEvent(null)} className="w-8 h-8 bg-teal-50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-teal-100 dark:hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-gray-100 dark:bg-[#1f1f23] rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-6">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{paymentEvent.title}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">قیمت بلیت:</span>
                  <div className="font-bold text-teal-600 dark:text-[#d9ff00]"><PriceWidget cost={paymentEvent.cost} showLabel={false} /></div>
                </div>
              </div>
              
              <div className="bg-teal-600/10 dark:bg-[#d9ff00]/10 border border-teal-600/20 dark:border-[#d9ff00]/20 rounded-2xl p-4 mb-6">
                <label className="flex flex-col gap-3 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600 dark:text-[#d9ff00]" />
                      خرید برای دوست (+۱)
                    </span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-teal-600/50 dark:hover:border-[#d9ff00]/50 text-teal-600 dark:text-[#d9ff00] focus:ring-teal-600 dark:ring-[#d9ff00]" 
                      checked={buyForFriend}
                      onChange={(e) => setBuyForFriend(e.target.checked)}
                    />
                  </div>
                  <p className="text-xs text-teal-600 dark:text-[#d9ff00] leading-relaxed">
                    با خرید بلیت برای دوستتان، ۱۰٪ روی بلیت دوم تخفیف بگیرید و ۲۰ امتیاز میونت جایزه بگیرید! این یک راه عالی برای شرکت گروهی در رویدادهاست.
                  </p>
                </label>
              </div>
              
              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-gray-700 dark:text-gray-300 font-medium">مبلغ کل قابل پرداخت:</span>
                <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                  <PriceWidget cost={buyForFriend ? (paymentEvent.cost * 1.9) : paymentEvent.cost} showLabel={false} />
                </div>
              </div>
              
              <button 
                onClick={executePayment}
                disabled={buyingTicketId === paymentEvent.id}
                className="w-full py-4 bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black hover:bg-teal-700 dark:hover:bg-[#c6eb00] font-bold rounded-xl shadow-lg shadow-teal-600/20 dark:shadow-[#d9ff00]/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {buyingTicketId === paymentEvent.id ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    در حال اتصال به درگاه...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    پرداخت آنلاین
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className={`px-6 py-3 rounded-full shadow-2xl font-bold text-sm text-center flex items-center gap-2 ${
              toastType === 'success' ? 'bg-green-600 text-white' : 
              toastType === 'error' ? 'bg-red-600 text-white' : 
              'bg-white dark:bg-[#18181b] text-gray-900 dark:text-white'
            }`}>
              {toastType === 'success' && <CheckCircle className="w-4 h-4" />}
              {toastType === 'error' && <CheckCircle className="w-4 h-4" />}
              {toastMessage}
            </div>
          </div>
        )}
        {showProfileEditModal && profile && (
          <ProfileEditModal
            profile={profile}
            onClose={() => setShowProfileEditModal(false)}
            onSave={async (updatedData) => {
              try {
                const res = await fetch(`/api/users/${profile.id}/profile`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedData)
                });
                if (res.ok) {
                  const data = await res.json();
                  setProfile(data.data);
                  showToast('پروفایل با موفقیت بروزرسانی شد', 'success');
                } else {
                  showToast('خطا در بروزرسانی پروفایل', 'error');
                }
              } catch (e) {
                showToast('خطا در ارتباط با سرور', 'error');
              }
            }}
          />
        )}
        <TripPlannerModal
          isOpen={showTripPlannerModal}
          onClose={() => setShowTripPlannerModal(false)}
          userProfile={profile}
          onSelectEvent={(e) => {
            setSelectedEvent(e);
            setShowTripPlannerModal(false);
          }}
          onSelectPlace={(p) => {
            setSelectedPlace(p);
            setShowTripPlannerModal(false);
          }}
          onSavePackage={() => showToast('پکیج سفر با موفقیت ذخیره شد', 'success')}
        />
      </div>
    </div>
  );
}


function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col md:flex-row md:justify-start items-center gap-1.5 md:gap-3 transition-colors md:p-3 md:rounded-xl md:w-full ${isActive ? 'text-teal-600 dark:text-[#d9ff00] md:bg-teal-600/10 dark:bg-[#d9ff00]/10' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 md:hover:bg-gray-100 dark:bg-[#1f1f23]'}`}
    >
      <div className="[&>svg]:w-6 [&>svg]:h-6">
        {icon}
      </div>
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}
