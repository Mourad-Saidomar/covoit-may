<script>
// ============================================================
// Page « Mot de passe oublié » (RG02.21)
// ------------------------------------------------------------
// Étape 1 : l'adresse email -> un code à 6 chiffres est envoyé.
//   Le message est le même que le compte existe ou non : la page
//   ne révèle pas quelles adresses sont inscrites (RG13.8).
// Étape 2 : le code + le nouveau mot de passe -> connecté.
// ============================================================
import { useAuthStore } from '../../stores/auth'
import CodeVerification from '../../components/CodeVerification.vue'
import { messageErreur } from '../../utils/format'

const DELAI_RENVOI = 60

export default {
  name: 'MotDePasseOublieView',

  components: { CodeVerification },

  data() {
    return {
      etape: 'email', // 'email' puis 'code'
      email: String(this.$route.query.email || ''),
      code: '',
      motDePasse: '',
      confirmation: '',
      afficherMotDePasse: false,
      erreur: '',
      information: '',
      chargement: false,
      attente: 0,
      minuteur: null
    }
  },

  computed: {
    auth() {
      return useAuthStore()
    },
    motDePasseValable() {
      return this.motDePasse.length >= 8 && /[a-zA-Z]/.test(this.motDePasse) && /[0-9]/.test(this.motDePasse)
    }
  },

  beforeUnmount() {
    clearInterval(this.minuteur)
  },

  methods: {
    lancerCompteARebours() {
      this.attente = DELAI_RENVOI
      clearInterval(this.minuteur)
      this.minuteur = setInterval(() => {
        if (this.attente > 0) this.attente--
        else clearInterval(this.minuteur)
      }, 1000)
    },

    // Étape 1 : demander un code
    async demanderCode() {
      this.erreur = ''
      this.chargement = true
      try {
        const reponse = await this.auth.demanderReinitialisation(this.email)
        this.information = reponse.message
        this.etape = 'code'
        this.lancerCompteARebours()
      } catch (erreur) {
        this.erreur = messageErreur(erreur)
      } finally {
        this.chargement = false
      }
    },

    // Étape 2 : code + nouveau mot de passe
    async valider() {
      this.erreur = ''
      if (this.code.length !== 6) {
        this.erreur = 'Saisissez le code à 6 chiffres reçu par email.'
        return
      }
      if (!this.motDePasseValable) {
        this.erreur = 'Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.'
        return
      }
      if (this.motDePasse !== this.confirmation) {
        this.erreur = 'Les deux mots de passe ne correspondent pas.'
        return
      }
      this.chargement = true
      const resultat = await this.auth.reinitialiserMotDePasse(this.email, this.code, this.motDePasse)
      this.chargement = false
      if (resultat !== '') {
        this.erreur = resultat
        return
      }
      this.$router.push(this.auth.destinationApresConnexion())
    }
  }
}
</script>

<template>
  <section id="mot-de-passe-oublie-page" class="auth-wrapper">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-5">
          <div class="card p-2">
            <div class="card-body p-4">
              <div class="text-center">
                <span class="auth-icone" aria-hidden="true"><i class="bi bi-key"></i></span>
                <h1 class="h4 fw-bold mt-3 mb-2">Mot de passe oublié</h1>
                <p v-if="etape === 'email'" class="text-muted mb-4">
                  Indiquez votre adresse email : nous vous enverrons un code pour choisir un nouveau mot de passe.
                </p>
                <p v-else class="text-muted mb-4">
                  Saisissez le code envoyé à <strong class="text-dark">{{ email }}</strong>, puis votre nouveau mot de passe.
                </p>
              </div>

              <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
              </div>
              <div v-if="information && etape === 'code'" class="alert alert-info py-2 small" role="status">
                <i class="bi bi-info-circle me-1"></i>{{ information }}
              </div>

              <!-- Étape 1 : l'adresse -->
              <form v-if="etape === 'email'" @submit.prevent="demanderCode">
                <label class="form-label fw-semibold" for="oubli-email">Adresse email</label>
                <input id="oubli-email" v-model="email" type="email" class="form-control" required
                  autocomplete="email" placeholder="vous@exemple.yt" />
                <button type="submit" class="btn btn-cm-primary w-100 py-2 mt-3" :disabled="chargement">
                  <span v-if="chargement" class="spinner-border spinner-border-sm me-1"></span>
                  Recevoir un code
                </button>
              </form>

              <!-- Étape 2 : le code et le nouveau mot de passe -->
              <form v-else @submit.prevent="valider">
                <CodeVerification v-model="code" :desactive="chargement" />
                <div class="text-center mt-2">
                  <button type="button" class="btn btn-link btn-sm" :disabled="attente > 0 || chargement" @click="demanderCode">
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    <template v-if="attente > 0">Renvoyer un code dans {{ attente }} s</template>
                    <template v-else>Renvoyer un code</template>
                  </button>
                </div>
                <label class="form-label fw-semibold mt-3" for="oubli-mdp">Nouveau mot de passe</label>
                <div class="input-group">
                  <input id="oubli-mdp" v-model="motDePasse" :type="afficherMotDePasse ? 'text' : 'password'"
                    class="form-control" required autocomplete="new-password" placeholder="8 caractères, lettres et chiffres" />
                  <button type="button" class="btn btn-outline-secondary"
                    :aria-label="afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    @click="afficherMotDePasse = !afficherMotDePasse">
                    <i class="bi" :class="afficherMotDePasse ? 'bi-eye-slash' : 'bi-eye'"></i>
                  </button>
                </div>
                <label class="form-label fw-semibold mt-3" for="oubli-confirmation">Confirmation</label>
                <input id="oubli-confirmation" v-model="confirmation" :type="afficherMotDePasse ? 'text' : 'password'"
                  class="form-control" required autocomplete="new-password" />
                <button type="submit" class="btn btn-cm-primary w-100 py-2 mt-4" :disabled="chargement">
                  <span v-if="chargement" class="spinner-border spinner-border-sm me-1"></span>
                  Changer mon mot de passe
                </button>
                <button type="button" class="btn btn-link btn-sm w-100 mt-1" @click="etape = 'email'; erreur = ''">
                  Changer d'adresse email
                </button>
              </form>

              <p class="text-center small mt-3 mb-0">
                <router-link :to="{ name: 'login' }">Retour à la connexion</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
