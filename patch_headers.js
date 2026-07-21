const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexFile, 'utf8');

const langSwitcherHtml = `
<div class="flex items-center gap-xs">
    <select class="bg-surface border border-outline-variant text-on-surface text-sm rounded-full px-3 py-1 cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary outline-none" onchange="window.App.setLanguage(this.value)">
        <option value="en">EN</option>
        <option value="hi">HI</option>
        <option value="hinglish">HIN</option>
    </select>
</div>
`;

// Inject the switcher into the end of every header container before its closing tag
content = content.replace(/<\/header>/g, `${langSwitcherHtml}</header>`);

fs.writeFileSync(indexFile, content);
console.log('Headers patched successfully with language switchers');
