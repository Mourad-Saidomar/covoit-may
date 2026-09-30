<script setup>
// ============================================================
// Suivi des transactions (BF-A07)
// Totaux (encaissé, commission, reversé, remboursé) puis la
// liste des paiements, tels qu'enregistrés dans la base.
// Aucune donnée de carte bancaire n'est stockée (RG06.6).
// Chaque ligne donne accès au reçu PDF du paiement ; les relevés
// mensuels sont dans « Documents ».
// ============================================================
import { ref, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import { formatDateTime, formatPrice, messageErreur, STATUT_PAIEMENT, MODES_PAIEMENT } from "@/utils/format";

const data = useDataStore();

const chargement = ref(true);
const erreur = ref("");
const transactions = ref([]);
const totals = ref({ encaisse: 0, commission: 0, reverseAuxConducteurs: 0, rembourse: 0 });
const recuEnCours = ref(null);

async function telechargerRecu(t) {
  erreur.value = "";
  recuEnCours.value = t.id;
  try {
    await data.telechargerRecu(t.reservationId);
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    recuEnCours.value = null;
  }
}

onMounted(async () => {
  try {
    const resultat = await data.transactions();
    transactions.value = resultat.transactions;
    totals.value = resultat.totaux;
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    chargement.value = false;
  }
});
</script>

<template>
  <div id="admin-transactions-page">
    <header class="admin-entete">
      <h1>Transactions</h1>
      <p>
        Paiements des réservations (paiement en ligne simulé dans cette démo).
        Relevé mensuel en PDF : <router-link :to="{ name: 'admin-documents' }">Documents</router-link>.
      </p>
    </header>

    <div v-if="erreur" class="alert alert-danger py-2" role="alert">{{ erreur }}</div>

    <section class="admin-chiffres" aria-label="Totaux">
      <div class="admin-chiffre">
        <div class="admin-chiffre-libelle">Volume encaissé</div>
        <div class="admin-chiffre-valeur">{{ formatPrice(totals.encaisse) }}</div>
      </div>
      <div class="admin-chiffre">
        <div class="admin-chiffre-libelle">Commission plateforme</div>
        <div class="admin-chiffre-valeur">{{ formatPrice(totals.commission) }}</div>
      </div>
      <div class="admin-chiffre">
        <div class="admin-chiffre-libelle">Reversé aux conducteurs</div>
        <div class="admin-chiffre-valeur">{{ formatPrice(totals.reverseAuxConducteurs) }}</div>
      </div>
      <div class="admin-chiffre">
        <div class="admin-chiffre-libelle">Remboursé</div>
        <div class="admin-chiffre-valeur">{{ formatPrice(totals.rembourse) }}</div>
      </div>
    </section>

    <section class="admin-panneau">
      <h2 class="admin-panneau-titre">Paiements</h2>

      <div v-if="chargement" aria-busy="true" aria-label="Chargement">
        <div v-for="n in 4" :key="n" class="squelette squelette-ligne mb-3"></div>
      </div>

      <div v-else class="table-responsive">
        <table class="table admin-table align-middle">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Trajet</th>
              <th>Passager</th>
              <th>Moyen</th>
              <th class="nombre">Montant</th>
              <th class="nombre">Commission</th>
              <th>Statut</th>
              <th>Encaissé le</th>
              <th><span class="visually-hidden">Reçu</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in transactions" :key="t.id">
              <td class="text-muted small">{{ t.reference }}</td>
              <td>{{ t.trajet }}</td>
              <td>{{ t.passager }}</td>
              <td class="small">{{ MODES_PAIEMENT[t.mode] }}</td>
              <td class="nombre fw-semibold">{{ formatPrice(t.montant) }}</td>
              <td class="nombre text-muted">{{ formatPrice(t.commission) }}</td>
              <td>
                <span class="badge" :class="STATUT_PAIEMENT[t.statut]?.class">{{ STATUT_PAIEMENT[t.statut]?.label }}</span>
              </td>
              <td class="text-muted small">
                {{ t.datePaiement ? formatDateTime(t.datePaiement) : "—" }}
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="recuEnCours === t.id"
                  :title="'Reçu ' + t.reference" :aria-label="'Télécharger le reçu ' + t.reference"
                  @click="telechargerRecu(t)">
                  <span v-if="recuEnCours === t.id" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-file-earmark-pdf"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
