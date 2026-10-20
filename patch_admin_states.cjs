const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'users' | 'events' | 'settings' | 'metrics'>('users');",
  "const [activeTab, setActiveTab] = useState<'users' | 'events' | 'settings' | 'metrics' | 'places' | 'chains' | 'vibes' | 'flows'>('users');\\n  const [places, setPlaces] = useState<any[]>([]);\\n  const [chains, setChains] = useState<any[]>([]);\\n  const [vibes, setVibes] = useState<any[]>([]);\\n  const [flows, setFlows] = useState<any[]>([]);\\n  const [editingPlace, setEditingPlace] = useState<any>(null);\\n  const [editingChain, setEditingChain] = useState<any>(null);\\n  const [editingVibe, setEditingVibe] = useState<any>(null);\\n  const [editingFlow, setEditingFlow] = useState<any>(null);"
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
