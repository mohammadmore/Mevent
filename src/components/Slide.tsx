import { ButtonHTMLAttributes, ReactNode, useId } from 'react';
import { LayoutGroup, motion } from 'motion/react';

// Single-choice groups (tabs, chips, segmented buttons): the highlight of the selected option
// slides from the old choice to the new one instead of jumping. Each <SlideGroup> is separate,
// so two groups on one page never pull each other's highlight.

export function SlideGroup({ children }: { children: ReactNode }) {
  return <LayoutGroup id={useId()}>{children}</LayoutGroup>;
}

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.8 };

type ChoiceProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  /** Classes of the sliding highlight (background or underline), e.g. "rounded-full bg-teal-600". */
  pill: string;
  children: ReactNode;
};

export function Choice({ selected, pill, className = '', children, type = 'button', ...rest }: ChoiceProps) {
  return (
    <button type={type} {...rest} className={`relative isolate ${className}`}>
      {selected && <motion.span layoutId="slide-pill" aria-hidden transition={SPRING} className={`absolute inset-0 -z-10 ${pill}`} />}
      {children}
    </button>
  );
}
