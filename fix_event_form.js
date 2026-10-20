import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const target1 = `const [hubs, setHubs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/hubs').then(res => res.json()).then(data => setHubs(data.data || []));
  }, []);`;

const replacement1 = `const [hubs, setHubs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  
  useEffect(() => {
    fetch('/api/hubs').then(res => res.json()).then(data => setHubs(data.data || []));
    fetch('/api/settings/event_categories')
      .then(res => res.json())
      .then(data => setCategories(data.data || []))
      .catch(console.error);
  }, []);`;

content = content.replace(target1, replacement1);
fs.writeFileSync('src/components/EventForm.tsx', content);
console.log('Fixed EventForm.tsx');
