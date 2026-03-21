$ErrorActionPreference = "Continue"

git config user.email "soham.chowdhury.2026@gmail.com"
git config user.name "Soham Chowdhury"

git update-ref -d HEAD
git rm -rf --cached .

git add .gitignore README.md server/package.json server/package-lock.json server/server.js server/app.js server/config/ server/utils/
git commit -m "chore: project configuration, readme, and environment setup"

git add server/models/
git commit -m "feat: database models and schemas"

git add server/controllers/
git commit -m "feat: API controllers"

git add server/routes/
git commit -m "feat: API routes"

git add server/middlewares/ server/services/ server/sockets/
git commit -m "feat: middlewares, services, and websockets integration"

git add public/auth/ public/index.html public/about.html public/faq.html
git commit -m "feat: authentication and core public pages"

git add public/contact.html public/press.html public/privacy.html public/terms.html public/team.html public/guidelines.html public/impact-metrics.html
git commit -m "feat: informational public pages frontend"

git add public/citizen/ public/services/
git commit -m "feat: citizen dashboard and services UI"

git add public/authority/ public/admin/
git commit -m "feat: authority and admin dashboard UI"

git add public/ngo/ public/volunteer/ public/donor/
git commit -m "feat: NGO, volunteer, and donor UI sections"

git add public/css/ public/js/ public/dark_theme_refactor.js public/refactor.js
git commit -m "style: frontend assets, themes, and scripts"

git add .
git commit -m "test: unit testing, mock data, uploads, and final assets"

git push -f origin main
