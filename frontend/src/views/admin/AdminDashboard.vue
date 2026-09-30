<script setup>
// ============================================================
// Tableau de bord de l'administration
// ------------------------------------------------------------
// 1. À traiter : conducteurs à valider, avis signalés, litiges
// 2. Chiffres clés de la plateforme (BF-A04)
// 3. Itinéraires les plus publiés et dernières réservations
// ============================================================
import { ref, computed, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import {
  formatPrice,
  formatDateLong,
  messageErreur,
  STATUT_PAIEMENT,
} from "@/utils/format";
import DemandesConducteur from "@/components/admin/DemandesConducteur.vue";

const data = useDataStore();

// Squelettes affichés pendant l'appel à l'API
const chargement = ref(true);
const erreur = ref("");
const tableau = ref(null);
const demandes = ref([]);
const transactions = ref([]);

async function charger() {
  try {
    const [t, d, p] = await Promise.all([
      data.tableauDeBord(),
      data.demandesConducteur("en_attente"),
      data.transactions(),
    ]);
    tableau.value = t;
    demandes.value = d;
    transactions.value = p.transactions;
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    chargement.value = false;
  }
}
onMounted(charger);

const aujourdhui = formatDateLong(new Date().toISOString());

// ---- À traiter ----
const avisSignales = computed(() => (tableau.value ? tableau.value.aTraiter.avisSignales : 0));
const litigesOuverts = computed(() => (tableau.value ? tableau.value.aTraiter.litiges : 0));
const rienATraiter = computed(
  () =>
    demandes.value.length === 0 &&
    avisSignales.value === 0 &&
    litigesOuverts.value === 0,
);

// ---- Chiffres clés (calculés par la base) ----
const chiffres = computed(() => {
  const t = tableau.value;
  if (!t) return [];
  return [
    { libelle: "Membres", valeur: t.utilisateurs },
    { libelle: "Trajets publiés", valeur: t.trajets },
    { libelle: "Réservations", valeur: t.reservations },
    { libelle: "Volume encaissé", valeur: formatPrice(t.volumePaye) },
    {
      libelle: "Commission (" + Math.round(data.commission * 100) + " %)",
      valeur: formatPrice(t.commission),
    },
    { libelle: "Avis publiés", valeur: t.avisPublies },
  ];
});

// ---- Itinéraires les plus publiés (barres) ----
const itineraires = computed(() => {
  const liste = tableau.value ? tableau.value.itinerairesPopulaires : [];
  const max = Math.max(1, ...liste.map((i) => i.nb));
  // largeur de chaque barre en % de la plus grande
  return liste.map((i) => ({ nom: i.itineraire, nombre: i.nb, largeur: (i.nb / max) * 100 }));
});

// ---- Dernières transactions ----
const dernieresTransactions = computed(() => transactions.value.slice(0, 5));
</script>

<template>
  <div id="admin-dashboard-page">
    <header class="admin-entete">
      <h1>Tableau de bord</h1>
      <p>État de la plateforme, {{ aujourdhui }}.</p>
    </header>

    <!-- Squelette pendant le chargement -->
    <div v-if="chargement" aria-busy="true" aria-label="Chargement">
      <div class="admin-panneau">
        <div class="squelette squelette-ligne w-25 mb-3"></div>
        <div class="squelette squelette-ligne w-75 mb-2"></div>
        <div class="squelette squelette-ligne w-50"></div>
      </div>
      <div class="admin-chiffres">
        <div v-for="n in 6" :key="n" class="admin-chiffre">
          <div class="squelette squelette-ligne w-50 mb-2"></div>
          <div class="squelette squelette-ligne squelette-grande w-75"></div>
        </div>
      </div>
      <div class="row g-4">
        <div v-for="n in 2" :key="n" class="col-xl-6">
          <div class="admin-panneau">
            <div class="squelette squelette-ligne w-50 mb-3"></div>
            <div
              v-for="l in 4"
              :key="l"
              class="squelette squelette-ligne mb-2"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="erreur" class="alert alert-danger" role="alert">{{ erreur }}</div>

    <template v-else>
      <!-- 1. À traiter -->
      <section class="admin-panneau admin-panneau-urgent">
        <h2 class="admin-panneau-titre">À traiter</h2>
        <p v-if="rienATraiter" class="admin-vide">
          Rien à traiter pour le moment.
        </p>

        <!-- Demandes conducteur (nouveaux inscrits et passagers) -->
        <DemandesConducteur :demandes="demandes" @traitee="charger" />

        <div v-if="avisSignales > 0" class="admin-ligne">
          <div class="admin-ligne-texte">
            <strong>{{ avisSignales }} avis signalé{{ avisSignales > 1 ? "s" : "" }}</strong>
            à vérifier
          </div>
          <router-link
            :to="{ name: 'admin-moderation' }"
            class="btn btn-sm btn-outline-cm"
            >Modérer</router-link
          >
        </div>
        <div v-if="litigesOuverts > 0" class="admin-ligne">
          <div class="admin-ligne-texte">
            <strong>{{ litigesOuverts }} litige{{ litigesOuverts > 1 ? "s" : "" }} ouvert{{ litigesOuverts > 1 ? "s" : "" }}</strong>
            entre un passager et un conducteur
          </div>
          <router-link
            :to="{ name: 'admin-disputes' }"
            class="btn btn-sm btn-outline-cm"
            >Traiter</router-link
          >
        </div>
      </section>

      <!-- 2. Chiffres clés -->
      <section class="admin-chiffres" aria-label="Chiffres clés">
        <div v-for="c in chiffres" :key="c.libelle" class="admin-chiffre">
          <div class="admin-chiffre-libelle">{{ c.libelle }}</div>
          <div class="admin-chiffre-valeur">{{ c.valeur }}</div>
        </div>
      </section>

      <div class="row g-4">
        <!-- 3a. Itinéraires les plus publiés -->
        <div class="col-xl-6">
          <section class="admin-panneau h-100 mb-0">
            <h2 class="admin-panneau-titre">Itinéraires les plus publiés</h2>
            <ul class="admin-barres">
              <li
                v-for="i in itineraires"
                :key="i.nom"
                class="admin-barre"
                :title="i.nom + ' : ' + i.nombre + ' trajet(s) publié(s)'"
              >
                <span class="text-truncate">{{ i.nom }}</span>
                <span class="admin-barre-piste">
                  <span
                    class="admin-barre-remplie d-block"
                    :style="{ width: i.largeur + '%' }"
                  ></span>
                </span>
                <span class="admin-barre-valeur">{{ i.nombre }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- 3b. Dernières réservations -->
        <div class="col-xl-6">
          <section class="admin-panneau h-100 mb-0">
            <h2 class="admin-panneau-titre">
              Dernières transactions
              <router-link :to="{ name: 'admin-transactions' }"
                >Toutes les transactions</router-link
              >
            </h2>
            <table class="table admin-table align-middle">
              <tbody>
                <tr v-for="p in dernieresTransactions" :key="p.id">
                  <td>
                    {{ p.passager }}
                    <div class="small text-muted">{{ p.trajet }}</div>
                  </td>
                  <td class="nombre">{{ formatPrice(p.montant) }}</td>
                  <td class="text-end">
                    <span
                      class="badge"
                      :class="STATUT_PAIEMENT[p.statut]?.class"
                      >{{ STATUT_PAIEMENT[p.statut]?.label }}</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
