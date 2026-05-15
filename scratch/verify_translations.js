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
const KOSOVO_SUBJECTS = [
  "Matematikë", "Gjuhë Shqipe", "Gjuhë Angleze", "Gjuhë Gjermane", "Fizikë", "Kimi", "Biologji", "Histori", "Gjeografi", "Informatikë", "Edukatë Fizike", "Art Figurativ", "Muzikë", "Edukatë Qytetare", "Ekonomi", "Sociologji"
];
KOSOVO_SUBJECTS.forEach(s => usedKeys.add(s));

// Clean up known non-keys
const forbidden = ['*', '?', ':', '.', 'id', 'user', 'window', 'notice_id', 'student_id', 'profiles', 'first_name', 'last_name', 'subjects', 'role', '|', '/', '-', ' ', 'T'];
forbidden.forEach(f => usedKeys.delete(f));

const translationsContent = fs.readFileSync('./src/data/translations.js', 'utf8');

function extractLanguageKeys(content, lang) {
  const langRegex = new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\}\\s*,?\\s*(?:\\/\\/|\\w+:|\\})`, 'g');
  const match = langRegex.exec(content);
  if (!match) return new Set();
  
  const block = match[1];
  const keys = new Set();
  const keyRegex = /^\s*["']?([\w-]+|[\u00C0-\u017F\s\w-]+)["']?:\s*/gm; // Support unicode/spaces for subjects
  let keyMatch;
  while ((keyMatch = keyRegex.exec(block)) !== null) {
    keys.add(keyMatch[1].trim());
  }
  return keys;
}

const languages = ['sq', 'sr', 'tr', 'it'];
const results = {};

languages.forEach(lang => {
  const langKeys = extractLanguageKeys(translationsContent, lang);
  const missing = Array.from(usedKeys).filter(k => {
      if (k.includes('(*)') || k.includes('!')) return false;
      return !langKeys.has(k);
  });
  results[lang] = missing;
});

console.log(JSON.stringify(results, null, 2));
