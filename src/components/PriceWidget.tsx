import React from 'react';

interface PriceWidgetProps {
  cost: number;
  className?: string;
}

export function PriceWidget({ cost, className = "", showLabel = true }: PriceWidgetProps & { showLabel?: boolean }) {
  if (cost === 0) {
    return <span className={className}>رایگان</span>;
  }

  let numStr = '';
  if (cost < 1000000) {
    numStr = `${Math.floor(cost / 1000)}T`;
  } else {
    numStr = `${parseFloat((cost / 1000000).toFixed(1))}M`;
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center leading-tight ${className}`}>
      {showLabel && <span className="text-[10px] opacity-80 font-normal">قیمت:</span>}
      <span className="font-bold text-sm" dir="ltr">{numStr}</span>
    </div>
  );
}
