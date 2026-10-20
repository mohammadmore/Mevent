import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Add imports
imports = """import { EventDetail } from './components/EventDetail';
import { PlaceDetail } from './components/PlaceDetail';
import { VibeDetail } from './components/VibeDetail';
import { ChainDetail } from './components/ChainDetail';
import { FlowDetail } from './components/FlowDetail';"""

code = code.replace("import { EventDetail } from './components/EventDetail';", imports)

# Add states
states = """  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<any | null>(null);
  const [selectedChain, setSelectedChain] = useState<any | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<any | null>(null);"""

code = code.replace("  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);", states)

# Add modals
modals = """        {/* Event Detail Modal */}
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onBack={() => setSelectedEvent(null)}
            onBuyTicket={initiateBuyTicket}
            onRsvp={(e, event) => { e.stopPropagation(); handleInteraction(event.id, 'RSVP'); }}
            isSaved={savedEvents.some(e => e.id === selectedEvent.id)}
            onSave={(e, event) => { e.stopPropagation(); toggleSaveEvent(event); }}
            onShare={handleShare}
          />
        )}
        {selectedPlace && (
          <PlaceDetail place={selectedPlace} onBack={() => setSelectedPlace(null)} onEventClick={(e) => setSelectedEvent(e)} />
        )}
        {selectedVibe && (
          <VibeDetail vibe={selectedVibe} onBack={() => setSelectedVibe(null)} />
        )}
        {selectedChain && (
          <ChainDetail chain={selectedChain} onBack={() => setSelectedChain(null)} onEventClick={(e) => setSelectedEvent(e)} />
        )}
        {selectedFlow && (
          <FlowDetail flow={selectedFlow} onBack={() => setSelectedFlow(null)} onEventClick={(e) => setSelectedEvent(e)} />
        )}
"""

code = re.sub(r"        \{\/\* Event Detail Modal \*\/\}.*?onShare=\{handleShare\}\n          \/>\n        \)}", modals, code, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(code)
