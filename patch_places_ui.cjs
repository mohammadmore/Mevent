const fs = require('fs');
let code = fs.readFileSync('src/components/EventDetail.tsx', 'utf8');

const targetState = `  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);`;
const repState = `  const [similarEvents, setSimilarEvents] = useState<Event[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);`;
code = code.replace(targetState, repState);

const targetEffect = `  React.useEffect(() => {
    fetch(\`/api/events/\${event.id}/similar\`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setSimilarEvents(data.data);
        }
      })
      .catch(console.error);
  }, [event.id]);`;
const repEffect = `  React.useEffect(() => {
    fetch(\`/api/events/\${event.id}/similar\`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setSimilarEvents(data.data);
        }
      })
      .catch(console.error);

    fetch(\`/api/events/\${event.id}/nearby-places\`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          // Filter by time and assign tags
          const getTimingTag = (place: any) => {
            if (!place.workingHours || !event.startTime) return null;
            
            const persianToEnglishDigits = (str: string) => {
              const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
              for (let i = 0; i < 10; i++) {
                str = str.replace(persianNumbers[i], i.toString());
              }
              return str;
            };
            
            const normalized = persianToEnglishDigits(place.workingHours);
            const nums = normalized.match(/\\d+/g);
            if (!nums || nums.length < 2) return null;
            
            let start = parseInt(nums[0]);
            let end = parseInt(nums[nums.length - 1]);
            
            if (end >= 1 && end <= 11) end += 12;
            if (start >= 1 && start <= 5) start += 12;
            
            const eventStart = new Date(event.startTime);
            const eventStartHour = eventStart.getHours() + (eventStart.getMinutes() / 60);
            const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
            const eventEndHour = eventEnd.getHours() + (eventEnd.getMinutes() / 60);
            
            const isOpenAt = (hour: number) => {
               const h = (hour + 24) % 24;
               if (start <= end) {
                   return h >= start && h < end;
               } else {
                   return h >= start || h < end;
               }
            };
            
            let isOpenAfter = false;
            for (let i = 0.5; i <= 2; i += 0.5) {
                if (isOpenAt(eventEndHour + i)) {
                    isOpenAfter = true;
                    break;
                }
            }
            
            let isOpenBefore = false;
            for (let i = 0.5; i <= 2; i += 0.5) {
                if (isOpenAt(eventStartHour - i)) {
                    isOpenBefore = true;
                    break;
                }
            }
            
            if (isOpenAfter && isOpenBefore) return "بعدش بریم";
            if (isOpenAfter) return "بعدش بریم";
            if (isOpenBefore) return "قبلش بریم";
            return null;
          };

          const placesWithTags = data.data.map((p: any) => {
             return { ...p, timingTag: getTimingTag(p) };
          }).filter((p: any) => p.timingTag !== null);

          setNearbyPlaces(placesWithTags);
        }
      })
      .catch(console.error);
  }, [event.id]);`;
code = code.replace(targetEffect, repEffect);

fs.writeFileSync('src/components/EventDetail.tsx', code);
