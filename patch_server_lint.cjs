const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      // Calculate similarity
      const scored = candidates.map(e => {
        let score = 0;
        
        // Tags overlap
        const currentTags = currentEvent.tags || [];
        const eTags = e.tags || [];
        const commonTags = currentTags.filter((t: string) => eTags.includes(t));
        score += commonTags.length * 2;
        
        // Same organizer
        if (e.organizerId === currentEvent.organizerId && e.organizerId !== null) score += 3;
        
        // Same hub
        if (e.hubId === currentEvent.hubId && e.hubId !== null) score += 2;
        
        // Same category
        if (e.category === currentEvent.category && e.category !== null) score += 3;

        return { event: e, score };
      });`;

const replacement = `      // Calculate similarity
      const scored = candidates.map(e => {
        let score = 0;
        
        // Tags overlap
        const currentTags = (currentEvent.tags as string[]) || [];
        const eTags = (e.tags as string[]) || [];
        const commonTags = currentTags.filter((t: string) => eTags.includes(t));
        score += commonTags.length * 2;
        
        // Same organizer
        if (e.organizerId === currentEvent.organizerId && e.organizerId !== null) score += 3;
        
        // Same hub
        if (e.hubId === currentEvent.hubId && e.hubId !== null) score += 2;

        return { event: e, score };
      });`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
