import { useEffect, useState } from 'react';
import { api } from './apiClient';

export interface SiteInfo {
  brandName: string;
  legalName: string;
  nationalId: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  supportHours: string;
  enamadId: string;
  enamadCode: string;
  refundBusinessDays: number;
  rules: {
    cancelDeadlineHours: number;
    paymentHoldMinutes: number;
    friendDiscountPercent: number;
    pointValueToman: number;
    maxPointsSharePercent: number;
  };
}

let cached: SiteInfo | null = null;
let pending: Promise<SiteInfo | null> | null = null;

export function loadSiteInfo(force = false) {
  if (force) { cached = null; pending = null; }
  pending ??= api<{ data: SiteInfo }>('/api/site-info', { silent: true })
    .then(d => (cached = d.data))
    .catch(() => { pending = null; return null; });
  return pending;
}

export function useSiteInfo() {
  const [info, setInfo] = useState<SiteInfo | null>(cached);
  useEffect(() => {
    if (!cached) loadSiteInfo().then(i => i && setInfo(i));
  }, []);
  return info;
}
