const { translations } = require('./src/data/translations');

const sqKeys = Object.keys(translations.sq);
const srKeys = Object.keys(translations.sr);

const missingInSr = sqKeys.filter(key => !srKeys.includes(key));

console.log('Missing in SR:', JSON.stringify(missingInSr, null, 2));

const missingInSq = srKeys.filter(key => !sqKeys.includes(key));
console.log('Missing in SQ:', JSON.stringify(missingInSq, null, 2));
