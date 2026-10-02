// ============================================================
// Le routeur : il fait le lien entre les adresses (URL)
// et les pages (fichiers .vue du dossier views/)
//
// C'est ici que se joue la règle « chaque utilisateur voit
// les pages qui lui sont attribuées » : chaque route déclare
// la liste des rôles autorisés, et une seule garde applique
// cette règle pour tout le site.
// ============================================================
import { createRouter, createWebHistory } from 'vue-router'
import {
  useAuthStore,
  ROLE_CONDUCTEUR,
  ROLE_ADMIN,
  ROLES_MEMBRES,
  TOUS_LES_ROLES
} from '../stores/auth'
import { useDataStore } from '../stores/data'

// On importe toutes les pages
import HomeView from '../views/HomeView.vue'
import SearchView from '../views/SearchView.vue'
import TripDetailView from '../views/TripDetailView.vue'
import PublicProfileView from '../views/PublicProfileView.vue'
import LoginView from '../views/auth/LoginView.vue'
import RegisterView from '../views/auth/RegisterView.vue'
import VerificationEmailView from '../views/auth/VerificationEmailView.vue'
import MotDePasseOublieView from '../views/auth/MotDePasseOublieView.vue'
import PublishTripView from '../views/PublishTripView.vue'
import MyBookingsView from '../views/MyBookingsView.vue'
import MyTripsView from '../views/MyTripsView.vue'
import MessagesView from '../views/MessagesView.vue'
import MyProfileView from '../views/MyProfileView.vue'
import MyAlertsView from '../views/MyAlertsView.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import AdminUsers from '../views/admin/AdminUsers.vue'
import AdminModeration from '../views/admin/AdminModeration.vue'
import AdminDisputes from '../views/admin/AdminDisputes.vue'
import AdminTransactions from '../views/admin/AdminTransactions.vue'
import AdminDocuments from '../views/admin/AdminDocuments.vue'
import ForbiddenView from '../views/ForbiddenView.vue'
import InfoView from '../views/InfoView.vue'
import ContactView from '../views/ContactView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// ============================================================
// MATRICE DES ACCÈS
// ------------------------------------------------------------
// meta.roles : la liste des rôles qui ont le droit d'ouvrir la page.
//   - pas de meta.roles  -> page publique (visiteurs compris)
//   - meta.roles: [...]   -> il faut être connecté AVEC un de ces rôles
// meta.titre : le titre affiché dans l'onglet du navigateur.
//
//   Page                | passager | conducteur | admin | visiteur
//   --------------------|----------|------------|-------|---------
//   Accueil, recherche  |    oui   |    oui     |  oui  |   oui
//   Détail trajet       |    oui   |    oui     |  oui  |   oui
//   Profil public       |    oui   |    oui     |  oui  |   oui
//   Publier un trajet   |   non    |    oui     |  non  |   non
//   Mes réservations    |    oui   |    oui     |  non  |   non
//   Mes trajets         |   non    |    oui     |  non  |   non
//   Messagerie          |    oui   |    oui     |  non  |   non
//   Mes alertes         |    oui   |    oui     |  non  |   non
//   Mon profil          |    oui   |    oui     |  oui  |   non
//   Administration      |   non    |    non     |  oui  |   non
//
// L'administrateur gère la plateforme : il ne réserve pas de place
// et ne publie pas de trajet (il n'a pas de véhicule dans la base).
// ============================================================
const routes = [
  // ----- Pages publiques (tout le monde) -----
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { titre: 'Accueil' }
  },
  {
    path: '/recherche',
    name: 'search',
    component: SearchView,
    meta: { titre: 'Rechercher un trajet' }
  },
  {
    path: '/trajet/:id',
    name: 'trip-detail',
    component: TripDetailView,
    meta: { titre: 'Détail du trajet' }
  },
  {
    path: '/profil/:id',
    name: 'public-profile',
    component: PublicProfileView,
    meta: { titre: 'Profil public' }
  },

  // ----- Pages d'information (pied de page) -----
  // Une seule vue : meta.page indique le texte à afficher
  // (voir data/pagesInfo.js).
  {
    path: '/a-propos',
    name: 'about',
    component: InfoView,
    meta: { titre: 'À propos', page: 'a-propos' }
  },
  {
    path: '/conditions-generales',
    name: 'terms',
    component: InfoView,
    meta: { titre: "Conditions générales d'utilisation", page: 'conditions-generales' }
  },
  {
    path: '/confidentialite',
    name: 'privacy',
    component: InfoView,
    meta: { titre: 'Politique de confidentialité', page: 'confidentialite' }
  },
  {
    path: '/cadre-legal',
    name: 'legal',
    component: InfoView,
    meta: { titre: 'Cadre légal du covoiturage', page: 'cadre-legal' }
  },
  {
    path: '/contact',
    name: 'contact',
    component: ContactView,
    meta: { titre: 'Nous contacter' }
  },

  // ----- Connexion / inscription -----
  {
    path: '/connexion',
    name: 'login',
    component: LoginView,
    meta: { titre: 'Connexion', invitesSeulement: true }
  },
  {
    path: '/inscription',
    name: 'register',
    component: RegisterView,
    meta: { titre: 'Inscription', invitesSeulement: true }
  },
  {
    path: '/verification-email',
    name: 'verification-email',
    component: VerificationEmailView,
    meta: { titre: 'Vérification de l’adresse email', invitesSeulement: true }
  },
  {
    path: '/mot-de-passe-oublie',
    name: 'mot-de-passe-oublie',
    component: MotDePasseOublieView,
    meta: { titre: 'Mot de passe oublié', invitesSeulement: true }
  },

  // ----- Pages du conducteur -----
  {
    path: '/publier',
    name: 'publish',
    component: PublishTripView,
    meta: { titre: 'Publier un trajet', roles: [ROLE_CONDUCTEUR] }
  },
  {
    path: '/mes-trajets',
    name: 'my-trips',
    component: MyTripsView,
    meta: { titre: 'Mes trajets', roles: [ROLE_CONDUCTEUR] }
  },

  // ----- Pages des membres (passager et conducteur) -----
  {
    path: '/mes-reservations',
    name: 'my-bookings',
    component: MyBookingsView,
    meta: { titre: 'Mes réservations', roles: ROLES_MEMBRES }
  },
  {
    path: '/messagerie',
    name: 'messages',
    component: MessagesView,
    meta: { titre: 'Messagerie', roles: ROLES_MEMBRES }
  },
  {
    path: '/mes-alertes',
    name: 'my-alerts',
    component: MyAlertsView,
    meta: { titre: 'Mes alertes', roles: ROLES_MEMBRES }
  },

  // ----- Page commune à toutes les personnes connectées -----
  {
    path: '/mon-profil',
    name: 'my-profile',
    component: MyProfileView,
    meta: { titre: 'Mon profil', roles: TOUS_LES_ROLES }
  },

  // ----- Partie administration -----
  {
    path: '/admin',
    component: AdminLayout,
    meta: { titre: 'Administration', roles: [ROLE_ADMIN] },
    // Les "children" sont les sous-pages affichées dans AdminLayout.
    // Elles héritent du meta du parent : l'accès admin est donc
    // vérifié pour chacune d'elles.
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: AdminDashboard,
        meta: { titre: 'Tableau de bord' }
      },
      {
        path: 'utilisateurs',
        name: 'admin-users',
        component: AdminUsers,
        meta: { titre: 'Utilisateurs' }
      },
      {
        path: 'moderation',
        name: 'admin-moderation',
        component: AdminModeration,
        meta: { titre: 'Modération' }
      },
      {
        path: 'litiges',
        name: 'admin-disputes',
        component: AdminDisputes,
        meta: { titre: 'Litiges' }
      },
      {
        path: 'transactions',
        name: 'admin-transactions',
        component: AdminTransactions,
        meta: { titre: 'Transactions' }
      },
      {
        path: 'documents',
        name: 'admin-documents',
        component: AdminDocuments,
        meta: { titre: 'Documents' }
      }
    ]
  },

  // ----- Accès refusé (403) -----
  {
    path: '/acces-refuse',
    name: 'forbidden',
    component: ForbiddenView,
    meta: { titre: 'Accès refusé' }
  },

  // ----- Page 404 (adresse inconnue) -----
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { titre: 'Page introuvable' }
  }
]

