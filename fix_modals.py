import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

modals = """
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

code = code.replace(
    "        {/* Payment Modal */}",
    modals + "\n        {/* Payment Modal */}"
)

with open('src/App.tsx', 'w') as f:
    f.write(code)
