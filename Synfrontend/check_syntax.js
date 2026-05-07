const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\LENOVO\\OneDrive\\Desktop\\Syn_cloud\\Synfrontend\\app\\utils\\BackupService.js', 'utf8');

function count(str, char) {
    return str.split(char).length - 1;
}

console.log('Total { :', count(content, '{'));
console.log('Total } :', count(content, '}'));
console.log('Total ( :', count(content, '('));
console.log('Total ) :', count(content, ')'));
console.log('Total < :', count(content, '<'));
console.log('Total > :', count(content, '>'));

const tags = [];
const regex = /<(\/?[a-zA-Z0-9]+)/g;
let match;
while ((match = regex.exec(content)) !== null) {
    const tagName = match[1];
    if (tagName.startsWith('/')) {
        const last = tags.pop();
        if (last !== tagName.substring(1)) {
            console.log(`Mismatch: Expected ${last}, found ${tagName}`);
        }
    } else {
        // Find the matching > for this tag
        let endIdx = -1;
        let depth = 0;
        for (let i = match.index; i < content.length; i++) {
            if (content[i] === '<') depth++;
            if (content[i] === '>') {
                depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        // Check if the tag is self-closing by looking for / before >
        const tagContent = content.substring(match.index, endIdx + 1);
        if (!tagContent.trim().endsWith('/>')) {
            tags.push(tagName);
        }
    }
}
console.log('Remaining tags:', tags);
