import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("import EventForm from './components/EventForm';", "import CreatePanel from './components/CreatePanel';")

with open('src/App.tsx', 'w') as f:
    f.write(code)
