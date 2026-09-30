// ============================================================
// Store d'authentification (connexion / inscription / droits)
// ------------------------------------------------------------
// Un "store" Pinia est une boîte qui garde des données
// partagées entre toutes les pages du site.
// Ici : qui est connecté, et à quoi a-t-il droit ?
//
// La connexion se fait sur le serveur (API). Il renvoie un
// jeton (JWT) que l'on garde dans le navigateur : il est envoyé
// avec chaque requête pour prouver qui l'on est.
// Le mot de passe, lui, n'est jamais gardé dans le navigateur.
// ============================================================
import { defineStore } from "pinia";
import { api, definirJeton, envoyer, lire } from "../services/api";

// ------------------------------------------------------------
// Les trois rôles du projet (mêmes valeurs que dans la base) :
//   - la table "administrateur" => rôle admin
//   - la table "utilisateur" a une colonne "role" => passager ou conducteur
// ------------------------------------------------------------
export const ROLE_PASSAGER = "passager";
export const ROLE_CONDUCTEUR = "conducteur";
export const ROLE_ADMIN = "admin";

// Les rôles "membres" : les personnes qui voyagent (par opposition à l'admin,
// qui gère la plateforme mais ne réserve pas et ne publie pas de trajet).
export const ROLES_MEMBRES = [ROLE_PASSAGER, ROLE_CONDUCTEUR];
export const TOUS_LES_ROLES = [ROLE_PASSAGER, ROLE_CONDUCTEUR, ROLE_ADMIN];

// Libellé lisible de chaque rôle (utilisé dans la navbar et les pages)
export const LIBELLES_ROLES = {
  [ROLE_PASSAGER]: "Passager",
  [ROLE_CONDUCTEUR]: "Conducteur",
  [ROLE_ADMIN]: "Administrateur",
};

// Clé du jeton dans le navigateur
const CLE_JETON = "cm_jeton";

