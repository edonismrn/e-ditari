const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const keys = new Set();
const tRegex = /t\(\s*['"]([^'"]+)['"]/g;

const files = getFiles('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }
});

console.log(JSON.stringify(Array.from(keys).sort(), null, 2));