// On crée le routeur
const router = createRouter({
  history: createWebHistory(),
  routes: routes,
  // On remonte en haut de page à chaque changement de page,
  // sauf pour un lien vers une section (#...) : on va à la section,
  // un peu plus bas pour qu'elle ne soit pas cachée par la navbar.
  scrollBehavior(versOu) {
    if (versOu.hash) {
      return { el: versOu.hash, top: 96 }
    }
    return { top: 0 }
  }
})

// ------------------------------------------------------------
// "Garde" de navigation : le seul endroit qui décide
// si une page peut être ouverte ou non.
// ------------------------------------------------------------
router.beforeEach(async function (versOu) {
  const auth = useAuthStore()

  // 1) On sait qui est connecté (le jeton gardé a été vérifié par
  //    le serveur). Un compte suspendu pendant la navigation est
  //    déconnecté dès sa requête suivante (voir main.js).
  await auth.initialiser()

  // 2) Page réservée aux visiteurs (connexion, inscription) :
  //    une personne déjà connectée est renvoyée vers SON espace.
  if (versOu.meta.invitesSeulement && auth.estConnecte) {
    return auth.destinationApresConnexion()
  }

  // 3) Page protégée : il faut être connecté.
  const rolesAutorises = versOu.meta.roles
  const pageProtegee = Array.isArray(rolesAutorises) && rolesAutorises.length > 0

  if (pageProtegee && !auth.estConnecte) {
    return { name: 'login', query: { redirect: versOu.fullPath } }
  }

  // 4) Connecté, mais le rôle ne correspond pas à cette page :
  //    on l'explique au lieu de rediriger en silence vers l'accueil.
  if (!auth.aAcces(versOu.meta)) {
    return {
      name: 'forbidden',
      query: { page: versOu.meta.titre || versOu.fullPath }
    }
  }

  // Sinon : la navigation continue normalement.
  return true
})

// Le titre de l'onglet suit la page affichée, et les compteurs de
// la barre de navigation sont remis à jour à chaque changement de page.
router.afterEach(function (versOu) {
  const titre = versOu.meta.titre
  document.title = titre ? titre + " · Covoit'May" : "Covoit'May"

  const auth = useAuthStore()
  const data = useDataStore()
  if (auth.estMembre) data.chargerCompteurs()
  if (auth.estAdmin) data.chargerCompteursAdmin()
})

export default router
