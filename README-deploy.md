# Guide de déploiement — Windows → GitHub Pages → iPhone

## Étape 0 — Générer les icônes PNG

Depuis Windows, ouvre **https://realfavicongenerator.net/** (gratuit, sans inscription).

1. Clique sur **"Select your Favicon image"** et uploade le fichier `icons/icon-source.svg`.
2. Dans la section **"iOS — Web Clip"**, choisis "Use a dedicated picture" et garde le SVG.
3. Dans la section **"Android Chrome"**, vérifie que la couleur de fond est `#0a0a0b`.
4. Tout en bas → **"Generate your Favicons and HTML code"**.
5. Télécharge le ZIP, extrais-le, et copie les fichiers suivants dans le dossier `icons/` (renomme si besoin) :

| Fichier généré (souvent renommé) | À placer sous le nom |
|---|---|
| `apple-touch-icon-120x120.png` | `icon-120.png` |
| `apple-touch-icon-152x152.png` | `icon-152.png` |
| `apple-touch-icon-167x167.png` | `icon-167.png` |
| `apple-touch-icon.png` (180x180) | `icon-180.png` |
| `android-chrome-192x192.png` | `icon-192.png` |
| `android-chrome-512x512.png` | `icon-512.png` |

Pour les versions **maskable** (Android adaptive icons) : sur la même page realfavicongenerator, dans la section Android, active "Add a solid color background" → l'outil te génère une variante. Renomme :
- `icon-192-maskable.png` (192×192)
- `icon-512-maskable.png` (512×512)

Si tu veux éviter cette étape : utilise les mêmes PNG `icon-192.png` et `icon-512.png` renommés en `*-maskable.png`. Ça marchera, juste moins joli sur Android.

**Alternative ultra-rapide :** si tu n'as ni le temps ni l'envie, utilise un outil unique comme **https://www.pwabuilder.com/imageGenerator** : uploade le SVG, télécharge le ZIP, copie les 8 fichiers dans `icons/` en respectant les noms ci-dessus.

---

## Étape 1 — Compte GitHub

Si tu n'en as pas déjà un : **https://github.com/signup** (gratuit). Confirme ton email.

---

## Étape 2 — Créer le repo

1. Connecte-toi sur github.com.
2. En haut à droite, clique sur le **+** puis **"New repository"**.
3. Nom du repo : `tracker` (ou ce que tu veux).
4. Visibilité : **Public** (obligatoire pour GitHub Pages gratuit).
5. Ne coche **rien** d'autre (pas de README, pas de gitignore).
6. Clique **"Create repository"**.

---

## Étape 3 — Uploader les fichiers (sans Git)

GitHub permet l'upload direct depuis le navigateur. Pas besoin d'installer Git.

1. Sur la page du repo vide, clique **"uploading an existing file"** (le lien dans la zone "Quick setup").
2. Glisse-dépose **tout le contenu** du dossier `tracker-app` (pas le dossier lui-même — son **contenu** : `index.html`, `manifest.json`, `service-worker.js`, les dossiers `css/`, `js/`, `icons/`).

   ⚠️ **Important** : l'interface web GitHub gère les sous-dossiers via le glisser-déposer. Si tu glisses le dossier `css/`, il sera bien créé avec son fichier `styles.css` dedans. Pareil pour `js/` et `icons/`.

3. En bas, **commit message** : `initial commit` → clique **"Commit changes"**.

Vérifie que ton repo affiche bien l'arborescence :
```
index.html
manifest.json
service-worker.js
css/styles.css
js/app.js, db.js, exercises.js, program.js, stats.js, workout.js
icons/icon-120.png, 152.png, 167.png, 180.png, 192.png, 512.png,
      icon-192-maskable.png, icon-512-maskable.png, icon-source.svg
```

---

## Étape 4 — Activer GitHub Pages

1. Sur ton repo, va dans **Settings** (onglet tout à droite du menu du repo, pas celui de ton compte).
2. Dans le menu de gauche, clique **Pages**.
3. Section **"Build and deployment"** :
   - Source : **Deploy from a branch**
   - Branch : **main** / dossier : **/ (root)**
   - Clique **Save**.
4. Patiente 30 secondes à 2 minutes. Recharge la page **Settings → Pages**.
5. Tu verras un encart vert avec : **"Your site is live at https://<ton-pseudo>.github.io/tracker/"**. Copie cette URL.

---

## Étape 5 — Premier test depuis le PC

Ouvre l'URL dans Chrome ou Edge sur Windows. L'app doit se charger, afficher "Aujourd'hui" et la séance du jour. Si écran blanc → ouvre la console (F12) et regarde les erreurs.

