<script>
// ============================================================
// Page "Mes réservations" (côté passager)
// ------------------------------------------------------------
// Deux onglets : "À venir" et "Historique".
// On peut contacter le conducteur, annuler une réservation,
// télécharger le reçu du paiement (PDF) ou laisser un avis après
// le trajet (petite fenêtre modale).
// ============================================================
import { useDataStore } from "../stores/data";
import {
  formatDateTime,
  formatPrice,
  messageErreur,
  STATUT_RESERVATION,
  STATUT_PAIEMENT,
} from "../utils/format";
import SqueletteTrajet from "../components/SqueletteTrajet.vue";
import AvatarMembre from "../components/AvatarMembre.vue";
import { revelerApresChargement } from "../utils/chargement";

export default {
  name: "MyBookingsView",

  components: { SqueletteTrajet, AvatarMembre },

  data() {
    return {
      chargement: true, // vrai pendant l'appel à l'API
      erreur: "",
      message: "",
      // Mes réservations, chacune avec son trajet et son conducteur (API)
      mesReservations: [],
      onglet: "avenir", // 'avenir' ou 'historique'
      // La fenêtre pour laisser un avis
      modaleAvis: {
        ouverte: false,
        reservation: null,
        note: 5,
        commentaire: "",
        erreur: "",
        envoi: false,
      },
      declencheurAvis: null,
      // Reçu en cours de téléchargement (id de la réservation)
      recuEnCours: null,
      // Les libellés et couleurs des statuts
      STATUT_RESERVATION: STATUT_RESERVATION,
      STATUT_PAIEMENT: STATUT_PAIEMENT,
    };
  },

  computed: {
    data() {
      return useDataStore();
    },

    // Les réservations à venir (en attente ou confirmées, dans le futur)
    aVenir() {
      const maintenant = new Date();
      return this.mesReservations.filter(function (r) {
        const statutOk = r.statut === "en_attente" || r.statut === "confirmee";
        return statutOk && new Date(r.trajet.dateDepart) > maintenant;
      });
    },

    // Tout le reste va dans l'historique
    historique() {
      return this.mesReservations.filter((r) => {
        return !this.aVenir.includes(r);
      });
    },

    // La liste affichée selon l'onglet choisi
    listeAffichee() {
      if (this.onglet === "avenir") {
        return this.aVenir;
      }
      return this.historique;
    },
  },

  // Changer d'onglet affiche de nouvelles cartes : on les révèle aussi
  watch: {
    onglet() {
      revelerApresChargement();
    },
  },

  // Squelettes, puis les réservations
  mounted() {
    this.charger();
  },

  methods: {
    formatDateTime,
    formatPrice,

    // Reçu du paiement en PDF, généré par le serveur
    async telechargerRecu(r) {
      this.recuEnCours = r.id;
      this.erreur = "";
      try {
        await this.data.telechargerRecu(r.id);
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.recuEnCours = null;
      }
    },

    async charger() {
      try {
        this.mesReservations = await this.data.mesReservations();
        this.erreur = "";
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.chargement = false;
        revelerApresChargement();
      }
    },

    // Le conducteur d'une réservation (prénom, initiale, téléphone si confirmée)
    conducteurDe(reservation) {
      return reservation.trajet.conducteur;
    },

    // Peut-on encore annuler cette réservation ?
    peutAnnuler(reservation) {
      const statutOk =
        reservation.statut === "en_attente" ||
        reservation.statut === "confirmee";
      return statutOk && new Date(reservation.trajet.dateDepart) > new Date();
    },

    // Peut-on laisser un avis ? (trajet passé, confirmé, pas déjà noté,
    // moins de 30 jours après : RG07.2, RG07.3, RG07.5, RG07.8)
    peutNoter(reservation) {
      const depart = new Date(reservation.trajet.dateDepart);
      const trajetPasse = depart < new Date();
      const recent = Date.now() - depart.getTime() < 30 * 24 * 3600 * 1000;
      const statutOk =
        reservation.statut === "confirmee" || reservation.statut === "terminee";
      return trajetPasse && recent && statutOk && !reservation.avisDepose;
    },

    // Ouvrir la fenêtre pour laisser un avis
    ouvrirAvis(reservation, evenement) {
      this.declencheurAvis = evenement.currentTarget;
      this.modaleAvis.ouverte = true;
      this.modaleAvis.reservation = reservation;
      this.modaleAvis.note = 5;
      this.modaleAvis.commentaire = "";
      this.modaleAvis.erreur = "";
      this.$nextTick(() => this.$refs.modaleAvis.focus());
    },

    fermerAvis() {
      this.modaleAvis.ouverte = false;
      this.$nextTick(() => {
        if (this.declencheurAvis) this.declencheurAvis.focus();
      });
    },

    // Publier l'avis (le serveur recalcule la note du conducteur)
    async publierAvis() {
      this.modaleAvis.envoi = true;
      this.modaleAvis.erreur = "";
      try {
        await this.data.deposerAvis(
          this.modaleAvis.reservation.trajetId,
          this.modaleAvis.note,
          this.modaleAvis.commentaire.trim(),
        );
        this.fermerAvis();
        this.message = "Merci ! Votre avis est publié.";
        await this.charger();
      } catch (erreur) {
        this.modaleAvis.erreur = messageErreur(erreur);
      } finally {
        this.modaleAvis.envoi = false;
      }
    },

    // Annuler une réservation (remboursement selon RG06.8)
    async annuler(reservation) {
      if (!confirm("Annuler cette réservation ?")) return;
      this.message = "";
      this.erreur = "";
      try {
        const resultat = await this.data.annulerReservation(reservation.id);
        this.message = resultat.rembourse
          ? "Réservation annulée. Vous ne serez pas débité (ou vous serez remboursé)."
          : "Réservation annulée moins de " +
            this.data.delaiRemboursementHeures +
            " h avant le départ : le paiement reste acquis au conducteur.";
        await this.charger();
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      }
    },
  },
};
</script>

