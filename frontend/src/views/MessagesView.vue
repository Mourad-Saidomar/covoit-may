<script>
// ============================================================
// Page Messagerie
// ------------------------------------------------------------
// À gauche : la liste des conversations.
// À droite : les messages avec la personne choisie.
// On peut arriver ici avec ?avec=ID pour ouvrir directement
// la conversation avec quelqu'un.
// On envoie du texte, une photo (réduite par le navigateur avant
// l'envoi) ou un message vocal enregistré avec le micro
// (MediaRecorder, 2 minutes au plus) : RG09.6 et RG09.7.
// ============================================================
import { useDataStore } from "../stores/data";
import { useAuthStore } from "../stores/auth";
import { timeAgo, formatTime, messageErreur } from "../utils/format";
import { preparerPhotoMessage } from "../utils/image";
import AvatarMembre from "../components/AvatarMembre.vue";
import PieceJointeMessage from "../components/PieceJointeMessage.vue";

// Durée maximale d'un message vocal, en secondes (RG09.7)
const DUREE_MAX_VOCAL = 120;

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
  },

  // Quand la page s'ouvre
  async mounted() {
    window.addEventListener("keydown", this.surTouche);
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
    this.annulerEnregistrement();
  },

  methods: {
    timeAgo,
    formatTime,

    estDeMoi(m) {
      return m.expediteurId === this.auth.utilisateur.id;
    },

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
      this.idChoisi = autreId;
      this.erreur = "";
      this.messagesAffiches = [];
      const conversation = this.conversations.find((c) => c.autreId === autreId);
      this.interlocuteur = conversation
        ? { id: autreId, ...conversation.autre }
        : null;
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
      this.descendreEnBas();
    },

    // Ajoute un message envoyé à la conversation et rafraîchit la liste
    async apresEnvoi(message) {
      this.messagesAffiches.push(message);
      this.erreur = "";
      this.descendreEnBas();
      await this.chargerConversations();
    },

    // Envoyer le message écrit dans le champ
    async envoyer() {
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

    // Échap ferme la photo agrandie
    surTouche(evenement) {
      if (evenement.key === "Escape") this.photoAgrandie = null;
    },

    // Fait défiler la zone de chat tout en bas
    descendreEnBas() {
      // $nextTick attend que la page soit mise à jour
      this.$nextTick(() => {
        const zone = this.$refs.zoneChat;
        if (zone) {
          zone.scrollTop = zone.scrollHeight;
        }
      });
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
                <span v-if="c.dernierMessage.deMoi">Vous : </span>
                <template v-if="c.dernierMessage.type === 'image'"><i class="bi bi-image me-1"></i>Photo</template>
                <template v-else-if="c.dernierMessage.type === 'vocal'"><i class="bi bi-mic-fill me-1"></i>Message vocal</template>
                <template v-else>{{ c.dernierMessage.contenu }}</template>
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
          class="col-md-8 d-flex flex-column reveal reveal-droite delai-2"
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
                <div v-if="interlocuteur.commune" class="small text-muted">{{ interlocuteur.commune }}</div>
              </div>
            </div>

            <div v-if="erreur" class="alert alert-warning m-3 mb-0 py-2 small" role="alert">
              <i class="bi bi-info-circle me-1"></i>{{ erreur }}
            </div>

            <!-- Les bulles de messages -->
            <div
              ref="zoneChat"
              class="flex-grow-1 p-3 overflow-auto"
              style="max-height: 45vh"
            >
              <div
                v-for="m in messagesAffiches"
                :key="m.id"
                class="d-flex mb-2"
                :class="estDeMoi(m) ? 'justify-content-end' : 'justify-content-start'"
              >
                <div
                  class="chat-bubble"
                  :class="[estDeMoi(m) ? 'mine' : 'theirs', { 'chat-media': m.type === 'image' }]"
                >
                  <PieceJointeMessage
                    v-if="m.type === 'image' || m.type === 'vocal'"
                    :message="m"
                    @agrandir="photoAgrandie = $event"
                  />
                  <div v-else>{{ m.contenu }}</div>
                  <div
                    class="small opacity-75 text-end mt-1"
                    :class="{ 'px-2 pb-1': m.type === 'image' }"
                    style="font-size: 0.7rem"
                  >
                    {{ formatTime(m.date) }}
                  </div>
                </div>
              </div>
              <p
                v-if="messagesAffiches.length === 0 && !erreur"
                class="text-center text-muted small py-4"
              >
                Envoyez votre premier message à {{ interlocuteur.prenom }} !
              </p>
            </div>

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

            <!-- Le champ pour écrire, avec les boutons photo et micro -->
            <form v-else class="p-3 border-top d-flex gap-2 align-items-center" @submit.prevent="envoyer">
              <label class="btn btn-outline-cm chat-outil d-inline-flex align-items-center justify-content-center mb-0"
                :class="{ disabled: envoi }" title="Envoyer une photo">
                <i class="bi bi-image"></i>
                <input type="file" accept="image/*" class="visually-hidden" aria-label="Envoyer une photo"
                  :disabled="envoi" @change="envoyerPhoto" />
              </label>
              <input
                id="message-input"
                v-model="brouillon"
                class="form-control"
                placeholder="Écrivez votre message…"
                autocomplete="off"
                maxlength="1000"
              />
              <!-- Champ vide : le micro ; sinon : envoyer le texte -->
              <button
                v-if="!brouillon.trim() && micDisponible"
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
                aria-label="Envoyer le message"
              >
                <span v-if="envoi" class="spinner-border spinner-border-sm"></span>
                <i v-else class="bi bi-send"></i>
              </button>
            </form>
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
