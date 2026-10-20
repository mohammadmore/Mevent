import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Event } from '../types';
import { useAuth } from './AuthContext';
import { api, ApiError, showToast } from './apiClient';
import { navigate } from './router';

// State shared by all screens: the signed-in user's profile, their saved/attending events,
// unread notifications, and the actions that change them.

export interface Profile {
  id: number;
  name: string;
  email?: string | null;
  city: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  organizerStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  points: number;
  preferences: any;
  inviteCode?: string | null;
  level?: { key: string; name: string; next: { name: string; pointsNeeded: number } | null; progress: number };
  [key: string]: any;
}

interface AppData {
  profile: Profile | null;
  profileLoaded: boolean;
  refreshProfile: () => Promise<Profile | null>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  savedEvents: Event[];
  rsvpEvents: Event[];
  refreshLists: () => void;
  isSaved: (id: number) => boolean;
  isGoing: (id: number) => boolean;
  toggleSave: (event: Event) => Promise<void>;
  toggleRsvp: (event: Event) => Promise<void>;
  recordView: (event: Event) => void;
  /** Opens checkout for paid events, or RSVPs for free ones. */
  attend: (event: Event) => void;
  checkoutEvent: Event | null;
  closeCheckout: () => void;
  unreadCount: number;
  refreshUnread: () => void;
  /** Sends anonymous visitors to the login screen and remembers where they were. */
  requireLogin: () => boolean;
  /** Event objects already loaded somewhere, so detail pages open instantly. */
  cacheEvent: (event: Event) => void;
  getCachedEvent: (id: number) => Event | undefined;
  openEvent: (event: Event) => void;
}

const Ctx = createContext<AppData | null>(null);

export function useAppData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}

export const RETURN_TO_KEY = 'mevent_return_to';

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { dbUserId, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([]);
  const [checkoutEvent, setCheckoutEvent] = useState<Event | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventCache = useRef(new Map<number, Event>());
  const viewed = useRef(new Set<number>());

  const refreshProfile = useCallback(async () => {
    if (!dbUserId) return null;
    try {
      const data = await api<{ data: Profile }>(`/api/users/${dbUserId}/profile`, { silent: true });
      setProfile(data.data);
      return data.data;
    } catch {
      return null;
    } finally {
      setProfileLoaded(true);
    }
  }, [dbUserId]);

  const refreshLists = useCallback(() => {
    if (!dbUserId) return;
    api<{ data: Event[] }>(`/api/users/${dbUserId}/saved`, { silent: true }).then(d => setSavedEvents(d.data || [])).catch(() => {});
    api<{ data: Event[] }>(`/api/users/${dbUserId}/rsvped`, { silent: true }).then(d => setRsvpEvents(d.data || [])).catch(() => {});
  }, [dbUserId]);

  const refreshUnread = useCallback(() => {
    if (!dbUserId) return;
    api<{ unread: number }>('/api/notifications/unread-count', { silent: true }).then(d => setUnreadCount(d.unread)).catch(() => {});
  }, [dbUserId]);

  useEffect(() => {
    if (!dbUserId) {
      setProfile(null);
      setProfileLoaded(!user);
      setSavedEvents([]);
      setRsvpEvents([]);
      setUnreadCount(0);
      return;
    }
    setProfileLoaded(false);
    refreshProfile();
    refreshLists();
    refreshUnread();
  }, [dbUserId]);

  // Role changes (e.g. organizer approval) and new notifications show up without re-login:
  // re-check when the tab regains focus and once a minute while it is visible.
  useEffect(() => {
    if (!dbUserId) return;
    const onFocus = () => { refreshUnread(); refreshProfile(); };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refreshUnread(); }, 60000);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [dbUserId, refreshUnread, refreshProfile]);

  const requireLogin = useCallback(() => {
    if (dbUserId) return true;
    try { sessionStorage.setItem(RETURN_TO_KEY, window.location.pathname + window.location.search); } catch {}
    showToast('برای این کار ابتدا وارد حساب کاربری شوید.', 'info');
    navigate('/login');
    return false;
  }, [dbUserId]);

  const cacheEvent = useCallback((e: Event) => { eventCache.current.set(e.id, e); }, []);
  const getCachedEvent = useCallback((id: number) => eventCache.current.get(id), []);

  const isSaved = useCallback((id: number) => savedEvents.some(e => e.id === id), [savedEvents]);
  const isGoing = useCallback((id: number) => rsvpEvents.some(e => e.id === id), [rsvpEvents]);

  const sendInteraction = (eventId: number, type: string) => api<any>('/api/interactions', { body: { eventId, type } });

  const toggleSave = useCallback(async (event: Event) => {
    if (!requireLogin()) return;
    const wasSaved = savedEvents.some(e => e.id === event.id);
    // Optimistic update, rolled back if the server rejects it.
    setSavedEvents(prev => wasSaved ? prev.filter(e => e.id !== event.id) : [...prev, event]);
    try {
      await sendInteraction(event.id, 'SAVE');
    } catch {
      refreshLists();
    }
  }, [savedEvents, requireLogin, refreshLists]);

  const toggleRsvp = useCallback(async (event: Event) => {
    if (!requireLogin()) return;
    const wasGoing = rsvpEvents.some(e => e.id === event.id);
    setRsvpEvents(prev => wasGoing ? prev.filter(e => e.id !== event.id) : [...prev, event]);
    try {
      await sendInteraction(event.id, 'RSVP');
      showToast(wasGoing ? 'ثبت‌نام شما لغو شد.' : 'حضور شما ثبت شد. یادآوری قبل از شروع رویداد برایتان ارسال می‌شود.', wasGoing ? 'info' : 'success');
      refreshProfile();
    } catch (err) {
      refreshLists();
      if (err instanceof ApiError && err.data?.code === 'HAS_TICKETS') navigate('/tickets');
    }
  }, [rsvpEvents, requireLogin, refreshLists, refreshProfile]);

  const recordView = useCallback((event: Event) => {
    if (!dbUserId || viewed.current.has(event.id)) return;
    viewed.current.add(event.id);
    api('/api/interactions', { body: { eventId: event.id, type: 'VIEW' }, silent: true }).catch(() => {});
  }, [dbUserId]);

  const attend = useCallback((event: Event) => {
    if (event.ticketUrl) {
      window.open(event.ticketUrl, '_blank', 'noopener');
      return;
    }
    if (!requireLogin()) return;
    if (event.cost > 0) setCheckoutEvent(event);
    else toggleRsvp(event);
  }, [requireLogin, toggleRsvp]);

  const openEvent = useCallback((event: Event) => {
    eventCache.current.set(event.id, event);
    navigate(`/events/${event.id}`);
  }, []);

  const value = useMemo<AppData>(() => ({
    profile, profileLoaded, refreshProfile, setProfile,
    savedEvents, rsvpEvents, refreshLists, isSaved, isGoing, toggleSave, toggleRsvp, recordView, attend,
    checkoutEvent, closeCheckout: () => setCheckoutEvent(null),
    unreadCount, refreshUnread, requireLogin, cacheEvent, getCachedEvent, openEvent,
  }), [profile, profileLoaded, refreshProfile, savedEvents, rsvpEvents, refreshLists, isSaved, isGoing, toggleSave, toggleRsvp,
       recordView, attend, checkoutEvent, unreadCount, refreshUnread, requireLogin, cacheEvent, getCachedEvent, openEvent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
