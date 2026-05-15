const fs = require('fs');
const path = require('path');

// 1. Get used keys from src
function getUsedKeys(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getUsedKeys(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  const keys = new Set();
  const tRegex = /t\(\s*['"]([^'"]+)['"]/g;
  fileList.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tRegex.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });
  return keys;
}

const usedKeys = getUsedKeys('./src');

// 2. Get subjects
const KOSOVO_SUBJECTS = [
  "Matematikë", "Gjuhë Shqipe", "Gjuhë Angleze", "Gjuhë Gjermane", "Fizikë", "Kimi", "Biologji", "Histori", "Gjeografi", "Informatikë", "Edukatë Fizike", "Art Figurativ", "Muzikë", "Edukatë Qytetare", "Ekonomi", "Sociologji"
];
KOSOVO_SUBJECTS.forEach(s => usedKeys.add(s));

// 3. Add some common UI labels that might be missing or useful
const extraKeys = ["all_subjects", "all", "first_semester", "second_semester", "hourly", "daily", "invalid_credentials"];
extraKeys.forEach(k => usedKeys.add(k));

// 4. Also include keys already in translations.js (to not lose them)
const translationsContent = fs.readFileSync('./src/data/translations.js', 'utf8');
const keyRegex = /^\s*["']?([\w-]+)["']?:\s*/gm;
let keyMatch;
while ((keyMatch = keyRegex.exec(translationsContent)) !== null) {
  usedKeys.add(keyMatch[1]);
}

// Clean up some non-keys picked up by regex
const forbidden = ['*', '?', ':', '.', 'id', 'user', 'window', 'notice_id', 'student_id', 'profiles', 'first_name', 'last_name', 'subjects', 'role', '|', '/', '-', ' ', 'T'];
forbidden.forEach(f => usedKeys.delete(f));
// Remove keys that look like database queries
Array.from(usedKeys).forEach(k => {
    if (k.includes('(*)') || k.includes('!')) usedKeys.delete(k);
});

console.log(JSON.stringify(Array.from(usedKeys).sort(), null, 2));
