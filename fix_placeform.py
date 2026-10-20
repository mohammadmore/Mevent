import re

with open('src/components/PlaceForm.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    "onLocationSelect={(lat, lng, address) => setLocation({ lat, lng, address })}",
    "onChange={(val) => setLocation({ lat: val.lat, lng: val.lng, address: '' })}"
)
code = code.replace(
    "initialLocation={location}",
    "value={location}"
)
with open('src/components/PlaceForm.tsx', 'w') as f:
    f.write(code)
