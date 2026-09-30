// ============================================================
// Fin du chargement des données (squelettes)
// ------------------------------------------------------------
// Pendant qu'une page attend la réponse de l'API, elle affiche
// des « squelettes » (formes grises animées). Quand les données
// arrivent, le vrai contenu apparaît : ses éléments .reveal
// doivent alors être surveillés pour s'animer au défilement.
// ============================================================
import { nextTick } from 'vue'
import { activerReveal } from '../reveal.js'

// À appeler juste après avoir mis chargement = false
export function revelerApresChargement() {
  nextTick(activerReveal)
}
