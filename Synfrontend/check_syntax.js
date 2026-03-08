const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\LENOVO\\OneDrive\\Desktop\\Syn_cloud\\Synfrontend\\app\\screens\\FilesScreen.js', 'utf8');

function count(str, char) {
    return str.split(char).length - 1;
}

console.log('Total { :', count(content, '{'));
console.log('Total } :', count(content, '}'));
console.log('Total ( :', count(content, '('));  
console.log('Total ) :', count(content, ')'));
console.log('Total < :', count(content, '<'));
console.log('Total > :', count(content, '>'));

// Check for unclosed JSX tags (rudimentary)
const tags = [];
const regex = /<(\/?[a-zA-Z]+)/g;
let match;
while ((match = regex.exec(content)) !== null) {
    const tagName = match[1];
    if (tagName.startsWith('/')) {
        const last = tags.pop();
        if (last !== tagName.substring(1)) {
            console.log(`Mismatch: Expected ${last}, found ${tagName}`);
        }
    } else {
        // Check if self-closing
        const startIdx = match.index;
        const endIdx = content.indexOf('>', startIdx);
        if (content[endIdx - 1] !== '/') {
            tags.push(tagName);
        }
    }
}
console.log('Remaining tags:', tags);
