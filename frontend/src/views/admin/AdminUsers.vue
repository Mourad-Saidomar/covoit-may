<script setup>
// ============================================================
// Gestion des utilisateurs (BF-A01, BF-A02)
// ------------------------------------------------------------
// En haut : les demandes conducteur à traiter (nouveaux inscrits
// et passagers qui demandent à devenir conducteur).
// Dessous : la liste des comptes, avec recherche et filtres
// (faits par l'API). Un compte actif peut être suspendu, un
// compte suspendu réactivé. La suppression appartient à la
// personne elle-même (droit à l'effacement, RG02.14).
// ============================================================
import { ref, watch, onMounted } from "vue";
import { useDataStore } from "@/stores/data";
import { initials, formatDate, messageErreur } from "@/utils/format";
import { LIBELLES_ROLES } from "@/stores/auth";
import StarRating from "@/components/StarRating.vue";
import DemandesConducteur from "@/components/admin/DemandesConducteur.vue";

const data = useDataStore();
const search = ref("");
const roleFilter = ref("");
const statutFilter = ref("");

const chargement = ref(true);
const erreur = ref("");
const utilisateurs = ref([]);
const demandes = ref([]);
const enCours = ref(null);
let minuteur = null;

async function chargerListe() {
  try {
    utilisateurs.value = await data.utilisateurs({
      recherche: search.value.trim(),
      role: roleFilter.value,
      statut: statutFilter.value,
    });
    erreur.value = "";
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    chargement.value = false;
  }
}

async function chargerDemandes() {
  demandes.value = await data.demandesConducteur("en_attente").catch(() => []);
}

async function toutRecharger() {
  await Promise.all([chargerListe(), chargerDemandes(), data.chargerCompteursAdmin()]);
}

onMounted(toutRecharger);

// La recherche part 300 ms après la dernière touche
watch([search, roleFilter, statutFilter], () => {
  clearTimeout(minuteur);
  minuteur = setTimeout(chargerListe, 300);
});

// Suspendre ou réactiver : une suspension annule les trajets et
// réservations en cours de la personne (côté serveur)
async function changerStatut(u, statut) {
  if (statut === "suspendu" && !confirm("Suspendre " + u.prenom + " " + u.nom + " ? Ses trajets et réservations en cours seront annulés.")) {
    return;
  }
  enCours.value = u.id;
  erreur.value = "";
  try {
    await data.changerStatutUtilisateur(u.id, statut);
    await chargerListe();
  } catch (e) {
    erreur.value = messageErreur(e);
  } finally {
    enCours.value = null;
  }
}

const STATUTS = {
  actif: { label: "Actif", class: "bg-success" },
  en_attente: { label: "En attente", class: "bg-warning text-dark" },
  suspendu: { label: "Suspendu", class: "bg-danger" },
  refuse: { label: "Refusé", class: "bg-secondary" },
  supprime: { label: "Supprimé", class: "bg-light text-muted border" },
};
</script>

<template>
  <div id="admin-users-page">
    <header class="admin-entete">
      <h1>Utilisateurs</h1>
      <p>Validez l'identité des conducteurs et gérez les comptes.</p>
    </header>

    <!-- Demandes conducteur à traiter -->
    <section v-if="demandes.length > 0" class="admin-panneau admin-panneau-urgent">
      <h2 class="admin-panneau-titre">Conducteurs à valider</h2>
      <DemandesConducteur :demandes="demandes" @traitee="toutRecharger" />
    </section>

    <!-- Tous les comptes -->
    <section class="admin-panneau">
      <h2 class="admin-panneau-titre">
        Comptes
        <span class="text-muted">{{ utilisateurs.length }} résultat(s)</span>
      </h2>
      <div class="admin-filtres">
        <input
          id="admin-user-search"
          v-model="search"
          class="form-control w-auto flex-grow-1"
          placeholder="Rechercher par nom ou email"
          aria-label="Rechercher par nom ou email"
          maxlength="100"
        />
        <select v-model="roleFilter" class="form-select w-auto" aria-label="Filtrer par rôle">
          <option value="">Tous les rôles</option>
          <option value="passager">Passagers</option>
          <option value="conducteur">Conducteurs</option>
        </select>
        <select v-model="statutFilter" class="form-select w-auto" aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          <option v-for="(s, cle) in STATUTS" :key="cle" :value="cle">{{ s.label }}</option>
        </select>
      </div>

      <div v-if="erreur" class="alert alert-danger py-2 small" role="alert">{{ erreur }}</div>

      <!-- Squelette du tableau -->
      <div v-if="chargement" aria-busy="true" aria-label="Chargement">
        <div v-for="n in 5" :key="n" class="d-flex align-items-center gap-3 py-2">
          <div class="squelette squelette-rond"></div>
          <div class="squelette squelette-ligne w-25"></div>
          <div class="squelette squelette-ligne w-25"></div>
          <div class="squelette squelette-ligne w-25"></div>
        </div>
      </div>

      <div v-else class="table-responsive">
        <table class="table admin-table align-middle">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Commune</th>
              <th>Note</th>
              <th>Inscrit le</th>
              <th>Statut</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in utilisateurs" :key="u.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <span class="avatar avatar-sm">{{ initials(u) }}</span>
                  <div>
                    <div class="fw-semibold">
                      {{ u.prenom }} {{ u.nom }}
                      <i v-if="u.verifie" class="bi bi-patch-check-fill text-cm-primary" title="Identité vérifiée"></i>
                    </div>
                    <div class="small text-muted">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td>{{ LIBELLES_ROLES[u.role] }}</td>
              <td>{{ u.commune || "—" }}</td>
              <td><StarRating :note="u.note" small /></td>
              <td>{{ formatDate(u.membreDepuis) }}</td>
              <td>
                <span class="badge" :class="STATUTS[u.statut]?.class">{{ STATUTS[u.statut]?.label }}</span>
              </td>
              <td class="text-end">
                <button
                  v-if="u.statut === 'actif'"
                  class="btn btn-sm btn-outline-secondary"
                  title="Suspendre"
                  :aria-label="'Suspendre ' + u.prenom + ' ' + u.nom"
                  :disabled="enCours === u.id"
                  @click="changerStatut(u, 'suspendu')"
                >
                  <i class="bi bi-pause-circle"></i>
                </button>
                <button
                  v-else-if="u.statut === 'suspendu'"
                  class="btn btn-sm btn-outline-success"
                  title="Réactiver"
                  :aria-label="'Réactiver ' + u.prenom + ' ' + u.nom"
                  :disabled="enCours === u.id"
                  @click="changerStatut(u, 'actif')"
                >
                  <i class="bi bi-play-circle"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
