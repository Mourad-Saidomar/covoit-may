<script>
// ============================================================
// Page d'inscription
// ------------------------------------------------------------
// On choisit un rôle (passager ou conducteur), on remplit
// le formulaire, et le store auth crée le compte. Le compte n'a
// accès à rien tant que l'adresse email n'est pas vérifiée : on
// passe à la saisie du code à 6 chiffres reçu par email (RG02.20).
// ============================================================
import { useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'

export default {
  name: 'RegisterView',

  data() {
    return {
      // Le rôle peut être pré-choisi dans l'adresse (?role=conducteur)
      role: this.$route.query.role === 'conducteur' ? 'conducteur' : 'passager',
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      commune: '',
      motDePasse: '',
      confirmation: '',
      cguAcceptees: false,
      erreur: '',
      chargement: false
    }
  },

  computed: {
    auth() {
      return useAuthStore()
    },
    // La liste des communes de Mayotte (pour le menu déroulant)
    communes() {
      return useDataStore().communes
    },

    // Petite jauge qui indique si le mot de passe est solide
    forceMotDePasse() {
      const mdp = this.motDePasse
      if (mdp === '') {
        return { pct: 0, label: '', classe: '' }
      }
      // On compte les points : longueur, majuscule, chiffre, symbole
      let points = 0
      if (mdp.length >= 8) points = points + 1
      if (/[A-Z]/.test(mdp)) points = points + 1
      if (/[0-9]/.test(mdp)) points = points + 1
      if (/[^A-Za-z0-9]/.test(mdp)) points = points + 1

      const niveaux = [
        { pct: 25, label: 'Faible', classe: 'bg-danger' },
        { pct: 50, label: 'Moyen', classe: 'bg-warning' },
        { pct: 75, label: 'Bon', classe: 'bg-info' },
        { pct: 100, label: 'Excellent', classe: 'bg-success' }
      ]
      return niveaux[Math.max(0, points - 1)]
    }
  },

  methods: {
    // Quand on valide le formulaire
    async valider() {
      this.erreur = ''

      // Vérifications rapides (le serveur refait toutes les vérifications)
      if (this.motDePasse.length < 8 || !/[a-zA-Z]/.test(this.motDePasse) || !/[0-9]/.test(this.motDePasse)) {
        this.erreur = 'Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.'
        return
      }
      if (this.motDePasse !== this.confirmation) {
        this.erreur = 'Les deux mots de passe ne correspondent pas.'
        return
      }
      if (!this.cguAcceptees) {
        this.erreur = 'Vous devez accepter les conditions générales d\'utilisation.'
        return
      }

      this.chargement = true
      const resultat = await this.auth.creerCompte({
        role: this.role,
        prenom: this.prenom,
        nom: this.nom,
        email: this.email,
        telephone: this.telephone,
        commune: this.commune,
        motDePasse: this.motDePasse,
        cguAcceptees: this.cguAcceptees
      })
      this.chargement = false

      if (resultat.erreur) {
        this.erreur = resultat.erreur
        return
      }
      // Compte créé : on saisit le code reçu par email
      this.$router.push({
        name: 'verification-email',
        query: { email: resultat.email, envoi: resultat.emailEnvoye ? undefined : 'echec' }
      })
    }
  }
}
</script>

<template>
  <section id="register-page" class="auth-wrapper">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-10 col-lg-7">
          <div class="card p-2 reveal">
            <div class="card-body p-4">
              <div class="text-center mb-4">
                <span class="brand-logo fs-3">
                  <i class="bi bi-car-front-fill me-1"></i>Covoit'<span class="accent">May</span>
                </span>
                <h1 class="h5 mt-2 text-muted fw-normal">Créer votre compte</h1>
              </div>

              <!-- Choix du rôle : passager ou conducteur -->
              <div class="row g-2 mb-4">
                <div class="col-6">
                  <input id="role-passager" v-model="role" type="radio" class="btn-check"
                    value="passager" name="role" />
                  <label class="btn rounded-4 w-100 py-3"
                    :class="role === 'passager' ? 'btn-cm-primary' : 'btn-outline-cm'"
                    for="role-passager">
                    <i class="bi bi-person-walking d-block fs-3 mb-1"></i>
                    <span class="fw-semibold">Passager</span>
                    <small class="d-block opacity-75">Je cherche des trajets</small>
                  </label>
                </div>
                <div class="col-6">
                  <input id="role-conducteur" v-model="role" type="radio" class="btn-check"
                    value="conducteur" name="role" />
                  <label class="btn rounded-4 w-100 py-3"
                    :class="role === 'conducteur' ? 'btn-cm-primary' : 'btn-outline-cm'"
                    for="role-conducteur">
                    <i class="bi bi-car-front d-block fs-3 mb-1"></i>
                    <span class="fw-semibold">Conducteur</span>
                    <small class="d-block opacity-75">Je propose des trajets</small>
                  </label>
                </div>
              </div>

              <div v-if="role === 'conducteur'" class="alert alert-info py-2 small">
                <i class="bi bi-patch-check me-1"></i>
                Après l'inscription, envoyez votre véhicule, votre pièce d'identité et votre permis
                depuis votre profil : notre équipe les vérifie avant votre premier trajet.
              </div>

              <!-- Message d'erreur (si besoin) -->
              <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
              </div>

              <form id="register-form" @submit.prevent="valider">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-prenom">Prénom</label>
                    <input id="reg-prenom" v-model="prenom" class="form-control"
                      placeholder="Ex : Rachida" required autocomplete="given-name" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-nom">Nom</label>
                    <input id="reg-nom" v-model="nom" class="form-control"
                      placeholder="Ex : Attoumani" required autocomplete="family-name" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-email">Adresse email</label>
                    <input id="reg-email" v-model="email" type="email" class="form-control"
                      placeholder="vous@exemple.yt" required autocomplete="email" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-tel">Téléphone</label>
                    <input id="reg-tel" v-model="telephone" type="tel" class="form-control"
                      placeholder="0639 XX XX XX" required autocomplete="tel" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-commune">Commune</label>
                    <select id="reg-commune" v-model="commune" class="form-select" required>
                      <option value="" disabled>Choisir…</option>
                      <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-password">Mot de passe</label>
                    <input id="reg-password" v-model="motDePasse" type="password"
                      class="form-control" placeholder="8 caractères, lettres et chiffres" required
                      autocomplete="new-password" />
                    <!-- Jauge de robustesse du mot de passe -->
                    <div v-if="motDePasse" class="mt-1">
                      <div class="progress" style="height: 5px;">
                        <div class="progress-bar" :class="forceMotDePasse.classe"
                          :style="{ width: forceMotDePasse.pct + '%' }"></div>
                      </div>
                      <small class="text-muted">Robustesse : {{ forceMotDePasse.label }}</small>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold" for="reg-password2">Confirmation</label>
                    <input id="reg-password2" v-model="confirmation" type="password"
                      class="form-control" placeholder="Répétez le mot de passe" required
                      autocomplete="new-password" />
                  </div>
                </div>

                <div class="form-check mt-3">
                  <input id="reg-cgu" v-model="cguAcceptees" class="form-check-input" type="checkbox" />
                  <label class="form-check-label small" for="reg-cgu">
                    J'accepte les
                    <a href="/conditions-generales" target="_blank" rel="noopener">conditions générales d'utilisation</a>
                    et la
                    <a href="/confidentialite" target="_blank" rel="noopener">politique de confidentialité (RGPD)</a>.
                  </label>
                </div>

                <button type="submit" class="btn btn-cm-primary w-100 py-2 mt-3" :disabled="chargement">
                  <span v-if="chargement" class="spinner-border spinner-border-sm me-1"></span>
                  Créer mon compte
                </button>
              </form>

              <p class="text-center mt-4 mb-0 small">
                Déjà inscrit ?
                <router-link :to="{ name: 'login' }" class="fw-semibold">Connectez-vous</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
