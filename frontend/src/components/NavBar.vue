<script>
// ============================================================
// Barre de navigation (en haut de toutes les pages)
// ------------------------------------------------------------
// Elle change selon si on est connecté ou pas :
// - pas connecté  -> boutons "Connexion" et "Inscription"
// - connecté      -> icône messagerie + menu avec l'avatar
// ============================================================
import { useAuthStore } from "../stores/auth";
import { useDataStore } from "../stores/data";
import { initials } from "../utils/format";

export default {
  name: "NavBar",

  data() {
    return {
      // Vrai tant que la page n'a pas défilé vers le bas
      enHautDePage: true,
    };
  },

  computed: {
    // Sur l'accueil, tant qu'on est en haut de la page, la barre prend
    // la couleur du hero : les deux ne forment qu'un seul bloc.
    surLeHero() {
      return this.$route.name === "home" && this.enHautDePage;
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
      return this.auth.estMembre ? this.data.nbAlertesActives : 0;
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
    // Les initiales de l'utilisateur (ex: "Rachida A." -> "RA")
    initialesUtilisateur() {
      return initials(this.auth.utilisateur);
    },
  },

  // On écoute le défilement de la page (et on arrête en quittant)
  mounted() {
    window.addEventListener("scroll", this.verifierDefilement, {
      passive: true,
    });
    this.verifierDefilement();
  },

  beforeUnmount() {
    window.removeEventListener("scroll", this.verifierDefilement);
  },

  methods: {
    verifierDefilement() {
      this.enHautDePage = window.scrollY < 10;
    },

    // Se déconnecter puis revenir à l'accueil
    seDeconnecter() {
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
    :class="{ 'navbar-sur-hero': surLeHero }"
  >
    <div class="container">
      <!-- Logo du site -->
      <router-link class="navbar-brand brand-logo" :to="destinationLogo">
        <img src="/favicon.ico" alt="Logo Covoit'May" class="img-fluid" />
        Covoit'<span class="accent">May</span>
      </router-link>

      <!-- Bouton "hamburger" affiché sur mobile -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navMenu"
        aria-controls="navMenu"
        aria-expanded="false"
        aria-label="Ouvrir le menu"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="navMenu" class="collapse navbar-collapse">
        <!-- Liens principaux (à gauche) -->
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <router-link class="nav-link" :to="{ name: 'search' }">
              <i class="bi bi-search me-1"></i>Rechercher un trajet
            </router-link>
          </li>
          <li v-if="auth.peutPublier" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'publish' }">
              <i class="bi bi-plus-circle me-1"></i>Publier un trajet
            </router-link>
          </li>
          <li v-if="auth.peutReserver" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'my-bookings' }">
              <i class="bi bi-ticket-perforated me-1"></i>Mes réservations
            </router-link>
          </li>
          <li v-if="auth.estConducteurEnAttente" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'my-profile', hash: '#devenir-conducteur' }">
              <i class="bi bi-hourglass-split me-1"></i>Vérification d'identité
            </router-link>
          </li>
          <li v-if="auth.estConducteur" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'my-trips' }">
              <i class="bi bi-signpost-2 me-1"></i>Mes trajets
            </router-link>
          </li>
          <li v-if="auth.peutAdministrer" class="nav-item">
            <router-link class="nav-link" :to="{ name: 'admin-dashboard' }">
              <i class="bi bi-speedometer2 me-1"></i>Administration
            </router-link>
          </li>
        </ul>

        <!-- Si PAS connecté : boutons Connexion / Inscription -->
        <div v-if="!auth.estConnecte" class="d-flex gap-2">
          <router-link class="btn btn-outline-cm" :to="{ name: 'login' }"
            >Connexion</router-link
          >
          <router-link class="btn btn-cm-primary" :to="{ name: 'register' }"
            >Inscription</router-link
          >
        </div>

        <!-- Si connecté : messagerie + menu utilisateur -->
        <ul v-else class="navbar-nav align-items-lg-center">
          <li v-if="auth.peutEchanger" class="nav-item me-lg-2">
            <router-link
              class="nav-link position-relative"
              :to="{ name: 'my-alerts' }"
              title="Mes alertes"
              aria-label="Mes alertes"
            >
              <i class="bi bi-bell fs-5"></i>
              <span
                v-if="alertesNonLues > 0"
                class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-pulse"
                style="font-size: 0.6rem"
                >{{ alertesNonLues
                }}<span class="visually-hidden"> alertes actives</span></span
              >
            </router-link>
          </li>
          <li v-if="auth.peutEchanger" class="nav-item me-lg-2">
            <router-link
              class="nav-link position-relative"
              :to="{ name: 'messages' }"
              title="Messagerie"
              aria-label="Messagerie"
            >
              <i class="bi bi-chat-dots fs-5"></i>
              <!-- Pastille rouge avec le nombre de messages non lus -->
              <span
                v-if="nonLus > 0"
                class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-pulse"
                style="font-size: 0.6rem"
                >{{ nonLus
                }}<span class="visually-hidden"> messages non lus</span></span
              >
            </router-link>
          </li>
          <li class="nav-item me-lg-2">
            <span class="user-status-badge" :class="classeStatutUtilisateur">
              {{ statutUtilisateur }}
            </span>
          </li>
          <li class="nav-item dropdown">
            <a
              id="user-menu"
              class="nav-link dropdown-toggle d-flex align-items-center gap-2"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span class="avatar avatar-sm">{{ initialesUtilisateur }}</span>
              <span class="d-lg-none d-xl-inline">{{
                auth.utilisateur.prenom
              }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <router-link class="dropdown-item" :to="{ name: 'my-profile' }">
                  <i class="bi bi-person me-2"></i>Mon profil
                </router-link>
              </li>
              <li v-if="auth.peutEchanger">
                <router-link class="dropdown-item" :to="{ name: 'my-alerts' }">
                  <i class="bi bi-bell me-2"></i>Mes alertes
                </router-link>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button
                  class="dropdown-item text-danger"
                  @click="seDeconnecter"
                >
                  <i class="bi bi-box-arrow-right me-2"></i>Déconnexion
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
