<script>
// ============================================================
// Barre de navigation (en haut de toutes les pages)
// ------------------------------------------------------------
// Elle change selon si on est connecté ou pas :
// - pas connecté  -> boutons "Connexion" et "Inscription"
// - connecté      -> alertes, messagerie, avatar (lien vers « Mon profil »)
//                    et bouton « Déconnexion »
// Sur mobile et tablette, un bouton « burger » ouvre un panneau :
// la carte du membre, puis les liens en lignes avec leurs icônes.
// Le panneau est géré par Vue (menuOuvert) : il se ferme tout seul
// quand on change de page ou qu'on appuie sur Échap.
// ============================================================
import { useAuthStore } from "../stores/auth";
import { useDataStore } from "../stores/data";
import AvatarMembre from "./AvatarMembre.vue";

export default {
  name: "NavBar",

  components: { AvatarMembre },

  data() {
    return {
      // Vrai tant que la page n'a pas défilé vers le bas
      enHautDePage: true,
      // Panneau du menu mobile ouvert ?
      menuOuvert: false,
    };
  },

  computed: {
    // Sur l'accueil, tant qu'on est en haut de la page, la barre prend
    // la couleur du hero : les deux ne forment qu'un seul bloc.
    surLeHero() {
      return this.$route.name === "home" && this.enHautDePage && !this.menuOuvert;
    },
    // Le store d'authentification (qui est connecté ?)
    auth() {
      return useAuthStore();
    },
    // Le store des données (messages, trajets…)
    data() {
      return useDataStore();
    },
    // Nombre de messages non lus (pour la pastille rouge).
    // Le routeur le recharge depuis l'API à chaque changement de page.
    nonLus() {
      return this.auth.estMembre ? this.data.nbMessagesNonLus : 0;
    },
    // Nombre d'alertes trajet actives (affiché dans la cloche).
    alertesNonLues() {
      return this.auth.estMembre ? this.data.nbAlertesNouvelles : 0;
    },
    // Le libellé du rôle pour rendre le statut visible immédiatement.
    // Il vient du store : un seul endroit définit les rôles du site.
    statutUtilisateur() {
      if (!this.auth.estConnecte) return "";
      return this.auth.libelleRole || "Membre";
    },
    classeStatutUtilisateur() {
      if (!this.auth.estConnecte) return "";
      const classes = {
        passager: "status-passager",
        conducteur: "status-conducteur",
        admin: "status-admin",
      };
      return classes[this.auth.role] || "";
    },
    // Le logo ramène les visiteurs à l'accueil et les membres à leur espace.
    destinationLogo() {
      if (!this.auth.estConnecte) return { name: "home" };
      return this.auth.destinationApresConnexion();
    },
  },

  watch: {
    // Nouvelle page : le menu mobile se referme
    $route() {
      this.menuOuvert = false;
    },
  },

  // On écoute le défilement de la page et la touche Échap (et on arrête en quittant)
  mounted() {
    window.addEventListener("scroll", this.verifierDefilement, { passive: true });
    window.addEventListener("keydown", this.surTouche);
    this.verifierDefilement();
  },

  beforeUnmount() {
    window.removeEventListener("scroll", this.verifierDefilement);
    window.removeEventListener("keydown", this.surTouche);
  },

  methods: {
    verifierDefilement() {
      this.enHautDePage = window.scrollY < 10;
    },

    surTouche(evenement) {
      if (evenement.key === "Escape" && this.menuOuvert) {
        this.menuOuvert = false;
        this.$refs.burger.focus();
      }
    },

    // Se déconnecter puis revenir à l'accueil
    seDeconnecter() {
      this.menuOuvert = false;
      this.auth.seDeconnecter();
      this.data.viderCompteurs();
      this.$router.push({ name: "home" });
    },
  },
};
</script>