function lireJeton() {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  // ---- state : les données du store ----
  state() {
    return {
      jeton: lireJeton(),
      // Le compte connecté, tel que renvoyé par l'API (null = personne)
      utilisateur: null,
      // Vrai quand on a vérifié le jeton au démarrage
      pret: false,
      // Message affiché sur la page de connexion quand la session
      // a été fermée (expirée, compte suspendu…)
      messageSession: "",
    };
  },

  // ---- getters : des valeurs calculées à partir du state ----
  getters: {
    // Est-ce que quelqu'un est connecté ?
    estConnecte(state) {
      return state.utilisateur !== null;
    },

    // Le rôle de la personne connectée ('' si personne)
    role(state) {
      return state.utilisateur ? state.utilisateur.role : "";
    },

    // Le libellé du rôle, prêt à afficher
    libelleRole() {
      return LIBELLES_ROLES[this.role] || "";
    },

    estAdmin() {
      return this.role === ROLE_ADMIN;
    },
    estConducteur() {
      return this.role === ROLE_CONDUCTEUR;
    },
    estPassager() {
      return this.role === ROLE_PASSAGER;
    },

    // Est-ce un membre qui voyage (passager ou conducteur) ?
    estMembre() {
      return ROLES_MEMBRES.includes(this.role);
    },

    // Un conducteur dont l'identité n'est pas encore validée (RG02.10)
    estConducteurEnAttente() {
      return this.estConducteur && !this.utilisateur.verifie;
    },

    // ---- Droits fonctionnels : utilisés par la navbar et les pages ----

    // Publier un trajet : conducteur à l'identité vérifiée (RG02.3)
    peutPublier() {
      return this.estConducteur && this.utilisateur.verifie;
    },
    // Réserver une place : réservé aux membres
    peutReserver() {
      return this.estMembre;
    },
    // Messagerie et alertes : réservées aux membres
    peutEchanger() {
      return this.estMembre;
    },
    // Espace d'administration
    peutAdministrer() {
      return this.estAdmin;
    },
  },

  // ---- actions : les fonctions qui modifient le store ----
  actions: {
    // ========== DROITS ==========

    // Est-ce que la personne connectée a le droit d'ouvrir cette page ?
    //   - pas de meta.roles  -> page publique, tout le monde entre
    //   - meta.roles         -> seuls ces rôles entrent
    aAcces(meta) {
      const rolesAutorises = meta && meta.roles;
      if (!Array.isArray(rolesAutorises) || rolesAutorises.length === 0) {
        return true;
      }
      if (!this.estConnecte) {
        return false;
      }
      return rolesAutorises.includes(this.role);
    },

    // ========== SESSION ==========

    // Au démarrage du site : si un jeton est gardé, on demande au
    // serveur à qui il appartient. S'il n'est plus valable, on l'oublie.
    async initialiser() {
      if (this.pret) return;
      if (this.jeton) {
        definirJeton(this.jeton);
        try {
          this.utilisateur = await lire("/auth/moi");
        } catch {
          this.fermerSession();
        }
      }
      this.pret = true;
    },

    // Relit le compte (après une modification du profil, une demande
    // conducteur acceptée…)
    async rafraichir() {
      if (!this.jeton) return;
      this.utilisateur = await lire("/auth/moi");
    },

    // Enregistre le jeton reçu du serveur
    ouvrirSession(resultat) {
      this.jeton = resultat.jeton;
      this.utilisateur = resultat.utilisateur;
      this.messageSession = "";
      definirJeton(resultat.jeton);
      try {
        localStorage.setItem(CLE_JETON, resultat.jeton);
      } catch {
        // navigation privée : la session durera le temps de l'onglet
      }
    },

    // Oublie le jeton et le compte
    fermerSession() {
      this.jeton = null;
      this.utilisateur = null;
      definirJeton(null);
      try {
        localStorage.removeItem(CLE_JETON);
      } catch {
        // rien à faire
      }
    },

    // Enregistre le message à afficher sur la page de connexion
    signalerFinDeSession(message) {
      this.messageSession = message;
    },

    // Récupère puis efface ce message (il ne doit s'afficher qu'une fois)
    consommerMessageSession() {
      const message = this.messageSession;
      this.messageSession = "";
      return message;
    },

    // ========== CONNEXION / INSCRIPTION ==========
    // Ces fonctions renvoient '' si tout va bien, sinon le message
    // d'erreur du serveur (mauvais mot de passe, compte suspendu…)

    async seConnecter(email, motDePasse) {
      try {
        const resultat = await envoyer("/auth/connexion", { email, motDePasse });
        this.ouvrirSession(resultat);
        return "";
      } catch (erreur) {
        return erreur.message;
      }
    },

    async creerCompte(infos) {
      try {
        const resultat = await api("/auth/inscription", {
          methode: "POST",
          corps: {
            nom: infos.nom,
            prenom: infos.prenom,
            email: infos.email,
            motDePasse: infos.motDePasse,
            telephone: infos.telephone,
            commune: infos.commune,
            role: infos.role,
            cguAcceptees: infos.cguAcceptees,
          },
        });
        this.ouvrirSession(resultat);
        return "";
      } catch (erreur) {
        return erreur.message;
      }
    },

    seDeconnecter() {
      this.fermerSession();
      this.messageSession = "";
    },

    // La page principale dépend du rôle de la personne connectée.
    // Un conducteur pas encore vérifié va sur son profil pour envoyer
    // ses justificatifs.
    destinationApresConnexion() {
      if (this.estAdmin) return { name: "admin-dashboard" };
      if (this.estConducteurEnAttente) return { name: "my-profile", hash: "#devenir-conducteur" };
      if (this.estConducteur) return { name: "my-trips" };
      if (this.estPassager) return { name: "my-bookings" };
      return { name: "home" };
    },
  },
});
