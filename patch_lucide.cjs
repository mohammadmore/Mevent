const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(
  "Shield, Users, Calendar, Activity, DollarSign, Edit, X, Settings,",
  "Shield, Users, Calendar, Activity, DollarSign, Edit, X, Settings, MapPin, Film, Wind,"
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
