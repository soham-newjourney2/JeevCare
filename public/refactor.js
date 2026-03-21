const fs = require('fs');
const path = require('path');

const publicDir = __dirname;

// Helper to crawl directories
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

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(publicDir, file).replace(/\\/g, '/');

    const hasNav = content.includes('<nav');
    const hasSidebar = content.includes('<aside');

    if (!hasNav) continue;

    // Determine the page identity
    let isPublic = !relativePath.includes('/') || relativePath.startsWith('auth/') || relativePath === 'login.html' || relativePath === 'register.html';

    let activePublicNav = '';
    if (relativePath === 'about.html') activePublicNav = 'about';
    if (relativePath === 'faq.html') activePublicNav = 'faq';
    if (relativePath === 'contact.html') activePublicNav = 'contact';

    let role = '';
    let roleDisplay = '';
    let activeSidebar = '';

    if (relativePath.startsWith('citizen/')) {
        role = 'citizen';
        roleDisplay = 'Citizen Portal';
        if (relativePath.includes('dashboard')) activeSidebar = 'dashboard';
        if (relativePath.includes('report')) activeSidebar = 'report';
        if (relativePath.includes('my-reports') || relativePath.includes('incident-detail')) activeSidebar = 'history';
        if (relativePath.includes('services') || relativePath.includes('book-service')) activeSidebar = 'services';
    }
    else if (relativePath.startsWith('ngo/')) {
        role = 'ngo';
        roleDisplay = 'NGO Portal';
        if (relativePath.includes('dashboard')) activeSidebar = 'dashboard';
        if (relativePath.includes('cases-pool')) activeSidebar = 'pool';
        if (relativePath.includes('active-cases') || relativePath.includes('case-detail')) activeSidebar = 'active';
        if (relativePath.includes('profile')) activeSidebar = 'profile';
    }

    // Replace Navbar
    const navRegex = /<nav class="navbar"[\s\S]*?<\/nav>/;
    content = content.replace(navRegex, '<div id="nav-placeholder"></div>');

    // Replace Sidebar
    if (hasSidebar) {
        const asideRegex = /<aside class="dash-sidebar">[\s\S]*?<\/aside>/;
        content = content.replace(asideRegex, '<div id="sidebar-placeholder"></div>');
    }

    // Add layout.js script if not exists
    if (!content.includes('layout.js')) {
        content = content.replace('</body>', '    <script src="/js/layout.js"></script>\n</body>');
    }

    // Add the execution script right before </body> to render the pieces
    let injectScript = '';
    if (isPublic) {
        injectScript = `\n    <script>window.Layout.renderPublicNav('nav-placeholder', '${activePublicNav}');</script>\n`;
    } else {
        injectScript = `\n    <script>\n        window.Layout.renderAppNav('nav-placeholder', '${roleDisplay}');\n`;
        if (hasSidebar) {
            injectScript += `        window.Layout.renderSidebar('sidebar-placeholder', '${role}', '${activeSidebar}');\n`;
        }
        injectScript += `    </script>\n`;
    }

    // Prevent double injection if we run script twice
    if (!content.includes('window.Layout.render')) {
        content = content.replace('</body>', injectScript + '</body>');
    }

    fs.writeFileSync(file, content);
    console.log(`Refactored: ${relativePath}`);
}
console.log('All files refactored with component architecture.');
