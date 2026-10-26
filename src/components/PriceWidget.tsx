import React from 'react';
import { softPrice } from '../lib/format';

/** Price as people say it ("مجانی", "۱۸۰ هزار تومان"), the same everywhere in the app. */
export function PriceWidget({ cost, className = '' }: { cost: number; className?: string; showLabel?: boolean }) {
  return <span className={className}>{softPrice(cost)}</span>;
}
