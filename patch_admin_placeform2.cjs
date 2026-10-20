const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace("import EventForm from './EventForm';\\\\nimport PlaceForm from './PlaceForm';", "import EventForm from './EventForm';\\nimport PlaceForm from './PlaceForm';");
code = code.replace("import EventForm from './EventForm';\\nimport PlaceForm from './PlaceForm';", "import EventForm from './EventForm';\\nimport PlaceForm from './PlaceForm';");

fs.writeFileSync('src/components/AdminPanel.tsx', code);
