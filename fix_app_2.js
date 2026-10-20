import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Revert all 
content = content.replace(/<\/div>\n                  \);\n                \}\)\}/g, `</div>\n                  ))}`);

// Revert specific ones that are actually wrong:
content = content.replace(`                    );
                  })}
                    {myTickets.length === 0 && (`, `                  ))}
                  {myTickets.length === 0 && (`);
                  
content = content.replace(`                    );
                  })}
                  {rsvpEvents.length === 0 && (`, `                  ))}
                  {rsvpEvents.length === 0 && (`);

content = content.replace(`                    );
                  })}
                  {savedEvents.length === 0 && (`, `                  ))}
                  {savedEvents.length === 0 && (`);

// Now for filteredEvents:
content = content.replace(`                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                {filteredEvents.length === 0 && (`, `                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
                {filteredEvents.length === 0 && (`);

fs.writeFileSync('src/App.tsx', content);
