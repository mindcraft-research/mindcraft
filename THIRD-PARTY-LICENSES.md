# Licences des dépendances tierces

Ce document recense les licences de toutes les bibliothèques externes embarquées
par MindCraft (frontend + backend) et confirme leur compatibilité avec la licence
du projet : **AGPL-3.0-or-later**.

> Données générées avec [`license-checker`](https://www.npmjs.com/package/license-checker).
> Pour régénérer ce rapport :
> ```bash
> cd backend  && npx license-checker --production --summary
> cd frontend && npx license-checker --production --summary
> ```

## Verdict

✅ **Toutes les dépendances de production sont compatibles avec AGPL-3.0-or-later.**

L'audit a été effectué le 2026-05-10 sur les versions verrouillées dans
`backend/package-lock.json` et `frontend/package-lock.json`.

## Matrice de compatibilité

| Famille de licence | Compatible AGPL-3.0 ? | Notes |
|---|---|---|
| MIT, ISC, BSD-2/3-Clause, 0BSD, MIT-0 | ✅ Oui | Licences permissives, ré-licenciables sous AGPL |
| Apache-2.0 | ✅ Oui | Compatible avec AGPL-3.0 (clause de brevet préservée) |
| BlueOak-1.0.0 | ✅ Oui | Licence permissive moderne (équivalente MIT) |
| Unlicense, CC0-1.0 | ✅ Oui | Domaine public |
| MPL-2.0 | ✅ Oui | Compatible (le code MPL reste sous MPL, le reste sous AGPL) |
| LGPL-3.0-or-later | ✅ Oui | Compatible avec AGPL-3.0 |
| Python-2.0 | ✅ Oui | Compatible (analogue à Apache-2.0) |
| CC-BY-4.0 (données) | ✅ Oui | Données de référence (caniuse-lite), pas du code |

## Synthèse — dépendances de production

### Backend (346 paquets)

| Licence | Nombre |
|---|---:|
| MIT | 238 |
| ISC | 55 |
| Apache-2.0 | 22 |
| BSD-3-Clause | 8 |
| BSD-2-Clause | 7 |
| BlueOak-1.0.0 | 4 |
| MIT* (MIT sans fichier formel — voir notes) | 3 |
| Unlicense (domaine public) | 2 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |
| (MIT OR GPL-3.0-or-later) | 1 |
| (MIT AND Zlib) | 1 |
| MIT-0 | 1 |
| 0BSD | 1 |
| Custom (équivalente MIT — voir notes) | 1 |
| UNLICENSED (paquet racine `mindcraft-backend`) | 1 |

### Frontend (144 paquets)

| Licence | Nombre |
|---|---:|
| MIT | 131 |
| Apache-2.0 | 2 |
| ISC | 2 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| Python-2.0 | 1 |
| CC-BY-4.0 (données caniuse) | 1 |
| BSD-2-Clause | 1 |
| BSD-3-Clause | 1 |
| (MIT AND Zlib) | 1 |
| MIT* | 1 |
| 0BSD | 1 |
| UNLICENSED (paquet racine `mindcraft-frontend`) | 1 |

## Notes sur les cas particuliers

### Paquets marqués `UNLICENSED`
Ce sont les `package.json` racine de MindCraft lui-même (`mindcraft-backend`,
`mindcraft-frontend`). Le champ `"license": "UNLICENSED"` indique simplement
qu'ils ne sont **pas publiés sur npm** ; ils ne sont pas redistribués comme
paquets tiers. La licence applicable au code MindCraft est **AGPL-3.0-or-later**
(voir [`LICENSE`](./LICENSE)).

### Paquets marqués `MIT*`
Le suffixe `*` signifie que `license-checker` a déduit la licence MIT depuis
le `README` ou un autre indice, faute de fichier `LICENSE` formel. Vérifié
manuellement :

| Paquet | Licence confirmée | Source |
|---|---|---|
| `chainsaw@0.1.0` | MIT | `README.markdown` |
| `png-js@1.0.0` | MIT | `README.md` |
| `traverse@0.3.9` | MIT | `README.markdown` |
| `rgbcolor@1.0.1` | MIT | `package.json` |

### Paquet `buffers@0.1.1` (licence "Custom")
La chaîne renvoyée par `license-checker` (`Custom: http://github.com/substack/node-bufferlist`)
pointe vers le `README` du paquet, qui indique explicitement **MIT**. Confirmé
par inspection du dépôt amont.

### Licences doubles
- `pako` : `(MIT AND Zlib)` — les deux sont des licences permissives compatibles AGPL.
- `jszip` : `(MIT OR GPL-3.0-or-later)` — nous retenons l'option MIT, compatible AGPL.
- `dompurify` : `(MPL-2.0 OR Apache-2.0)` — nous retenons Apache-2.0, compatible AGPL.
- `@img/sharp-win32-x64` : `Apache-2.0 AND LGPL-3.0-or-later` — les deux sont compatibles AGPL.

### `caniuse-lite` (CC-BY-4.0)
Il s'agit d'un **jeu de données** (compatibilité navigateurs), pas de code
exécutable. La licence CC-BY-4.0 impose seulement l'attribution, qui est
honorée par la présence du paquet et de ses métadonnées dans `node_modules`.

### `argparse` (Python-2.0)
Port JavaScript du module `argparse` de Python. La licence Python Software
Foundation 2.0 est reconnue par la FSF comme compatible GPL/AGPL.

## Méthodologie

1. Extraction via `license-checker --production` pour les dépendances réellement
   embarquées dans les images Docker de production.
2. Inspection manuelle des paquets dont le champ `license` était ambigu
   (`MIT*`, `Custom`, `UNLICENSED`).
3. Vérification de compatibilité avec la
   [matrice de compatibilité GNU](https://www.gnu.org/licenses/license-list.html).

## Mise à jour

Ce document doit être régénéré à chaque modification significative de
`package-lock.json` (`npm install`, ajout/retrait de dépendance majeure).
