const fs = require('fs');

let eventCode = fs.readFileSync('src/components/EventForm.tsx', 'utf8');
eventCode = eventCode.replace(
  /      <div>\s*<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان رویداد<\/label>/,
  `      <label className="block text-sm font-medium text-gray-700 mb-1">عنوان رویداد</label>`
);
fs.writeFileSync('src/components/EventForm.tsx', eventCode);

let placeCode = fs.readFileSync('src/components/PlaceForm.tsx', 'utf8');
placeCode = placeCode.replace(
  /        <div>\s*<label className="block text-sm text-gray-400 mb-1">نام پاتوق<\/label>/,
  `        <label className="block text-sm text-gray-400 mb-1">نام پاتوق</label>`
);
fs.writeFileSync('src/components/PlaceForm.tsx', placeCode);
