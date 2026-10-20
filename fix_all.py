import re
with open('server.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    # I already removed some with the bad sed, I need to restore `        }` where the line is now empty, but wait!
    pass
