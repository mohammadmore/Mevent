import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(`                  </div>
                  );
                })}
                {!loading && filteredEvents.length === 0 && (`, `                  </div>
                ))}
                {!loading && filteredEvents.length === 0 && (`);

// There might be another place where this replacement was done incorrectly! Let's find out by regex search.
// We only want to restore the Array(6).fill(0).map, and check others.

fs.writeFileSync('src/App.tsx', content);
