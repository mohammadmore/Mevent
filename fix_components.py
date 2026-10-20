import re
import os

# Fix FlowDetail
with open('src/components/FlowDetail.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    "fetch(`/api/events?tag=${flow.tag}`)",
    "fetch(`/api/events/nearby?tag=${flow.tag}`)"
)
code = code.replace(
    ".then(data => setEvents(data))",
    ".then(data => setEvents(data.data || []))"
)
with open('src/components/FlowDetail.tsx', 'w') as f:
    f.write(code)

# Fix ChainDetail
with open('src/components/ChainDetail.tsx', 'r') as f:
    code = f.read()
code = code.replace(
    ".then(data => setChainData(data))",
    ".then(data => setChainData(data.data ? data.data : data))"
)
with open('src/components/ChainDetail.tsx', 'w') as f:
    f.write(code)

# Fix PlaceDetail
with open('src/components/PlaceDetail.tsx', 'r') as f:
    code = f.read()
code = code.replace(
    ".then(data => setPlaceData(data))",
    ".then(data => setPlaceData(data.data ? data.data : data))"
)
with open('src/components/PlaceDetail.tsx', 'w') as f:
    f.write(code)

# Fix VibeDetail
with open('src/components/VibeDetail.tsx', 'r') as f:
    code = f.read()
code = code.replace(
    ".then(data => setVibeData(data))",
    ".then(data => setVibeData(data.data ? data.data : data))"
)
with open('src/components/VibeDetail.tsx', 'w') as f:
    f.write(code)

