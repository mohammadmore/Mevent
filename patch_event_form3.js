import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const faulty = `  const [sameDay, setSameDay] = useState(
    initialData?.endTime && initialData?.startTime 
      ? new Date(initialData.endTime).toISOString().slice(0,10) === new Date(initialData.startTime).toISOString().slice(0,10)
      : true
  );
  
  useEffect(() => {
    // Keep date part of endTime synced if sameDay is true and startTime changes
    if (sameDay && formData?.startTime) {
      const startDate = formData.startTime.split('T')[0];
      setFormData(prev => {
        if (!prev.endTime) return { ...prev, endTime: \`\${startDate}T23:59\` };
        const timePart = prev.endTime.includes('T') ? prev.endTime.split('T')[1] : prev.endTime;
        return { ...prev, endTime: \`\${startDate}T\${timePart}\` };
      });
    }
  }, [formData?.startTime, sameDay]);
  
  const [formData, setFormData] = useState({`;

const fixed = `  const [sameDay, setSameDay] = useState(
    initialData?.endTime && initialData?.startTime 
      ? new Date(initialData.endTime).toISOString().slice(0,10) === new Date(initialData.startTime).toISOString().slice(0,10)
      : true
  );
  
  const [formData, setFormData] = useState({`;

content = content.replace(faulty, fixed);

const insertTarget = `    cost: initialData?.cost || 0,
  });`;

const insertText = `    cost: initialData?.cost || 0,
  });

  useEffect(() => {
    // Keep date part of endTime synced if sameDay is true and startTime changes
    if (sameDay && formData?.startTime) {
      const startDate = formData.startTime.split('T')[0];
      setFormData(prev => {
        if (!prev.endTime) return { ...prev, endTime: \`\${startDate}T23:59\` };
        const timePart = prev.endTime.includes('T') ? prev.endTime.split('T')[1] : prev.endTime;
        return { ...prev, endTime: \`\${startDate}T\${timePart}\` };
      });
    }
  }, [formData?.startTime, sameDay]);`;

content = content.replace(insertTarget, insertText);

fs.writeFileSync('src/components/EventForm.tsx', content);
