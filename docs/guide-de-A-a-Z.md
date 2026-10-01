# Covoit'May : le guide de A à Z

Ce guide explique **tout le chemin** parcouru pour créer Covoit'May : de l'idée jusqu'au site en ligne.
Chaque étape dit **ce qu'on a fait**, **avec quel outil** et **pourquoi**. À la fin : les erreurs rencontrées, un glossaire et un aide-mémoire des commandes.

> **En ligne**
> - Site : https://covoit-may.mourad-saidomar-sio.workers.dev
> - API : https://mourad.alwaysdata.net/api (test : `/api/sante`)
> - Code : https://github.com/Mourad-Saidomar/covoit-may

---

## Sommaire

0. [La vue d'ensemble](#0-la-vue-densemble)
1. [La conception](#1-la-conception)
2. [La base de données (MariaDB)](#2-la-base-de-données-mariadb)
3. [Le back-end : l'API (Node.js + Express)](#3-le-back-end--lapi-nodejs--express)
4. [Le front-end : le site (Vue.js)](#4-le-front-end--le-site-vuejs)
5. [Travailler et tester en local](#5-travailler-et-tester-en-local)
6. [Versionner avec Git et GitHub](#6-versionner-avec-git-et-github)
7. [La mise en ligne](#7-la-mise-en-ligne)
8. [Mettre à jour le site ensuite](#8-mettre-à-jour-le-site-ensuite)
9. [Les erreurs rencontrées et leurs solutions](#9-les-erreurs-rencontrées-et-leurs-solutions)
10. [Glossaire](#10-glossaire)
11. [Aide-mémoire des commandes](#11-aide-mémoire-des-commandes)

---

## 0. La vue d'ensemble

Covoit'May est composé de **trois programmes séparés** qui se parlent, plus un espace de stockage :

```
   Navigateur de l'utilisateur
            │
            │ 1. charge les pages du site
            ▼
   ┌──────────────────────────┐
   │  FRONT-END (Vue.js)      │   hébergé sur Cloudflare Workers
   │  ce que l'on voit        │
   └──────────────────────────┘
            │
            │ 2. demande des données : requêtes HTTP, réponses JSON
            ▼
   ┌──────────────────────────┐        ┌────────────────────────┐
   │  BACK-END : l'API        │ ─────► │  Backblaze B2          │
   │  (Node.js + Express)     │        │  photos, vocaux,       │
   │  règles, sécurité        │        │  sauvegardes           │
   └──────────────────────────┘        └────────────────────────┘
            │
            │ 3. lit et écrit les données (requêtes SQL)
            ▼
   ┌──────────────────────────┐
   │  BASE DE DONNÉES         │   l'API et la base sont hébergées chez alwaysdata
   │  (MariaDB)               │
   └──────────────────────────┘
```

**Le principe à retenir :** le navigateur ne parle **jamais** directement à la base de données. Il passe toujours par l'API, qui vérifie qui fait la demande, s'il en a le droit, et si les données sont valides.

---

## 1. La conception

Avant d'écrire du code, on a décrit **ce que l'application doit faire**. C'est le rôle du **cahier des charges** (`infos_projet/Covoit-May-Cahier-des-Charges-v3.3.docx`).

| Partie | Contenu | Pourquoi |
|---|---|---|
| 1. Présentation | Contexte (Mayotte), problème, objectifs | Savoir **pourquoi** on crée le site |
| 2. Expression des besoins | Utilisateurs (visiteur, passager, conducteur, administrateur), 8 fonctionnalités principales (F1 à F8), 31 besoins fonctionnels (BF01 à BF31), besoins non fonctionnels, contraintes, périmètre | Savoir **quoi** faire, et ce qu'on ne fait pas |
| 3. Environnement technique | Architecture, outils, organisation du code, hébergement | Savoir **avec quoi** on le fait |
| 4. Règles de gestion | 125 règles (RG01 à RG13) : « le prix est entre 1 et 10 € », « on ne réserve pas son propre trajet »… | Les **règles métier**, que le code doit faire respecter |

**Méthode suivie :**
1. Lister les **acteurs**, puis les **fonctionnalités** de chacun.
2. Détailler chaque fonctionnalité en **besoins fonctionnels** : « [Acteur] doit pouvoir [action] », avec les données obligatoires et la logique métier.
3. En déduire les **règles de gestion**, puis les **données** à stocker, donc le **modèle de la base** (MCD → MLD → MPD).
4. Dessiner les **maquettes** des écrans avec **Figma** (ordinateur et mobile).

Chaque règle porte un code, par exemple RG05.3. On retrouve ce code dans le script SQL, dans l'API et dans les messages d'erreur : on peut ainsi suivre une règle depuis le cahier des charges jusqu'au code.

---

## 2. La base de données (MariaDB)

**Outil :** MariaDB, une base **relationnelle** (des tables reliées entre elles), gratuite et compatible MySQL. On l'administre avec **DBeaver**.

**Fichier principal :** `backend/database/covoitmay.sql`. Il crée tout d'un coup :

| Élément | Exemple dans Covoit'May | À quoi ça sert |
|---|---|---|
| **Tables** (15) | `utilisateur`, `trajet`, `reservation`, `paiement`, `message`… | Ranger les données |
| **Clés étrangères** | une réservation pointe vers un trajet existant | Garder des liens cohérents |
| **Contraintes `CHECK`** | `prix BETWEEN 1 AND 10` | Refuser une valeur interdite |
| **Triggers** | « on ne réserve pas son propre trajet » | Faire respecter une règle **même si quelqu'un contourne l'API** |
| **Vues** | `v_profil_public` : prénom, initiale, note… sans email ni téléphone | Ne montrer que ce qui est public |
| **Procédures** | `cloturer_trajets_passes()` | Traitements automatiques |
| **Compte applicatif** | `covoitmay_app`, avec des droits minimaux | L'API ne se connecte jamais en `root` |

**Pourquoi autant de règles dans la base ?** C'est le « dernier rempart ». Même si l'interface ou l'API avaient un oubli, la base refuserait une donnée invalide.

**Les migrations :** quand on modifie la structure d'une base qui contient **déjà** des données (ajout de la photo de profil, des pièces jointes…), on ne recrée pas tout. On lance un petit script qui ne fait que les changements : `backend/database/migrations/2026-10-medias.sql`, puis `2026-10-temps-reel.sql` (code par e-mail, accusés de lecture, modification et suppression des messages, nouveaux trajets des alertes). Les fichiers `…-droits-local.sql` ne servent qu'au PC : ils donnent ses droits au compte `covoitmay_app`.

**Les preuves :** `backend/database/tests-regles.sql` essaie de faire des choses interdites et vérifie que la base les refuse.

---

## 3. Le back-end : l'API (Node.js + Express)

**L'API** est le programme qui reçoit les demandes du site, applique les règles et répond en **JSON**.

**Outils :**
- **Node.js** : exécute du JavaScript sur le serveur. C'est le même langage que le front-end.
- **Express** : crée facilement les **routes**, par exemple `GET /api/trajets`.

### 3.1 Le trajet d'une requête

Exemple : le passager réserve une place (`POST /api/reservations`).

```
app.js ──► middlewares ──► route ──► contrôleur ──► service ──► modèle ──► MariaDB
          (sécurité,      (adresse)   (lit la       (règles     (SQL
           connexion,                  requête,      métier)     seulement)
           rôle,                       répond)
           validation)
```

| Dossier | Rôle | Exemple |
|---|---|---|
| `src/app.js` | Démarre le serveur et branche tout | Sécurité, routes, tâches planifiées |
| `src/routes/` | Liste des adresses de l'API | `router.post('/', authentifier, …)` |
| `src/middlewares/` | Contrôles communs à plusieurs routes | `authentifier` (jeton), `autoriser` (rôle), `validate…Body` (données) |
| `src/controllers/` | Lit la requête, appelle le service, renvoie la réponse | `res.status(201).json(…)` |
| `src/services/` | **Les règles métier** | « seul le conducteur du trajet accepte une demande » |
| `src/models/` | **Uniquement du SQL** | `SELECT … WHERE id = ?` |
| `src/config/db.js` | Connexion à MariaDB | Pool de connexions, transactions |

**Pourquoi séparer en couches ?** Chaque fichier a un seul rôle. On trouve vite où corriger un problème, et une règle n'est écrite qu'à un seul endroit.

### 3.2 La sécurité (règles RG13)

| Protection | Comment | Contre quoi |
|---|---|---|
| Mots de passe hachés | **bcrypt** : seule l'empreinte est stockée | Vol de la base |
| Connexion | Jeton **JWT** signé, valable 2 h | Usurpation d'identité |
| Rôles | Middleware `autoriser('admin')` | Un passager qui ouvrirait l'administration |
| Validation | Chaque champ reçu est vérifié (type, longueur, format) | Données invalides, champs cachés comme `role: admin` |
| Requêtes préparées | Valeurs passées par des `?` | Injection SQL |
| Limites | 10 connexions et 300 requêtes par quart d'heure et par adresse IP | Robots, attaques par force brute |
| En-têtes HTTP | **helmet** | Diverses attaques du navigateur |
| **CORS** | Seul le site (`FRONTEND_URL`) peut appeler l'API | Un autre site qui utiliserait l'API |
| Secrets | Fichier `.env`, jamais envoyé sur GitHub | Fuite des mots de passe |

### 3.3 Les fichiers envoyés (photos, vocaux, justificatifs)

- **multer** reçoit le fichier.
- On vérifie son **vrai type** en lisant ses premiers octets (sa « signature ») : un programme renommé en `.jpg` est refusé.
- Le **service de stockage** (`stockageService.js`) range le fichier :
  - en **local**, dans `backend/uploads/medias` (pendant le développement) ;
  - sur **Backblaze B2**, dans un bucket **privé** (en production). La base ne garde que la **clé** du fichier.
- Les fichiers ne sont jamais publics : l'API les relit après avoir vérifié les droits. Par exemple, seules les deux personnes d'une conversation peuvent écouter un vocal.

### 3.4 Les documents PDF

**pdfkit** dessine les PDF côté serveur :
- **pour les membres** : le reçu de paiement et le relevé mensuel ;
- **pour l'administrateur** : le rapport d'activité, le relevé des transactions et le journal des actions.

Les montants viennent de la base : le navigateur ne peut pas les modifier. Le gabarit commun est dans `src/services/pdf/gabaritPdf.js`.

### 3.5 Le temps réel (WebSocket)

Avant, le site devait **redemander** au serveur s'il y avait du nouveau. Avec un **WebSocket**, la connexion reste ouverte et le serveur **prévient** le site tout de suite.

- **Bibliothèque :** `ws`, branchée sur le même serveur et le même port que l'API, à l'adresse `/api/temps-reel` (fichier `src/tempsReel.js`).
- **Connexion :** le site envoie d'abord son jeton (`{ type: 'auth', jeton }`). Le serveur le vérifie comme pour une requête normale, et refuse un compte suspendu ou non confirmé.
- **Ce qui passe par là :** nouveau message, message modifié ou supprimé, « reçu », « lu », « en train d'écrire… » et les pastilles de la barre de navigation.
- **Si le WebSocket est coupé** (réseau, hébergeur) : le site relit la conversation toutes les 8 secondes et les pastilles toutes les 30 secondes. Il fonctionne donc toujours, juste un peu moins vite.

**Les accusés de lecture :** une coche = envoyé ; deux coches grises = reçu (le destinataire était connecté) ; deux coches dorées = lu (il a ouvert la conversation). Un état ne revient jamais en arrière (trigger de la base).

### 3.6 Le code reçu par e-mail

À l'inscription, et pour un mot de passe oublié, l'API envoie un **code à 6 chiffres** :
- valable **10 minutes**, avec **5 essais** au plus ;
- un nouveau code au plus toutes les **60 secondes**, et 5 par heure ;
- le code n'est **jamais enregistré en clair** : la base garde seulement son empreinte (HMAC-SHA256) ;
- tant que le code n'est pas saisi, le compte n'a **aucun accès** au site ;
- pour « mot de passe oublié », la réponse est la même que l'adresse existe ou non : on ne révèle pas qui est inscrit.

L'e-mail part avec **nodemailer** par un serveur **SMTP** (Gmail, alwaysdata, Brevo…). Sans réglage SMTP, en local, le code s'affiche simplement dans le terminal de l'API : `>>> CODE : 123456 <<<`.

### 3.7 Les variables d'environnement (`.env`)

Ce sont les **réglages et les secrets**, qui changent entre ton PC et le serveur. Ils ne sont jamais écrits dans le code.

| Variable | Rôle |
|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Où est la base, et comment s'y connecter |
| `JWT_SECRET` | Clé qui signe les jetons de connexion (96 caractères aléatoires) |
| `FRONTEND_URL` | Adresse du site autorisée à appeler l'API (CORS) |
| `TRUST_PROXY` | `1` en production : l'API est derrière le proxy de l'hébergeur |
| `B2_…` | Accès au bucket Backblaze des médias |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Le serveur d'e-mails qui envoie les codes (test : `npm run test:email -- ton@adresse.fr`) |

Le fichier `.env.example` montre la liste des variables, **sans les vraies valeurs**.

---

## 4. Le front-end : le site (Vue.js)

**Outils :**

| Outil | Rôle dans le projet |
|---|---|
| **Vue.js 3** | Découpe l'interface en **composants** réutilisables (`TripCard`, `AvatarMembre`…) ; l'écran se met à jour tout seul quand les données changent |
| **Vue Router** | Navigation entre les pages sans rechargement ; chaque page déclare les rôles autorisés |
| **Pinia** | « Stores » : données partagées entre les pages (personne connectée, compteurs…) |
| **Bootstrap 5** + `main.css` | Grille responsive, composants, charte Covoit'May |
| **Leaflet** + OpenStreetMap | Cartes interactives |
| **Vite** | Serveur de développement et **build** : transforme le code en fichiers optimisés dans `dist/` |

**Organisation (`frontend/src/`) :**

| Dossier | Contenu |
|---|---|
| `views/` | Les pages (accueil, recherche, messagerie, profil, administration…) |
| `components/` | Les morceaux réutilisables (carte de trajet, barre de navigation, avatar…) |
| `router/index.js` | La liste des pages et leurs droits d'accès |
| `stores/` | `auth.js` (qui est connecté), `data.js` (tous les appels à l'API) |
| `services/api.js` | **Le seul fichier qui parle au serveur** : ajoute le jeton, lit le JSON, gère les erreurs |
| `assets/main.css` | Le style, dont le responsive (mobile, tablette, ordinateur) |

**Quelques techniques utilisées :**
- **Responsive :** grilles CSS (`grid-template-areas`) qui réorganisent le hero et les cartes selon la largeur de l'écran.
- **Photo de profil :** le navigateur la recadre en 512 × 512 px avec un `<canvas>` avant l'envoi. Elle passe de plusieurs Mo à environ 60 Ko.
- **Message vocal :** l'API du navigateur **MediaRecorder** enregistre le micro, jusqu'à 2 minutes maximum. Elle ne fonctionne qu'en HTTPS ou sur `localhost`.
- **Fichiers protégés** (PDF, photos et vocaux des messages) : ils sont téléchargés avec le jeton de connexion, puis affichés à partir d'une adresse locale `blob:`.
- **Lecteur de vocal (comme WhatsApp) :** une forme d'onde où l'on clique ou glisse pour se déplacer, et un bouton de vitesse 1× / 1,5× / 2× (`playbackRate`).
- **Ouvrir la conversation en bas :** après l'affichage des messages (`nextTick`), on fait défiler tout en bas. Un `ResizeObserver` y reste quand une photo finit de se charger, sauf si la personne lit plus haut : un bouton « Nouveaux messages » apparaît alors.

---

## 5. Travailler et tester en local

**Sur ton PC :** Windows 11, VS Code, Node.js 24, MariaDB 12.3.

```powershell
# 1. Créer la base (une seule fois ; ATTENTION : efface la base existante)
#    Dans PowerShell, « < » n'existe pas : on utilise « source »
& "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" -u root -p -e "source backend/database/covoitmay.sql"

# 2. Lancer l'API (terminal 1)
cd backend
npm install
npm run dev          # http://localhost:3000/api

# 3. Lancer le site (terminal 2)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite relaie les appels `/api` du site vers l'API (port 3000). Les comptes de démonstration sont listés dans le `README.md`.

**Pour tester :**
- **Postman** : tester chaque route de l'API (avec l'en-tête `Authorization: Bearer <jeton>`) avant de la brancher sur le site.
- **DevTools** du navigateur (F12) : l'onglet **Console** pour les erreurs, l'onglet **Réseau** pour les requêtes et réponses JSON, le **mode responsive** pour le mobile et la tablette.
- **DBeaver** : vérifier ce qui est réellement enregistré dans la base.

---

## 6. Versionner avec Git et GitHub

- **Git** garde l'historique de chaque modification (les **commits**). On peut revenir en arrière et comparer.
- **GitHub** garde une copie en ligne : https://github.com/Mourad-Saidomar/covoit-may
- Le fichier **`.gitignore`** empêche d'envoyer :
  - `.env` (les secrets) ;
  - `node_modules/` (réinstallable avec `npm install`) ;
  - `dist/` (recréé par le build) ;
  - `uploads/` (les fichiers des membres, protégés par le RGPD) ;
  - `*.tgz` (les archives d'envoi).

```powershell
git add -A
git status                          # TOUJOURS vérifier la liste avant de valider
git commit -m "feat: ce qui a été ajouté"
git push                            # envoie sur GitHub, et republie le site
```

Préfixes de messages de commit : `feat:` pour une nouvelle fonctionnalité, `fix:` pour une correction, `docs:` pour la documentation.

---

## 7. La mise en ligne

### 7.1 Pourquoi ces hébergeurs ?

Tout est **gratuit** et **sans carte bancaire**.

| Service | Ce qu'il héberge | Pourquoi lui |
|---|---|---|
| **Cloudflare Workers** | Le site (front-end) | Gratuit, rapide dans le monde entier, HTTPS inclus, republication automatique à chaque `git push` |
| **alwaysdata** | L'API + la base MariaDB | Hébergeur français gratuit (100 Mo), qui fournit **MariaDB** : notre script SQL, avec ses triggers, fonctionne presque tel quel. Node.js, HTTPS et SSH sont inclus. |
| **Backblaze B2** | Photos, vocaux, sauvegardes | 10 Go gratuits, stockage **hors** du serveur, compatible S3 |
| **GitHub** | Le code | Relié à Cloudflare |

Oracle Cloud avait été envisagé au départ, mais son inscription était trop compliquée.

### 7.2 L'API et la base sur alwaysdata

Panneau d'administration : https://admin.alwaysdata.com

1. **Base de données** (Bases de données → MySQL) :
   - créer la base `mourad_covoitmay` ;
   - créer l'utilisateur `mourad_app`, avec accès à cette base uniquement.
2. **SSH** (Accès distant → SSH) : activer la connexion par mot de passe.
   Pour se connecter : `ssh mourad@ssh-mourad.alwaysdata.net`
3. **Node.js** (Environnement → Node.js) : choisir la version 22 ou plus récente.
4. **Envoyer le code** depuis le PC : une archive `tar`, envoyée avec `scp` (voir la partie 8).
5. **Installer les dépendances** sur le serveur : `npm ci --omit=dev`.
6. **Importer la base** : on retire du script la création de la base et des comptes, que le panneau gère, puis `mysql … < script.sql`.
7. **Sécuriser l'administrateur** : remplacer le mot de passe de démonstration `admin1234` par une nouvelle empreinte bcrypt.
8. **Créer le `.env` de production**, avec les vraies valeurs, puis `chmod 600 .env` pour que le fichier soit lisible par toi seul.
9. **Déclarer le site** (Web → Sites) :
   - type Node.js ;
   - commande `node --env-file=/home/mourad/covoitmay/backend/.env /home/mourad/covoitmay/backend/src/app.js`.

   L'API écoute sur l'adresse et le port fournis par alwaysdata (variables `IP` et `PORT`).
10. **Forcer le HTTPS** (onglet SSL du site).

Test : https://mourad.alwaysdata.net/api/sante doit répondre `{"statut":"ok"}`.

### 7.3 Le site sur Cloudflare Workers

1. Créer un **Worker** relié au dépôt GitHub `covoit-may`.
2. **Settings → Build** :

   | Champ | Valeur |
   |---|---|
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Variables de **build** | `VITE_API_URL=https://mourad.alwaysdata.net/api`, `NODE_VERSION=22` |

3. `frontend/wrangler.jsonc` publie le dossier `dist/` en mode `single-page-application`. Ainsi, recharger `/recherche` ne donne pas d'erreur 404 : Cloudflare renvoie `index.html`, et Vue Router affiche la bonne page.
4. **Settings → Domains & Routes** : activer l'adresse `workers.dev`.
5. Sur le serveur, mettre cette adresse dans `FRONTEND_URL` (CORS), puis cliquer sur **Redémarrer**.

### 7.4 Backblaze : médias et sauvegardes

**Médias** (photos de profil, photos et vocaux) :
1. Créer le bucket **privé** `covoitmay-medias-mourad`, et une **clé d'application** limitée à ce bucket.
2. Ajouter les 4 variables `B2_…` dans le `.env` du serveur.
3. Tester avec `npm run test:stockage` : il doit afficher « Backblaze B2 » et trois « OK ».

**Sauvegardes de la base** (règle RG13.14) :
1. Créer un second bucket privé, `covoitmay-sauvegardes-mourad`, avec une **règle de cycle de vie** de 30 jours.
2. Installer **rclone** sur le serveur, et le relier à Backblaze.
3. Le script `~/sauvegarde.sh` exporte la base (`mysqldump`), la compresse, puis l'envoie sur Backblaze.
4. Une **tâche planifiée** alwaysdata le lance chaque nuit à 3 h.
5. La **restauration a été testée** : la sauvegarde, réimportée dans une base vide, contenait les mêmes données.

---

## 8. Mettre à jour le site ensuite

| Partie modifiée | Ce qu'il faut faire |
|---|---|
| **Front-end** (dossier `frontend`) | `git push`, c'est tout : Cloudflare reconstruit et republie le site en 1 à 2 minutes |
| **API** (dossier `backend`) | Envoyer la nouvelle version au serveur (voir ci-dessous) |
| **Structure de la base** | Écrire un script de migration dans `backend/database/migrations/`, puis l'appliquer en local et en production |

**L'ordre compte :** 1. la base (migration), 2. l'API, 3. le site (`git push`). Le nouveau site a besoin de la nouvelle API ; l'ancienne API, elle, fonctionne avec la base migrée.

**Mettre à jour l'API :**

```powershell
# SUR TON PC (PowerShell), dans le dossier du projet
tar -czf backend.tgz --exclude=node_modules --exclude=.env --exclude=uploads backend
scp backend.tgz mourad@ssh-mourad.alwaysdata.net:~/
ssh mourad@ssh-mourad.alwaysdata.net
```

```bash
# SUR LE SERVEUR (invite mourad@ssh2)
find ~/covoitmay/backend -type d -not -path "*/node_modules/*" -exec chmod 755 {} +
tar -xzf ~/backend.tgz -C ~/covoitmay --no-overwrite-dir --delay-directory-restore
find ~/covoitmay/backend -type d -not -path "*/node_modules/*" -exec chmod 755 {} +
cd ~/covoitmay/backend && npm ci --omit=dev
# s'il y a une nouvelle migration :
mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/NOM.sql
```

Si `.env.example` contient de **nouvelles variables** (par exemple `SMTP_…`), les ajouter dans le `.env` du serveur : `nano ~/covoitmay/backend/.env`.

Pour finir, clique sur **Redémarrer** dans le panneau alwaysdata (Web → Sites), puis vérifie `/api/sante`.

---

## 9. Les erreurs rencontrées et leurs solutions

Elles font partie de l'apprentissage, et le jury peut t'interroger dessus.

| Problème | Cause | Solution |
|---|---|---|
| `ParserError : Jeton inattendu « -u »` | Dans PowerShell, un programme dont le chemin est entre guillemets doit être précédé de `&` | `& "C:\…\mariadb.exe" -u root -p …` |
| `L'opérateur « < » est réservé` | PowerShell ne connaît pas `<`, contrairement à Linux | Utiliser `-e "source fichier.sql"` sur le PC ; `<` fonctionne sur le serveur |
| Commandes du serveur tapées sur le PC | Confusion entre les deux terminaux | Regarder l'invite : `PS C:\…>` = PC, `mourad@ssh2:~$` = serveur |
| `JWT_SECRET manquant ou trop court` | Valeur d'exemple `<clé de l'étape 1>` restée dans `.env` | Générer une vraie clé aléatoire de 96 caractères |
| `pool failed to retrieve a connection` | `<compte>` et le mot de passe d'exemple restés dans `.env` | Remplacer par les vraies valeurs ; vérifier avec `grep -n '<' .env` |
| `Connection to upstream failed` | L'API ne démarrait pas (à cause des deux erreurs ci-dessus) | Lancer l'API à la main pour lire l'erreur : `node --env-file=.env src/app.js` |
| Page blanche sur Cloudflare | Le dossier `frontend` était publié **sans build** (code source brut) | Build command `npm run build`, deploy command `npx wrangler deploy` |
| Le site s'affiche, mais sans données | CORS : `FRONTEND_URL` contenait une autre adresse que celle du site | Mettre l'adresse exacte du site, puis Redémarrer |
| `Access denied` pour `mysqldump` | Mot de passe mal recopié dans `~/.my.cnf` | Réécrire le fichier avec `read -s` et `printf` |
| Mot de passe cassé dans une commande | Il contenait une apostrophe `'` et des `$` | Le saisir avec `read -s` et le passer dans une variable |
| `Permission denied` après `tar` | Une archive créée sous Windows enregistre les dossiers sans le droit « x » | `chmod 755` sur les dossiers + `--no-overwrite-dir` |
| Mauvais site affiché en local | Le port 5173 était déjà pris par un autre projet | Arrêter l'ancien serveur, ou changer de port |
| L'API locale ne répond pas ou répond autre chose | Le port 3000 était déjà pris par un autre projet (un portfolio Next.js) | `PORT=3100` dans `backend/.env`, puis lancer Vite avec `$env:API_CIBLE="http://localhost:3100"` |
| Aucun e-mail reçu à l'inscription | `SMTP_HOST` vide : le code est seulement affiché dans le terminal de l'API | Remplir les variables `SMTP_…`, puis `npm run test:email -- ton@adresse.fr` |

**Le réflexe à garder :** lire le message d'erreur **en entier**, puis tester l'étape seule (lancer l'API à la main, appeler `/api/sante`, regarder l'onglet Réseau des DevTools).

---

## 10. Glossaire

| Mot | Définition simple |
|---|---|
| **Front-end** | La partie visible du site, qui s'exécute dans le navigateur |
| **Back-end / API** | Le programme sur le serveur qui gère les données et les règles |
| **REST** | Une façon d'organiser une API : une adresse par ressource (`/trajets`) et un verbe par action (GET lire, POST créer, PUT/PATCH modifier, DELETE supprimer) |
| **JSON** | Le format texte des données échangées : `{"prix": 3.5}` |
| **Code HTTP** | Le résultat d'une requête : 200 OK, 201 créé, 400 donnée invalide, 401 non connecté, 403 interdit, 404 introuvable, 409 règle non respectée, 429 trop de requêtes |
| **JWT** | Un « badge » signé remis à la connexion, et renvoyé à chaque requête pour prouver qui on est |
| **bcrypt / hachage** | Transformation irréversible d'un mot de passe : on stocke l'empreinte, jamais le mot de passe |
| **Middleware** | Une fonction qui s'exécute avant la route (vérifier le jeton, le rôle, les données…) |
| **CORS** | Règle du navigateur : une API n'accepte que les sites qu'elle autorise |
| **Proxy** | Un intermédiaire qui reçoit les requêtes et les transmet (celui d'alwaysdata reçoit le HTTPS pour l'API) |
| **SPA** | *Single Page Application* : une seule page HTML, Vue change le contenu sans recharger |
| **Build** | Transformer le code source en fichiers optimisés pour la production (`dist/`) |
| **Variable d'environnement** | Un réglage lu au démarrage (`.env`), différent en local et en production |
| **Trigger** | Du code SQL lancé automatiquement par la base avant ou après une modification |
| **Migration** | Un script qui fait évoluer la structure d'une base existante sans perdre ses données |
| **SSH** | Une connexion sécurisée pour taper des commandes sur le serveur à distance |
| **scp / tar** | `scp` copie un fichier vers le serveur ; `tar` crée et ouvre une archive |
| **Bucket** | Un « dossier » de stockage dans le cloud (Backblaze) |
| **WebSocket** | Une connexion qui reste ouverte entre le site et le serveur : le serveur peut envoyer une information sans qu'on la lui demande (temps réel) |
| **SMTP** | Le protocole utilisé pour envoyer des e-mails |
| **Code OTP** | *One-Time Password* : un code à usage unique, valable peu de temps (ici 6 chiffres, 10 minutes) |
| **HMAC** | Une empreinte calculée avec une clé secrète : on peut vérifier un code sans l'avoir stocké |
| **HTTPS** | La version chiffrée de HTTP (le cadenas dans le navigateur) |
| **Responsive** | Un site qui s'adapte à la taille de l'écran |
| **RGPD** | La loi européenne sur les données personnelles (effacement du compte, minimisation…) |

---

## 11. Aide-mémoire des commandes

### Sur ton PC (PowerShell, invite `PS C:\…>`)

| Action | Commande |
|---|---|
| Lancer l'API | `cd backend` puis `npm run dev` |
| Lancer le site | `cd frontend` puis `npm run dev` |
| Appliquer une migration | `& "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" -u root -p covoitmay -e "source database/migrations/NOM.sql"` (depuis `backend`) |
| Tester le stockage | `cd backend` puis `npm run test:stockage` |
| Tester l'envoi d'e-mails | `cd backend` puis `npm run test:email -- ton@adresse.fr` |
| Envoyer sur GitHub | `git add -A`, `git status`, `git commit -m "…"`, `git push` |
| Créer et envoyer l'archive de l'API | `tar -czf backend.tgz --exclude=node_modules --exclude=.env --exclude=uploads backend` puis `scp backend.tgz mourad@ssh-mourad.alwaysdata.net:~/` |
| Se connecter au serveur | `ssh mourad@ssh-mourad.alwaysdata.net` |

### Sur le serveur (invite `mourad@ssh2:~$`)

| Action | Commande |
|---|---|
| Aller dans l'API | `cd ~/covoitmay/backend` |
| Lancer l'API à la main (pour voir une erreur) | `node --env-file=.env src/app.js`, puis Ctrl+C |
| Modifier le `.env` | `nano .env` (Ctrl+O, Entrée, Ctrl+X) |
| Vérifier le `.env` sans montrer les secrets | `sed 's/=.*/=…/' .env` |
| Se connecter à la base | `mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay` |
| Appliquer une migration | `mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/NOM.sql` (depuis `~/covoitmay/backend`) |
| Tester l'envoi d'e-mails | `npm run test:email -- ton@adresse.fr` |
| Lancer une sauvegarde à la main | `~/sauvegarde.sh` |
| Lister les sauvegardes | `~/bin/rclone ls b2:covoitmay-sauvegardes-mourad` |
| Revenir sur le PC | `exit` |

### Dans les panneaux web

| Panneau | Pour quoi faire |
|---|---|
| admin.alwaysdata.com → Web → Sites | **Redémarrer** l'API, forcer le HTTPS |
| admin.alwaysdata.com → Avancé → Tâches planifiées | La sauvegarde de chaque nuit |
| dash.cloudflare.com → Workers & Pages → covoit-may | État des déploiements, réglages du build |
| secure.backblaze.com → Buckets | Voir les fichiers, les clés et les règles de cycle de vie |