**Erreurs classiques :**
- 404 sur `manifest.json` ou `icon-*.png` → fichiers absents du repo. Re-upload depuis l'interface GitHub.
- 404 sur `js/app.js` → le dossier `js/` n'a pas été créé. Sur GitHub, va dans **Add file → Create new file**, tape `js/app.js` (le `/` crée le dossier) et colle le contenu.

---

## Étape 6 — Installation sur iPhone (Safari obligatoire)

⚠️ **L'installation PWA iOS ne marche QUE depuis Safari.** Pas Chrome iOS, pas Firefox iOS — ces navigateurs utilisent WebKit en interne mais ne donnent pas accès à "Sur l'écran d'accueil".

1. Sur iPhone, ouvre **Safari**.
2. Tape l'URL `https://<ton-pseudo>.github.io/tracker/`.
3. Une fois la page chargée (attends 2-3 secondes que le Service Worker s'enregistre), tape le bouton **Partager** (carré avec flèche vers le haut) en bas au milieu.
4. Fais défiler les actions, choisis **"Sur l'écran d'accueil"** (icône `+` carré).
5. Confirme le nom (par défaut "Tracker"), tape **Ajouter** en haut à droite.
6. L'icône apparaît sur ton écran d'accueil. **Ferme Safari complètement.**
7. Lance l'app depuis l'icône. Elle s'ouvre en mode **plein écran sans barre Safari** = mode standalone PWA, correct.

---

## Étape 7 — Tester l'offline

1. Mets l'iPhone en **mode avion**.
2. Lance l'app depuis l'icône.
3. Tout doit fonctionner : navigation onglets, démarrer une séance, timer, valider des sets, etc.
4. Le seul lien externe qui échouera est le bouton "Voir technique" (YouTube) — normal.

Si l'app ne se lance pas en offline : c'est que le Service Worker n'a pas eu le temps de mettre tout en cache lors du premier passage. Solution : rouvre l'app **en ligne** une fois, attends 5 secondes, puis re-teste l'offline.

---

## Étape 8 — Mettre à jour l'app plus tard

Si tu modifies un fichier (par exemple `program.js`) :

1. Sur GitHub, navigue jusqu'au fichier, clique l'icône **crayon** ✏️, fais ta modif, **Commit**.
2. **Important** : pour que le Service Worker prenne la nouvelle version, change `CACHE_VERSION = 'tracker-v1'` en `'tracker-v2'` dans `service-worker.js` puis commit. À la prochaine ouverture, le SW se met à jour.
3. Sur iPhone : ferme totalement l'app (double-tap home / swipe up), relance-la deux fois. La 2e ouverture charge la nouvelle version.

---

## Récap des fichiers livrés

```
tracker-app/
├── index.html
├── manifest.json
├── service-worker.js
├── README-deploy.md         ← ce guide
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── exercises.js
│   ├── program.js
│   ├── stats.js
│   └── workout.js
└── icons/
    └── icon-source.svg      ← à convertir en PNG via realfavicongenerator.net
```

Les 8 PNG d'icônes sont à générer puis ajouter au dossier `icons/`.

---

## Limitations connues à anticiper

- **Vibration API** : ignorée par iOS. Le timer émet un son via Web Audio (qui marche partout), pas de vibration sur iPhone.
- **Notifications push** : iOS exige que l'app soit installée (ajoutée à l'écran d'accueil) ET iOS ≥ 16.4. La permission est demandée au premier clic dans l'app.
- **IndexedDB en mode privé Safari** : limité, mais en mode standalone PWA (icône écran accueil) c'est OK.
- **Stockage** : Safari peut purger l'IndexedDB après 7 jours d'inactivité de l'app si non installée. **Une fois installée sur l'écran d'accueil, c'est persistent.** D'où l'importance d'installer.
- **Pas de sync cloud** : tout est local au device. Utilise l'export JSON régulièrement (Réglages → Exporter) si tu veux un backup, ou si tu changes d'iPhone.

---

## Si quelque chose ne marche pas

Ouvre la console JavaScript :
- Sur **iPhone** : impossible nativement. Branche le téléphone à un Mac via USB et utilise Safari → Develop → [Ton iPhone]. Si pas de Mac : pas de console. Solution alternative : tu peux ajouter temporairement dans `index.html` un script qui affiche les erreurs visuellement.
- Sur **PC Chrome/Edge** : F12 → onglet Console. Reproduit le bug sur PC pour voir l'erreur exacte. La plupart des bugs PWA sont identiques desktop/mobile.

Bon entraînement.
