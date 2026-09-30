// ============================================================
// Service VÉHICULE
// ============================================================
import { ErreurApi } from '../middlewares/errorHandler.js'
import * as vehiculeModel from '../models/vehiculeModel.js'

export async function mesVehicules(idUtilisateur) {
  const lignes = await vehiculeModel.listerParProprietaire(idUtilisateur)
  return lignes.map(vehiculeModel.versVehicule)
}

// Un conducteur vérifié ajoute un autre véhicule
export async function ajouter(utilisateur, donnees) {
  if (!utilisateur.verifie) {
    throw new ErreurApi(403, 'Votre identité doit être vérifiée avant d’ajouter un véhicule.')
  }
  const id = await vehiculeModel.creer(donnees, utilisateur.id)
  return vehiculeModel.versVehicule(await vehiculeModel.trouverParId(id))
}

// Un véhicule n'est jamais supprimé : il est désactivé (RG03.7)
export async function desactiver(idUtilisateur, id) {
  const vehicule = await vehiculeModel.trouverParId(id)
  // Même réponse si le véhicule n'existe pas ou n'est pas le sien :
  // on ne révèle pas les véhicules des autres
  if (!vehicule || vehicule.id_utilisateur !== idUtilisateur) {
    throw new ErreurApi(404, 'Véhicule introuvable.')
  }
  if (await vehiculeModel.estUtiliseParUnTrajetOuvert(id)) {
    throw new ErreurApi(409, 'Ce véhicule est prévu pour un trajet ouvert : annulez ou modifiez d’abord ce trajet.')
  }
  await vehiculeModel.desactiver(id)
}
