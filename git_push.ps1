git add .
git commit -m "fix: deduplicate universities and clean number prefixes"
git push origin main
git checkout admin-initial
git merge main
git push origin admin-initial
git checkout main
