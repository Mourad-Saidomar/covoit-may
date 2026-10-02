# Covoit'May : le guide de A à Z

Ce guide explique **tout ce qui compose Covoit'May** et **tout le chemin** parcouru, de l'idée jusqu'au site en ligne.

Pour chaque élément, il dit :
- **ce que c'est** ;
- **à quoi il sert dans le projet** ;
- **où le trouver** (fichier ou panneau) ;
- **pourquoi ce choix**.

Il est écrit pour un apprenti : rien n'est considéré comme « évident ». Les mots techniques sont expliqués dans le texte et repris dans le **glossaire** (partie 13).

> **En ligne**
> - Site : https://covoit-may.mourad-saidomar-sio.workers.dev
> - API : https://mourad.alwaysdata.net/api (test : `/api/sante`)
> - Code : https://github.com/Mourad-Saidomar/covoit-may

---

## Sommaire

0. [La vue d'ensemble](#0-la-vue-densemble)
1. [La conception](#1-la-conception)
2. [La boîte à outils : tous les outils et services](#2-la-boîte-à-outils--tous-les-outils-et-services)
3. [La base de données (MariaDB)](#3-la-base-de-données-mariadb)
4. [Le back-end : l'API (Node.js + Express)](#4-le-back-end--lapi-nodejs--express)
5. [Le front-end : le site (Vue.js)](#5-le-front-end--le-site-vuejs)
6. [Les fonctionnalités, de l'écran jusqu'à la base](#6-les-fonctionnalités-de-lécran-jusquà-la-base)
7. [Travailler et tester en local](#7-travailler-et-tester-en-local)
8. [Versionner avec Git et GitHub](#8-versionner-avec-git-et-github)
9. [La mise en ligne](#9-la-mise-en-ligne)
10. [Mettre à jour le site ensuite](#10-mettre-à-jour-le-site-ensuite)
11. [Les erreurs rencontrées et leurs solutions](#11-les-erreurs-rencontrées-et-leurs-solutions)
12. [Limites connues et pistes d'amélioration](#12-limites-connues-et-pistes-damélioration)
13. [Glossaire](#13-glossaire)
14. [Aide-mémoire des commandes](#14-aide-mémoire-des-commandes)

---

## 0. La vue d'ensemble

Covoit'May est composé de **trois programmes séparés** qui se parlent, et de plusieurs **services extérieurs** :

```
   Navigateur de l'utilisateur (ordinateur, tablette, téléphone)
            │
            │ 1. charge les pages du site (HTML, CSS, JavaScript)
            ▼
   ┌──────────────────────────┐        ┌──────────────────────────┐
   │  FRONT-END (Vue.js)      │ ─────► │  OpenStreetMap / OSRM    │
   │  ce que l'on voit        │        │  fonds de carte,         │
   │  hébergé sur Cloudflare  │        │  itinéraires             │
   └──────────────────────────┘        └──────────────────────────┘
            │
            │ 2. demande des données : requêtes HTTP (JSON)
            │    + une connexion WebSocket pour le temps réel
            ▼
   ┌──────────────────────────┐        ┌──────────────────────────┐
   │  BACK-END : l'API        │ ─────► │  Backblaze B2            │
   │  (Node.js + Express)     │        │  photos, vocaux,         │
   │  règles, sécurité        │        │  sauvegardes             │
   │  hébergé chez alwaysdata │        └──────────────────────────┘
   └──────────────────────────┘        ┌──────────────────────────┐
            │                  ─────►  │  Gmail (SMTP)            │
            │                          │  e-mails avec les codes  │
            │                          └──────────────────────────┘
            │ 3. lit et écrit les données (requêtes SQL)
            ▼
   ┌──────────────────────────┐
   │  BASE DE DONNÉES         │   hébergée chez alwaysdata
   │  (MariaDB)               │
   └──────────────────────────┘
```

**Le principe à retenir :** le navigateur ne parle **jamais** directement à la base de données. Il passe toujours par l'API, qui vérifie :
1. **qui** fait la demande (connexion) ;
2. s'il en a **le droit** (rôle, propriétaire de la donnée) ;
3. si les données sont **valides** (format, règles de gestion).

**Les trois rôles des membres :**

| Rôle | Ce qu'il peut faire |
|---|---|
| **Visiteur** (non connecté) | Chercher des trajets, voir un trajet, voir un profil public, s'inscrire, se connecter |
| **Passager** | Réserver et payer, annuler, donner un avis, écrire au conducteur, créer des alertes, garder des conducteurs favoris, demander à devenir conducteur |
| **Conducteur** (vérifié) | Tout ce que fait un passager, plus : publier, modifier et annuler des trajets, accepter ou refuser les réservations, gérer ses véhicules |
| **Administrateur** | Tableau de bord, comptes, demandes conducteur, avis signalés, litiges, transactions, réglages, documents PDF. Il ne voyage pas et n'utilise pas la messagerie. |

---

## 1. La conception

Avant d'écrire du code, on a décrit **ce que l'application doit faire**. C'est le rôle du **cahier des charges** : `infos_projet/Covoit-May-Cahier-des-Charges-v3.4.docx`.

| Partie | Contenu | Pourquoi |
|---|---|---|
| 1. Présentation | Contexte (Mayotte), problème, objectifs, public | Savoir **pourquoi** on crée le site |
| 2. Expression des besoins | Acteurs (visiteur, passager, conducteur, administrateur), 8 fonctionnalités principales (F1 à F8), 31 besoins fonctionnels (BF01 à BF31), besoins non fonctionnels, contraintes, périmètre | Savoir **quoi** faire, et ce qu'on ne fait pas |
| 3. Environnement technique | Architecture, outils, technologies, organisation du code, hébergement | Savoir **avec quoi** on le fait |
| 4. Règles de gestion | **133 règles** (RG01 à RG13) : « le prix est entre 1 et 10 € », « on ne réserve pas son propre trajet »… Pour chacune : sa traduction dans le code et la preuve qu'elle marche | Les **règles métier**, que le code doit faire respecter |

**Méthode suivie :**
1. Lister les **acteurs**, puis les **fonctionnalités** de chacun.
2. Détailler chaque fonctionnalité en **besoins fonctionnels** : « [Acteur] doit pouvoir [action] », avec les données obligatoires et la logique métier.
3. En déduire les **règles de gestion**, puis les **données** à stocker, donc le **modèle de la base** avec la méthode **Merise** :
   - **MCD** (modèle conceptuel) : les entités et leurs liens, sans technique (« un conducteur publie des trajets ») ;
   - **MLD** (modèle logique) : les tables, les clés primaires et étrangères ;
   - **MPD** (modèle physique) : le script SQL réel, avec les types (`INT`, `VARCHAR`, `DATETIME`…).
4. Dessiner les **maquettes** des écrans avec **Figma** (ordinateur et mobile).

**La traçabilité :** chaque règle porte un code, par exemple RG05.3. On retrouve ce code dans le script SQL, dans l'API et dans les messages d'erreur. On peut ainsi suivre une règle depuis le cahier des charges jusqu'au code, et le montrer au jury.

---

## 2. La boîte à outils : tous les outils et services

### 2.1 Les outils installés sur le PC

| Outil | Ce que c'est | À quoi il a servi |
|---|---|---|
| **Windows 11** | Le système d'exploitation du PC | Poste de développement |
| **VS Code** | Éditeur de code (Microsoft, gratuit) | Écrire tout le code ; terminal intégré ; une extension Vue colore et vérifie les fichiers `.vue` |
| **PowerShell** | Le terminal de Windows | Lancer les commandes (`npm`, `git`, `tar`, `scp`, `ssh`…) |
| **Node.js 24** + **npm** | Node exécute du JavaScript hors du navigateur ; npm installe les bibliothèques | Faire tourner l'API et les outils du front-end (Vite) |
| **MariaDB 12.3** | Serveur de base de données relationnelle | La base locale `covoitmay` |
| **DBeaver** | Logiciel graphique pour explorer une base | Voir les tables, lancer des requêtes, vérifier les triggers |
| **Postman** | Logiciel pour envoyer des requêtes HTTP à la main | Tester chaque route de l'API avant de la brancher sur le site |
| **Git** | Gestionnaire de versions | Garder l'historique du code (partie 8) |
| **Navigateur + DevTools** (F12) | Outils de développement intégrés à Chrome / Edge | Console (erreurs), Réseau (requêtes), mode responsive (mobile), Application (localStorage) |
| **Figma** | Outil de maquettes en ligne | Dessiner les écrans avant de coder |
| **Microsoft Word** | Traitement de texte | Le cahier des charges |
| **OpenSSH** (`ssh`, `scp`) | Inclus dans Windows 11 | Se connecter au serveur et lui envoyer des fichiers |
| **tar** | Inclus dans Windows 11 | Créer l'archive de l'API avant l'envoi |

### 2.2 Les services en ligne

Tous sont **gratuits**.

| Service | Ce qu'il fait pour Covoit'May | Où le gérer |
|---|---|---|
| **GitHub** | Garde le code en ligne ; prévient Cloudflare à chaque `git push` | github.com/Mourad-Saidomar/covoit-may |
| **Cloudflare Workers** | Héberge et diffuse le site (front-end), avec HTTPS | dash.cloudflare.com → Workers & Pages |
| **alwaysdata** | Héberge l'API (Node.js) et la base MariaDB ; accès SSH ; HTTPS ; tâches planifiées | admin.alwaysdata.com |
| **Backblaze B2** | Stocke les photos et les vocaux (bucket `covoitmay-medias-mourad`) et les sauvegardes de la base (bucket `covoitmay-sauvegardes-mourad`) | secure.backblaze.com |
| **Gmail (SMTP)** | Envoie les e-mails avec les codes à 6 chiffres (adresse `covoitmay@gmail.com`) | myaccount.google.com → Sécurité |
| **OpenStreetMap** (tuiles) | Les « images » du fond de carte affichées par Leaflet | Aucun compte : service public |
| **OSRM** (`router.project-osrm.org`) | Calcule l'itinéraire routier, la distance et la durée d'un trajet | Aucun compte : serveur de démonstration |
| **Google Fonts** | Fournit la police **Recursive** des titres | Lien dans `frontend/index.html` |
| **Données IGN** (via le projet *france-geojson*) | Le tracé des côtes de Mayotte de la carte d'accueil | Converti une fois dans `frontend/src/data/carteMayotte.js` |

### 2.3 Les outils utilisés sur le serveur (alwaysdata, Linux)

| Outil | À quoi il sert |
|---|---|
| **bash** | Le terminal Linux du serveur (invite `mourad@ssh2:~$`) |
| **nano** | Éditeur de texte dans le terminal, pour modifier le `.env` |
| **npm ci** | Installe **exactement** les versions écrites dans `package-lock.json` (plus sûr que `npm install` en production) |
| **mysql** | Client en ligne de commande : appliquer un script SQL, interroger la base |
| **mysqldump** | Exporte toute la base dans un fichier `.sql` (sauvegarde) |
| **rclone** | Copie des fichiers vers un stockage en ligne (ici Backblaze) |
| **chmod** | Change les droits d'un fichier (`600` : lisible par toi seul ; `755` : dossier ouvrable) |
| **Tâche planifiée** (panneau alwaysdata) | Lance `~/sauvegarde.sh` chaque nuit à 3 h |

---

## 3. La base de données (MariaDB)

**MariaDB** est une base **relationnelle** : les données sont rangées dans des **tables** (comme des tableaux Excel) reliées entre elles. Elle est gratuite et compatible MySQL.

**Fichier principal :** `backend/database/covoitmay.sql`. Il crée tout d'un coup : la base, les tables, les règles, les données de démonstration et le compte de l'application.

### 3.1 Les 17 tables

| Table | Ce qu'elle contient |
|---|---|
| `utilisateur` | Les membres : identité, e-mail (confirmé ou non), mot de passe haché, rôle, statut, note moyenne, photo |
| `administrateur` | Les comptes administrateurs (séparés des membres) |
| `commune` | Les 22 lieux de départ et d'arrivée (les 17 communes de Mayotte et 5 grands villages : Passamainty, Kawéni, Combani, Vahibé, Longoni), avec leurs coordonnées GPS |
| `vehicule` | Les véhicules des conducteurs |
| `demande_conducteur` | Les demandes « devenir conducteur », avec les justificatifs |
| `trajet` | Les trajets publiés : départ, arrivée, date, heure, places, prix, statut |
| `reservation` | Les réservations des passagers et leur statut (en attente, confirmée, refusée, annulée, terminée) |
| `paiement` | Le paiement lié à chaque réservation : autorisé, validé, annulé, remboursé |
| `avis` | Les notes et commentaires après un trajet |
| `message` | Les messages : texte, photo ou vocal ; dates d'envoi, de réception, de lecture, de modification, de suppression |
| `message_masque` | Les messages qu'une personne a supprimés « pour elle » |
| `litige` | Les problèmes signalés sur une réservation, et leur résolution |
| `alerte` | Les alertes de trajet (départ, arrivée, heures, prix maximum) et la date de dernière consultation |
| `favori` | Les conducteurs favoris d'un membre |
| `parametre` | Les réglages de la plateforme : commission (12 %), délai de remboursement (24 h), 10 alertes au maximum, conservation des justificatifs (30 jours), 5 essais de connexion, blocage de 15 minutes |
| `journal_admin` | L'historique des actions des administrateurs (impossible à modifier ou effacer) |
| `code_verification` | Les codes envoyés par e-mail (seulement leur empreinte), avec les essais et l'expiration |

### 3.2 Les « briques » SQL qui protègent les données

| Brique | Nombre | Exemple | À quoi ça sert |
|---|---|---|---|
| **Clé primaire** | 1 par table | `id_trajet` | Identifier chaque ligne de façon unique |
| **Clé étrangère** | Nombreuses | une réservation pointe vers un trajet existant | Garder des liens cohérents : pas de réservation sur un trajet qui n'existe pas |
| **Contrainte `UNIQUE`** | Plusieurs | un seul compte par e-mail ; pas deux alertes identiques | Empêcher les doublons |
| **Contrainte `CHECK`** | Nombreuses | `prix BETWEEN 1 AND 10` ; un vocal dure de 1 à 120 s | Refuser une valeur interdite |
| **Trigger** | 33 | `trg_reservation_avant_insertion` : « on ne réserve pas son propre trajet » | Faire respecter une règle **même si quelqu'un contourne l'API** |
| **Vue** | 2 | `v_profil_public` (prénom, initiale, note… sans e-mail ni téléphone) ; `v_trajets_disponibles` | Ne montrer que ce qui est permis |
| **Procédure stockée** | 2 | `cloturer_trajets_passes()` ; `recalculer_note()` | Traitements automatiques réutilisables |
| **Compte applicatif** | 1 | `covoitmay_app` | L'API ne se connecte jamais en `root` ; elle n'a aucun droit de supprimer des tables ni d'effacer des paiements |

**Comment un trigger refuse une action :** il lance `SIGNAL SQLSTATE '45000'` avec un message, par exemple « Un message ne peut être modifié que dans les 15 minutes qui suivent son envoi (RG09.3) ». L'API transforme cette erreur en réponse **409** et le site affiche le message.

**Pourquoi autant de règles dans la base ?** C'est le « dernier rempart ». Même si l'interface ou l'API avaient un oubli, la base refuserait une donnée invalide.

### 3.3 Les autres fichiers SQL

| Fichier | Rôle |
|---|---|
| `backend/database/tests-regles.sql` | **Les preuves** : il essaie des actions interdites et vérifie que la base les refuse. Tout est annulé à la fin. |
| `backend/database/migrations/2026-10-medias.sql` | **Migration** : ajoute les photos de profil et les pièces jointes à une base existante |
| `backend/database/migrations/2026-10-temps-reel.sql` | **Migration** : e-mail confirmé, codes, accusés de lecture, modification et suppression des messages, nouveaux trajets des alertes |
| `backend/database/migrations/2026-10-temps-reel-droits-local.sql` | Droits du compte `covoitmay_app` sur les nouvelles tables. **Seulement sur le PC.** |

**Une migration**, c'est un script qui fait évoluer la structure d'une base qui contient **déjà** des données, sans tout effacer. On l'applique en local puis en production.

---

## 4. Le back-end : l'API (Node.js + Express)

**L'API** (interface de programmation) est le programme qui reçoit les demandes du site, applique les règles et répond en **JSON** (un format texte : `{"prix": 3.5}`).

### 4.1 Node.js et ce qu'on utilise de lui

**Node.js** exécute du JavaScript sur le serveur. Avantage : c'est le même langage que le front-end.

| Fonction de Node | Utilisation dans le projet |
|---|---|
| **Modules ES** (`import` / `export`, `"type": "module"`) | Chaque fichier importe ce dont il a besoin |
| `--env-file-if-exists=.env` | Lit le fichier `.env` au démarrage, sans bibliothèque supplémentaire |
| `--watch` (`npm run dev`) | Redémarre l'API à chaque modification du code |
| **crypto** (module intégré) | Tirer les codes à 6 chiffres (`randomInt`), calculer leur empreinte (`createHmac`), les comparer sans fuite de temps (`timingSafeEqual`), créer des noms de fichiers aléatoires (`randomBytes`) |
| **fs** (module intégré) | Lire et écrire les fichiers en local (`uploads/`) |
| `setInterval` | Les tâches automatiques (partie 4.10) |

### 4.2 Les bibliothèques (paquets npm) du back-end

Elles sont listées dans `backend/package.json`. `npm install` les télécharge dans `node_modules/`.

| Paquet | Ce que c'est | À quoi il sert ici | Où |
|---|---|---|---|
| **express** (v5) | Le framework web le plus utilisé de Node | Déclarer les routes (`GET /api/trajets`) et enchaîner les middlewares | `src/app.js`, `src/routes/` |
| **mariadb** | Le pilote officiel de MariaDB | Se connecter à la base (pool de connexions), requêtes préparées, transactions | `src/config/db.js` |
| **jsonwebtoken** | Création et vérification de jetons JWT | Le « badge » de connexion, signé, valable 2 h | `src/middlewares/authentifier.js` |
| **bcryptjs** | Hachage de mots de passe | Stocker l'empreinte du mot de passe (coût 12), jamais le mot de passe | `src/services/authService.js` |
| **helmet** | En-têtes de sécurité HTTP | Protège contre plusieurs attaques du navigateur (contenu piégé, iframe…) | `src/app.js` |
| **cors** | Gestion du CORS | Seule l'adresse du site (`FRONTEND_URL`) peut appeler l'API | `src/app.js` |
| **express-rate-limit** | Limitation du nombre de requêtes | 10 connexions et 300 requêtes par quart d'heure et par adresse IP | `src/middlewares/limiteurs.js` |
| **multer** | Réception de fichiers envoyés par formulaire | Justificatifs, photos de profil, photos et vocaux des messages | `src/middlewares/upload…js` |
| **pdfkit** | Dessin de documents PDF | Reçus, relevés mensuels, documents de l'administrateur | `src/services/documentService.js`, `src/services/pdf/gabaritPdf.js` |
| **aws4fetch** | Signature des requêtes au format Amazon S3 | Déposer et lire les fichiers dans Backblaze B2 | `src/services/stockageService.js` |
| **ws** | Serveur WebSocket | Le temps réel : messages, accusés, « en train d'écrire », pastilles | `src/tempsReel.js` |
| **nodemailer** | Envoi d'e-mails | Envoyer les codes à 6 chiffres par SMTP (Gmail) | `src/services/emailService.js` |

### 4.3 Le trajet d'une requête (l'architecture en couches)

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
| `src/app.js` | Démarre le serveur et branche tout | Sécurité, routes, tâches planifiées, temps réel |
| `src/routes/` | Liste des adresses de l'API et des contrôles de chacune | `router.post('/', authentifier, autoriser(MEMBRES), validateReservationBody, …)` |
| `src/middlewares/` | Contrôles communs à plusieurs routes | Jeton, rôle, validation des données, fichiers, erreurs |
| `src/controllers/` | Lit la requête, appelle le service, renvoie la réponse | `res.status(201).json(…)` |
| `src/services/` | **Les règles métier** | « seul le conducteur du trajet accepte une demande » |
| `src/models/` | **Uniquement du SQL** | `SELECT … WHERE id = ?` |
| `src/config/db.js` | Connexion à MariaDB | Pool, requêtes préparées, transactions |

**Pourquoi séparer en couches ?** Chaque fichier a un seul rôle. On trouve vite où corriger un problème, et une règle n'est écrite qu'à un seul endroit.

**La connexion à la base** (`src/config/db.js`) :
- un **pool** garde jusqu'à 10 connexions ouvertes et les prête aux requêtes (plus rapide que d'en ouvrir une à chaque fois) ;
- `requete(sql, valeurs)` envoie une **requête préparée** : les valeurs passent par des `?` et ne sont jamais collées dans le SQL (protection contre l'**injection SQL**) ;
- `transaction(travail)` exécute plusieurs requêtes en « tout ou rien » : si une échoue, aucune n'est enregistrée.

### 4.4 Les modules de l'API (les routes)

Chaque fichier de `src/routes/` correspond à un **domaine** du site. Toutes les adresses commencent par `/api`.

| Préfixe | Fichier | Ce qu'on y fait | Qui |
|---|---|---|---|
| `/sante` | `app.js` | Vérifier que l'API tourne | Tout le monde |
| `/auth` | `auth.routes.js` | Inscription, confirmation de l'e-mail, renvoi du code, connexion, mot de passe oublié, « qui suis-je ? » (`/moi`) | Public (sauf `/moi`) |
| `/communes` | `commune.routes.js` | Liste des communes | Public |
| `/parametres` | `parametre.routes.js` | Réglages publics (taux de commission…) | Public |
| `/utilisateurs` | `utilisateur.routes.js` | Mon profil, mot de passe, photo, suppression du compte ; profil public, avis reçus, photo d'un membre ; liste et suspension des comptes | Membre / public / admin |
| `/vehicules` | `vehicule.routes.js` | Mes véhicules : lister, ajouter, désactiver | Conducteur |
| `/demandes-conducteur` | `demandeConducteur.routes.js` | Déposer sa demande (véhicule + 2 justificatifs) ; l'admin consulte, ouvre les justificatifs, accepte ou refuse | Membre / admin |
| `/trajets` | `trajet.routes.js` | Rechercher, voir le détail ; publier, modifier, annuler ; voir les réservations d'un trajet | Public / conducteur |
| `/reservations` | `reservation.routes.js` | Réserver, mes réservations, accepter, refuser, annuler | Membre / conducteur |
| `/paiements` | `paiement.routes.js` | Suivi des transactions | Admin |
| `/avis` | `avis.routes.js` | Déposer, signaler ; l'admin liste, restaure ou supprime | Membre / admin |
| `/messages` | `message.routes.js` | Conversations, envoyer un texte, une photo ou un vocal, lire un fichier, marquer comme lu, modifier, supprimer | Membre |
| `/litiges` | `litige.routes.js` | Ouvrir un litige, mes litiges ; l'admin prend en charge et résout | Membre / admin |
| `/alertes` | `alerte.routes.js` | Mes alertes, créer, activer ou mettre en pause, supprimer, marquer comme vues | Membre |
| `/favoris` | `favori.routes.js` | Mes conducteurs favoris : lister, ajouter, retirer | Membre |
| `/documents` | `document.routes.js` | PDF : reçu, relevé mensuel ; rapport d'activité, transactions, journal | Membre / admin |
| `/notifications` | `notification.routes.js` | Les deux compteurs des pastilles (messages non lus, nouveaux trajets) | Membre |
| `/admin` | `admin.routes.js` | Tableau de bord, réglages, journal des actions | Admin |
| `/temps-reel` | `tempsReel.js` | La connexion WebSocket (partie 4.8) | Membre |

### 4.5 Les middlewares, un par un

Un **middleware** est une fonction qui s'exécute **avant** le contrôleur. Il peut laisser passer la requête (`next()`) ou l'arrêter avec une erreur.

| Fichier | Rôle |
|---|---|
| `requestLogger.js` | Écrit une ligne par requête dans la console : heure, méthode, adresse, code, durée, utilisateur. **Jamais** le mot de passe ni le jeton. |
| `limiteurs.js` | `limiteurApi` (300 requêtes / 15 min / IP) et `limiteurConnexion` (10 essais / 15 min / IP). Au-delà : **429**. |
| `authentifier.js` | Lit le jeton dans l'en-tête `Authorization: Bearer …`, vérifie sa signature (HS256) et sa date, puis **relit le compte dans la base** : un compte suspendu, supprimé ou non confirmé est refusé (**401**). |
| `autoriser.js` | Vérifie le rôle : `autoriser('admin')`, `autoriser('conducteur')`, `autoriser(MEMBRES)`. Sinon : **403**. |
| `validation.js` | La « boîte à outils » de validation : `texte`, `email`, `motDePasse`, `telephone`, `entier`, `nombre`, `booleen`, `date`, `heure`, `choix`… Les champs non prévus sont **supprimés** (on ne peut pas glisser `"role": "admin"`). |
| `validate…Body.js` (un par domaine) | Utilisent `validation.js` pour décrire les données attendues de chaque formulaire |
| `validateId.js` | Vérifie qu'un identifiant dans l'adresse est un entier positif (`/trajets/abc` est refusé) |
| `validateMois.js` | Vérifie un mois `AAAA-MM` pour les relevés PDF (pas de mois futur) |
| `uploadJustificatifs.js` | Reçoit la pièce d'identité et le permis : PDF, JPEG ou PNG, 5 Mo ; nom de fichier aléatoire ; dossier non public |
| `uploadMedia.js` | Reçoit une photo de profil (2 Mo) ou une pièce jointe de message (photo 5 Mo, vocal 3 Mo) ; contrôle la **signature** du fichier |
| `notFound.js` | Adresse inconnue : réponse **404** en JSON |
| `errorHandler.js` | Reçoit **toutes** les erreurs et renvoie un message clair en français, sans détail technique. Il traduit les erreurs de la base : trigger → 409, doublon → 409, lien impossible → 400… |

**La signature d'un fichier :** les premiers octets d'un fichier indiquent son vrai type (`%PDF`, `FF D8 FF` pour un JPEG…). On les lit pour refuser un programme renommé en `.jpg`.

### 4.6 Les services, un par un

Les services contiennent **la logique métier**. Ils appellent les modèles (SQL).

| Service | Ce qu'il fait |
|---|---|
| `authService.js` | Inscription (mot de passe haché, envoi du code), confirmation de l'e-mail, connexion (blocage après 5 échecs), mot de passe oublié, réinitialisation |
| `codeService.js` | Crée un code à 6 chiffres (10 min, 5 essais, 1 envoi / 60 s, 5 / heure) et le vérifie |
| `emailService.js` | Envoie l'e-mail du code (HTML aux couleurs du site) avec nodemailer, ou l'affiche dans la console en local |
| `utilisateurService.js` | Profil, mot de passe, photo, suppression du compte (anonymisation), gestion des comptes par l'admin |
| `vehiculeService.js` | Ajouter ou désactiver un véhicule |
| `demandeConducteurService.js` | Dépôt de la demande, décision de l'admin, effacement des justificatifs après 30 jours |
| `trajetService.js` | Recherche, détail, publication (prévient les membres dont l'alerte correspond), modification, annulation |
| `reservationService.js` | Réserver et payer, accepter, refuser, annuler (avec remboursement selon le délai) |
| `paiementService.js` | Liste des transactions pour l'admin |
| `avisService.js` | Dépôt, signalement, modération |
| `messageService.js` | Conversations, envoi (texte, photo, vocal), lecture, modification, suppression ; prévient les deux personnes en temps réel |
| `litigeService.js` | Ouverture, prise en charge, résolution (avec remboursement éventuel) |
| `alerteService.js` | Alertes, compteur de nouveaux trajets, « marquer comme vues » |
| `favoriService.js` | Ajouter ou retirer un conducteur favori |
| `notificationService.js` | Calcule les deux compteurs des pastilles |
| `adminService.js` | Tableau de bord, réglages, journal |
| `communeService.js` | Liste des communes |
| `documentService.js` + `pdf/gabaritPdf.js` | Fabrique les 5 PDF (partie 4.7) |
| `stockageService.js` | Range les fichiers en local ou sur Backblaze (partie 4.7) |

Chaque service a son **modèle** dans `src/models/` (par exemple `trajetModel.js`), qui ne contient que les requêtes SQL. Quelques modèles sans service propre : `statistiqueModel.js` (chiffres du tableau de bord), `journalModel.js` (journal des admins), `parametreModel.js`, `administrateurModel.js`, `codeModel.js`, `documentModel.js`.

### 4.7 Les fichiers et les PDF

**Les fichiers envoyés (photos, vocaux, justificatifs) :**
1. **multer** reçoit le fichier et le garde en mémoire.
2. On vérifie son **vrai type** (signature) et sa taille.
3. Le **service de stockage** (`stockageService.js`) le range sous un **nom aléatoire** :
   - en **local**, dans `backend/uploads/medias` (pendant le développement) ;
   - sur **Backblaze B2**, dans un bucket **privé** (en production). Les requêtes sont signées avec **aws4fetch** (format Amazon S3, que Backblaze comprend).
4. La base ne garde que la **clé** du fichier (son chemin), pas le fichier.
5. Les fichiers ne sont jamais publics : l'API les relit après avoir vérifié les droits. Seules les deux personnes d'une conversation peuvent écouter un vocal.

Les justificatifs restent toujours sur le serveur (`backend/uploads/justificatifs`) et sont effacés 30 jours après la décision (RGPD).

**Les PDF** sont dessinés par **pdfkit**, côté serveur :

| Document | Pour qui | Contenu |
|---|---|---|
| Reçu | Le passager (et l'admin) | La preuve d'une réservation payée |
| Relevé mensuel | Chaque membre | Trajets, dépenses, revenus de conducteur du mois |
| Rapport d'activité | Admin | Chiffres du mois (inscriptions, trajets, réservations…) |
| Relevé des transactions | Admin | Tous les paiements du mois |
| Journal des actions | Admin | Ce que les administrateurs ont fait (traçabilité) |

Les montants viennent de la base : le navigateur ne peut pas les modifier. Le gabarit commun (en-tête, couleurs, tableaux, pied de page) est dans `src/services/pdf/gabaritPdf.js`.

### 4.8 Le temps réel (WebSocket)

Une requête HTTP classique part **toujours** du navigateur : le serveur ne peut pas prévenir le site de lui-même. Avec un **WebSocket**, la connexion reste ouverte dans les deux sens.

- **Bibliothèque :** `ws`, branchée sur le même serveur et le même port que l'API, à l'adresse `/api/temps-reel` (fichier `src/tempsReel.js`).
- **Sécurité :**
  - seule l'adresse du site (`FRONTEND_URL`) peut se connecter ;
  - le site doit envoyer son jeton dans les 10 premières secondes (`{ type: 'auth', jeton }`), vérifié comme pour une requête normale ;
  - un jeton invalide ferme la connexion (code 4001) ; un administrateur est refusé (code 4003) ;
  - le compte est revérifié régulièrement : un compte suspendu est déconnecté.
- **Battement de cœur :** toutes les 25 secondes, le serveur vérifie que le navigateur répond encore (« ping »). Sinon, il ferme la connexion.
- **Les événements envoyés :** `message` (nouveau message), `message-modifie`, `message-supprime`, `message-masque`, `recus`, `lus`, `ecrit` (« en train d'écrire… »), `compteurs` (pastilles).
- **Si le WebSocket est coupé** (réseau, hébergeur) : le site se reconnecte en attendant de plus en plus longtemps (1 s, 2 s, 4 s… jusqu'à 30 s), et en attendant il relit la conversation toutes les 8 secondes et les pastilles toutes les 30 secondes. Le site marche donc toujours.

**Les accusés de lecture :** une coche = envoyé ; deux coches grises = reçu (le destinataire était connecté) ; deux coches dorées = lu (il a ouvert la conversation). Un état ne revient jamais en arrière (trigger de la base).

### 4.9 Le code reçu par e-mail (OTP)

À l'inscription, et pour un mot de passe oublié, l'API envoie un **code à 6 chiffres** :
- tiré au hasard par un **générateur cryptographique** (`crypto.randomInt`) ;
- valable **10 minutes**, avec **5 essais** au plus ;
- un nouveau code au plus toutes les **60 secondes**, et 5 par heure ;
- **jamais enregistré en clair** : la base garde son empreinte **HMAC-SHA256** (calculée avec la clé secrète du serveur) ;
- comparé avec `timingSafeEqual`, qui prend toujours le même temps (on ne peut pas deviner le code en mesurant la durée de la réponse) ;
- tant que le code n'est pas saisi, le compte n'a **aucun accès** au site ;
- pour « mot de passe oublié », la réponse est la même que l'adresse existe ou non : on ne révèle pas qui est inscrit.

L'e-mail part avec **nodemailer** par le serveur **SMTP** de Gmail (partie 9.5). Sans réglage SMTP, en local, le code s'affiche dans le terminal de l'API : `>>> CODE : 123456 <<<`.

Les codes de plus de 7 jours sont effacés chaque jour (minimisation des données, RGPD).

### 4.10 Les tâches automatiques

Lancées par `src/app.js` au démarrage, puis régulièrement :

| Tâche | Fréquence | Ce qu'elle fait |
|---|---|---|
| Clôture des trajets | Toutes les 15 minutes | Les trajets passés deviennent « terminés », leurs réservations aussi (procédure `cloturer_trajets_passes`) |
| Purge des justificatifs | Chaque jour | Efface les pièces d'identité 30 jours après la décision |
| Purge des codes | Chaque jour | Efface les codes e-mail de plus de 7 jours |

La **sauvegarde** de la base, elle, est lancée par le serveur (partie 9.4).

### 4.11 La sécurité, en résumé (règles RG13)

| Protection | Comment | Contre quoi |
|---|---|---|
| Mots de passe hachés | **bcrypt** (coût 12) : seule l'empreinte est stockée | Vol de la base |
| Connexion | Jeton **JWT** signé (HS256), valable 2 h, compte relu à chaque requête | Usurpation d'identité |
| Confirmation de l'e-mail | Code à 6 chiffres | Faux comptes, adresses d'autres personnes |
| Blocage | 5 mauvais mots de passe = compte bloqué 15 minutes | Force brute |
| Rôles | Middleware `autoriser` + garde du routeur côté site | Un passager qui ouvrirait l'administration |
| Propriété | Les services partent toujours de l'identifiant du jeton | Lire ou modifier les données d'un autre |
| Validation | Chaque champ reçu est vérifié ; les champs inconnus sont supprimés | Données invalides, `role: admin` caché |
| Requêtes préparées | Valeurs passées par des `?` | Injection SQL |
| Limites | 10 connexions et 300 requêtes par quart d'heure et par IP ; JSON limité à 100 ko | Robots, saturation |
| En-têtes HTTP | **helmet** | Attaques du navigateur |
| **CORS** | Seul le site (`FRONTEND_URL`) peut appeler l'API et ouvrir le WebSocket | Un autre site qui utiliserait l'API |
| Fichiers | Signature vérifiée, nom aléatoire, stockage privé, lecture après contrôle des droits | Fichiers piégés, fuite de documents |
| Messages d'erreur | Aucun détail technique ; même réponse pour un e-mail inconnu ou un mauvais mot de passe | Espionnage de la structure, recherche de comptes |
| Journal | Ni mot de passe, ni jeton | Fuite de secrets par les journaux |
| Secrets | Fichier `.env`, jamais envoyé sur GitHub ; `chmod 600` sur le serveur | Fuite des mots de passe |
| HTTPS | Forcé chez alwaysdata et Cloudflare | Écoute du réseau |
| Base | Triggers, CHECK, compte `covoitmay_app` aux droits minimaux | Contournement de l'API |
| Sauvegardes | Chaque nuit, hors du serveur, restauration testée | Perte des données |

### 4.12 Les variables d'environnement (`.env`)

Ce sont les **réglages et les secrets**, qui changent entre ton PC et le serveur. Ils ne sont jamais écrits dans le code. Le fichier `.env.example` montre la liste, **sans les vraies valeurs**.

| Variable | Rôle |
|---|---|
| `PORT`, `IP` | Port et adresse d'écoute (alwaysdata les fournit) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Où est la base, et comment s'y connecter |
| `JWT_SECRET` | Clé qui signe les jetons et les codes (96 caractères aléatoires ; l'API refuse de démarrer avec moins de 32) |
| `JWT_DUREE` | Durée d'une session (`2h`) |
| `FRONTEND_URL` | Adresse(s) du site autorisée(s) à appeler l'API (CORS et WebSocket), séparées par des virgules |
| `TRUST_PROXY` | `1` en production : l'API est derrière le proxy de l'hébergeur (pour lire la vraie IP des visiteurs) |
| `LIMITE_CONNEXIONS`, `LIMITE_REQUETES` | Pour changer les limites par IP (facultatif) |
| `B2_S3_ENDPOINT`, `B2_BUCKET_MEDIAS`, `B2_KEY_ID`, `B2_APPLICATION_KEY` | Accès au bucket Backblaze des médias |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Le serveur d'e-mails qui envoie les codes |

### 4.13 Les scripts de test du back-end

| Commande (dossier `backend`) | Ce qu'elle vérifie |
|---|---|
| `npm run dev` | Lance l'API et la relance à chaque modification |
| `npm start` | Lance l'API (sans relance automatique) |
| `npm run test:stockage` | Envoie, relit et supprime un petit fichier dans le stockage (local ou Backblaze) |
| `npm run test:email -- adresse@exemple.fr` | Envoie un e-mail de test avec le SMTP du `.env` |

---

## 5. Le front-end : le site (Vue.js)

Le front-end est une **SPA** (*Single Page Application*) : une seule page HTML ; Vue change le contenu sans recharger la page.

### 5.1 Les bibliothèques du front-end

Listées dans `frontend/package.json`.

| Paquet | Ce que c'est | À quoi il sert ici |
|---|---|---|
| **vue** (v3) | Le framework de l'interface | Découper l'écran en **composants** ; l'affichage se met à jour tout seul quand les données changent (réactivité) |
| **vue-router** | Le routeur de Vue | Faire correspondre une adresse (`/recherche`) à une page, et bloquer les pages interdites |
| **pinia** | Le gestionnaire d'état de Vue | Les « stores » : données partagées entre les pages (personne connectée, compteurs…) |
| **bootstrap** (v5) + **@popperjs/core** | Bibliothèque CSS et JavaScript | Grille responsive, boutons, formulaires, fenêtres (modales), menus ; Popper place les menus déroulants |
| **bootstrap-icons** | Une police d'icônes | Toutes les icônes (`bi-chat-dots`, `bi-check2-all`…) |
| **leaflet** | Bibliothèque de cartes interactives | La carte du trajet (page détail), avec les tuiles OpenStreetMap |
| **vite** (outil de développement) | Serveur de développement + outil de **build** | Recharge instantanée pendant le code ; fabrique les fichiers optimisés de `dist/` |
| **@vitejs/plugin-vue** | Extension de Vite | Comprendre les fichiers `.vue` |
| **wrangler** (outil) | L'outil en ligne de commande de Cloudflare | Publier `dist/` sur Cloudflare Workers (`npx wrangler deploy`) |

### 5.2 Les fichiers de configuration

| Fichier | Rôle |
|---|---|
| `index.html` | La seule page HTML : elle contient `<div id="app">`, la police Google Fonts et charge `src/main.js` |
| `vite.config.ts` | Réglages de Vite : l'alias `@` (= `src/`), le **relais** (proxy) qui envoie `/api` et le WebSocket vers l'API (port 3000, ou `API_CIBLE`), le dossier de build `dist` |
| `wrangler.jsonc` | Réglages de Cloudflare : publier `dist/` en mode `single-page-application` (toute adresse inconnue renvoie `index.html`) |
| `package.json` | Les bibliothèques et les commandes (`dev`, `build`, `deploy`) |
| `ecosystem.config.cjs`, `tsconfig.json`, scripts `dev:sandbox`, `clean-port`, `test` | **Restes du modèle de départ** (générateur de projet). Ils ne servent pas au site : on peut les ignorer ou les supprimer. |

**Le relais de Vite (proxy) :** en local, le site tourne sur le port 5173 et l'API sur le port 3000. Vite fait suivre les adresses `/api` vers l'API : le navigateur ne parle qu'à une seule adresse, donc pas de problème de CORS en local. En production, l'adresse de l'API est donnée par `VITE_API_URL` au moment du build.

### 5.3 Le démarrage du site (`src/main.js`)

1. Crée l'application Vue et branche **Pinia**.
2. Importe **Bootstrap**, **Bootstrap Icons** et notre `main.css`.
3. Prévoit quoi faire si l'API répond **401** alors qu'on était connecté : fermer la session et retourner à la page de connexion avec une explication.
4. Écoute le temps réel pour les pastilles (sinon : relecture toutes les 30 s).
5. Attend deux choses : la vérification du jeton gardé (« qui est connecté ? ») et le chargement des communes et des réglages.
6. Branche le **routeur** et affiche l'application dans `<div id="app">`.

`App.vue` est le cadre de toutes les pages : la barre de navigation, la page en cours (`<RouterView>`) et le pied de page.

### 5.4 Les dossiers de `frontend/src/`

| Dossier ou fichier | Contenu |
|---|---|
| `views/` | Les **pages** (partie 5.6) |
| `components/` | Les **morceaux réutilisables** (partie 5.5) |
| `router/index.js` | La liste des pages, leurs rôles autorisés et la **garde** qui les applique |
| `stores/auth.js` | Qui est connecté, son rôle, connexion, inscription, code e-mail, mot de passe oublié, déconnexion |
| `stores/data.js` | **Tous** les appels à l'API (les pages n'ont pas à connaître les adresses) + les compteurs des pastilles |
| `services/api.js` | **Le seul fichier qui parle au serveur** : ajoute le jeton, lit le JSON, transforme les erreurs, télécharge les fichiers protégés |
| `services/tempsReel.js` | La connexion WebSocket : se connecter, se reconnecter, écouter un événement, envoyer « en train d'écrire » |
| `utils/format.js` | Afficher les dates, les heures, les prix (`Intl.NumberFormat`), « il y a 3 j », les libellés des statuts |
| `utils/image.js` | Réduire une photo avant l'envoi (`<canvas>`) |
| `utils/chargement.js` | Fin des « squelettes » de chargement |
| `reveal.js` | Animation des éléments quand ils apparaissent à l'écran |
| `data/mapData.js` | Les coordonnées GPS des communes (OpenStreetMap) |
| `data/carteMayotte.js` | Le tracé de l'île pour la carte de l'accueil (IGN) |
| `data/pagesInfo.js` | Le texte des pages « À propos », « Conditions générales », « Confidentialité », « Cadre légal » |
| `assets/main.css` | Tout le style : charte (vert lagon, corail, crème), responsive, animations |

**La garde du routeur :** chaque page déclare `meta.roles` (par exemple `[ROLE_CONDUCTEUR]` pour « Publier un trajet »). Avant chaque changement de page, une seule fonction vérifie :
- pas connecté sur une page protégée → page de connexion (puis retour à la page demandée) ;
- connecté mais mauvais rôle → page « Accès refusé ».

Attention : c'est un **confort** pour l'utilisateur. La vraie sécurité est dans l'API (un pirate peut modifier le JavaScript de son navigateur, pas le serveur).

**Le jeton dans le navigateur :** il est gardé dans le **localStorage** (clé `cm_jeton`), pour rester connecté si on recharge la page. Il est envoyé à chaque requête dans l'en-tête `Authorization`.

### 5.5 Les composants

| Composant | Ce qu'il affiche |
|---|---|
| `NavBar.vue` | La barre du haut : liens selon le rôle, pastilles (messages non lus, nouveaux trajets), avatar et prénom cliquables vers « Mon profil », bouton Déconnexion, menu « burger » sur mobile |
| `AppFooter.vue` | Le pied de page et ses liens d'information |
| `SearchForm.vue` | Le formulaire de recherche (départ, arrivée, date) |
| `TripCard.vue` | La carte d'un trajet dans les listes |
| `SqueletteTrajet.vue` | La forme grise animée affichée pendant le chargement |
| `TripMap.vue` | La carte Leaflet du trajet, avec l'itinéraire calculé par OSRM (ou une ligne droite en pointillés si OSRM ne répond pas) |
| `HeroCarte.vue` | La carte animée de Mayotte de l'accueil (SVG) : trajets proposés, petite voiture, « trafic » |
| `AvatarMembre.vue` | La photo d'un membre, ou ses initiales s'il n'en a pas |
| `StarRating.vue` | Les étoiles d'une note (pleine, moitié, vide) |
| `PieceJointeMessage.vue` | Une photo (agrandissable) ou un vocal dans la messagerie : lecteur façon WhatsApp |
| `CodeVerification.vue` | Les 6 cases du code reçu par e-mail (collage du code, passage automatique à la case suivante) |
| `admin/DemandesConducteur.vue` | La liste des demandes conducteur à traiter par l'admin |

### 5.6 Les pages

| Page (adresse) | Fichier | Pour qui |
|---|---|---|
| Accueil (`/`) | `HomeView.vue` | Tous |
| Recherche (`/recherche`) | `SearchView.vue` | Tous |
| Détail d'un trajet (`/trajet/:id`) | `TripDetailView.vue` | Tous (réserver : membre) |
| Profil public (`/profil/:id`) | `PublicProfileView.vue` | Tous |
| Pages d'information (`/a-propos`, `/conditions-generales`, `/confidentialite`, `/cadre-legal`) | `InfoView.vue` | Tous |
| Connexion, inscription | `auth/LoginView.vue`, `auth/RegisterView.vue` | Visiteurs |
| Confirmation de l'e-mail (`/verification-email`) | `auth/VerificationEmailView.vue` | Visiteurs |
| Mot de passe oublié (`/mot-de-passe-oublie`) | `auth/MotDePasseOublieView.vue` | Visiteurs |
| Publier un trajet (`/publier`) | `PublishTripView.vue` | Conducteur |
| Mes trajets (`/mes-trajets`) | `MyTripsView.vue` | Conducteur |
| Mes réservations (`/mes-reservations`) | `MyBookingsView.vue` | Membres |
| Messagerie (`/messagerie`) | `MessagesView.vue` | Membres |
| Mes alertes (`/mes-alertes`) | `MyAlertsView.vue` | Membres |
| Mon profil (`/mon-profil`) | `MyProfileView.vue` | Tous les connectés |
| Administration (`/admin/…`) : tableau de bord, utilisateurs, modération, litiges, transactions, documents | `admin/Admin….vue` (dans `AdminLayout.vue`) | Admin |
| Accès refusé, page introuvable | `ForbiddenView.vue`, `NotFoundView.vue` | Tous |

### 5.7 Les fonctions du navigateur utilisées (API Web)

Ce sont des outils **intégrés au navigateur**, sans bibliothèque :

| API Web | Utilisation |
|---|---|
| `fetch` | Toutes les requêtes vers l'API (`services/api.js`) |
| `WebSocket` | Le temps réel (`services/tempsReel.js`) |
| `localStorage` | Garder le jeton de connexion |
| `MediaRecorder` + `getUserMedia` | Enregistrer un message vocal au micro (2 minutes maximum). Ne fonctionne qu'en **HTTPS** ou sur `localhost`. |
| `Audio` / `<audio>` + `playbackRate` | Écouter un vocal, changer la vitesse (1×, 1,5×, 2×) |
| `<canvas>` + `toBlob` | Réduire une photo avant l'envoi (512 × 512 px pour le profil : de plusieurs Mo à environ 60 Ko) |
| `URL.createObjectURL` (adresses `blob:`) | Afficher une photo, un vocal ou un PDF téléchargé avec le jeton |
| `IntersectionObserver` | Savoir quand un élément entre à l'écran (animations `reveal`) |
| `ResizeObserver` | Rester en bas de la conversation quand une photo finit de se charger |
| `requestAnimationFrame` | Animer la carte de l'accueil et la progression du vocal sans saccade |
| `matchMedia('(prefers-reduced-motion)')` | Couper les animations si la personne l'a demandé dans son système |
| `AbortController` | Abandonner une requête trop longue (calcul d'itinéraire) |
| `Intl.NumberFormat` | Afficher les prix en euros à la française (« 3,50 € ») |

### 5.8 Les techniques CSS et d'interface

- **Responsive :** la grille de Bootstrap, des `@media` (tailles d'écran) et des grilles CSS (`grid-template-areas`) qui réorganisent le hero et les cartes selon la largeur (mobile, tablette, ordinateur).
- **`clamp()`** : des tailles de texte qui grandissent avec l'écran, entre un minimum et un maximum.
- **`position: sticky`** : des éléments qui restent visibles en faisant défiler.
- **Variables CSS** (`--cm-primary`…) : la charte de couleurs définie une seule fois.
- **Animations** (`@keyframes`) : apparition des éléments, trois points qui rebondissent (« en train d'écrire »).
- **Accessibilité :**
  - textes alternatifs et attributs `aria-label` sur les boutons-icônes ;
  - navigation au clavier (`:focus-visible`) ;
  - animations coupées avec `prefers-reduced-motion` ;
  - infobulle « Mon profil » sur l'avatar.
- **Squelettes de chargement :** des formes grises pendant l'attente, au lieu d'un écran vide.

---

## 6. Les fonctionnalités, de l'écran jusqu'à la base

Pour chaque fonctionnalité : **la page**, **l'adresse de l'API** et **ce qui protège la règle**.

### F1 : Comptes

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| S'inscrire | `RegisterView` | `POST /auth/inscription` | Données validées ; mot de passe haché ; compte créé **non confirmé** ; code envoyé par e-mail ; redirection vers la page du code |
| Confirmer son e-mail | `VerificationEmailView` + `CodeVerification` | `POST /auth/verifier-email`, `/auth/renvoyer-code` | Code vérifié (10 min, 5 essais) ; le compte est confirmé et la session s'ouvre ; bouton « renvoyer » après 60 s |
| Se connecter | `LoginView` | `POST /auth/connexion` | Blocage après 5 échecs ; compte non confirmé → nouveau code et page du code |
| Mot de passe oublié | `MotDePasseOublieView` | `POST /auth/mot-de-passe-oublie`, `/auth/reinitialiser-mot-de-passe` | Code par e-mail, puis nouveau mot de passe ; réponse neutre si l'adresse est inconnue |
| Gérer son profil | `MyProfileView` | `PUT /utilisateurs/moi`, `/moi/mot-de-passe`, `/moi/photo` | Seuls certains champs sont modifiables ; photo recadrée par le navigateur |
| Supprimer son compte | `MyProfileView` | `DELETE /utilisateurs/moi` | Mot de passe redemandé ; trajets et réservations annulés ; données personnelles anonymisées ; historique comptable gardé |
| Se déconnecter | Bouton de la `NavBar` | — | Le jeton est effacé du navigateur ; le WebSocket est fermé |

### F2 : Certification des conducteurs

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Demander à devenir conducteur | `MyProfileView` | `POST /demandes-conducteur` | Véhicule + pièce d'identité + permis (PDF, JPEG, PNG, 5 Mo) |
| Valider ou refuser | `admin/AdminUsers`, `AdminDashboard` | `POST /demandes-conducteur/:id/accepter` ou `/refuser` | L'admin ouvre les justificatifs ; refus avec motif ; action notée dans le journal ; justificatifs effacés après 30 jours |
| Gérer ses véhicules | `MyProfileView` | `/vehicules` | Ajouter, désactiver |

### F3 : Trajets

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Rechercher | `HomeView`, `SearchView` | `GET /trajets?depart=&arrivee=&date=&prixMax=&tri=` | Seulement les trajets ouverts et à venir |
| Voir un trajet | `TripDetailView` | `GET /trajets/:id` | Carte et itinéraire (OSRM), conducteur, avis |
| Publier | `PublishTripView` | `POST /trajets` | Conducteur vérifié, date future, prix de 1 à 10 €, places du véhicule (triggers) ; les membres dont l'**alerte** correspond sont prévenus en direct |
| Modifier, annuler | `MyTripsView` | `PATCH /trajets/:id`, `POST /trajets/:id/annuler` | Les passagers sont remboursés si le conducteur annule |
| Suivre ses trajets et revenus | `MyTripsView`, relevé PDF | `GET /trajets/moi` | — |
| Alertes de trajet | `MyAlertsView` | `/alertes` | 10 alertes actives au maximum, sans doublon ; pastille « nouveaux trajets » remise à zéro à l'ouverture de la page (`POST /alertes/vues`) |

### F4 : Réservation et paiement

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Réserver et payer | `TripDetailView` | `POST /reservations` | Le montant est **calculé par la base** ; paiement « autorisé ». Le paiement est **simulé** : les champs de carte ne sont jamais envoyés. |
| Accepter, refuser | `MyTripsView` | `POST /reservations/:id/accepter` ou `/refuser` | Les places et le paiement suivent automatiquement (triggers) ; le téléphone devient visible une fois la réservation confirmée |
| Annuler | `MyBookingsView` | `POST /reservations/:id/annuler` | Remboursé si l'annulation a lieu au moins 24 h avant le départ |
| Mes réservations, reçu | `MyBookingsView` | `GET /reservations/moi`, `GET /documents/recus/:id` | Reçu PDF |

### F5 : Messagerie

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Écrire | `MessagesView` | `POST /messages` | Seulement entre deux personnes liées par une réservation ; 1 à 1 000 caractères |
| Photo, vocal | `MessagesView` | `POST /messages/fichier` | Photo réduite par le navigateur ; vocal enregistré au micro (2 min max) ; stockage privé |
| Recevoir en direct | `MessagesView` | WebSocket `message` | Sans recharger la page |
| « En train d'écrire… » | `MessagesView` | WebSocket `ecrit` | Affiché dans l'en-tête, la liste et une bulle à trois points |
| Accusés de lecture | `MessagesView` | `POST /messages/lus`, WebSocket `recus` / `lus` | Une coche, deux coches, deux coches dorées |
| Modifier (15 min) | Menu ⋯ d'un message | `PATCH /messages/:id` | Texte seulement, par son auteur ; « modifié » affiché |
| Supprimer | Menu ⋯ d'un message | `DELETE /messages/:id` (`pourTous` : vrai ou faux) | « Pour moi » à tout moment ; « pour tous » par l'auteur dans les 24 h : texte et fichier effacés |
| Écouter un vocal | `PieceJointeMessage` | `GET /messages/:id/fichier` | Forme d'onde, se déplacer, vitesse 1× / 1,5× / 2× ; un seul vocal à la fois |
| Ouvrir en bas | `MessagesView` | — | La conversation s'ouvre sur le dernier message ; bouton « Nouveaux messages » si on lit plus haut |
| Pastille des messages | `NavBar` | `GET /notifications`, WebSocket `compteurs` | Se met à jour dès qu'on lit |

### F6 : Confiance et réputation

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Profil public | `PublicProfileView` | `GET /utilisateurs/:id/profil`, `/avis` | Prénom et initiale seulement ; jamais l'e-mail ni le téléphone |
| Déposer un avis | `MyBookingsView` | `POST /avis` | Après le trajet, un seul avis, dans les 30 jours ; la note moyenne est recalculée par la base |
| Modérer les avis | `admin/AdminModeration` | `GET /avis`, `/avis/:id/restaurer`, `DELETE /avis/:id` | — |
| Conducteurs favoris | `PublicProfileView`, `TripDetailView`, `MyProfileView` | `/favoris` | — |

### F7 : Litiges

| Fonctionnalité | Page | API | Ce qui se passe |
|---|---|---|---|
| Traiter un litige | `admin/AdminDisputes` | `/litiges/:id/prendre-en-charge`, `/resoudre` | Décision, explication, remboursement éventuel |

### F8 : Administration

| Fonctionnalité | Page | API |
|---|---|---|
| Tableau de bord | `AdminDashboard` | `GET /admin/tableau-de-bord` |
| Comptes (suspendre, réactiver) | `AdminUsers` | `GET /utilisateurs`, `PATCH /utilisateurs/:id/statut` |
| Transactions | `AdminTransactions` | `GET /paiements` |
| Documents PDF | `AdminDocuments` | `GET /documents/admin/…` |
| Réglages, journal | API | `/admin/parametres`, `/admin/journal` |

---

## 7. Travailler et tester en local

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

Vite relaie les appels `/api` (et le WebSocket) du site vers l'API. Les comptes de démonstration sont listés dans le `README.md`.

**En local, les e-mails ne partent pas** (sauf si tu remplis `SMTP_…`) : le code à 6 chiffres s'affiche dans le terminal de l'API.

**Si le port 3000 est déjà pris** (par un autre projet) : mets `PORT=3100` dans `backend/.env`, puis lance le site avec `$env:API_CIBLE="http://localhost:3100"; npm run dev`.

**Pour tester :**
- **Postman** : tester chaque route de l'API (avec l'en-tête `Authorization: Bearer <jeton>`) avant de la brancher sur le site.
- **DevTools** du navigateur (F12) :
  - **Console** : les erreurs JavaScript ;
  - **Réseau** : les requêtes, les réponses JSON et le WebSocket (filtre « WS ») ;
  - **mode responsive** : le mobile et la tablette ;
  - **Application → Local Storage** : le jeton `cm_jeton`.
- **DBeaver** : vérifier ce qui est réellement enregistré dans la base.
- **Deux navigateurs** (ou une fenêtre privée) connectés avec deux comptes : tester la messagerie en temps réel.
- `tests-regles.sql` : rejouer les preuves des règles de gestion.

---

## 8. Versionner avec Git et GitHub

- **Git** garde l'historique de chaque modification (les **commits**). On peut revenir en arrière et comparer.
- **GitHub** garde une copie en ligne : https://github.com/Mourad-Saidomar/covoit-may
- Une seule branche, `main`, qui contient la version en ligne.
- Le fichier **`.gitignore`** empêche d'envoyer :
  - `.env` (les secrets) ;
  - `node_modules/` (réinstallable avec `npm install`) ;
  - `dist/` (recréé par le build) ;
  - `uploads/` (les fichiers des membres, protégés par le RGPD) ;
  - `*.tgz` (les archives d'envoi) ;
  - `infos_projet/` (documents de travail).

```powershell
git add -A
git status                          # TOUJOURS vérifier la liste avant de valider
git commit -m "feat: ce qui a été ajouté"
git push                            # envoie sur GitHub, et republie le site
```

Préfixes des messages de commit : `feat:` pour une nouvelle fonctionnalité, `fix:` pour une correction, `docs:` pour la documentation.

---

## 9. La mise en ligne

### 9.1 Pourquoi ces hébergeurs ?

Tout est **gratuit** et **sans carte bancaire**.

| Service | Ce qu'il héberge | Pourquoi lui |
|---|---|---|
| **Cloudflare Workers** | Le site (front-end) | Gratuit, rapide dans le monde entier, HTTPS inclus, republication automatique à chaque `git push` |
| **alwaysdata** | L'API + la base MariaDB | Hébergeur français gratuit (100 Mo), qui fournit **MariaDB** : notre script SQL, avec ses triggers, fonctionne presque tel quel. Node.js, HTTPS et SSH sont inclus. |
| **Backblaze B2** | Photos, vocaux, sauvegardes | 10 Go gratuits, stockage **hors** du serveur, compatible S3 |
| **Gmail** | L'envoi des codes par e-mail | Gratuit (500 e-mails par jour), fiable |
| **GitHub** | Le code | Relié à Cloudflare |

Oracle Cloud avait été envisagé au départ, mais son inscription était trop compliquée.

### 9.2 L'API et la base sur alwaysdata

Panneau d'administration : https://admin.alwaysdata.com

1. **Base de données** (Bases de données → MySQL) :
   - créer la base `mourad_covoitmay` ;
   - créer l'utilisateur `mourad_app`, avec accès à cette base uniquement.
2. **SSH** (Accès distant → SSH) : activer la connexion par mot de passe.
   Pour se connecter : `ssh mourad@ssh-mourad.alwaysdata.net`
3. **Node.js** (Environnement → Node.js) : choisir la version 22 ou plus récente.
4. **Envoyer le code** depuis le PC : une archive `tar`, envoyée avec `scp` (voir la partie 10).
5. **Installer les dépendances** sur le serveur : `npm ci --omit=dev` (sans les outils de développement).
6. **Importer la base** : on retire du script la création de la base et des comptes, que le panneau gère, puis `mysql … < script.sql`.
7. **Sécuriser l'administrateur** : remplacer le mot de passe de démonstration `admin1234` par une nouvelle empreinte bcrypt.
8. **Créer le `.env` de production**, avec les vraies valeurs, puis `chmod 600 .env` pour que le fichier soit lisible par toi seul.
9. **Déclarer le site** (Web → Sites) :
   - type Node.js ;
   - commande `node --env-file=/home/mourad/covoitmay/backend/.env /home/mourad/covoitmay/backend/src/app.js`.

   L'API écoute sur l'adresse et le port fournis par alwaysdata (variables `IP` et `PORT`).
10. **Forcer le HTTPS** (onglet SSL du site).

Test : https://mourad.alwaysdata.net/api/sante doit répondre `{"statut":"ok"}`.

### 9.3 Le site sur Cloudflare Workers

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
5. Sur le serveur, mettre cette adresse dans `FRONTEND_URL` (CORS et WebSocket), puis cliquer sur **Redémarrer**.

Le WebSocket utilise la même adresse que l'API, en `wss://` (WebSocket chiffré) : `wss://mourad.alwaysdata.net/api/temps-reel`. Le site la calcule tout seul à partir de `VITE_API_URL`.

### 9.4 Backblaze : médias et sauvegardes

**Médias** (photos de profil, photos et vocaux) :
1. Créer le bucket **privé** `covoitmay-medias-mourad`, et une **clé d'application** limitée à ce bucket.
2. Ajouter les 4 variables `B2_…` dans le `.env` du serveur.
3. Tester avec `npm run test:stockage` : il doit afficher « Backblaze B2 » et trois « OK ».

**Sauvegardes de la base** (règle RG13.14) :
1. Créer un second bucket privé, `covoitmay-sauvegardes-mourad`, avec une **règle de cycle de vie** de 30 jours (les vieilles sauvegardes s'effacent toutes seules).
2. Installer **rclone** sur le serveur, et le relier à Backblaze.
3. Le script `~/sauvegarde.sh` exporte la base (`mysqldump`, avec les triggers et les procédures), la compresse, puis l'envoie sur Backblaze.
4. Une **tâche planifiée** alwaysdata le lance chaque nuit à 3 h.
5. La **restauration a été testée** : la sauvegarde, réimportée dans une base vide, contenait les mêmes données.

### 9.5 Gmail : l'envoi des codes par e-mail

L'API se connecte au serveur d'envoi de Gmail (**SMTP**) avec l'adresse `covoitmay@gmail.com`.

Gmail refuse le mot de passe habituel du compte pour ce genre de connexion. Il faut un **mot de passe d'application** :
1. Se connecter à covoitmay@gmail.com sur myaccount.google.com → **Sécurité**.
2. Activer la **validation en deux étapes** (obligatoire pour la suite).
3. Rechercher **« Mots de passe des applications »**, en créer un nommé « Covoit'May ».
4. Google affiche **16 lettres** : c'est la valeur de `SMTP_PASSWORD` (sans les espaces).

Dans le `.env` du serveur :

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=covoitmay@gmail.com
SMTP_PASSWORD=(les 16 lettres)
MAIL_FROM=Covoit'May <covoitmay@gmail.com>
```

- Le port **587** utilise **STARTTLS** : la connexion démarre en clair puis se chiffre. Le port 465 serait chiffré dès le départ.
- Tester avec `npm run test:email -- covoitmay@gmail.com`, puis **Redémarrer** l'API (elle ne lit le `.env` qu'au démarrage).
- Ne jamais coller ce mot de passe dans un document, un chat ou sur GitHub. S'il a fuité : le supprimer dans Google et en créer un autre.

---

## 10. Mettre à jour le site ensuite

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
# s'il y a une nouvelle migration (jamais les fichiers « -droits-local ») :
mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/NOM.sql
```

Si `.env.example` contient de **nouvelles variables** (par exemple `SMTP_…`), les ajouter dans le `.env` du serveur : `nano ~/covoitmay/backend/.env`.

Pour finir, clique sur **Redémarrer** dans le panneau alwaysdata (Web → Sites), puis vérifie `/api/sante`.

---

## 11. Les erreurs rencontrées et leurs solutions

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
| `535-5.7.8 Username and Password not accepted` (Gmail) | Les valeurs d'exemple (`votre.adresse@gmail.com`, `les16lettresdugoogle`) étaient restées dans `.env`, ou le mot de passe habituel du compte était utilisé | `SMTP_USER=covoitmay@gmail.com` et un **mot de passe d'application** de 16 lettres (partie 9.5) |
| La conversation s'ouvrait tout en haut | Le défilement était fait **avant** que Vue affiche les messages | Faire défiler après `nextTick()`, et rester en bas avec un `ResizeObserver` |
| La pastille des messages ne disparaissait pas | Deux chargements des compteurs se croisaient : l'ancien, plus lent, écrasait le nouveau | Numéroter les chargements et ignorer une réponse dépassée |

**Le réflexe à garder :** lire le message d'erreur **en entier**, puis tester l'étape seule (lancer l'API à la main, appeler `/api/sante`, regarder l'onglet Réseau des DevTools).

---

## 12. Limites connues et pistes d'amélioration

Il vaut mieux les connaître et les dire au jury que de les découvrir pendant la soutenance :

- **Paiement simulé** : aucune vraie transaction. Une vraie version utiliserait un prestataire (Stripe, PayPal, un opérateur de mobile money).
- **Ouvrir un litige** et **signaler un avis** : les adresses de l'API existent (`POST /litiges`, `POST /avis/:id/signaler`) et sont protégées, mais le site n'a pas encore de bouton pour les membres.
- **OSRM** : le serveur de démonstration peut être lent ou indisponible ; le site trace alors une ligne droite.
- **Hébergement gratuit** : 100 Mo chez alwaysdata, d'où le stockage des médias sur Backblaze.
- **Gmail** : 500 e-mails par jour au maximum. Pour un vrai site : un service spécialisé (Brevo, Mailjet) et un nom de domaine.
- **Pas de nom de domaine** : le site utilise les adresses gratuites `workers.dev` et `alwaysdata.net`.
- **Tests automatisés** : les preuves sont en SQL (`tests-regles.sql`) et les parcours ont été testés à la main et par scripts ; il n'y a pas encore de suite de tests intégrée au projet (Vitest, Jest, Playwright…).

---

## 13. Glossaire

| Mot | Définition simple |
|---|---|
| **Front-end** | La partie visible du site, qui s'exécute dans le navigateur |
| **Back-end / API** | Le programme sur le serveur qui gère les données et les règles |
| **REST** | Une façon d'organiser une API : une adresse par ressource (`/trajets`) et un verbe par action (GET lire, POST créer, PUT/PATCH modifier, DELETE supprimer) |
| **JSON** | Le format texte des données échangées : `{"prix": 3.5}` |
| **Code HTTP** | Le résultat d'une requête : 200 OK, 201 créé, 400 donnée invalide, 401 non connecté, 403 interdit, 404 introuvable, 409 règle non respectée, 413 trop gros, 429 trop de requêtes |
| **Framework** | Une boîte à outils qui impose une organisation du code (Express, Vue) |
| **Bibliothèque / paquet npm** | Du code écrit par d'autres, qu'on installe avec npm (`bcryptjs`, `leaflet`…) |
| **Composant** | Un morceau d'interface réutilisable, dans un fichier `.vue` (HTML + JavaScript + style) |
| **Store** | Une « boîte » Pinia qui garde des données partagées entre les pages |
| **Route** | Une adresse : côté API (`POST /api/trajets`) ou côté site (`/mes-trajets`) |
| **Middleware** | Une fonction qui s'exécute avant la route (vérifier le jeton, le rôle, les données…) |
| **Contrôleur / service / modèle** | Les trois couches de l'API : lire la requête / appliquer les règles / parler à la base |
| **JWT** | Un « badge » signé remis à la connexion, et renvoyé à chaque requête pour prouver qui on est |
| **bcrypt / hachage** | Transformation irréversible d'un mot de passe : on stocke l'empreinte, jamais le mot de passe |
| **HMAC** | Une empreinte calculée avec une clé secrète : on peut vérifier un code sans l'avoir stocké |
| **Code OTP** | *One-Time Password* : un code à usage unique, valable peu de temps (ici 6 chiffres, 10 minutes) |
| **CORS** | Règle du navigateur : une API n'accepte que les sites qu'elle autorise |
| **Injection SQL** | Une attaque qui glisse du code SQL dans un champ de formulaire ; évitée par les requêtes préparées |
| **Requête préparée** | Une requête SQL dont les valeurs passent par des `?`, séparées du code |
| **Transaction** | Plusieurs requêtes en « tout ou rien » |
| **Pool de connexions** | Quelques connexions à la base gardées ouvertes et prêtées aux requêtes |
| **Trigger** | Du code SQL lancé automatiquement par la base avant ou après une modification |
| **Vue SQL** | Une requête enregistrée qu'on lit comme une table (ex. le profil public) |
| **Procédure stockée** | Un petit programme enregistré dans la base |
| **Migration** | Un script qui fait évoluer la structure d'une base existante sans perdre ses données |
| **WebSocket** | Une connexion qui reste ouverte entre le site et le serveur : le serveur peut envoyer une information sans qu'on la lui demande (temps réel) |
| **Polling (interrogation régulière)** | Redemander au serveur toutes les X secondes s'il y a du nouveau (solution de secours si le WebSocket est coupé) |
| **SMTP** | Le protocole utilisé pour envoyer des e-mails |
| **STARTTLS** | Une connexion qui démarre en clair puis passe en chiffré (port 587) |
| **Proxy** | Un intermédiaire qui reçoit les requêtes et les transmet (celui d'alwaysdata reçoit le HTTPS pour l'API ; celui de Vite relaie `/api` en local) |
| **SPA** | *Single Page Application* : une seule page HTML, Vue change le contenu sans recharger |
| **Build** | Transformer le code source en fichiers optimisés pour la production (`dist/`) |
| **Variable d'environnement** | Un réglage lu au démarrage (`.env`), différent en local et en production |
| **localStorage** | Un petit espace de stockage du navigateur, propre à chaque site |
| **Blob** | Un fichier gardé en mémoire dans le navigateur, affiché par une adresse `blob:` |
| **SSH** | Une connexion sécurisée pour taper des commandes sur le serveur à distance |
| **scp / tar** | `scp` copie un fichier vers le serveur ; `tar` crée et ouvre une archive |
| **Bucket** | Un « dossier » de stockage dans le cloud (Backblaze) |
| **S3** | Le format de stockage d'Amazon, devenu un standard que Backblaze comprend |
| **Tuile (carte)** | Une petite image carrée du fond de carte ; Leaflet les assemble |
| **HTTPS** | La version chiffrée de HTTP (le cadenas dans le navigateur) |
| **Responsive** | Un site qui s'adapte à la taille de l'écran |
| **Accessibilité** | Rendre le site utilisable par tous (clavier, lecteur d'écran, animations réduites) |
| **RGPD** | La loi européenne sur les données personnelles (effacement du compte, minimisation…) |
| **Merise (MCD, MLD, MPD)** | Méthode française pour concevoir une base de données, du schéma au script SQL |

---

## 14. Aide-mémoire des commandes

### Sur ton PC (PowerShell, invite `PS C:\…>`)

| Action | Commande |
|---|---|
| Lancer l'API | `cd backend` puis `npm run dev` |
| Lancer le site | `cd frontend` puis `npm run dev` |
| Lancer le site vers une API sur un autre port | `$env:API_CIBLE="http://localhost:3100"; npm run dev` (dans `frontend`) |
| Construire le site (pour vérifier) | `cd frontend` puis `npm run build` |
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
| Tester le stockage | `npm run test:stockage` |
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
| myaccount.google.com → Sécurité | Validation en deux étapes, mots de passe d'application (Gmail) |