<template>
  <nav
    id="main-navbar"
    class="navbar navbar-expand-lg navbar-cm sticky-top"
    :class="{ 'navbar-sur-hero': surLeHero, 'menu-est-ouvert': menuOuvert }"
  >
    <div class="container">
      <!-- Logo du site -->
      <router-link class="navbar-brand brand-logo" :to="destinationLogo">
        <img src="/favicon.ico" alt="Logo Covoit'May" class="img-fluid" />
        Covoit'<span class="accent">May</span>
      </router-link>

      <!-- Bouton « burger » (mobile et tablette) : 3 traits qui deviennent une croix -->
      <button
        ref="burger"
        class="burger d-lg-none"
        type="button"
        aria-controls="navMenu"
        :aria-expanded="menuOuvert ? 'true' : 'false'"
        :aria-label="menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="menuOuvert = !menuOuvert"
      >
        <span></span><span></span><span></span>
        <!-- Rappel discret : des messages ou des alertes attendent -->
        <i v-if="!menuOuvert && nonLus + alertesNonLues > 0" class="burger-pastille" aria-hidden="true"></i>
      </button>

      <div id="navMenu" class="navbar-collapse menu-cm" :class="{ ouvert: menuOuvert }">
        <div class="menu-panneau">
          <!-- Mobile : la carte du membre connecté -->
          <router-link
            v-if="auth.estConnecte"
            class="menu-profil d-lg-none"
            :to="{ name: 'my-profile' }"
          >
            <AvatarMembre :personne="auth.utilisateur" taille="lg" />
            <span class="menu-profil-texte">
              <span class="menu-profil-nom">{{ auth.utilisateur.prenom }} {{ auth.utilisateur.nom }}</span>
              <span class="user-status-badge" :class="classeStatutUtilisateur">{{ statutUtilisateur }}</span>
            </span>
            <i class="bi bi-chevron-right ms-auto text-muted"></i>
          </router-link>

          <!-- Liens principaux (à gauche sur ordinateur) -->
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <router-link class="nav-link" :to="{ name: 'search' }">
                <i class="bi bi-search"></i>Rechercher un trajet
              </router-link>
            </li>
            <li v-if="auth.peutPublier" class="nav-item">
              <router-link class="nav-link" :to="{ name: 'publish' }">
                <i class="bi bi-plus-circle"></i>Publier un trajet
              </router-link>
            </li>
            <li v-if="auth.peutReserver" class="nav-item">
              <router-link class="nav-link" :to="{ name: 'my-bookings' }">
                <i class="bi bi-ticket-perforated"></i>Mes réservations
              </router-link>
            </li>
            <li v-if="auth.estConducteurEnAttente" class="nav-item">
              <router-link class="nav-link" :to="{ name: 'my-profile', hash: '#devenir-conducteur' }">
                <i class="bi bi-hourglass-split"></i>Vérification d'identité
              </router-link>
            </li>
            <li v-if="auth.estConducteur" class="nav-item">
              <router-link class="nav-link" :to="{ name: 'my-trips' }">
                <i class="bi bi-signpost-2"></i>Mes trajets
              </router-link>
            </li>
            <li v-if="auth.peutAdministrer" class="nav-item">
              <router-link class="nav-link" :to="{ name: 'admin-dashboard' }">
                <i class="bi bi-speedometer2"></i>Administration
              </router-link>
            </li>
          </ul>

          <!-- Si PAS connecté : boutons Connexion / Inscription -->
          <div v-if="!auth.estConnecte" class="menu-boutons">
            <router-link class="btn btn-outline-cm" :to="{ name: 'login' }">Connexion</router-link>
            <router-link class="btn btn-cm-primary" :to="{ name: 'register' }">Inscription</router-link>
          </div>

          <!-- Si connecté : alertes, messagerie, statut et menu utilisateur -->
          <ul v-else class="navbar-nav align-items-lg-center menu-droite">
            <li v-if="auth.peutEchanger" class="nav-item me-lg-2">
              <router-link
                class="nav-link nav-icone position-relative"
                :to="{ name: 'my-alerts' }"
                title="Mes alertes"
              >
                <i class="bi bi-bell"></i><span class="d-lg-none">Mes alertes</span>
                <span v-if="alertesNonLues > 0" class="badge rounded-pill bg-danger badge-pulse menu-compteur">
                  {{ alertesNonLues }}<span class="visually-hidden"> nouveaux trajets pour vos alertes</span>
                </span>
                <span class="visually-hidden d-none d-lg-inline">Mes alertes</span>
              </router-link>
            </li>
            <li v-if="auth.peutEchanger" class="nav-item me-lg-2">
              <router-link
                class="nav-link nav-icone position-relative"
                :to="{ name: 'messages' }"
                title="Messagerie"
              >
                <i class="bi bi-chat-dots"></i><span class="d-lg-none">Messagerie</span>
                <!-- Pastille rouge avec le nombre de messages non lus -->
                <span v-if="nonLus > 0" class="badge rounded-pill bg-danger badge-pulse menu-compteur">
                  {{ nonLus }}<span class="visually-hidden"> messages non lus</span>
                </span>
                <span class="visually-hidden d-none d-lg-inline">Messagerie</span>
              </router-link>
            </li>

            <!-- Ordinateur : « Mon profil » (avatar + prénom, rôle en dessous) et déconnexion (icône seule) -->
            <li class="nav-item d-none d-lg-block">
              <router-link
                :to="{ name: 'my-profile' }"
                class="navbar-profil"
                data-infobulle="Mon profil"
                aria-label="Mon profil"
              >
                <AvatarMembre :personne="auth.utilisateur" taille="sm" />
                <span class="navbar-profil-texte">
                  <span class="navbar-profil-nom d-none d-xl-block">{{ auth.utilisateur.prenom }}</span>
                  <span class="user-status-badge navbar-profil-role" :class="classeStatutUtilisateur">
                    {{ statutUtilisateur }}
                  </span>
                </span>
              </router-link>
            </li>
            <li class="nav-item d-none d-lg-block ms-lg-2">
              <button type="button" class="btn btn-deconnexion" data-infobulle="Se déconnecter"
                aria-label="Se déconnecter" @click="seDeconnecter">
                <i class="bi bi-box-arrow-right"></i>
              </button>
            </li>

            <!-- Mobile : déconnexion en bas du panneau -->
            <li class="nav-item d-lg-none menu-separateur">
              <button class="nav-link menu-deconnexion" type="button" @click="seDeconnecter">
                <i class="bi bi-box-arrow-right"></i>Déconnexion
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>
