// ============================================================
// Validation : véhicule et demande pour devenir conducteur
// ============================================================
import { verifierCorps, verifierFiltres, texte, entier, choix } from './validation.js'

// Format SIV français : AA-123-AA (RG03.5). Les minuscules sont acceptées
// ici, la base les passe en majuscules.
const IMMATRICULATION = /^[A-Za-z]{2}-?[0-9]{3}-?[A-Za-z]{2}$/

// Remet les tirets : "ab123cd" -> "AB-123-CD"
function normaliserImmatriculation(regle) {
  return {
    facultatif: regle.facultatif,
    verifier(v) {
      const r = regle.verifier(v)
      if (r.erreur) return r
      const brut = r.valeur.replace(/-/g, '').toUpperCase()
      return { valeur: brut.slice(0, 2) + '-' + brut.slice(2, 5) + '-' + brut.slice(5) }
    }
  }
}

const REGLES_VEHICULE = {
  marque: texte({ max: 50 }),
  modele: texte({ max: 50 }),
  couleur: texte({ max: 30, facultatif: true }),
  immatriculation: normaliserImmatriculation(texte({ max: 10, motif: IMMATRICULATION, message: 'doit suivre le format AA-123-AA' })),
  nbPlaces: entier({ min: 1, max: 8 })
}

export const validateVehiculeBody = verifierCorps(REGLES_VEHICULE)

// Demande conducteur : mêmes champs que le véhicule (envoyés en
// multipart avec les deux fichiers, d'où les nombres en texte)
export const validateDemandeConducteurBody = verifierCorps(REGLES_VEHICULE)

// Administrateur : refus motivé d'une demande (RG08.6)
export const validateRefusBody = verifierCorps({
  motif: texte({ min: 5, max: 500 })
})

export const validateFiltreDemandes = verifierFiltres({
  statut: choix(['en_attente', 'acceptee', 'refusee'])
})
