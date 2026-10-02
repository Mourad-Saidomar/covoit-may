<script>
// ============================================================
// Page « Nous contacter »
// ------------------------------------------------------------
// Ouverte à tous. Le message part par email à l'équipe (POST
// /api/contact) : il n'est pas enregistré dans la base.
// Si la personne est connectée, son nom et son email sont déjà
// remplis.
// Le champ « site » est caché : c'est un piège à robots (seul un
// robot le remplit, et son message est alors ignoré).
// ============================================================
import { useAuthStore } from '../stores/auth'
import { useDataStore } from '../stores/data'
import { messageErreur } from '../utils/format'

const LONGUEUR_MAX = 2000

export default {
  name: 'ContactView',

  data() {
    const auth = useAuthStore()
    const moi = auth.estMembre ? auth.utilisateur : null
    return {
      nom: moi ? `${moi.prenom} ${moi.nom}` : '',
      email: moi && moi.email ? moi.email : '',
      sujet: '',
      message: '',
      site: '',
      envoi: false,
      erreur: '',
      confirmation: '',
      longueurMax: LONGUEUR_MAX,
      sujets: [
        { valeur: 'question', libelle: 'Question générale' },
        { valeur: 'compte', libelle: 'Mon compte' },
        { valeur: 'reservation', libelle: 'Une réservation ou un trajet' },
        { valeur: 'paiement', libelle: 'Paiement ou remboursement' },
        { valeur: 'signalement', libelle: 'Signaler un problème ou un membre' },
        { valeur: 'suggestion', libelle: 'Suggestion' },
        { valeur: 'autre', libelle: 'Autre' }
      ]
    }
  },

  computed: {
    restant() {
      return LONGUEUR_MAX - this.message.length
    }
  },

  methods: {
    async envoyer() {
      this.erreur = ''
      if (this.message.trim().length < 10) {
        this.erreur = 'Votre message doit contenir au moins 10 caractères.'
        return
      }
      this.envoi = true
      try {
        const reponse = await useDataStore().envoyerContact({
          nom: this.nom,
          email: this.email,
          sujet: this.sujet,
          message: this.message,
          site: this.site
        })
        this.confirmation = reponse.message
        this.message = ''
        this.sujet = ''
      } catch (erreur) {
        this.erreur = messageErreur(erreur)
      } finally {
        this.envoi = false
      }
    },

    nouveauMessage() {
      this.confirmation = ''
      this.$nextTick(() => this.$refs.champSujet?.focus())
    }
  }
}
</script>

<template>
  <section id="contact-page" class="py-5">
    <div class="container">
      <header class="mb-4">
        <h1 class="h2 fw-bold"><i class="bi bi-envelope-paper me-2 text-cm-primary"></i>Nous contacter</h1>
        <p class="text-muted mb-0">Une question, un souci avec un trajet, une idée ? L'équipe Covoit'May vous répond par email.</p>
      </header>

      <div class="row g-4">
        <!-- Informations -->
        <aside class="col-lg-4 order-lg-2">
          <div class="card contact-infos h-100">
            <div class="card-body p-4">
              <h2 class="h6 fw-bold text-uppercase small mb-3">Bon à savoir</h2>
              <ul class="list-unstyled contact-liste mb-4">
                <li>
                  <i class="bi bi-clock-history"></i>
                  <span><strong>Réponse sous 48 h</strong><br />les jours ouvrés, à l'adresse email indiquée.</span>
                </li>
                <li>
                  <i class="bi bi-geo-alt"></i>
                  <span><strong>Mamoudzou, Mayotte (976)</strong><br />une équipe sur place.</span>
                </li>
                <li>
                  <i class="bi bi-chat-dots"></i>
                  <span><strong>Pour un trajet réservé</strong><br />écrivez d'abord au conducteur ou au passager depuis la
                    <router-link :to="{ name: 'messages' }">messagerie</router-link>.</span>
                </li>
                <li>
                  <i class="bi bi-shield-exclamation"></i>
                  <span><strong>Urgence sur la route</strong><br />appelez le 17 (police) ou le 15 (SAMU).</span>
                </li>
              </ul>
              <h2 class="h6 fw-bold text-uppercase small mb-2">À lire aussi</h2>
              <ul class="list-unstyled small mb-0">
                <li class="mb-1"><router-link :to="{ name: 'about' }">À propos de Covoit'May</router-link></li>
                <li class="mb-1"><router-link :to="{ name: 'terms' }">Conditions générales</router-link></li>
                <li><router-link :to="{ name: 'privacy' }">Politique de confidentialité</router-link></li>
              </ul>
            </div>
          </div>
        </aside>

        <!-- Formulaire -->
        <div class="col-lg-8 order-lg-1">
          <div class="card">
            <div class="card-body p-4">
              <!-- Message envoyé -->
              <div v-if="confirmation" class="text-center py-4" role="status">
                <span class="auth-icone" aria-hidden="true"><i class="bi bi-check2-circle"></i></span>
                <h2 class="h4 fw-bold mt-3">Message envoyé</h2>
                <p class="text-muted">{{ confirmation }}</p>
                <button type="button" class="btn btn-outline-cm" @click="nouveauMessage">Écrire un autre message</button>
              </div>

              <form v-else novalidate @submit.prevent="envoyer">
                <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
                </div>

                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="contact-nom">Nom et prénom</label>
                    <input id="contact-nom" v-model="nom" type="text" class="form-control" required
                      minlength="2" maxlength="100" autocomplete="name" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="contact-email">Adresse email</label>
                    <input id="contact-email" v-model="email" type="email" class="form-control" required
                      maxlength="150" autocomplete="email" placeholder="vous@exemple.yt" />
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" for="contact-sujet">Sujet</label>
                    <select id="contact-sujet" ref="champSujet" v-model="sujet" class="form-select" required>
                      <option value="" disabled>Choisissez un sujet</option>
                      <option v-for="s in sujets" :key="s.valeur" :value="s.valeur">{{ s.libelle }}</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold" for="contact-message">Message</label>
                    <textarea id="contact-message" v-model="message" class="form-control" rows="7" required
                      minlength="10" :maxlength="longueurMax" aria-describedby="contact-compteur"
                      placeholder="Décrivez votre demande. Pour un trajet, indiquez sa date et les communes."></textarea>
                    <div id="contact-compteur" class="form-text text-end" :class="{ 'text-danger': restant < 100 }">
                      {{ restant }} caractères restants
                    </div>
                  </div>
                  <!-- Piège à robots : invisible et ignoré par les humains -->
                  <div class="contact-piege" aria-hidden="true">
                    <label for="contact-site">Ne pas remplir ce champ</label>
                    <input id="contact-site" v-model="site" type="text" tabindex="-1" autocomplete="off" />
                  </div>
                </div>

                <p class="small text-muted mt-3 mb-3">
                  <i class="bi bi-lock me-1"></i>Vos informations servent uniquement à vous répondre ; le message n'est pas conservé
                  sur le site. Voir la <router-link :to="{ name: 'privacy' }">politique de confidentialité</router-link>.
                </p>

                <button type="submit" class="btn btn-cm-primary px-4"
                  :disabled="envoi || !nom.trim() || !email.trim() || !sujet || !message.trim()">
                  <span v-if="envoi" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-send me-1"></i>Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
