// ============================================================
// Service UTILISATEUR : profil, mot de passe, suppression du
// compte, et gestion des comptes par l'administrateur
// ============================================================
import bcrypt from 'bcryptjs'
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import { COUT_BCRYPT } from './authService.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import * as trajetModel from '../models/trajetModel.js'
import * as reservationModel from '../models/reservationModel.js'
import * as alerteModel from '../models/alerteModel.js'
import * as favoriModel from '../models/favoriModel.js'
import * as demandeModel from '../models/demandeConducteurModel.js'
import * as journalModel from '../models/journalModel.js'

// Profil public : prénom, initiale, note… jamais email ni téléphone (RG02.15)
export async function profilPublic(id) {
  const ligne = await utilisateurModel.profilPublic(id)
  if (!ligne) throw new ErreurApi(404, 'Profil introuvable.')
  const profil = utilisateurModel.versProfilPublic(ligne)
  const trajets = await trajetModel.listerAVenirDuConducteur(id)
  profil.trajetsAVenir = trajets.map(trajetModel.versTrajet)
  return profil
}

export async function monProfil(id) {
  return utilisateurModel.versUtilisateur(await utilisateurModel.trouverParId(id))
}

export async function modifierProfil(id, champs) {
  await utilisateurModel.modifierProfil(id, champs)
  return monProfil(id)
}

export async function changerMotDePasse(id, ancien, nouveau) {
  const empreinte = await utilisateurModel.lireEmpreinte(id)
  if (!(await bcrypt.compare(ancien, empreinte))) {
    throw new ErreurApi(400, 'L’ancien mot de passe est incorrect.')
  }
  await utilisateurModel.modifierMotDePasse(id, await bcrypt.hash(nouveau, COUT_BCRYPT))
}

// Droit à l'effacement (RGPD) : tout ce qui est en cours est annulé, les
// données personnelles sont effacées, l'historique comptable est gardé
// sous un nom anonyme (RG02.14).
export async function supprimerMonCompte(id, motDePasse) {
  const empreinte = await utilisateurModel.lireEmpreinte(id)
  if (!(await bcrypt.compare(motDePasse, empreinte))) {
    throw new ErreurApi(400, 'Mot de passe incorrect : le compte n’a pas été supprimé.')
  }
  if (await demandeModel.aUneDemandeEnAttente(id)) {
    throw new ErreurApi(409, 'Votre demande conducteur est en cours d’examen : attendez la décision avant de supprimer votre compte.')
  }
  await transaction(async function (cx) {
    // Mes trajets ouverts : annulés, passagers remboursés
    const trajets = await trajetModel.listerOuvertsDuConducteur(id, cx)
    for (const t of trajets) {
      await reservationModel.annulerActivesDuTrajet(t.id_trajet, 'conducteur', cx)
      await trajetModel.annuler(t.id_trajet, cx)
    }
    // Mes réservations en cours : annulées
    await reservationModel.annulerActivesDuPassager(id, 'passager', cx)
    await alerteModel.supprimerToutes(id, cx)
    await favoriModel.supprimerTous(id, cx)
    await utilisateurModel.anonymiser(id, cx)
  })
}

// ---------- Administrateur ----------

export async function lister(filtres) {
  const lignes = await utilisateurModel.lister(filtres)
  return lignes.map(utilisateurModel.versUtilisateur)
}

// Suspendre (ou réactiver) un compte. Une suspension annule les trajets
// ouverts et les réservations en cours de la personne.
export async function changerStatut(admin, id, statut, motif, ip) {
  const utilisateur = await utilisateurModel.trouverParId(id)
  if (!utilisateur) throw new ErreurApi(404, 'Utilisateur introuvable.')
  const actuel = utilisateur.statut_compte
  const permis = (actuel === 'actif' && statut === 'suspendu') || (actuel === 'suspendu' && statut === 'actif')
  if (!permis) {
    throw new ErreurApi(409, `Impossible de passer un compte « ${actuel} » au statut « ${statut} ».`)
  }

  await transaction(async function (cx) {
    if (statut === 'suspendu') {
      const trajets = await trajetModel.listerOuvertsDuConducteur(id, cx)
      for (const t of trajets) {
        await reservationModel.annulerActivesDuTrajet(t.id_trajet, 'admin', cx)
        await trajetModel.annuler(t.id_trajet, cx)
      }
      await reservationModel.annulerActivesDuPassager(id, 'admin', cx)
    }
    await utilisateurModel.changerStatut(id, statut, cx)
    await journalModel.ajouter({
      idAdmin: admin.id,
      action: statut === 'suspendu' ? 'SUSPENSION_COMPTE' : 'REACTIVATION_COMPTE',
      tableCible: 'utilisateur',
      idCible: id,
      details: motif,
      ip
    }, cx)
  })
  return monProfil(id)
}
