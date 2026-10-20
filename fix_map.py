import re

with open('src/components/MapComponent.tsx', 'r') as f:
    code = f.read()

# Add props
code = code.replace(
    "export default function MapComponent({ events, userLocation }: MapProps) {",
    "export default function MapComponent({ events, userLocation, onEventSelect, onPlaceSelect, onVibeSelect }: MapProps & { onEventSelect?: (e: Event) => void, onPlaceSelect?: (p: any) => void, onVibeSelect?: (v: any) => void }) {"
)

# Fix Event Popup
event_popup = """                    <p className="text-xs font-semibold text-teal-600 dark:text-[#d9ff00] mt-2">
                      {event.cost === 0 ? 'رایگان' : `${(event.cost / 1000).toLocaleString()} هزار تومان`}
                    </p>
                    {onEventSelect && <button className="mt-2 text-xs bg-teal-600 text-white px-2 py-1 rounded w-full" onClick={() => onEventSelect(event)}>جزئیات</button>}
"""
code = code.replace(
    "                    <p className=\"text-xs font-semibold text-teal-600 dark:text-[#d9ff00] mt-2\">\n                      {event.cost === 0 ? 'رایگان' : `${(event.cost / 1000).toLocaleString()} هزار تومان`}\n                    </p>\n",
    event_popup
)

# Fix Place Popup
place_popup = """                    <p className="text-xs text-gray-500 leading-relaxed">{place.address}</p>
                    {onPlaceSelect && <button className="mt-2 text-xs bg-teal-600 text-white px-2 py-1 rounded w-full" onClick={() => onPlaceSelect(place)}>جزئیات</button>}
"""
code = code.replace(
    "                    <p className=\"text-xs text-gray-500 leading-relaxed\">{place.address}</p>\n",
    place_popup
)

# Fix Vibe Popup 1
vibe_popup = """                    <p className="text-xs text-gray-600 leading-relaxed">{vibe.description}</p>
                    {onVibeSelect && <button className="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded w-full" onClick={() => onVibeSelect(vibe)}>جزئیات</button>}
"""
code = code.replace(
    "                    <p className=\"text-xs text-gray-600 leading-relaxed\">{vibe.description}</p>\n",
    vibe_popup
)

with open('src/components/MapComponent.tsx', 'w') as f:
    f.write(code)
