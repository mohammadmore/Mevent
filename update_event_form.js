import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

// 1. Add tags state and categories state
const stateReplacement = `const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hubs, setHubs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
`;
content = content.replace("const [loading, setLoading] = useState(false);\n  const [success, setSuccess] = useState(false);\n  const [hubs, setHubs] = useState<any[]>([]);", stateReplacement);

// 2. Fetch categories in useEffect
const fetchHubsTarget = `fetch('/api/hubs')
      .then(res => res.json())
      .then(data => setHubs(data.data || []))
      .catch(console.error);`;

const fetchHubsReplacement = `fetch('/api/hubs')
      .then(res => res.json())
      .then(data => setHubs(data.data || []))
      .catch(console.error);
      
    fetch('/api/settings/event_categories')
      .then(res => res.json())
      .then(data => setCategories(data.data || []))
      .catch(console.error);`;
content = content.replace(fetchHubsTarget, fetchHubsReplacement);

// 3. Update handleSubmit
const submitTarget = `          cost: Number(formData.cost),
          organizerId: dbUserId,
          imageUrl,
          location: {`;
const submitReplacement = `          cost: Number(formData.cost),
          organizerId: dbUserId,
          imageUrl,
          tags: selectedTags,
          location: {`;
content = content.replace(submitTarget, submitReplacement);

// 4. Update UI to add Tag Selection right before Cost
const uiTarget = `<div>
        <label className="block text-sm font-medium text-gray-700 mb-1">هزینه (تومان)</label>`;
const tagSelectionUI = `
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی‌ها</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                if (selectedTags.includes(cat)) {
                  setSelectedTags(selectedTags.filter(t => t !== cat));
                } else {
                  setSelectedTags([...selectedTags, cat]);
                }
              }}
              className={\`px-3 py-1.5 rounded-full text-xs font-bold transition-colors \${
                selectedTags.includes(cat) 
                  ? 'bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black' 
                  : 'bg-gray-100 dark:bg-[#1f1f23] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">هزینه (تومان)</label>`;
content = content.replace(uiTarget, tagSelectionUI);

// Update button text to remove "تولید برچسب های هوشمند"
const buttonTarget = `در حال ثبت و تولید برچسب‌های هوشمند...`;
const buttonReplacement = `در حال ذخیره‌سازی...`;
content = content.replace(buttonTarget, buttonReplacement);


fs.writeFileSync('src/components/EventForm.tsx', content);
console.log('EventForm.tsx updated');
