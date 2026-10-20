import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// For RSVP:
const rsvpOrig = `className="bg-[#d9ff00]/5 border-[#d9ff00]/30 hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50 rounded-2xl border p-4 shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      {event.imageUrl && (
                        <div className="w-full h-64 bg-white/5 overflow-hidden relative rounded-t-xl mb-4 -mt-4 -mx-4" style={{ width: 'calc(100% + 32px)' }}>
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}`;
const rsvpRep = `className="bg-[#d9ff00]/5 border-[#d9ff00]/30 hover:bg-[#d9ff00]/10 hover:border-[#d9ff00]/50 rounded-2xl border shadow-[0_0_15px_rgba(217,255,0,0.1)] hover:shadow-[0_0_25px_rgba(217,255,0,0.2)] transition-all duration-300 cursor-pointer overflow-hidden relative" onClick={() => setSelectedEvent(event)}>
                      {event.imageUrl && (
                        <div className="w-full h-64 bg-white/5 overflow-hidden relative">
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-4">`;

content = content.replace(rsvpOrig, rsvpRep);

// And we need to close the <div className="p-4"> for RSVP
content = content.replace(
  `<span className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                    </div>`,
  `<span className="bg-[#1f1f23] text-gray-300 px-2 py-1 rounded-lg text-xs font-medium border border-white/10">{tag}</span>
                        ))}
                      </div>
                      </div>
                    </div>`
);

// For Saved:
const savedOrig = `className="bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-2xl border p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                      {event.imageUrl && (
                        <div className="w-full h-64 bg-white/5 overflow-hidden relative rounded-t-xl mb-4 -mt-4 -mx-4" style={{ width: 'calc(100% + 32px)' }}>
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}`;
const savedRep = `className="bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-2xl border shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 cursor-pointer overflow-hidden relative" onClick={() => setSelectedEvent(event)}>
                      {event.imageUrl && (
                        <div className="w-full h-64 bg-white/5 overflow-hidden relative">
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-4">`;
content = content.replace(savedOrig, savedRep);


fs.writeFileSync('src/App.tsx', content);
