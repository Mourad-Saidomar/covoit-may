<script setup>
// ============================================================
// Gestion des litiges (BF-A05)
// Chaque litige : qui l'a ouvert, le trajet et le montant, le
// motif. L'administrateur le prend en charge, puis rend une
// décision motivée (RG10.4, RG10.5). Un remboursement total
// rembourse le paiement ; un remboursement partiel ne peut pas
// dépasser le montant de la réservation (RG10.6).
// ============================================================
import { ref, reactive, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import { formatDateTime, formatPrice, messageErreur, DECISIONS_LITIGE } from "@/utils/format";

const data = useDataStore();

const litiges = ref([]);
const erreur = ref("");
const chargement = ref(true);
// La décision en cours de saisie pour chaque litige
const decisions = reactive({});

async function charger() {
  try {
    litiges.value = await data.tousLesLitiges();
    // Un formulaire de décision vide pour chaque litige non résolu
    litiges.value.forEach((l) => {
      if (l.statut !== "resolu" && !decisions[l.id]) {
        decisions[l.id] = { decision: "avertissement", resolution: "", montant: null };
      }
    });
    erreur.value = "";
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    chargement.value = false;
  }
  data.chargerCompteursAdmin();
}
onMounted(charger);

async function agir(action) {
  erreur.value = "";
  try {
    await action();
    await charger();
  } catch (e) {
    erreur.value = messageErreur(e);
  }
}

function prendreEnCharge(litige) {
  agir(() => data.prendreEnChargeLitige(litige.id));
}

function resoudre(litige) {
  const f = decisions[litige.id];
  agir(() =>
    data.resoudreLitige(
      litige.id,
      f.decision,
      f.resolution.trim(),
      f.decision === "remboursement_partiel" ? f.montant : undefined,
    ),
  );
}

const STATUTS = {
  ouvert: { label: "Ouvert", class: "bg-danger" },
  en_cours: { label: "En cours", class: "bg-warning text-dark" },
  resolu: { label: "Résolu", class: "bg-success" },
};
</script>

<template>
  <div id="admin-disputes-page">
    <header class="admin-entete">
      <h1>Litiges</h1>
      <p>Arbitrez les désaccords entre passagers et conducteurs.</p>
    </header>

    <div v-if="erreur" class="alert alert-danger py-2" role="alert">{{ erreur }}</div>

    <section v-if="chargement" class="admin-panneau" aria-busy="true">
      <div class="squelette squelette-ligne w-50 mb-2"></div>
      <div class="squelette squelette-ligne w-75"></div>
    </section>

    <section v-else-if="litiges.length === 0" class="admin-panneau">
      <p class="admin-vide">Aucun litige.</p>
    </section>

    <section
      v-for="d in litiges"
      :key="d.id"
      class="admin-panneau"
      :class="{ 'admin-panneau-urgent': d.statut !== 'resolu' }"
    >
      <h2 class="admin-panneau-titre">
        Litige n° {{ d.id }}
        <span class="badge" :class="STATUTS[d.statut]?.class">{{ STATUTS[d.statut]?.label }}</span>
      </h2>
      <p class="small text-muted mb-2">
        Ouvert par {{ d.demandeur }} le {{ formatDateTime(d.date) }}, pour le trajet
        {{ d.trajet }} (réservation n° {{ d.reservationId }}, {{ formatPrice(d.montant) }}).
      </p>
      <blockquote class="mb-3 ps-3 border-start border-3">
        <strong>{{ d.motif }}</strong>
        <div v-if="d.description" class="small text-muted">{{ d.description }}</div>
      </blockquote>

      <!-- 1. Prise en charge -->
      <button v-if="d.statut === 'ouvert'" class="btn btn-sm btn-outline-cm mb-3" @click="prendreEnCharge(d)">
        <i class="bi bi-person-check me-1"></i>Prendre en charge
      </button>

      <!-- 2. Décision -->
      <form v-if="d.statut !== 'resolu'" class="row g-2 align-items-end" @submit.prevent="resoudre(d)">
        <div class="col-md-3">
          <label class="form-label small" :for="'decision-' + d.id">Décision</label>
          <select :id="'decision-' + d.id" v-model="decisions[d.id].decision" class="form-select form-select-sm">
            <option v-for="(libelle, cle) in DECISIONS_LITIGE" :key="cle" :value="cle">{{ libelle }}</option>
          </select>
        </div>
        <div v-if="decisions[d.id].decision === 'remboursement_partiel'" class="col-md-2">
          <label class="form-label small" :for="'montant-' + d.id">Montant (€)</label>
          <input :id="'montant-' + d.id" v-model.number="decisions[d.id].montant" type="number"
            min="0.5" :max="d.montant" step="0.5" class="form-control form-control-sm" required />
        </div>
        <div class="col">
          <label class="form-label small" :for="'resolution-' + d.id">Explication</label>
          <input :id="'resolution-' + d.id" v-model="decisions[d.id].resolution"
            class="form-control form-control-sm" placeholder="Explication donnée aux deux parties"
            required minlength="5" maxlength="1000" />
        </div>
        <div class="col-auto">
          <button type="submit" class="btn btn-sm btn-cm-primary">Marquer comme résolu</button>
        </div>
      </form>
      <p v-else class="mb-0">
        <strong>Décision :</strong> {{ DECISIONS_LITIGE[d.decision] }}
        <template v-if="d.montantRembourse"> ({{ formatPrice(d.montantRembourse) }})</template>
        — {{ d.resolution }}
      </p>
    </section>
  </div>
</template>
