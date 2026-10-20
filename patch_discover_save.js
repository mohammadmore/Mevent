import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `onClick={(e) => { e.stopPropagation(); handleInteraction(event.id, 'SAVE'); }}`;
const replacement = `onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                            if (savedEvents.some(se => se.id === event.id)) {
                              setSavedEvents(prev => prev.filter(se => se.id !== event.id));
                            } else {
                              setSavedEvents(prev => [...prev, event]);
                            }
                          }}`;
content = content.replace(target, replacement);

const target2 = `<Bookmark className="w-4 h-4" /> ذخیره`;
const replacement2 = `{savedEvents.some(se => se.id === event.id) ? (
                            <><Bookmark className="w-4 h-4 fill-indigo-600 text-indigo-600" /> ذخیره شده</>
                          ) : (
                            <><Bookmark className="w-4 h-4" /> ذخیره</>
                          )}`;
content = content.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', content);
