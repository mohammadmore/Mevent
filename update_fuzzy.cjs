const fs = require('fs');

function updateFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  // replace {event.fuzzyTime} -> {event.fuzzyTime?.startsWith('{') ? JSON.parse(event.fuzzyTime).label : event.fuzzyTime}
  // replace {ev.fuzzyTime} -> {ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}
  
  code = code.replace(
    /\{event\.fuzzyTime\}/g,
    "{event.fuzzyTime?.startsWith('{') ? JSON.parse(event.fuzzyTime).label : event.fuzzyTime}"
  );
  code = code.replace(
    /\{ev\.fuzzyTime\}/g,
    "{ev.fuzzyTime?.startsWith('{') ? JSON.parse(ev.fuzzyTime).label : ev.fuzzyTime}"
  );
  
  code = code.replace(
    /\{event\.fuzzyTime \|\|/g,
    "{(event.fuzzyTime?.startsWith('{') ? JSON.parse(event.fuzzyTime).label : event.fuzzyTime) ||"
  );
  
  fs.writeFileSync(file, code);
}

['src/App.tsx', 'src/components/OrganizerPublicProfile.tsx', 'src/components/EventDetail.tsx', 'src/components/ChainForm.tsx', 'src/components/PlaceDetail.tsx', 'src/components/ChainDetail.tsx', 'src/components/FlowDetail.tsx'].forEach(updateFile);

