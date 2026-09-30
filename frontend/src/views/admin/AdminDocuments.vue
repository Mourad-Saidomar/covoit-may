<script setup>
// ============================================================
// Documents de l'administration (PDF générés par le serveur)
// ------------------------------------------------------------
// Pour un mois choisi :
// - rapport d'activité : membres, trajets, réservations, finances,
//   qualité (avis, litiges), itinéraires les plus actifs ;
// - relevé des transactions : chaque paiement, pour la comptabilité ;
// - journal des actions des administrateurs (traçabilité, RG01.6).
// Les reçus d'un paiement se téléchargent depuis « Transactions ».
// ============================================================
import { ref, computed } from "vue";
import { useDataStore } from "@/stores/data";
import { messageErreur } from "@/utils/format";

const data = useDataStore();

// Les 18 derniers mois (la plateforme a ouvert en 2025)
const mois = computed(() => {
  const liste = [];
  const date = new Date();
  date.setDate(1);
  for (let i = 0; i < 18; i++) {
    const valeur = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    if (valeur < "2025-01") break;
    liste.push({ valeur, libelle: date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) });
    date.setMonth(date.getMonth() - 1);
  }
  return liste;
});
const moisChoisi = ref(mois.value[0].valeur);

const documents = [
  {
    type: "activite",
    icone: "bi-graph-up-arrow",
    titre: "Rapport d'activité",
    texte: "Nouveaux membres, demandes conducteur, trajets et taux de remplissage, réservations par statut, "
      + "encaissements et commission, avis, litiges, itinéraires les plus actifs.",
    usage: "Piloter la plateforme et suivre son évolution mois après mois.",
  },
  {
    type: "transactions",
    icone: "bi-receipt",
    titre: "Relevé des transactions",
    texte: "Chaque paiement du mois (référence, trajet, passager, moyen, statut, montant, commission, "
      + "part du conducteur), avec les totaux par statut.",
    usage: "Rapprochement comptable et contrôle des remboursements.",
  },
  {
    type: "journal",
    icone: "bi-journal-check",
    titre: "Journal des actions",
    texte: "Toutes les actions sensibles des administrateurs : suspensions, validations conducteur, "
      + "modération des avis, litiges, paramètres, avec l'adresse IP.",
    usage: "Traçabilité et contrôle interne (le journal n'est pas modifiable).",
  },
];

const enCours = ref("");
const erreur = ref("");

async function telecharger(type) {
  erreur.value = "";
  enCours.value = type;
  try {
    await data.telechargerDocumentAdmin(type, moisChoisi.value);
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    enCours.value = "";
  }
}
</script>

<template>
  <div id="admin-documents-page">
    <header class="admin-entete">
      <h1>Documents</h1>
      <p>Rapports mensuels en PDF, générés à partir des données de la base.</p>
    </header>

    <div v-if="erreur" class="alert alert-danger py-2" role="alert">{{ erreur }}</div>

    <section class="admin-panneau">
      <label class="form-label fw-semibold" for="doc-mois">Mois</label>
      <select id="doc-mois" v-model="moisChoisi" class="form-select w-auto">
        <option v-for="m in mois" :key="m.valeur" :value="m.valeur">{{ m.libelle }}</option>
      </select>
    </section>

    <section class="admin-panneau">
      <h2 class="admin-panneau-titre">Rapports du mois</h2>
      <div v-for="d in documents" :key="d.type" class="document-ligne">
        <span class="document-icone" aria-hidden="true"><i class="bi" :class="d.icone"></i></span>
        <div class="flex-grow-1">
          <div class="fw-semibold">{{ d.titre }}</div>
          <div class="small text-muted">{{ d.texte }}</div>
          <div class="small"><i class="bi bi-info-circle me-1 text-cm-primary"></i>{{ d.usage }}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-cm flex-shrink-0" :disabled="enCours === d.type"
          @click="telecharger(d.type)">
          <span v-if="enCours === d.type" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>PDF
        </button>
      </div>
    </section>
  </div>
</template>
