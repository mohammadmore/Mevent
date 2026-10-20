import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Let's ensure selectedFlow etc are passed to DiscoveryHeader correctly
if "<DiscoveryHeader onFlowSelect=" not in code:
    code = code.replace("<DiscoveryHeader />", "<DiscoveryHeader onFlowSelect={setSelectedFlow} onVibeSelect={setSelectedVibe} onChainSelect={setSelectedChain} />")

with open('src/App.tsx', 'w') as f:
    f.write(code)
