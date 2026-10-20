import fs from 'fs';
let content = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const target = `      {/* Header Image & Actions */}
      <div className="relative h-64 sm:h-80 bg-[#18181b]/5 flex-shrink-0">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#d9ff00]/10 text-[#d9ff00]/80 space-y-4">
            <Calendar className="w-16 h-16" />
            <span className="font-medium text-lg">بدون تصویر</span>
          </div>
        )}
        
        {/* Top actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-[#18181b]/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#18181b]/30 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-[#18181b]/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#18181b]/30 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 md:px-10 py-6 md:py-10 bg-[#18181b] -mt-6 md:-mt-10 rounded-t-3xl md:rounded-t-[3rem] relative z-10 max-w-5xl mx-auto w-full">`;

const rep = `      {/* Header Image & Actions */}
      {event.imageUrl ? (
        <div className="relative h-64 sm:h-80 bg-[#18181b]/5 flex-shrink-0">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          
          {/* Top actions */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleShare}
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center p-4 bg-[#18181b] sticky top-0 z-50 border-b border-white/5">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-[#1f1f23] rounded-full flex items-center justify-center text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className={\`flex-1 px-5 md:px-10 py-6 md:py-10 bg-[#18181b] relative z-10 max-w-5xl mx-auto w-full \${event.imageUrl ? '-mt-6 md:-mt-10 rounded-t-3xl md:rounded-t-[3rem]' : ''}\`}>`;

content = content.replace(target, rep);
fs.writeFileSync('src/components/EventDetail.tsx', content);
