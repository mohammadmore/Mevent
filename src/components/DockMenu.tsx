import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Compass, Users, Tent, User, PlusCircle } from 'lucide-react';

export default function DockMenu({ activeTab, setActiveTab, profile, setShowQuickSearch }: any) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Every tab always shows its name: icons alone are guesswork (people = friends or communities?).
  const navItems = [
    { id: 'discover', icon: <Compass className="w-6 h-6" />, label: 'کشف' },
    { id: 'friends', icon: <Users className="w-6 h-6" />, label: 'دوستان' },
    { id: 'hubs', icon: <Tent className="w-6 h-6" />, label: 'جوامع' },
    { id: 'profile', icon: <User className="w-6 h-6" />, label: 'پروفایل' },
  ];
  // Organizers get "create" in the middle.
  if (profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') {
    navItems.splice(2, 0, { id: 'create', icon: <PlusCircle className="w-6 h-6" />, label: 'ایجاد' });
  }

  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return;
    if (!containerRef.current) return;
    // Sliding a finger along the dock switches tabs.
    for (const button of Array.from(containerRef.current.querySelectorAll<HTMLElement>('button[data-id]'))) {
      const rect = button.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        const tabId = button.getAttribute('data-id');
        if (tabId && tabId !== activeTab) {
          setShowQuickSearch(false);
          setActiveTab(tabId);
        }
        break;
      }
    }
  };

  return (
    <nav aria-label="منوی اصلی" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center w-full max-w-lg px-3 pointer-events-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerEvent}
        onPointerMove={handlePointerEvent}
        className="bg-white/95 dark:bg-[#18181b]/90 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-1.5 flex items-center justify-center gap-0.5 shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative pointer-events-auto mx-auto w-max touch-none select-none"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-id={item.id}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                setShowQuickSearch(false);
                setActiveTab(item.id);
              }}
              className="relative w-16 h-14 flex flex-col items-center justify-center gap-0.5 outline-none rounded-[1.5rem] touch-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-[#d9ff00]"
            >
              {isActive && (
                <motion.div
                  layoutId="active-bg"
                  className="absolute inset-0 bg-teal-600 dark:bg-[#d9ff00] rounded-[1.5rem] shadow-md shadow-teal-600/30 dark:shadow-[0_8px_20px_rgba(217,255,0,0.25)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className={`relative z-10 flex flex-col items-center gap-0.5 transition-colors duration-200 ${isActive ? 'text-white dark:text-black' : 'text-gray-500 dark:text-gray-400'}`}>
                {item.icon}
                <span className="text-[11px] font-bold leading-none">{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
