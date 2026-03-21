const fs = require('fs');
const path = require('path');

const publicDir = __dirname;

function getHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory() && file !== 'components') {
            getHtmlFiles(fullPath, fileList);
        } else if (fullPath.endsWith('.html')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const htmlFiles = getHtmlFiles(publicDir);

let changedCount = 0;

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Borders
    content = content.replace(/border(-[a-z]+)?:\s*1px\s+solid\s+(#eee|#ccc|#e5e7eb|#d1d5db)/g, 'border$1: 1px solid var(--glass-border)');

    // Backgrounds
    content = content.replace(/background(-color)?:\s*(white|#ffffff|#fff|#f9fafb|#fafafa|#f3f4f6|rgba\(0,0,0,0\.02\))/g, 'background: var(--glass-bg)');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log(`Updated theme for: ${path.relative(publicDir, file)}`);
    }
}
console.log(`Refactored ${changedCount} files to dark theme global variables.`);
