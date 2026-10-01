<script>
// ============================================================
// Page Messagerie
// ------------------------------------------------------------
// À gauche : la liste des conversations. À droite : les messages
// avec la personne choisie. On peut arriver ici avec ?avec=ID.
// - Texte, photo (réduite avant l'envoi) ou message vocal (micro,
//   2 minutes au plus) : RG09.6, RG09.7.
// - Temps réel (services/tempsReel.js) : les messages, les accusés
//   (envoyé ✓, reçu ✓✓, lu ✓✓ en couleur), les modifications, les
//   suppressions et « en train d'écrire… » arrivent tout seuls.
//   Sans temps réel, la conversation est relue toutes les 8 s.
// - Menu « ⋯ » d'un message : modifier (15 min, RG09.3), supprimer
//   pour moi ou pour tous (24 h, RG09.8).
// - La conversation s'ouvre en bas et y reste quand un message
//   arrive, sauf si on est remonté lire l'historique.
// ============================================================
import { useDataStore } from "../stores/data";
import { useAuthStore } from "../stores/auth";
import { timeAgo, formatTime, messageErreur, versDate } from "../utils/format";
import { preparerPhotoMessage } from "../utils/image";
import { ecouter, envoyer as envoyerTempsReel, estConnecte } from "../services/tempsReel";
import AvatarMembre from "../components/AvatarMembre.vue";
import PieceJointeMessage from "../components/PieceJointeMessage.vue";

// Durée maximale d'un message vocal, en secondes (RG09.7)
const DUREE_MAX_VOCAL = 120;
const MODIFICATION_MINUTES = 15; // RG09.3
const SUPPRESSION_POUR_TOUS_MINUTES = 24 * 60; // RG09.8
const DUREE_ECRIT_MS = 4000;
const RELECTURE_SANS_TEMPS_REEL_MS = 8000;

// Premier format audio que le navigateur sait enregistrer
function formatAudio() {
  const formats = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return formats.find((f) => window.MediaRecorder && MediaRecorder.isTypeSupported(f)) || "";
}

