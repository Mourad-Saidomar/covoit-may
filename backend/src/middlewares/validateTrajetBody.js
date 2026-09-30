// ============================================================
// Validation : publication, modification et recherche de trajets
// ============================================================
import { verifierCorps, verifierFiltres, texte, entier, nombre, booleen, date, heure, choix, listeDe, JOURS } from './validation.js'

const REGLES_TRAJET = {
  depart: texte({ max: 60 }),
  arrivee: texte({ max: 60 }),
  pointRdv: texte({ min: 3, max: 150 }),
  date: date(),
  heure: heure(),
  placesTotal: entier({ min: 1, max: 6 }),        // RG04.8
  prix: nombre({ min: 1, max: 10 }),              // RG04.7
  detourAccepte: booleen({ facultatif: true }),
  recurrent: booleen({ facultatif: true }),
  joursRecurrents: listeDe(JOURS, { facultatif: true }),
  description: texte({ max: 500, facultatif: true }),
  idVehicule: entier({ min: 1, facultatif: true })
}

export const validateTrajetBody = verifierCorps(REGLES_TRAJET)

// Modification : les mêmes champs, tous facultatifs
export const validateModificationTrajetBody = verifierCorps(REGLES_TRAJET, { partiel: true })

// Recherche : /api/trajets?depart=Combani&arrivee=Mamoudzou&date=2026-09-30&prixMax=4
export const validateRechercheTrajets = verifierFiltres({
  depart: texte({ max: 60 }),
  arrivee: texte({ max: 60 }),
  date: date(),
  heureMin: heure(),
  heureMax: heure(),
  prixMax: nombre({ min: 1, max: 10 }),
  places: entier({ min: 1, max: 6 }),
  detour: booleen(),
  verifies: booleen(),
  tri: choix(['depart', 'prix', 'note']),
  limite: entier({ min: 1, max: 100 })
})
