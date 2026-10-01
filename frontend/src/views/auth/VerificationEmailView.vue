<script>
// ============================================================
// Page « Vérifiez votre adresse email » (RG02.20, RG02.21)
// ------------------------------------------------------------
// Après l'inscription (ou une connexion avec un compte pas encore
// vérifié), la personne saisit le code à 6 chiffres reçu par email.
// Code valable 10 minutes, 5 essais. Un nouveau code peut être
// demandé toutes les 60 secondes. Code correct : connectée.
// Adresse : /verification-email?email=…
// ============================================================
import { useAuthStore } from '../../stores/auth'
import CodeVerification from '../../components/CodeVerification.vue'
import { messageErreur } from '../../utils/format'

const DELAI_RENVOI = 60

export default {
  name: 'VerificationEmailView',

  components: { CodeVerification },

  data() {
    return {
      email: String(this.$route.query.email || ''),
      code: '',
      erreur: '',
      information: this.$route.query.envoi === 'echec'
        ? 'L’envoi de l’email a échoué. Demandez un nouveau code.'
        : '',
      chargement: false,
      // Secondes avant de pouvoir redemander un code
      attente: this.$route.query.envoi === 'echec' ? 0 : DELAI_RENVOI,
      minuteur: null
    }
  },

  computed: {
    auth() {
      return useAuthStore()
    }
  },

  mounted() {
    if (!this.email) {
      this.$router.replace({ name: 'register' })
      return
    }
    this.lancerCompteARebours()
  },

  beforeUnmount() {
    clearInterval(this.minuteur)
  },

  methods: {
    lancerCompteARebours() {
      clearInterval(this.minuteur)
      this.minuteur = setInterval(() => {
        if (this.attente > 0) this.attente--
        else clearInterval(this.minuteur)
      }, 1000)
    },

    async valider() {
      if (this.code.length !== 6 || this.chargement) return
      this.erreur = ''
      this.chargement = true
      const resultat = await this.auth.verifierEmail(this.email, this.code)
      this.chargement = false
      if (resultat !== '') {
        this.erreur = resultat
        this.code = ''
        return
      }
      // Adresse vérifiée et connecté : direction son espace
      this.$router.push(this.auth.destinationApresConnexion())
    },

    async renvoyer() {
      this.erreur = ''
      this.information = ''
      try {
        const reponse = await this.auth.renvoyerCode(this.email)
        this.information = reponse.message
        this.code = ''
        this.attente = DELAI_RENVOI
        this.lancerCompteARebours()
      } catch (erreur) {
        this.erreur = messageErreur(erreur)
      }
    }
  }
}
</script>

<template>
  <section id="verification-page" class="auth-wrapper">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-5">
          <div class="card p-2">
            <div class="card-body p-4 text-center">
              <span class="auth-icone" aria-hidden="true"><i class="bi bi-envelope-check"></i></span>
              <h1 class="h4 fw-bold mt-3 mb-2">Vérifiez votre adresse email</h1>
              <p class="text-muted mb-4">
                Nous avons envoyé un code à 6 chiffres à<br />
                <strong class="text-dark">{{ email }}</strong>
              </p>

              <div v-if="erreur" class="alert alert-danger py-2 small text-start" role="alert">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
              </div>
              <div v-if="information" class="alert alert-info py-2 small text-start" role="status">
                <i class="bi bi-info-circle me-1"></i>{{ information }}
              </div>

              <form @submit.prevent="valider">
                <CodeVerification v-model="code" :desactive="chargement" @complet="valider" />
                <button type="submit" class="btn btn-cm-primary w-100 py-2 mt-4" :disabled="code.length !== 6 || chargement">
                  <span v-if="chargement" class="spinner-border spinner-border-sm me-1"></span>
                  Valider mon adresse
                </button>
              </form>

              <p class="small text-muted mt-4 mb-1">
                Le code est valable 10 minutes. Pensez à regarder dans vos courriers indésirables.
              </p>
              <button type="button" class="btn btn-link btn-sm" :disabled="attente > 0" @click="renvoyer">
                <i class="bi bi-arrow-clockwise me-1"></i>
                <template v-if="attente > 0">Renvoyer un code dans {{ attente }} s</template>
                <template v-else>Renvoyer un code</template>
              </button>

              <p class="small mt-3 mb-0">
                <router-link :to="{ name: 'login' }">Retour à la connexion</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
