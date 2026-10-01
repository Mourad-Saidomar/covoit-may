<script>
// ============================================================
// Page de connexion
// ------------------------------------------------------------
// L'utilisateur entre son email et son mot de passe.
// Le store auth vérifie et renvoie :
// - '' (texte vide)              -> connexion réussie
// - { message, code, email }     -> une erreur à afficher ; si l'adresse
//   email n'est pas encore vérifiée, on va saisir le code reçu (RG02.20)
// ============================================================
import { useAuthStore } from '../../stores/auth'

export default {
  name: 'LoginView',

  data() {
    return {
      email: '',
      motDePasse: '',
      erreur: '',              // le message d'erreur à afficher
      afficherMotDePasse: false,
      chargement: false        // true pendant la connexion
    }
  },

  computed: {
    auth() {
      return useAuthStore()
    }
  },

  // Si la session a été fermée automatiquement (compte suspendu ou
  // supprimé pendant la navigation), on affiche la raison ici.
  mounted() {
    const message = this.auth.consommerMessageSession()
    if (message !== '') {
      this.erreur = message
    }
  },

  methods: {
    // Quand on valide le formulaire : le serveur vérifie le mot de passe
    async valider() {
      this.erreur = ''
      this.chargement = true

      // seConnecter renvoie '' si tout va bien, sinon l'erreur du serveur
      // (mot de passe faux, compte suspendu, trop de tentatives…)
      const resultat = await this.auth.seConnecter(this.email, this.motDePasse)
      this.chargement = false

      if (resultat !== '') {
        // Adresse pas encore vérifiée : un code vient d'être envoyé, on va le saisir
        if (resultat.code === 'EMAIL_NON_VERIFIE') {
          this.$router.push({ name: 'verification-email', query: { email: resultat.email } })
          return
        }
        this.erreur = resultat.message
        return
      }

      // Connexion réussie : où va-t-on ?
      this.$router.push(this.destinationApresConnexion())
    },

    // On repart vers la page demandée avant la connexion, MAIS
    // seulement si le rôle de la personne y a droit. Sinon on
    // l'emmène directement dans son propre espace : personne
    // n'atterrit sur un « accès refusé » juste après s'être connecté.
    destinationApresConnexion() {
      const redirection = this.$route.query.redirect
      if (!redirection) {
        return this.auth.destinationApresConnexion()
      }

      const cible = this.$router.resolve(redirection)
      const adresseConnue =
        cible.matched.length > 0 && cible.name !== 'not-found'
      if (adresseConnue && this.auth.aAcces(cible.meta)) {
        return cible.fullPath
      }
      return this.auth.destinationApresConnexion()
    }
  }
}
</script>

<template>
  <section id="login-page" class="auth-wrapper">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-5">
          <div class="card p-2 reveal reveal-zoom">
            <div class="card-body p-4">
              <div class="text-center mb-4">
                <span class="brand-logo fs-3">
                  <i class="bi bi-car-front-fill me-1"></i>Covoit'<span class="accent">May</span>
                </span>
                <h1 class="h5 mt-2 text-muted fw-normal">Connexion à votre compte</h1>
              </div>

              <!-- Message d'erreur (si besoin) -->
              <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
              </div>

              <form id="login-form" @submit.prevent="valider">
                <div class="mb-3">
                  <label class="form-label fw-semibold" for="login-email">Adresse email</label>
                  <div class="input-group">
                    <span class="input-group-text bg-white"><i class="bi bi-envelope"></i></span>
                    <input id="login-email" v-model="email" type="email" class="form-control"
                      placeholder="vous@exemple.yt" required autocomplete="email" />
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold" for="login-password">Mot de passe</label>
                  <div class="input-group">
                    <span class="input-group-text bg-white"><i class="bi bi-lock"></i></span>
                    <input id="login-password" v-model="motDePasse"
                      :type="afficherMotDePasse ? 'text' : 'password'" class="form-control"
                      placeholder="••••••••" required autocomplete="current-password" />
                    <button type="button" class="btn btn-outline-secondary"
                      :aria-label="afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                      @click="afficherMotDePasse = !afficherMotDePasse">
                      <i class="bi" :class="afficherMotDePasse ? 'bi-eye-slash' : 'bi-eye'"></i>
                    </button>
                  </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="form-check">
                    <input id="remember-me" class="form-check-input" type="checkbox" />
                    <label class="form-check-label small" for="remember-me">Se souvenir de moi</label>
                  </div>
                  <router-link :to="{ name: 'mot-de-passe-oublie', query: email ? { email } : {} }" class="small">
                    Mot de passe oublié ?
                  </router-link>
                </div>

                <button type="submit" class="btn btn-cm-primary w-100 py-2" :disabled="chargement">
                  <span v-if="chargement" class="spinner-border spinner-border-sm me-1"></span>
                  Se connecter
                </button>
              </form>

              <p class="text-center mt-4 mb-0 small">
                Pas encore de compte ?
                <router-link :to="{ name: 'register' }" class="fw-semibold">Inscrivez-vous</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
