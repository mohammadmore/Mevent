const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(
  `        ) : (
          <div className="space-y-4" dir="rtl">
            {editingEvent ? (`,
  `        ) : activeTab === 'events' ? (
          <div className="space-y-4" dir="rtl">
            {editingEvent ? (`
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
