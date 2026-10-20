import re

with open('src/components/DiscoveryHeader.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    "export default function DiscoveryHeader() {",
    "export default function DiscoveryHeader({ onFlowSelect, onVibeSelect, onChainSelect }: { onFlowSelect?: (v: any) => void; onVibeSelect?: (v: any) => void; onChainSelect?: (v: any) => void; }) {"
)

# Flow onClick
code = code.replace(
    "className=\"min-w-[280px] h-40 rounded-2xl relative overflow-hidden snap-center cursor-pointer group\"",
    "className=\"min-w-[280px] h-40 rounded-2xl relative overflow-hidden snap-center cursor-pointer group\" onClick={() => onFlowSelect && onFlowSelect(flow)}"
)

# Vibe onClick
code = code.replace(
    "className=\"min-w-[220px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer hover:border-indigo-500 transition-colors\"",
    "className=\"min-w-[220px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer hover:border-indigo-500 transition-colors\" onClick={() => onVibeSelect && onVibeSelect(vibe)}"
)

# Chain onClick
code = code.replace(
    "className=\"min-w-[250px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer flex items-center gap-4 hover:border-orange-500 transition-colors\"",
    "className=\"min-w-[250px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 snap-center cursor-pointer flex items-center gap-4 hover:border-orange-500 transition-colors\" onClick={() => onChainSelect && onChainSelect(chain)}"
)

with open('src/components/DiscoveryHeader.tsx', 'w') as f:
    f.write(code)
