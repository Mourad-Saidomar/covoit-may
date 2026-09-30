<script>
// ============================================================
// Page Messagerie
// ------------------------------------------------------------
// À gauche : la liste des conversations.
// À droite : les messages avec la personne choisie.
// On peut arriver ici avec ?avec=ID pour ouvrir directement
// la conversation avec quelqu'un.
// ============================================================
import { useDataStore } from "../stores/data";
import { useAuthStore } from "../stores/auth";
import { initials, timeAgo, formatTime, messageErreur } from "../utils/format";

export default {
  name: "MessagesView",

  data() {
    return {
      conversations: [], // mes conversations (API), une par personne
      idChoisi: null, // l'id de la personne avec qui on discute
      interlocuteur: null, // son prénom, son initiale et sa commune
      messagesAffiches: [], // les messages de la conversation choisie
      brouillon: "", // le message en train d'être écrit
      erreur: "", // refus du serveur (ex. pas de réservation commune)
      envoi: false,
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
  },

  // Quand la page s'ouvre
  async mounted() {
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

  methods: {
    initials,
    timeAgo,
    formatTime,

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
          this.interlocuteur = { id: autreId, prenom: profil.prenom, nom: profil.nom, commune: profil.commune };
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

    // Envoyer le message écrit dans le champ
    async envoyer() {
      const contenu = this.brouillon.trim();
      if (contenu === "" || this.idChoisi === null) return;
      this.envoi = true;
      try {
        const message = await this.data.envoyerMessage(this.idChoisi, contenu);
        this.messagesAffiches.push(message);
        this.brouillon = "";
        this.erreur = "";
        await this.chargerConversations();
      } catch (erreur) {
        this.erreur = messageErreur(erreur);
      } finally {
        this.envoi = false;
      }
      this.descendreEnBas();
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
            <span class="avatar avatar-sm">{{ initials(interlocuteur) }}</span>
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
            <span class="avatar avatar-sm">{{ initials(c.autre) }}</span>
            <div class="flex-grow-1 overflow-hidden">
              <div class="d-flex justify-content-between">
                <span class="fw-semibold small">{{ c.autre.prenom }} {{ c.autre.nom }}</span>
                <span class="small text-muted">{{
                  timeAgo(c.dernierMessage.date)
                }}</span>
              </div>
              <div class="small text-muted text-truncate">
                <span v-if="c.dernierMessage.deMoi">Vous : </span>{{ c.dernierMessage.contenu }}
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
              <span class="avatar avatar-sm">{{
                initials(interlocuteur)
              }}</span>
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
                :class="
                  m.expediteurId === auth.utilisateur.id
                    ? 'justify-content-end'
                    : 'justify-content-start'
                "
              >
                <div
                  class="chat-bubble"
                  :class="
                    m.expediteurId === auth.utilisateur.id ? 'mine' : 'theirs'
                  "
                >
                  <div>{{ m.contenu }}</div>
                  <div
                    class="small opacity-75 text-end mt-1"
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

            <!-- Le champ pour écrire -->
            <form class="p-3 border-top d-flex gap-2" @submit.prevent="envoyer">
              <input
                id="message-input"
                v-model="brouillon"
                class="form-control"
                placeholder="Écrivez votre message…"
                autocomplete="off"
                maxlength="1000"
              />
              <button
                type="submit"
                class="btn btn-cm-primary"
                :disabled="!brouillon.trim() || envoi"
                aria-label="Envoyer le message"
              >
                <i class="bi bi-send"></i>
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
  </div>
</template>
