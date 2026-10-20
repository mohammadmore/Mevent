import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                            if (savedEvents.some(se => se.id === event.id)) {
                              setSavedEvents(prev => prev.filter(se => se.id !== event.id));
                            } else {
                              setSavedEvents(prev => [...prev, event]);
                            }
                          }}
                          className={\`p-2 rounded-full transition-colors \${savedEvents.some(se => se.id === event.id) ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:text-indigo-600'}\`}
                        >`;

const replacement = `                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleInteraction(event.id, 'SAVE');
                          }}
                          className={\`p-2 rounded-full transition-colors \${savedEvents.some(se => se.id === event.id) ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:text-indigo-600'}\`}
                        >`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
