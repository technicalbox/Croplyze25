const fs = require('fs');
let content = fs.readFileSync('src/data/crops_seed.json', 'utf8');
content = content.replace(/<<<<<<< HEAD\r?\n\s*"en": "(.*?)",\r?\n=======\r?\n\s*"en": "(.*?)",\r?\n>>>>>>> [a-f0-9]+/g, '      "en": "$2",');
fs.writeFileSync('src/data/crops_seed.json', content);
console.log('Fixed crops_seed.json');
