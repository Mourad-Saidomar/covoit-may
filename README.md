# Covoit'May

Plateforme de covoiturage local pour Mayotte : projet fil rouge du titre professionnel DWWM.

**Tout le parcours expliqué, de la conception à la mise en ligne :** [docs/guide-de-A-a-Z.md](docs/guide-de-A-a-Z.md)

## En ligne

- Site : https://covoit-may.mourad-saidomar-sio.workers.dev (Cloudflare Workers, republié à chaque push sur `main`)
- API : https://mourad.alwaysdata.net/api (alwaysdata : Node.js et MariaDB), contrôle : `/api/sante`

## Organisation du projet

```
genspark - 3/
├── frontend/                 Application Vue 3 (Vite, Pinia, Vue Router, Bootstrap, Leaflet)
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                  API REST Node.js (Express 5, MariaDB)
│   ├── database/
│   │   ├── covoitmay.sql     Base complète : tables, règles, triggers, vues, données de démo, compte applicatif
│   │   └── tests-regles.sql  Preuves des règles de gestion (tout est annulé à la fin)
│   ├── src/
│   │   ├── config/           Connexion MariaDB (pool, requêtes préparées, transactions)
│   │   ├── controllers/      Lecture de la requête -> appel du service -> réponse JSON
│   │   ├── middlewares/      Sécurité, authentification, rôles, validation, erreurs, journal
│   │   ├── models/           Requêtes SQL uniquement
│   │   ├── routes/           Adresses de l'API et middlewares de chaque route
│   │   ├── services/         Règles de gestion et contrôles de propriété
│   │   └── app.js            Démarrage du serveur
│   ├── .env.example
│   └── package.json
└── infos_projet/             Cahier des charges, maquettes
```

## 1. Créer la base de données

MariaDB 10.11 ou plus. Dans une invite de commandes, dossier `backend` :

```
mariadb -u root -p < database/covoitmay.sql
```

**Attention :** le script supprime puis recrée la base `covoitmay`.

Il crée aussi le compte `covoitmay_app`, qui a des droits limités. Changez son mot de passe à la fin du script avant de le lancer.

Pour rejouer les preuves des règles de gestion :

```
mariadb --force -u root -p covoitmay < database/tests-regles.sql
```

Chaque essai interdit affiche une erreur qui cite sa règle, par exemple « (RG05.3) ». La base n'est pas modifiée.

**Base déjà créée avec une version précédente du script :** appliquer les migrations du dossier `database/migrations`, dans l'ordre, sans rien perdre :

```
mariadb -u root -p covoitmay < database/migrations/2026-10-medias.sql
mariadb -u root -p covoitmay < database/migrations/2026-10-temps-reel.sql
mariadb -u root -p covoitmay < database/migrations/2026-10-temps-reel-droits-local.sql
```

Le dernier fichier donne ses droits au compte `covoitmay_app` : il ne sert **qu'en local** (en production, le compte de l'hébergeur a déjà tous les droits). Sous PowerShell, `<` n'existe pas : utiliser `mariadb -u root -p covoitmay -e "source database/migrations/NOM.sql"`.

## 2. Lancer l'API

```
cd backend
copy .env.example .env      (puis remplir DB_PASSWORD et JWT_SECRET)
npm install
npm run dev
```

L'API répond sur http://localhost:3000/api. Pour vérifier qu'elle tourne : `GET /api/sante`.

**Médias (photos de profil, photos et vocaux de la messagerie).** Sans configuration, ils sont rangés dans `backend/uploads/medias` (non versionné). En production, ils vont dans un bucket **privé** Backblaze B2 : remplir `B2_S3_ENDPOINT`, `B2_BUCKET_MEDIAS`, `B2_KEY_ID` et `B2_APPLICATION_KEY` dans `.env`. Pour vérifier la connexion au stockage : `npm run test:stockage`.

