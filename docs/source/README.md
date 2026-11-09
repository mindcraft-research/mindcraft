# Source de la documentation technique

`documentation-technique.html` est la source de
`docs/MindCraft_Documentation_Technique_GitHub.pdf`, la version publique et
allégée de la documentation technique.

Pour mettre le PDF à jour : modifiez le fichier HTML, puis lancez depuis la
racine du dépôt, avec Chrome ou Edge installé :

```bash
npm install --no-save --prefix docs/source puppeteer-core
node docs/source/build-pdf.cjs
```

Ne placez ici aucune valeur opérationnelle : ce dépôt est public (voir
`.gitignore` et la section « Portée de cette version publique » du document).
