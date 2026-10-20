import re

with open('server.ts', 'r') as f:
    code = f.read()

# Modify /api/events endpoint to support tag filtering
code = code.replace(
    "const { lat, lng, radius = 10 } = req.query;",
    "const { lat, lng, radius = 10, tag } = req.query;"
)

code = code.replace(
    "      let filtered = initialEvents;",
    "      let filtered = initialEvents;\n      if (tag) {\n        const tagStr = (tag as string).startsWith('#') ? tag : '#' + tag;\n        filtered = filtered.filter(e => e.tags && e.tags.includes(tagStr));\n      }"
)

with open('server.ts', 'w') as f:
    f.write(code)
