<script setup>
// ============================================================
// Modération des avis (BF-A03)
// Les avis signalés d'abord (masqués du public en attendant la
// décision), puis tous les avis publiés. Chaque action est
// tracée dans le journal des administrateurs (RG01.6).
// ============================================================
import { ref, computed, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import { initialesTexte, timeAgo, messageErreur } from "@/utils/format";
import StarRating from "@/components/StarRating.vue";

const data = useDataStore();
const tousLesAvis = ref([]);
const erreur = ref("");
const chargement = ref(true);

const reported = computed(() => tousLesAvis.value.filter((r) => r.signale));
const others = computed(() => tousLesAvis.value.filter((r) => !r.signale));

async function charger() {
  try {
    tousLesAvis.value = await data.tousLesAvis();
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

function restaurer(avis) {
  agir(() => data.restaurerAvis(avis.id));
}

function supprimer(avis) {
  if (!confirm("Supprimer définitivement cet avis ?")) return;
  agir(() => data.supprimerAvis(avis.id));
}
</script>

<template>
  <div id="admin-moderation-page">
    <header class="admin-entete">
      <h1>Modération des avis</h1>
      <p>Restaurez ou supprimez les avis signalés par les membres.</p>
    </header>

    <div v-if="erreur" class="alert alert-danger py-2" role="alert">{{ erreur }}</div>

    <section class="admin-panneau" :class="{ 'admin-panneau-urgent': reported.length > 0 }">
      <h2 class="admin-panneau-titre">
        Avis signalés
        <span class="text-muted">{{ reported.length }}</span>
      </h2>
      <div v-if="chargement" class="squelette squelette-ligne w-75" aria-busy="true"></div>
      <p v-else-if="reported.length === 0" class="admin-vide">Aucun avis signalé.</p>
      <div v-for="r in reported" :key="r.id" class="admin-ligne">
        <div class="admin-ligne-texte">
          <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span class="avatar avatar-sm">{{ initialesTexte(r.auteur) }}</span>
            <strong>{{ r.auteur }}</strong>
            <span class="text-muted">sur {{ r.cible }} · {{ r.trajet }}</span>
            <StarRating :note="r.note" small />
            <span class="small text-muted">{{ timeAgo(r.date) }}</span>
          </div>
          <p class="mb-1">{{ r.commentaire }}</p>
          <p class="small text-danger mb-0">
            <i class="bi bi-flag-fill me-1"></i>Motif du signalement : {{ r.motifSignalement }}
          </p>
        </div>
        <div class="admin-ligne-actions">
          <button class="btn btn-sm btn-outline-cm" @click="restaurer(r)">Restaurer</button>
          <button class="btn btn-sm btn-danger" @click="supprimer(r)">Supprimer définitivement</button>
        </div>
      </div>
    </section>

    <section class="admin-panneau">
      <h2 class="admin-panneau-titre">
        Avis publiés
        <span class="text-muted">{{ others.length }}</span>
      </h2>
      <div v-for="r in others" :key="r.id" class="admin-ligne">
        <div class="admin-ligne-texte">
          <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span class="avatar avatar-sm">{{ initialesTexte(r.auteur) }}</span>
            <strong>{{ r.auteur }}</strong>
            <span class="text-muted">sur {{ r.cible }} · {{ r.trajet }}</span>
            <StarRating :note="r.note" small />
            <span class="small text-muted">{{ timeAgo(r.date) }}</span>
          </div>
          <p class="mb-0">{{ r.commentaire }}</p>
        </div>
        <div class="admin-ligne-actions">
          <button class="btn btn-sm btn-outline-danger" @click="supprimer(r)">Supprimer</button>
        </div>
      </div>
    </section>
  </div>
</template>