export default {
  name: "MessagesView",

  components: { AvatarMembre, PieceJointeMessage },

  data() {
    return {
      conversations: [], // mes conversations (API), une par personne
      idChoisi: null, // l'id de la personne avec qui on discute
      interlocuteur: null, // son prénom, son initiale, sa photo et sa commune
      messagesAffiches: [], // les messages de la conversation choisie
      brouillon: "", // le message en train d'être écrit
      erreur: "", // refus du serveur (ex. pas de réservation commune)
      envoi: false,
      // Enregistrement d'un message vocal
      enregistrement: { actif: false, secondes: 0 },
      // Photo agrandie par-dessus la page (adresse blob:), ou null
      photoAgrandie: null,
      // Personnes en train d'écrire : { idPersonne: true }
      enEcriture: {},
      // Message dont le menu « ⋯ » est ouvert, et message en cours de modification
      menuOuvert: null,
      edition: null, // { id, contenu }
      // Rester collé en bas de la conversation ?
      collerEnBas: true,
      nouveauxEnBas: false,
      maintenant: Date.now(),
      DUREE_MAX_VOCAL,
    };
  },

  computed: {
    data() {
      return useDataStore();
    },
    auth() {
      return useAuthStore();
    },

    // Est-ce une toute nouvelle conversation (pas encore de messages) ?
    nouvelleConversation() {
      if (!this.interlocuteur) return false;
      return !this.conversations.some((c) => c.autreId === this.idChoisi);
    },

    // Le navigateur sait-il enregistrer le micro ? (il faut aussi le HTTPS)
    micDisponible() {
      return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && formatAudio());
    },

    tempsEnregistre() {
      const s = this.enregistrement.secondes;
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    },

    interlocuteurEcrit() {
      return this.idChoisi !== null && Boolean(this.enEcriture[this.idChoisi]);
    },
  },

  watch: {
    // « En train d'écrire » : prévenir l'autre personne pendant la frappe
    brouillon(texte) {
      if (texte.trim() && this.idChoisi !== null && !this.edition) {
        const maintenant = Date.now();
        if (!this.dernierSignalEcrit || maintenant - this.dernierSignalEcrit > 2000) {
          this.dernierSignalEcrit = maintenant;
          envoyerTempsReel({ type: "ecrit", avec: this.idChoisi });
        }
      }
    },
  },

  // Quand la page s'ouvre
  async mounted() {
    window.addEventListener("keydown", this.surTouche);
    document.addEventListener("click", this.fermerMenu);
    this.minuteursEcriture = {};
    this.brancherTempsReel();
    // Sans temps réel : la conversation est relue régulièrement
    this.relecture = setInterval(() => {
      this.maintenant = Date.now();
      if (!estConnecte()) this.rafraichir();
    }, RELECTURE_SANS_TEMPS_REEL_MS);

    await this.chargerConversations();
    // Si l'adresse contient ?avec=ID, on ouvre cette conversation
    const avec = Number(this.$route.query.avec);
    if (avec) {
      this.choisir(avec);
    } else if (this.conversations.length > 0) {
      // Sinon on ouvre la conversation la plus récente
      this.choisir(this.conversations[0].autreId);
    }
  },

  beforeUnmount() {
    window.removeEventListener("keydown", this.surTouche);
    document.removeEventListener("click", this.fermerMenu);
    clearInterval(this.relecture);
    (this.desabonnements || []).forEach((arreter) => arreter());
    Object.values(this.minuteursEcriture || {}).forEach(clearTimeout);
    if (this.observateur) this.observateur.disconnect();
    this.annulerEnregistrement();
  },

  methods: {
    timeAgo,
    formatTime,

    estDeMoi(m) {
      return m.expediteurId === this.auth.utilisateur.id;
    },

    // ---------- Temps réel ----------
    brancherTempsReel() {
      this.desabonnements = [
        ecouter("message", (e) => this.recevoirMessage(e.message)),
        ecouter("message-modifie", (e) => this.remplacerMessage(e.message)),
        ecouter("message-supprime", (e) => this.remplacerMessage(e.message)),
        ecouter("message-masque", (e) => {
          this.messagesAffiches = this.messagesAffiches.filter((m) => m.id !== e.id);
          this.chargerConversations();
        }),
        // L'autre personne a lu mes messages : coches « lu » (RG09.9)
        ecouter("lus", (e) => {
          if (e.par === this.idChoisi) {
            this.messagesAffiches.forEach((m) => {
              if (this.estDeMoi(m)) {
                m.lu = true;
                m.recu = true;
              }
            });
          }
          this.mettreAJourApercu(e.par, { lu: true, recu: true });
        }),
        // L'autre personne vient de se connecter : coches « reçu »
        ecouter("recus", (e) => {
          if (e.par === this.idChoisi) {
            this.messagesAffiches.forEach((m) => {
              if (this.estDeMoi(m)) m.recu = true;
            });
          }
          this.mettreAJourApercu(e.par, { recu: true });
        }),
        ecouter("ecrit", (e) => this.signalerEcriture(e.de)),
        // Reconnexion après une coupure : on rattrape ce qui a été manqué
        ecouter("pret", () => this.rafraichir()),
      ];
    },

    recevoirMessage(message) {
      const autre = this.estDeMoi(message) ? message.destinataireId : message.expediteurId;
      if (!this.estDeMoi(message)) this.arreterEcriture(autre);
      if (autre === this.idChoisi && !this.messagesAffiches.some((m) => m.id === message.id)) {
        this.messagesAffiches.push(message);
        if (this.estDeMoi(message) || this.collerEnBas) this.descendreEnBas();
        else this.nouveauxEnBas = true;
        // Conversation ouverte et page visible : le message est lu tout de suite
        if (!this.estDeMoi(message) && document.visibilityState === "visible") {
          this.data.marquerLus(autre).catch(() => {});
        }
      }
      this.chargerConversations();
    },

    remplacerMessage(message) {
      const i = this.messagesAffiches.findIndex((m) => m.id === message.id);
      if (i !== -1) this.messagesAffiches.splice(i, 1, message);
      this.chargerConversations();
    },

    mettreAJourApercu(autreId, changements) {
      const c = this.conversations.find((x) => x.autreId === autreId);
      if (c && c.dernierMessage.deMoi) Object.assign(c.dernierMessage, changements);
    },

    signalerEcriture(idPersonne) {
      this.enEcriture = { ...this.enEcriture, [idPersonne]: true };
      clearTimeout(this.minuteursEcriture[idPersonne]);
      this.minuteursEcriture[idPersonne] = setTimeout(() => this.arreterEcriture(idPersonne), DUREE_ECRIT_MS);
      if (idPersonne === this.idChoisi && this.collerEnBas) this.descendreEnBas();
    },

    arreterEcriture(idPersonne) {
      clearTimeout(this.minuteursEcriture[idPersonne]);
      if (this.enEcriture[idPersonne]) {
        const copie = { ...this.enEcriture };
        delete copie[idPersonne];
        this.enEcriture = copie;
      }
    },

    // Relit la conversation ouverte (reconnexion, ou sans temps réel)
    async rafraichir() {
      await this.chargerConversations();
      if (this.idChoisi === null || this.envoi) return;
      try {
        const messages = await this.data.conversationAvec(this.idChoisi);
        const avant = this.messagesAffiches.length;
        this.messagesAffiches = messages;
        if (messages.length > avant) {
          if (this.collerEnBas) this.descendreEnBas();
          else this.nouveauxEnBas = true;
        }
      } catch {
        // on réessaiera à la prochaine relecture
      }
    },

    // ---------- Conversations ----------
    async chargerConversations() {
      try {
        this.conversations = await this.data.conversations();
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      }
    },

    // Choisir une conversation : le serveur renvoie les messages et
    // marque comme lus ceux que j'ai reçus
    async choisir(autreId) {
      this.annulerEnregistrement();
      this.edition = null;
      this.menuOuvert = null;
      this.idChoisi = autreId;
      this.erreur = "";
      this.messagesAffiches = [];
      this.nouveauxEnBas = false;
      const conversation = this.conversations.find((c) => c.autreId === autreId);
      this.interlocuteur = conversation ? { id: autreId, ...conversation.autre } : null;
      try {
        // Nouvelle conversation : on va chercher le profil public
        if (!this.interlocuteur) {
          const profil = await this.data.profilPublic(autreId);
          this.interlocuteur = {
            id: autreId, prenom: profil.prenom, nom: profil.nom, commune: profil.commune, photo: profil.photo,
          };
        }
        this.messagesAffiches = await this.data.conversationAvec(autreId);
        // Les pastilles « non lus » de la liste se mettent à jour
        const c = this.conversations.find((x) => x.autreId === autreId);
        if (c) c.nonLus = 0;
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      }
      // La conversation s'ouvre en bas (le plus récent)
      this.collerEnBas = true;
      this.descendreEnBas();
      this.observerHauteur();
    },

    // ---------- Défilement ----------
    // Défile tout en bas, une fois les messages affichés par Vue
    descendreEnBas() {
      this.nouveauxEnBas = false;
      this.collerEnBas = true;
      this.$nextTick(() => {
        const zone = this.$refs.zoneChat;
        if (zone) zone.scrollTop = zone.scrollHeight;
      });
    },

    // La personne fait défiler : est-elle encore en bas ?
    surDefilement() {
      const zone = this.$refs.zoneChat;
      if (!zone) return;
      this.collerEnBas = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 80;
      if (this.collerEnBas) this.nouveauxEnBas = false;
    },

    // Les photos se chargent après l'affichage et allongent la conversation :
    // si on était en bas, on y reste
    observerHauteur() {
      this.$nextTick(() => {
        const contenu = this.$refs.contenuChat;
        if (!contenu || !window.ResizeObserver) return;
        if (this.observateur) this.observateur.disconnect();
        this.observateur = new ResizeObserver(() => {
          if (this.collerEnBas) {
            const zone = this.$refs.zoneChat;
            if (zone) zone.scrollTop = zone.scrollHeight;
          }
        });
        this.observateur.observe(contenu);
      });
    },

    surChargementMedia() {
      if (this.collerEnBas) this.descendreEnBas();
    },

    // ---------- Envoi ----------
    async apresEnvoi(message) {
      if (!this.messagesAffiches.some((m) => m.id === message.id)) this.messagesAffiches.push(message);
      this.erreur = "";
      this.descendreEnBas();
      await this.chargerConversations();
    },

    // Envoyer le message écrit dans le champ (ou enregistrer la modification)
    async envoyer() {
      if (this.edition) return this.enregistrerModification();
      const contenu = this.brouillon.trim();
      if (contenu === "" || this.idChoisi === null) return;
      this.envoi = true;
      try {
        const message = await this.data.envoyerMessage(this.idChoisi, contenu);
        this.brouillon = "";
        await this.apresEnvoi(message);
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.envoi = false;
      }
    },

    // ---------- Accusés, modification, suppression ----------
    statut(m) {
      if (m.lu) return { icone: "bi-check2-all", classe: "chat-statut-lu", texte: "Lu" };
      if (m.recu) return { icone: "bi-check2-all", classe: "", texte: "Distribué" };
      return { icone: "bi-check2", classe: "", texte: "Envoyé" };
    },

    ageMinutes(m) {
      return (this.maintenant - versDate(m.date).getTime()) / 60000;
    },
    peutModifier(m) {
      return this.estDeMoi(m) && m.type === "texte" && !m.supprime && this.ageMinutes(m) < MODIFICATION_MINUTES;
    },
    peutSupprimerPourTous(m) {
      return this.estDeMoi(m) && !m.supprime && this.ageMinutes(m) < SUPPRESSION_POUR_TOUS_MINUTES;
    },

    basculerMenu(m) {
      this.maintenant = Date.now();
      this.menuOuvert = this.menuOuvert === m.id ? null : m.id;
    },
    fermerMenu(evenement) {
      if (!evenement.target.closest || !evenement.target.closest(".chat-menu")) this.menuOuvert = null;
    },

    commencerModification(m) {
      this.menuOuvert = null;
      this.annulerEnregistrement();
      this.edition = { id: m.id, contenu: m.contenu };
      this.brouillon = m.contenu;
      this.$nextTick(() => this.$refs.champMessage && this.$refs.champMessage.focus());
    },
    annulerModification() {
      this.edition = null;
      this.brouillon = "";
    },
    async enregistrerModification() {
      const contenu = this.brouillon.trim();
      if (!contenu || contenu === this.edition.contenu) return this.annulerModification();
      this.envoi = true;
      try {
        this.remplacerMessage(await this.data.modifierMessage(this.edition.id, contenu));
        this.annulerModification();
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.envoi = false;
      }
    },

    async supprimer(m, pourTous) {
      this.menuOuvert = null;
      const question = pourTous
        ? "Supprimer ce message pour tout le monde ? Il sera remplacé par « Ce message a été supprimé »."
        : "Supprimer ce message de votre conversation ? L'autre personne le verra toujours.";
      if (!confirm(question)) return;
      try {
        const resultat = await this.data.supprimerMessage(m.id, pourTous);
        if (pourTous) this.remplacerMessage(resultat);
        else this.messagesAffiches = this.messagesAffiches.filter((x) => x.id !== m.id);
        await this.chargerConversations();
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      }
    },

    // ---------- Photo ----------
    async envoyerPhoto(evenement) {
      const fichier = evenement.target.files[0];
      evenement.target.value = "";
      if (!fichier || this.idChoisi === null) return;
      if (!fichier.type.startsWith("image/")) {
        this.erreur = "Choisissez une image (JPEG, PNG ou WebP).";
        return;
      }
      this.envoi = true;
      try {
        // 1600 px au plus, en JPEG : l'envoi reste rapide sur mobile
        const image = await preparerPhotoMessage(fichier);
        const message = await this.data.envoyerFichierMessage(this.idChoisi, image, "photo.jpg");
        await this.apresEnvoi(message);
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.envoi = false;
      }
    },

    // ---------- Message vocal ----------
    async demarrerEnregistrement() {
      this.erreur = "";
      let flux;
      try {
        flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        this.erreur = "Accès au micro refusé : autorisez-le dans les réglages du navigateur.";
        return;
      }
      const format = formatAudio();
      const enregistreur = new MediaRecorder(flux, format ? { mimeType: format } : undefined);
      const morceaux = [];
      enregistreur.ondataavailable = (e) => {
        if (e.data.size > 0) morceaux.push(e.data);
      };
      const debut = Date.now();
      // Ces objets ne sont pas réactifs : on les range à part
      this.enreg = { flux, enregistreur, morceaux, debut, envoyer: false };
      this.enregistrement.actif = true;
      this.enregistrement.secondes = 0;
      this.enreg.minuteur = setInterval(() => {
        this.enregistrement.secondes = Math.floor((Date.now() - debut) / 1000);
        // Pendant l'enregistrement, l'autre personne voit « en train d'écrire… »
        if (this.enregistrement.secondes % 3 === 0) envoyerTempsReel({ type: "ecrit", avec: this.idChoisi });
        // Arrêt automatique à 2 minutes (RG09.7)
        if (this.enregistrement.secondes >= DUREE_MAX_VOCAL) this.arreterEtEnvoyer();
      }, 250);
      enregistreur.onstop = () => this.finEnregistrement();
      enregistreur.start();
    },

    arreterEtEnvoyer() {
      if (!this.enreg || this.enreg.enregistreur.state === "inactive") return;
      this.enreg.envoyer = true;
      this.enreg.enregistreur.stop();
    },

    annulerEnregistrement() {
      if (!this.enreg) return;
      this.enreg.envoyer = false;
      if (this.enreg.enregistreur.state !== "inactive") this.enreg.enregistreur.stop();
      else this.finEnregistrement();
    },

    // Appelé quand l'enregistreur s'arrête : on coupe le micro, puis on envoie
    async finEnregistrement() {
      const enreg = this.enreg;
      if (!enreg) return;
      this.enreg = null;
      clearInterval(enreg.minuteur);
      enreg.flux.getTracks().forEach((piste) => piste.stop());
      this.enregistrement.actif = false;
      if (!enreg.envoyer) return;

      const duree = Math.min(DUREE_MAX_VOCAL, Math.round((Date.now() - enreg.debut) / 1000));
      if (duree < 1) {
        this.erreur = "Message vocal trop court : parlez au moins une seconde.";
        return;
      }
      const type = (enreg.enregistreur.mimeType || "audio/webm").split(";")[0];
      const extension = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" }[type] || "webm";
      const fichier = new Blob(enreg.morceaux, { type });
      this.envoi = true;
      try {
        const message = await this.data.envoyerFichierMessage(this.idChoisi, fichier, "vocal." + extension, duree);
        await this.apresEnvoi(message);
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.envoi = false;
      }
    },

    // Échap : ferme la photo agrandie, le menu, ou annule la modification
    surTouche(evenement) {
      if (evenement.key !== "Escape") return;
      if (this.photoAgrandie) this.photoAgrandie = null;
      else if (this.menuOuvert) this.menuOuvert = null;
      else if (this.edition) this.annulerModification();
    },
  },
};
</script>

