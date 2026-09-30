<script setup>
// ============================================================
// Liste des demandes conducteur en attente (tableau de bord et
// page Utilisateurs). L'administrateur ouvre les justificatifs,
// puis accepte ou refuse avec un motif (RG08.5, RG08.6).
// ============================================================
import { ref, reactive } from "vue";
import { useDataStore } from "@/stores/data";
import { formatDate, messageErreur } from "@/utils/format";

const props = defineProps({
  demandes: { type: Array, required: true },
});
const emit = defineEmits(["traitee"]);

const data = useDataStore();
const erreur = ref("");
const enCours = ref(null);
// Le motif de refus tapé pour chaque demande
const motifs = reactive({});
const refusOuvert = reactive({});

async function voir(demande, type) {
  erreur.value = "";
  try {
    await data.voirJustificatif(demande.id, type);
  } catch (e) {
    erreur.value = messageErreur(e);
  }
}

async function traiter(demande, accepte) {
  erreur.value = "";
  enCours.value = demande.id;
  try {
    if (accepte) {
      await data.accepterDemandeConducteur(demande.id);
    } else {
      await data.refuserDemandeConducteur(demande.id, motifs[demande.id]);
    }
    emit("traitee");
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    enCours.value = null;
  }
}
</script>

<template>
  <div>
    <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">{{ erreur }}</div>
    <div v-for="d in props.demandes" :key="d.id" class="admin-ligne">
      <div class="admin-ligne-texte">
        <strong>{{ d.utilisateur.prenom }} {{ d.utilisateur.nom }}</strong>
        <template v-if="d.utilisateur.role === 'conducteur'">, nouveau conducteur</template>
        <template v-else> (passager) demande à devenir conducteur</template>
        <div class="small text-muted">
          {{ d.vehicule.marque }} {{ d.vehicule.modele }}
          <template v-if="d.vehicule.couleur">{{ d.vehicule.couleur }}</template>
          · {{ d.vehicule.immatriculation }} · {{ d.vehicule.nbPlaces }} places ·
          demande du {{ formatDate(d.date) }}
        </div>
        <button type="button" class="admin-justificatif btn btn-link p-0 me-2" @click="voir(d, 'identite')">
          <i class="bi bi-person-vcard"></i>Pièce d'identité
        </button>
        <button type="button" class="admin-justificatif btn btn-link p-0" @click="voir(d, 'permis')">
          <i class="bi bi-card-heading"></i>Permis de conduire
        </button>
        <form v-if="refusOuvert[d.id]" class="d-flex gap-2 mt-2" @submit.prevent="traiter(d, false)">
          <input v-model="motifs[d.id]" class="form-control form-control-sm"
            placeholder="Motif du refus (obligatoire)" aria-label="Motif du refus" required minlength="5" />
          <button type="submit" class="btn btn-sm btn-danger" :disabled="enCours === d.id">Refuser</button>
          <button type="button" class="btn btn-sm btn-link text-muted" @click="refusOuvert[d.id] = false">Annuler</button>
        </form>
      </div>
      <div v-if="!refusOuvert[d.id]" class="admin-ligne-actions">
        <button class="btn btn-sm btn-cm-primary" :disabled="enCours === d.id" @click="traiter(d, true)">
          <i class="bi bi-patch-check me-1"></i>Valider l'identité
        </button>
        <button class="btn btn-sm btn-outline-danger" @click="refusOuvert[d.id] = true">Refuser</button>
      </div>
    </div>
  </div>
</template>