<template>
  <div id="my-bookings-page" class="container py-4 min-h-page">
    <h1 class="h3 section-title mb-4 reveal">
      <i class="bi bi-ticket-perforated text-cm-primary me-2"></i>Mes
      réservations
    </h1>

    <div v-if="message" class="alert alert-success py-2" role="status">
      <i class="bi bi-check-circle me-1"></i>{{ message }}
    </div>
    <div v-if="erreur" class="alert alert-danger py-2" role="alert">
      <i class="bi bi-exclamation-circle me-1"></i>{{ erreur }}
    </div>

    <!-- Les deux onglets -->
    <ul class="nav nav-pills mb-4 reveal delai-1">
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ 'active bg-cm-primary': onglet === 'avenir' }"
          @click="onglet = 'avenir'"
        >
          À venir
          <span class="badge bg-white text-cm-primary ms-1">{{
            aVenir.length
          }}</span>
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ 'active bg-cm-primary': onglet === 'historique' }"
          @click="onglet = 'historique'"
        >
          Historique
          <span class="badge bg-white text-cm-primary ms-1">{{
            historique.length
          }}</span>
        </button>
      </li>
    </ul>

    <!-- Pendant le chargement : des squelettes de cartes -->
    <div v-if="chargement" aria-busy="true" aria-label="Chargement">
      <SqueletteTrajet v-for="n in 3" :key="n" />
    </div>

    <!-- Message si la liste est vide -->
    <div
      v-if="!chargement && listeAffichee.length === 0"
      class="card text-center py-5 reveal reveal-zoom"
    >
      <div class="card-body">
        <i class="bi bi-ticket fs-1 text-muted"></i>
        <p class="text-muted mt-3 mb-3">
          Aucune réservation dans cette catégorie.
        </p>
        <router-link to="/recherche" class="btn btn-cm-primary">
          <i class="bi bi-search me-1"></i>Trouver un trajet
        </router-link>
      </div>
    </div>

    <!-- Une carte par réservation (aucune pendant le chargement) -->
    <article
      v-for="(r, i) in chargement ? [] : listeAffichee"
      :key="r.id"
      class="card mb-3 reveal"
      :class="'delai-' + Math.min(i + 1, 4)"
    >
      <div class="card-body">
        <div class="row align-items-center g-3">
          <div class="col-md-5">
            <router-link
              :to="{ name: 'trip-detail', params: { id: r.trajetId } }"
              class="fw-bold text-decoration-none fs-5"
            >
              {{ r.trajet.depart }} → {{ r.trajet.arrivee }}
            </router-link>
            <div class="small text-muted">
              <i class="bi bi-calendar3 me-1"></i
              >{{ formatDateTime(r.trajet.dateDepart) }}
            </div>
            <div class="small text-muted">
              <i class="bi bi-pin-map me-1"></i>{{ r.trajet.pointRdv }}
            </div>
          </div>
          <div class="col-md-3">
            <div class="d-flex align-items-center gap-2">
              <AvatarMembre :personne="conducteurDe(r)" taille="sm" />
              <div class="small">
                <div class="fw-semibold">
                  {{ conducteurDe(r).prenom }} {{ conducteurDe(r).nom }}
                </div>
                <span class="text-muted"
                  >{{ r.places }} place(s) · {{ formatPrice(r.montant) }}</span
                >
                <div v-if="conducteurDe(r).telephone" class="text-muted">
                  <i class="bi bi-telephone me-1"></i>{{ conducteurDe(r).telephone }}
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4 text-md-end">
            <!-- Badge de statut (en attente, confirmée…) -->
            <span
              class="badge"
              :class="
                STATUT_RESERVATION[r.statut]
                  ? STATUT_RESERVATION[r.statut].class
                  : ''
              "
            >
              {{
                STATUT_RESERVATION[r.statut]
                  ? STATUT_RESERVATION[r.statut].label
                  : r.statut
              }}
            </span>
            <!-- État du paiement (autorisé, encaissé, remboursé…) -->
            <span
              v-if="r.paiement && STATUT_PAIEMENT[r.paiement.statut]"
              class="badge ms-1 bg-light text-dark border"
              :title="'Paiement : ' + STATUT_PAIEMENT[r.paiement.statut].label"
            >
              <i class="bi bi-credit-card me-1"></i
              >{{ STATUT_PAIEMENT[r.paiement.statut].label }}
            </span>
            <div class="mt-2 d-flex gap-2 justify-content-md-end flex-wrap">
              <router-link
                class="btn btn-sm btn-outline-cm"
                :to="{
                  name: 'messages',
                  query: { avec: r.trajet.conducteur.id },
                }"
              >
                <i class="bi bi-chat-dots"></i> Contacter
              </router-link>
              <!-- Reçu du paiement en PDF (preuve de la transaction) -->
              <button
                v-if="r.paiement"
                class="btn btn-sm btn-outline-secondary"
                :disabled="recuEnCours === r.id"
                :title="'Télécharger le reçu ' + r.paiement.reference"
                @click="telechargerRecu(r)"
              >
                <span v-if="recuEnCours === r.id" class="spinner-border spinner-border-sm"></span>
                <i v-else class="bi bi-file-earmark-pdf"></i> Reçu
              </button>
              <button
                v-if="peutNoter(r)"
                class="btn btn-sm btn-cm-accent"
                @click="ouvrirAvis(r, $event)"
              >
                <i class="bi bi-star"></i> Laisser un avis
              </button>
              <button
                v-if="peutAnnuler(r)"
                class="btn btn-sm btn-outline-danger"
                @click="annuler(r)"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>

    <!-- Fenêtre modale pour laisser un avis -->
    <div
      v-if="modaleAvis.ouverte"
      ref="modaleAvis"
      class="modal d-block"
      style="background: rgba(0, 0, 0, 0.5)"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      @click.self="fermerAvis"
      @keydown.esc.prevent="fermerAvis"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="review-dialog-title" class="modal-title h5">Votre avis sur le trajet</h2>
            <button
              type="button"
              class="btn-close"
              aria-label="Fermer"
              @click="fermerAvis"
            ></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted">
              {{ modaleAvis.reservation.trajet.depart }} →
              {{ modaleAvis.reservation.trajet.arrivee }}, conduit par
              {{ conducteurDe(modaleAvis.reservation).prenom }}
            </p>
            <div v-if="modaleAvis.erreur" class="alert alert-danger py-2 small" role="alert">
              {{ modaleAvis.erreur }}
            </div>
            <!-- Les 5 étoiles cliquables -->
            <div class="mb-3 text-center fs-3">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="btn btn-link p-1 stars fs-3"
                :aria-label="'Note ' + i + ' sur 5'"
                @click="modaleAvis.note = i"
              >
                <i
                  class="bi"
                  :class="modaleAvis.note >= i ? 'bi-star-fill' : 'bi-star'"
                ></i>
              </button>
            </div>
            <textarea
              v-model="modaleAvis.commentaire"
              class="form-control"
              rows="3"
              maxlength="500"
              placeholder="Partagez votre expérience : ponctualité, conduite, ambiance…"
            ></textarea>
            <small class="text-muted">10 caractères minimum ({{ modaleAvis.commentaire.trim().length }}/500)</small>
          </div>
          <div class="modal-footer">
            <button
              class="btn btn-outline-secondary"
              @click="fermerAvis"
            >
              Annuler
            </button>
            <button
              class="btn btn-cm-primary"
              :disabled="modaleAvis.commentaire.trim().length < 10 || modaleAvis.envoi"
              @click="publierAvis"
            >
              Publier l'avis
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
