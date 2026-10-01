// ============================================================
// Point d'entrée de l'application Covoit'May
// C'est le premier fichier JavaScript exécuté.
// ============================================================

// On importe les outils dont on a besoin
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import { surSessionFermee } from './services/api'
import { estConnecte } from './services/tempsReel'

// On importe Bootstrap (le CSS et le JavaScript)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// On importe notre feuille de style personnalisée
import './assets/main.css'

// On crée l'application Vue
const app = createApp(App)

// On branche Pinia (pour partager les données entre les pages)
app.use(createPinia())

// Si le serveur répond « 401 » alors qu'on était connecté (session
// expirée, compte suspendu…), on ferme la session et on explique
// pourquoi sur la page de connexion.
surSessionFermee(function (message) {
  const auth = useAuthStore()
  auth.fermerSession()
  auth.signalerFinDeSession(message)
  useDataStore().viderCompteurs()
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

// Avant d'afficher le site : on vérifie le jeton gardé (qui est
// connecté ?) et on charge les communes et le taux de commission.
const auth = useAuthStore()
const data = useDataStore()

// Pastilles de la barre de navigation : mises à jour en direct par le
// temps réel ; sans lui (connexion impossible), toutes les 30 secondes
data.ecouterTempsReel()
setInterval(function () {
  if (auth.estMembre && !estConnecte()) data.chargerCompteurs()
}, 30000)

Promise.all([auth.initialiser(), data.chargerReferences()]).finally(function () {
  // On branche le routeur (pour naviguer entre les pages)
  app.use(router)
  // On affiche l'application dans la balise <div id="app"> du index.html
  app.mount('#app')
})
