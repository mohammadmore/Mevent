import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                            if (savedEvents.some(se => se.id === event.id)) {
                              setSavedEvents(prev => prev.filter(se => se.id !== event.id));
                            } else {
                              setSavedEvents(prev => [...prev, event]);
                            }
                          }}`;

const replacement = `                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                          }}`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
