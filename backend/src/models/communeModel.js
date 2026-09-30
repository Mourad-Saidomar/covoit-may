// ============================================================
// Modèle COMMUNE (liste de référence des communes de Mayotte)
// ============================================================
import { requete } from '../config/db.js'

export async function lister() {
  const lignes = await requete('SELECT nom, latitude, longitude FROM commune ORDER BY nom')
  return lignes.map((l) => ({ nom: l.nom, coordonnees: [l.latitude, l.longitude] }))
}
