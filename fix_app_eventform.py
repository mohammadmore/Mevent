import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("<EventForm onSuccess=", "<CreatePanel onSuccess=")

with open('src/App.tsx', 'w') as f:
    f.write(code)
