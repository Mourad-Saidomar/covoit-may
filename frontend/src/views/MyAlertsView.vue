<script setup>
// ============================================================
// Mes alertes trajets
// ------------------------------------------------------------
// Les alertes sont enregistrées par l'API (10 actives au plus,
// RG11.2). Pour chaque alerte active, on cherche les trajets
// ouverts qui correspondent à ses critères.
// ============================================================
import { reactive, ref, computed, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import { formatPrice, formatDateTime, messageErreur } from "@/utils/format";
import { revelerApresChargement } from "@/utils/chargement";

const data = useDataStore();

const myAlerts = ref([]);
const matches = ref([]);
const erreur = ref("");
const envoi = ref(false);

const communes = computed(() => data.communes);
const nbActives = computed(() => myAlerts.value.filter((a) => a.active).length);

const form = reactive({
  depart: "",
  arrivee: "",
  heureMin: "06:00",
  heureMax: "09:00",
  prixMax: 5,
});

// Les trajets ouverts qui correspondent à une alerte active
async function chercherCorrespondances() {
  const actives = myAlerts.value.filter((a) => a.active && a.nbTrajetsCorrespondants > 0);
  const resultats = await Promise.all(
    actives.map((a) =>
      data
        .rechercherTrajets({
          depart: a.depart,
          arrivee: a.arrivee,
          heureMin: a.heureMin,
          heureMax: a.heureMax,
          prixMax: a.prixMax || undefined,
        })
        .then((trajets) => trajets.map((t) => ({ alertId: a.id, trip: t })))
        .catch(() => []),
    ),
  );
  matches.value = resultats.flat();
}

async function charger() {
  try {
    myAlerts.value = await data.mesAlertes();
    await chercherCorrespondances();
  } catch (e) {
    erreur.value = messageErreur(e);
  }
  // La page est vue : la pastille « Mes alertes » s'efface (RG11.6).
  // Les nouveautés restent signalées sur les alertes jusqu'à la prochaine visite.
  data.marquerAlertesVues().catch(() => {});
  // Les nouvelles cartes doivent être révélées (animation au défilement)
  revelerApresChargement();
}

onMounted(charger);

// Lance une action de l'API puis recharge ; affiche le refus éventuel
async function agir(action) {
  erreur.value = "";
  try {
    await action();
    await charger();
  } catch (e) {
    erreur.value = messageErreur(e);
  }
}

async function addAlert() {
  if (!form.depart || !form.arrivee) return;
  if (form.heureMin >= form.heureMax) {
    erreur.value = "L'heure de début doit être avant l'heure de fin.";
    return;
  }
  envoi.value = true;
  await agir(async () => {
    await data.creerAlerte({ ...form });
    form.depart = "";
    form.arrivee = "";
  });
  envoi.value = false;
}

function basculer(alerte) {
  agir(() => data.changerEtatAlerte(alerte.id, !alerte.active));
}

function supprimerAlerte(alerte) {
  agir(() => data.supprimerAlerte(alerte.id));
}
</script>

<template>
  <div id="my-alerts-page" class="container py-4 min-h-page">
    <h1 class="h3 section-title mb-4 reveal">
      <i class="bi bi-bell text-cm-primary me-2"></i>Mes alertes trajets
    </h1>
    <p class="text-muted reveal delai-1">
      Créez une alerte et soyez notifié dès qu'un trajet correspondant à vos
      critères est publié.
    </p>
    <div v-if="erreur" class="alert alert-danger py-2" role="alert">
      <i class="bi bi-exclamation-circle me-1"></i>{{ erreur }}
    </div>

    <div class="row g-4">
      <div class="col-lg-5 reveal reveal-gauche delai-2">
        <form class="card" @submit.prevent="addAlert">
          <div class="card-body p-4">
            <h2 class="h6 fw-bold text-cm-primary mb-3">Nouvelle alerte</h2>
            <div class="mb-3">
              <label class="form-label small fw-semibold" for="alert-depart"
                >Départ</label
              >
              <select
                id="alert-depart"
                v-model="form.depart"
                class="form-select"
                required
              >
                <option value="" disabled>Choisir…</option>
                <option v-for="c in communes" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold" for="alert-arrivee"
                >Arrivée</label
              >
              <select
                id="alert-arrivee"
                v-model="form.arrivee"
                class="form-select"
                required
              >
                <option value="" disabled>Choisir…</option>
                <option v-for="c in communes" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </div>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold" for="alert-hmin"
                  >Entre</label
                >
                <input
                  id="alert-hmin"
                  v-model="form.heureMin"
                  type="time"
                  class="form-control"
                />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold" for="alert-hmax"
                  >Et</label
                >
                <input
                  id="alert-hmax"
                  v-model="form.heureMax"
                  type="time"
                  class="form-control"
                />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold" for="alert-prix">
                Prix max :
                <strong class="text-cm-primary">{{
                  formatPrice(form.prixMax)
                }}</strong>
              </label>
              <input
                id="alert-prix"
                v-model.number="form.prixMax"
                type="range"
                class="form-range"
                min="1"
                max="10"
                step="0.5"
              />
            </div>
            <button type="submit" class="btn btn-cm-primary w-100" :disabled="envoi">
              <i class="bi bi-plus-circle me-1"></i>Créer l'alerte
            </button>
          </div>
        </form>
      </div>

      <div class="col-lg-7 reveal reveal-droite delai-2">
        <h2 class="h6 fw-bold mb-3">
          Mes alertes ({{ nbActives }} active{{ nbActives > 1 ? "s" : "" }} sur {{ myAlerts.length }})
        </h2>
        <div
          v-if="myAlerts.length === 0"
          class="card p-4 text-center text-muted small"
        >
          Aucune alerte configurée.
        </div>
        <div
          v-for="(a, i) in myAlerts"
          :key="a.id"
          class="card mb-2 reveal"
          :class="'delai-' + Math.min(i + 1, 4)"
        >
          <div
            class="card-body py-3 d-flex justify-content-between align-items-center flex-wrap gap-2"
          >
            <div :class="{ 'opacity-50': !a.active }">
              <strong>{{ a.depart }} → {{ a.arrivee }}</strong>
              <span v-if="!a.active" class="badge bg-secondary ms-2">En pause</span>
              <span v-else-if="a.nbNouveaux > 0" class="badge bg-danger ms-2">
                {{ a.nbNouveaux }} nouveau{{ a.nbNouveaux > 1 ? 'x' : '' }}
              </span>
              <div class="small text-muted">
                Entre {{ a.heureMin }} et {{ a.heureMax }}
                <template v-if="a.prixMax"> · max {{ formatPrice(a.prixMax) }}</template>
                · {{ a.nbTrajetsCorrespondants }} trajet(s) correspondant(s)
              </div>
            </div>
            <div class="d-flex gap-1">
              <button
                class="btn btn-sm btn-outline-secondary"
                :title="a.active ? 'Mettre en pause' : 'Réactiver'"
                :aria-label="a.active ? 'Mettre en pause' : 'Réactiver'"
                @click="basculer(a)"
              >
                <i class="bi" :class="a.active ? 'bi-pause' : 'bi-play'"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                title="Supprimer"
                aria-label="Supprimer l'alerte"
                @click="supprimerAlerte(a)"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <h2 class="h6 fw-bold mb-3 mt-4 reveal">
          <i class="bi bi-bell-fill text-cm-accent me-1"></i>Trajets
          correspondants ({{ matches.length }})
        </h2>
        <div v-if="matches.length === 0" class="small text-muted">
          Aucun trajet ne correspond à vos alertes pour le moment.
        </div>
        <router-link
          v-for="m in matches"
          :key="`${m.alertId}-${m.trip.id}`"
          :to="{ name: 'trip-detail', params: { id: m.trip.id } }"
          class="card mb-2 text-decoration-none card-hover reveal"
        >
          <div
            class="card-body py-3 d-flex justify-content-between align-items-center"
          >
            <div>
              <strong class="text-dark"
                >{{ m.trip.depart }} → {{ m.trip.arrivee }}</strong
              >
              <div class="small text-muted">
                {{ formatDateTime(m.trip.dateDepart) }}
              </div>
            </div>
            <span class="fw-bold text-cm-primary">{{
              formatPrice(m.trip.prix)
            }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
