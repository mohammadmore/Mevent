const fs = require('fs');

function patchForm(filename, modelName) {
  if (!fs.existsSync(filename)) return;
  let code = fs.readFileSync(filename, 'utf8');

  const compName = filename.replace('src/components/','').replace('.tsx','');

  code = code.replace(
    /export default function [a-zA-Z]+\(\{\s*onSuccess,\s*initialData\s*\}\s*:\s*any\)\s*\{/,
    "export default function " + compName + "({ onSuccess, initialData, isAdmin }: any) {"
  );

  const targetFetchPost = "fetch('/api/" + modelName + "s'";
  const repFetch = "fetch(isAdmin && initialData ? `/api/admin/" + modelName + "s/${initialData.id}` : '/api/" + modelName + "s'";
  code = code.replace(targetFetchPost, repFetch);

  fs.writeFileSync(filename, code);
}

patchForm('src/components/ChainForm.tsx', 'chain');
patchForm('src/components/VibeForm.tsx', 'vibe');
patchForm('src/components/FlowForm.tsx', 'flow');

