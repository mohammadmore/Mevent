import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const aiTagsTarget = `let generatedTags = req.body.tags;
      if (!generatedTags || generatedTags.length === 0) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: \`Generate 3-5 relevant Persian hashtags for this event. 
Title: \${title}
Description: \${description}
Return ONLY a JSON array of strings, like ["#فرهنگی", "#تهران"].\`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          });
          generatedTags = JSON.parse(aiResponse.text.trim());
        } catch (aiErr) {
          console.error("AI Tagging failed", aiErr);
          generatedTags = ['#جدید'];
        }
      }`;

const aiTagsReplacement = `let generatedTags = req.body.tags || [];`;

content = content.replace(aiTagsTarget, aiTagsReplacement);

fs.writeFileSync('server.ts', content);
console.log('Server updated to use provided tags directly');
