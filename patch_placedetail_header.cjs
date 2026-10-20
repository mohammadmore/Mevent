const fs = require('fs');
let code = fs.readFileSync('src/components/PlaceDetail.tsx', 'utf8');

const target = `{p.imageUrl ? (
        <div className="relative h-64 sm:h-80 bg-teal-50 dark:bg-white/5 flex-shrink-0">
          <img loading="lazy" src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>`;

const replacement = `{p.imageUrl ? (
        <div className="relative h-64 sm:h-80 flex-shrink-0">
          <img loading="lazy" src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }} />
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/PlaceDetail.tsx', code);
    console.log('patched');
} else {
    console.log('target not found');
}