<template>
  <div id="messages-page" class="container py-4 min-h-page">
    <h1 class="h3 section-title mb-4 reveal">
      <i class="bi bi-chat-dots text-cm-primary me-2"></i>Messagerie
    </h1>

    <div class="card reveal reveal-zoom" style="min-height: 60vh">
      <div class="row g-0" style="min-height: 60vh">
        <!-- Colonne de gauche : les conversations -->
        <aside class="col-md-4 border-end reveal reveal-gauche delai-1">
          <div class="p-3 border-bottom">
            <h2 class="h6 mb-0 fw-bold">Conversations</h2>
          </div>
          <div
            v-if="conversations.length === 0 && !interlocuteur"
            class="p-4 text-center text-muted small"
          >
            Aucune conversation. Contactez un conducteur depuis la page d'un
            trajet !
          </div>

          <!-- Nouvelle conversation (ouverte via ?avec=) -->
          <button
            v-if="interlocuteur && nouvelleConversation"
            class="conversation-item active w-100 text-start border-0 bg-transparent d-flex gap-2 p-3"
          >
            <AvatarMembre :personne="interlocuteur" taille="sm" />
            <div>
              <div class="fw-semibold small">
                {{ interlocuteur.prenom }} {{ interlocuteur.nom }}
              </div>
              <div class="small text-muted">Nouvelle conversation</div>
            </div>
          </button>

          <!-- Les conversations existantes -->
          <button
            v-for="c in conversations"
            :key="c.autreId"
            class="conversation-item w-100 text-start border-0 bg-transparent d-flex gap-2 p-3 border-bottom"
            :class="{ active: c.autreId === idChoisi }"
            @click="choisir(c.autreId)"
          >
            <AvatarMembre :personne="c.autre" taille="sm" />
            <div class="flex-grow-1 overflow-hidden">
              <div class="d-flex justify-content-between">
                <span class="fw-semibold small">{{ c.autre.prenom }} {{ c.autre.nom }}</span>
                <span class="small text-muted">{{
                  timeAgo(c.dernierMessage.date)
                }}</span>
              </div>
              <div class="small text-muted text-truncate">
                <span v-if="enEcriture[c.autreId]" class="chat-ecrit-texte">en train d'écrire…</span>
                <template v-else>
                  <i v-if="c.dernierMessage.deMoi && !c.dernierMessage.supprime" class="bi me-1"
                    :class="[statut(c.dernierMessage).icone, statut(c.dernierMessage).classe]"></i>
                  <template v-if="c.dernierMessage.supprime"><i class="bi bi-slash-circle me-1"></i>Message supprimé</template>
                  <template v-else-if="c.dernierMessage.type === 'image'"><i class="bi bi-image me-1"></i>Photo</template>
                  <template v-else-if="c.dernierMessage.type === 'vocal'"><i class="bi bi-mic-fill me-1"></i>Message vocal</template>
                  <template v-else>{{ c.dernierMessage.contenu }}</template>
                </template>
              </div>
            </div>
            <span
              v-if="c.nonLus > 0"
              class="badge rounded-pill bg-danger align-self-center"
              >{{ c.nonLus }}</span
            >
          </button>
        </aside>

        <!-- Colonne de droite : le chat -->
        <section
          class="col-md-8 d-flex flex-column reveal reveal-droite delai-2 position-relative"
        >
          <template v-if="interlocuteur">
            <!-- En-tête avec le nom de la personne -->
            <div class="p-3 border-bottom d-flex align-items-center gap-2">
              <AvatarMembre :personne="interlocuteur" taille="sm" />
              <div>
                <router-link
                  :to="{
                    name: 'public-profile',
                    params: { id: interlocuteur.id },
                  }"
                  class="fw-semibold text-decoration-none"
                >
                  {{ interlocuteur.prenom }} {{ interlocuteur.nom }}
                </router-link>
                <div v-if="interlocuteurEcrit" class="small chat-ecrit-texte" aria-live="polite">en train d'écrire…</div>
                <div v-else-if="interlocuteur.commune" class="small text-muted">{{ interlocuteur.commune }}</div>
              </div>
            </div>

            <div v-if="erreur" class="alert alert-warning m-3 mb-0 py-2 small" role="alert">
              <i class="bi bi-info-circle me-1"></i>{{ erreur }}
            </div>

            <!-- Les bulles de messages -->
            <div
              ref="zoneChat"
              class="flex-grow-1 p-3 overflow-auto chat-zone"
              @scroll="surDefilement"
            >
              <div ref="contenuChat">
                <div
                  v-for="m in messagesAffiches"
                  :key="m.id"
                  class="d-flex mb-2 chat-ligne"
                  :class="estDeMoi(m) ? 'justify-content-end' : 'justify-content-start'"
                >
                  <div
                    class="chat-bubble"
                    :class="[estDeMoi(m) ? 'mine' : 'theirs', { 'chat-media': m.type === 'image' && !m.supprime, 'chat-supprime': m.supprime }]"
                  >
                    <!-- Menu « ⋯ » : modifier, supprimer -->
                    <div class="chat-menu">
                      <button type="button" class="chat-menu-bouton" :aria-expanded="menuOuvert === m.id ? 'true' : 'false'"
                        aria-label="Actions sur le message" @click.stop="basculerMenu(m)">
                        <i class="bi bi-three-dots-vertical"></i>
                      </button>
                      <ul v-if="menuOuvert === m.id" class="chat-menu-liste" role="menu">
                        <li v-if="peutModifier(m)">
                          <button type="button" role="menuitem" @click="commencerModification(m)">
                            <i class="bi bi-pencil"></i>Modifier
                          </button>
                        </li>
                        <li>
                          <button type="button" role="menuitem" @click="supprimer(m, false)">
                            <i class="bi bi-trash"></i>Supprimer pour moi
                          </button>
                        </li>
                        <li v-if="peutSupprimerPourTous(m)">
                          <button type="button" role="menuitem" class="text-danger" @click="supprimer(m, true)">
                            <i class="bi bi-trash3"></i>Supprimer pour tous
                          </button>
                        </li>
                      </ul>
                    </div>

                    <div v-if="m.supprime" class="fst-italic">
                      <i class="bi bi-slash-circle me-1"></i>Ce message a été supprimé
                    </div>
                    <PieceJointeMessage
                      v-else-if="m.type === 'image' || m.type === 'vocal'"
                      :message="m"
                      @agrandir="photoAgrandie = $event"
                      @charge="surChargementMedia"
                    />
                    <div v-else class="chat-texte">{{ m.contenu }}</div>

                    <!-- Heure, « modifié », accusés (envoyé, reçu, lu) -->
                    <div
                      class="chat-pied"
                      :class="{ 'px-2 pb-1': m.type === 'image' && !m.supprime }"
                    >
                      <span v-if="m.modifie && !m.supprime" class="me-1">modifié ·</span>
                      {{ formatTime(m.date) }}
                      <i v-if="estDeMoi(m) && !m.supprime" class="bi ms-1 chat-statut"
                        :class="[statut(m).icone, statut(m).classe]" :title="statut(m).texte"
                        :aria-label="statut(m).texte"></i>
                    </div>
                  </div>
                </div>

                <!-- L'autre personne écrit -->
                <div v-if="interlocuteurEcrit" class="d-flex mb-2 justify-content-start">
                  <div class="chat-bubble theirs chat-ecrit" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                </div>

                <p
                  v-if="messagesAffiches.length === 0 && !erreur"
                  class="text-center text-muted small py-4"
                >
                  Envoyez votre premier message à {{ interlocuteur.prenom }} !
                </p>
              </div>
            </div>

            <!-- Des messages sont arrivés pendant qu'on lisait plus haut -->
            <button v-if="nouveauxEnBas" type="button" class="btn btn-sm btn-cm-primary chat-nouveaux" @click="descendreEnBas">
              <i class="bi bi-arrow-down me-1"></i>Nouveaux messages
            </button>

            <!-- Enregistrement d'un message vocal en cours -->
            <div v-if="enregistrement.actif" class="p-3 border-top d-flex gap-2 align-items-center">
              <button type="button" class="btn btn-outline-secondary chat-outil" aria-label="Annuler l'enregistrement"
                @click="annulerEnregistrement">
                <i class="bi bi-trash"></i>
              </button>
              <div class="enregistreur" role="status">
                <span class="enregistreur-point" aria-hidden="true"></span>
                Enregistrement…
                <span class="enregistreur-temps ms-auto">{{ tempsEnregistre }} / 2:00</span>
              </div>
              <button type="button" class="btn btn-cm-primary chat-outil" aria-label="Envoyer le message vocal"
                @click="arreterEtEnvoyer">
                <i class="bi bi-send"></i>
              </button>
            </div>

            <template v-else>
              <!-- Modification en cours -->
              <div v-if="edition" class="chat-edition">
                <i class="bi bi-pencil text-cm-primary"></i>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="small fw-semibold text-cm-primary">Modifier le message</div>
                  <div class="small text-muted text-truncate">{{ edition.contenu }}</div>
                </div>
                <button type="button" class="btn-close" aria-label="Annuler la modification" @click="annulerModification"></button>
              </div>

              <!-- Le champ pour écrire, avec les boutons photo et micro -->
              <form class="p-3 border-top d-flex gap-2 align-items-center" @submit.prevent="envoyer">
                <label v-if="!edition" class="btn btn-outline-cm chat-outil d-inline-flex align-items-center justify-content-center mb-0"
                  :class="{ disabled: envoi }" title="Envoyer une photo">
                  <i class="bi bi-image"></i>
                  <input type="file" accept="image/*" class="visually-hidden" aria-label="Envoyer une photo"
                    :disabled="envoi" @change="envoyerPhoto" />
                </label>
                <input
                  id="message-input"
                  ref="champMessage"
                  v-model="brouillon"
                  class="form-control"
                  :placeholder="edition ? 'Modifiez votre message…' : 'Écrivez votre message…'"
                  autocomplete="off"
                  maxlength="1000"
                />
                <!-- Champ vide : le micro ; sinon : envoyer le texte -->
                <button
                  v-if="!brouillon.trim() && micDisponible && !edition"
                  type="button"
                  class="btn btn-outline-cm chat-outil"
                  :disabled="envoi"
                  title="Enregistrer un message vocal (2 minutes au plus)"
                  aria-label="Enregistrer un message vocal"
                  @click="demarrerEnregistrement"
                >
                  <i class="bi bi-mic-fill"></i>
                </button>
                <button
                  v-else
                  type="submit"
                  class="btn btn-cm-primary chat-outil"
                  :disabled="!brouillon.trim() || envoi"
                  :aria-label="edition ? 'Enregistrer la modification' : 'Envoyer le message'"
                >
                  <span v-if="envoi" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi" :class="edition ? 'bi-check-lg' : 'bi-send'"></i>
                </button>
              </form>
            </template>
          </template>

          <div
            v-else
            class="d-flex align-items-center justify-content-center flex-grow-1 text-muted"
          >
            <div class="text-center">
              <i class="bi bi-chat-square-dots fs-1"></i>
              <p class="mt-2">Sélectionnez une conversation</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Photo agrandie : un clic ou Échap la ferme -->
    <div v-if="photoAgrandie" class="visionneuse" role="dialog" aria-label="Photo agrandie" @click="photoAgrandie = null">
      <img :src="photoAgrandie" alt="Photo agrandie" />
    </div>
  </div>
</template>