**E-mails (code à 6 chiffres à l'inscription et pour le mot de passe oublié).** Sans `SMTP_HOST`, rien n'est envoyé : le code s'affiche dans la console de l'API (`>>> CODE : 123456 <<<`), ce qui suffit pour tester en local. En production, remplir `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` et `MAIL_FROM`, puis vérifier avec `npm run test:email -- vous@exemple.fr`.

**Temps réel.** La messagerie, les accusés de lecture, « en train d'écrire » et les pastilles passent par un WebSocket ouvert sur le même port que l'API (`/api/temps-reel`). S'il est coupé, le site relit les données régulièrement : il fonctionne quand même.

## 3. Lancer le frontend

```
cd frontend
npm install
npm run dev
```

Le site s'ouvre sur http://localhost:5173. Toutes ses données viennent de l'API : l'API (étape 2) doit donc tourner en même temps.

Vite relaie les appels `/api` vers `http://localhost:3000` (voir `frontend/vite.config.ts`) : le navigateur ne parle qu'à une seule adresse. Pour une autre adresse d'API en production, définir `VITE_API_URL` au moment du build.

Si le port 3000 est déjà pris sur le PC, lancer l'API sur un autre port (`PORT=3100` dans `backend/.env`) et indiquer ce port à Vite : `$env:API_CIBLE="http://localhost:3100"; npm run dev` (PowerShell).

La connexion renvoie un jeton (JWT) gardé dans le navigateur et envoyé à chaque requête. Si le serveur le refuse (session expirée, compte suspendu…), le site déconnecte la personne et explique pourquoi.

## Mettre à jour l'API en production (alwaysdata)

**Ordre à respecter :** 1. la base (migration), 2. l'API, 3. le site (`git push`). Le nouveau site a besoin de la nouvelle API ; l'ancienne API fonctionne avec la base migrée.

Sur le PC (PowerShell, dossier du projet) :

```
tar -czf backend.tgz --exclude=node_modules --exclude=.env --exclude=uploads backend
scp backend.tgz mourad@ssh-mourad.alwaysdata.net:~/
```

Sur le serveur (`ssh mourad@ssh-mourad.alwaysdata.net`) :

```
find ~/covoitmay/backend -type d -not -path "*/node_modules/*" -exec chmod 755 {} +
tar -xzf ~/backend.tgz -C ~/covoitmay --no-overwrite-dir --delay-directory-restore
find ~/covoitmay/backend -type d -not -path "*/node_modules/*" -exec chmod 755 {} +
cd ~/covoitmay/backend && npm ci --omit=dev
```

S'il y a une nouvelle migration, l'appliquer **avant** de redémarrer (jamais les fichiers `-droits-local`) :

```
cd ~/covoitmay/backend
mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/NOM.sql
```

Si de nouvelles variables sont apparues dans `.env.example`, les ajouter dans `~/covoitmay/backend/.env` (`nano .env`). Puis cliquer sur « Redémarrer » dans le panneau alwaysdata (Web → Sites), et contrôler `/api/sante`.
Les `chmod` sont indispensables : une archive créée sous Windows enregistre les dossiers sans le droit « x », et Linux refuserait d'y écrire les nouveaux fichiers. `.env` et `uploads/` ne sont jamais écrasés : ils ne sont pas dans l'archive.

## Comptes de démonstration

Valables en local et en ligne, sauf le mot de passe administrateur : `admin1234` ne fonctionne qu'en local, il a été remplacé en production.

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@covoitmay.yt | admin1234 |
| Conductrice vérifiée | rachida@exemple.yt | demo1234 |
| Conducteur vérifié | ibrahim@exemple.yt | demo1234 |
| Passagère | naima@exemple.yt | demo1234 |
| Passagère avec une demande conducteur en attente | fatima@exemple.yt | demo1234 |
| Passager devenu conducteur | anli@exemple.yt | demo1234 |
| Conducteur en attente de vérification | said@exemple.yt | demo1234 |
| Compte suspendu (connexion refusée) | kamal@exemple.yt | demo1234 |
| Compte bloqué 15 min après 5 échecs | hadidja@exemple.yt | demo1234 |

## Principales adresses de l'API

| Méthode | Adresse | Accès |
|---|---|---|
| POST | `/api/auth/inscription`, `/api/auth/connexion` | public |
| GET | `/api/trajets?depart=&arrivee=&date=&prixMax=&tri=` | public |
| GET | `/api/trajets/:id`, `/api/utilisateurs/:id/profil` | public |
| POST | `/api/trajets` | conducteur |
| POST | `/api/reservations` puis `/api/reservations/:id/accepter` | membre, puis conducteur du trajet |
| POST | `/api/demandes-conducteur` (multipart : véhicule + 2 fichiers) | membre |
| GET | `/api/messages`, `/api/alertes`, `/api/favoris` | membre |
| GET | `/api/admin/tableau-de-bord`, `/api/paiements`, `/api/admin/journal` | administrateur |
| PUT, DELETE | `/api/utilisateurs/moi/photo` (multipart : champ `photo`) | membre |
| GET | `/api/utilisateurs/:id/photo` | public |
| POST | `/api/messages/fichier` (multipart : `fichier`, `idDestinataire`, `dureeSecondes` pour un vocal) | membre |
| GET | `/api/messages/:id/fichier` | les 2 participants |
| GET | `/api/documents/recus/:idReservation` (PDF) | passager de la réservation, administrateur |
| GET | `/api/documents/releves/:mois` (PDF, ex. `2026-09`) | membre |
| GET | `/api/documents/admin/activite/:mois`, `…/transactions/:mois`, `…/journal/:mois` (PDF) | administrateur |
| POST | `/api/auth/verifier-email`, `/api/auth/renvoyer-code` (code à 6 chiffres) | public |
| POST | `/api/auth/mot-de-passe-oublie`, `/api/auth/reinitialiser-mot-de-passe` | public |
| GET | `/api/notifications` (messages non lus, nouveaux trajets des alertes) | membre |
| POST | `/api/messages/lus` (`{ avec }`) | membre |
| PATCH, DELETE | `/api/messages/:id` (modifier sous 15 min ; supprimer `{ pourTous }`) | auteur (ou destinataire pour « pour moi ») |
| POST | `/api/alertes/vues` | membre |
| POST | `/api/contact` (`{ nom, email, sujet, message }`, 5 par heure et par IP) | public |
| WebSocket | `/api/temps-reel` (premier message : `{ type: 'auth', jeton }`) | membre |

Les routes protégées attendent l'en-tête `Authorization: Bearer <jeton>`, où le jeton est renvoyé par la connexion.

## Règles de gestion

Elles sont détaillées dans `infos_projet/Covoit-May-Cahier-des-Charges-v3.4.docx`, partie 4 : RG01 à RG13, soit 133 règles.

Chaque règle est vérifiée à au moins un niveau : base de données (contraintes et triggers), API (middlewares et services) ou interface.
---------------------------------------------------------------------------------------------------------

<!-- Le frontend est maintenant branché sur le backend : toutes les données affichées viennent de ta base MariaDB par l'API. J'ai testé le parcours complet dans un navigateur, avec le frontend, l'API et une copie temporaire de la base, sans toucher à ta vraie base. Les 36 vérifications passent et la console n'affiche aucune erreur.

**Pour le lancer chez toi**
1. Créer la base : `mariadb -u root -p < backend/database/covoitmay.sql`. Attention, ce script supprime puis recrée la base `covoitmay`.
2. Démarrer l'API : `cd backend`, puis `npm run dev`. J'ai déjà créé le fichier `backend/.env` avec une clé de connexion aléatoire. Si tu changes le mot de passe du compte `covoitmay_app` dans le script SQL, reporte-le dans ce fichier.
3. Démarrer le site : `cd frontend`, puis `npm run dev`, et ouvrir http://localhost:5173.

**Ce qui a changé côté frontend**
- **Appels au serveur :** un nouveau fichier, [api.js](frontend/src/services/api.js), fait tous les appels. Vite relaie les adresses `/api` vers le port 3000.
- **Connexion :** elle se fait par le serveur. Si le serveur refuse la session (compte suspendu entre-temps, session expirée), le site déconnecte la personne et affiche la raison.
- **Pages :** toutes lisent l'API. Les squelettes de chargement correspondent maintenant à de vrais temps d'attente, et les messages d'erreur du serveur s'affichent (« trajet complet », « (RG05.3) »…).
- **Fausses données :** j'ai supprimé `mockData.js`.

Côté backend, j'ai ajouté une route publique pour le taux de commission et l'information « avis déjà déposé » dans les réservations.

**Changements de comportement, imposés par tes règles de gestion**
- **Inscription conducteur :** il n'y a plus de champ véhicule. Le conducteur envoie ensuite son véhicule et ses deux justificatifs depuis son profil, et ne peut publier qu'une fois vérifié (RG02.3).
- **Messagerie :** on ne peut écrire qu'à une personne avec qui on a une réservation (RG09.1). Sinon, le refus est expliqué à l'écran.
- **Comptes :** l'administrateur peut suspendre ou réactiver un compte, mais plus le supprimer. Seule la personne peut supprimer son propre compte, en redonnant son mot de passe.
- **Paiement :** les champs de carte bancaire restent décoratifs et ne sont jamais envoyés au serveur (RG06.6).

**À faire de ton côté :** les anciens serveurs lancés depuis la racine du projet, `npm run dev` et l'aperçu sur le port 4173, affichent l'ancienne version. Arrête-les et relance depuis `frontend/`. -->