import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Users, Activity, Shield, Heart, User, PlusCircle } from 'lucide-react';

export default function DockMenu({ activeTab, setActiveTab, profile, setShowQuickSearch }: any) {
  const containerRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'discover', icon: <Compass className="w-6 h-6" />, label: 'کشف' },
    { id: 'hubs', icon: <Users className="w-6 h-6" />, label: 'جوامع' },
  ];

  if (profile?.role === 'ORGANIZER' || profile?.role === 'ADMIN') {
    navItems.push({ id: 'create', icon: <PlusCircle className="w-6 h-6" />, label: 'ایجاد' });
  }

  navItems.push({ id: 'profile', icon: <User className="w-6 h-6" />, label: 'پروفایل' });

  // Let's ensure "create" is in the middle if it exists
  const createItemIndex = navItems.findIndex(i => i.id === 'create');
  if (createItemIndex !== -1) {
    const createItem = navItems.splice(createItemIndex, 1)[0];
    const middleIndex = Math.floor(navItems.length / 2);
    navItems.splice(middleIndex, 0, createItem);
  }

  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && e.buttons !== 1) return;
    
    if (containerRef.current) {
      // Find the button elements within our container
      const buttons = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button[data-id]'));
      
      for (const button of buttons) {
        const rect = (button as HTMLElement).getBoundingClientRect();
        // Check if the pointer is within the horizontal bounds of this button
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const tabId = (button as HTMLElement).getAttribute('data-id');
          if (tabId && tabId !== activeTab) {
            setShowQuickSearch(false);
            setActiveTab(tabId);
          }
          break;
        }
      }
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center w-full max-w-lg px-4 pointer-events-none">
      <div 
        ref={containerRef}
        onPointerDown={handlePointerEvent}
        onPointerMove={handlePointerEvent}
        className="bg-white/90 dark:bg-[#18181b]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] px-2 flex items-center justify-center gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative pointer-events-auto mx-auto w-max touch-none select-none"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-id={item.id}
              onClick={() => {
                setShowQuickSearch(false);
                setActiveTab(item.id);
              }}
              className="relative w-16 h-16 flex items-center justify-center outline-none group touch-none"
            >
              <div className="absolute w-full h-full flex items-center justify-center -top-8 pointer-events-none">
                {isActive && (
                   <motion.div
                      layoutId="active-bg"
                      className="w-14 h-14 bg-teal-600 dark:bg-[#d9ff00] rounded-full shadow-teal-600/30 dark:shadow-[0_8px_20px_rgba(217,255,0,0.3)] z-10 absolute"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                   />
                )}
              </div>
              
              <motion.div 
                className={`z-20 flex items-center justify-center absolute pointer-events-none transition-colors duration-300 ${isActive ? 'text-white dark:text-black' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                animate={{ 
                  y: isActive ? -32 : 0
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                whileHover={!isActive ? { scale: 1.1 } : {}}
              >
                {item.icon}
              </motion.div>
              
              {/* Label inside button for exact positioning */}
              <AnimatePresence>
                {isActive && (
                   <motion.div 
                     initial={{ opacity: 0, y: 5, scale: 0.8 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 5, scale: 0.8 }}
                     transition={{ duration: 0.2 }}
                     className="absolute bottom-2 whitespace-nowrap text-gray-900 dark:text-white text-[11px] font-bold tracking-wide pointer-events-none z-10"
                   >
                     {item.label}
                   </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </div>
  );
}
