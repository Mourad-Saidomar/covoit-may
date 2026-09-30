<script setup>
// ============================================================
// Page « Mon profil »
// ------------------------------------------------------------
// - résumé du compte ;
// - passager (ou conducteur pas encore vérifié) : demande pour
//   devenir conducteur, avec le véhicule et les justificatifs ;
// - conducteur vérifié : ses véhicules ;
// - favoris, informations personnelles, mot de passe ;
// - suppression du compte (le mot de passe est redemandé).
// Tout passe par l'API : les règles sont vérifiées par le serveur.
// ============================================================
import { reactive, ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDataStore } from "@/stores/data";
import { useAuthStore } from "@/stores/auth";
import { initials, formatDate, messageErreur } from "@/utils/format";
import StarRating from "@/components/StarRating.vue";

const router = useRouter();
const data = useDataStore();
const auth = useAuthStore();

const u = computed(() => auth.utilisateur);
const communes = computed(() => data.communes);

// Un membre : l'administrateur n'a ni profil public, ni favoris, ni véhicule
const estMembre = computed(() => auth.estMembre);
// Peut demander à devenir conducteur : passager, ou conducteur pas encore vérifié
const peutDemander = computed(
  () => auth.estPassager || auth.estConducteurEnAttente,
);
const conducteurVerifie = computed(
  () => auth.estConducteur && u.value.verifie,
);

// ---- Données chargées depuis l'API ----
const favoris = ref([]);
const vehicules = ref([]);
const demandes = ref([]);
// La demande la plus récente (la liste arrive triée du plus récent au plus ancien)
const demande = computed(() => demandes.value[0] || null);

async function chargerMesDonnees() {
  if (!estMembre.value) return;
  const [f, d, v] = await Promise.all([
    data.mesFavoris().catch(() => []),
    peutDemander.value ? data.mesDemandesConducteur().catch(() => []) : [],
    conducteurVerifie.value ? data.mesVehicules().catch(() => []) : [],
  ]);
  favoris.value = f;
  demandes.value = d;
  vehicules.value = v;
}

onMounted(chargerMesDonnees);

// ---- Informations personnelles ----
const form = reactive({
  prenom: u.value.prenom,
  nom: u.value.nom,
  telephone: u.value.telephone || "",
  commune: u.value.commune || "",
  bio: u.value.bio || "",
});
const saved = ref(false);
const erreurProfil = ref("");

async function save() {
  erreurProfil.value = "";
  try {
    // Seuls ces champs sont modifiables (RG02.17)
    await data.modifierProfil({
      prenom: form.prenom,
      nom: form.nom,
      telephone: form.telephone,
      commune: form.commune,
      bio: form.bio.trim() || undefined,
    });
    await auth.rafraichir();
    saved.value = true;
    setTimeout(() => {
      saved.value = false;
    }, 2500);
  } catch (e) {
    erreurProfil.value = messageErreur(e);
  }
}

// ---- Mot de passe ----
const formMdp = reactive({ ancien: "", nouveau: "", confirmation: "" });
const messageMdp = ref("");
const erreurMdp = ref("");

async function changerMotDePasse() {
  erreurMdp.value = "";
  messageMdp.value = "";
  if (formMdp.nouveau !== formMdp.confirmation) {
    erreurMdp.value = "Les deux nouveaux mots de passe ne correspondent pas.";
    return;
  }
  try {
    await data.changerMotDePasse(formMdp.ancien, formMdp.nouveau);
    formMdp.ancien = "";
    formMdp.nouveau = "";
    formMdp.confirmation = "";
    messageMdp.value = "Mot de passe modifié.";
  } catch (e) {
    erreurMdp.value = messageErreur(e);
  }
}

// ---- Devenir conducteur (vérification d'identité) ----
const formConducteur = reactive({
  marque: "",
  modele: "",
  couleur: "",
  immatriculation: "",
  nbPlaces: 4,
  pieceIdentite: null,
  permis: null,
});
const erreurConducteur = ref("");
const envoiDemande = ref(false);

// Types et taille acceptés pour les justificatifs (RG08.1)
const TYPES_ACCEPTES = ["application/pdf", "image/jpeg", "image/png"];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

// Garde le fichier choisi s'il est valable, sinon affiche l'erreur
function choisirFichier(evenement, champ) {
  const fichier = evenement.target.files[0] || null;
  erreurConducteur.value = "";
  formConducteur[champ] = null;
  if (!fichier) return;
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    erreurConducteur.value = "Formats acceptés : PDF, JPG ou PNG.";
    evenement.target.value = "";
    return;
  }
  if (fichier.size > TAILLE_MAX) {
    erreurConducteur.value = "Chaque fichier doit faire moins de 5 Mo.";
    evenement.target.value = "";
    return;
  }
  formConducteur[champ] = fichier;
}

async function envoyerDemandeConducteur() {
  if (!formConducteur.pieceIdentite || !formConducteur.permis) {
    erreurConducteur.value =
      "Ajoutez votre pièce d'identité et votre permis de conduire.";
    return;
  }
  envoiDemande.value = true;
  erreurConducteur.value = "";
  try {
    await data.deposerDemandeConducteur(
      {
        marque: formConducteur.marque,
        modele: formConducteur.modele,
        couleur: formConducteur.couleur,
        immatriculation: formConducteur.immatriculation,
        nbPlaces: formConducteur.nbPlaces,
      },
      formConducteur.pieceIdentite,
      formConducteur.permis,
    );
    demandes.value = await data.mesDemandesConducteur();
  } catch (e) {
    erreurConducteur.value = messageErreur(e);
  } finally {
    envoiDemande.value = false;
  }
}

// ---- Véhicules (conducteur vérifié) ----
const formVehicule = reactive({
  ouvert: false,
  marque: "",
  modele: "",
  couleur: "",
  immatriculation: "",
  nbPlaces: 4,
});
const erreurVehicule = ref("");

async function ajouterVehicule() {
  erreurVehicule.value = "";
  try {
    await data.ajouterVehicule({
      marque: formVehicule.marque,
      modele: formVehicule.modele,
      couleur: formVehicule.couleur || undefined,
      immatriculation: formVehicule.immatriculation,
      nbPlaces: formVehicule.nbPlaces,
    });
    formVehicule.ouvert = false;
    formVehicule.marque = "";
    formVehicule.modele = "";
    formVehicule.couleur = "";
    formVehicule.immatriculation = "";
    vehicules.value = await data.mesVehicules();
  } catch (e) {
    erreurVehicule.value = messageErreur(e);
  }
}

// ---- Suppression du compte (droit à l'effacement, RG02.14) ----
const mdpSuppression = ref("");
const erreurSuppression = ref("");

async function deleteAccount() {
  erreurSuppression.value = "";
  if (
    !confirm(
      "Êtes-vous sûr de vouloir supprimer votre compte ? Vos trajets et réservations en cours seront annulés. Cette action est irréversible.",
    )
  ) {
    return;
  }
  try {
    await data.supprimerMonCompte(mdpSuppression.value);
    auth.seDeconnecter();
    data.viderCompteurs();
    router.push({ name: "home" });
  } catch (e) {
    erreurSuppression.value = messageErreur(e);
  }
}
</script>

<template>
  <div id="my-profile-page" class="container py-4 min-h-page">
    <h1 class="h3 section-title mb-4 reveal">
      <i class="bi bi-person-circle text-cm-primary me-2"></i>Mon profil
    </h1>

    <div class="row g-4">
      <!-- Résumé -->
      <div class="col-lg-4 reveal reveal-gauche delai-1">
        <div class="card text-center mb-4">
          <div class="card-body p-4">
            <span class="avatar avatar-lg mx-auto mb-3">{{ initials(u) }}</span>
            <h2 class="h5 fw-bold mb-1">{{ u.prenom }} {{ u.nom }}</h2>
            <p class="small text-muted mb-2">{{ u.email }}</p>
            <span class="badge" :class="u.role === 'conducteur' ? 'bg-cm-primary' : 'bg-secondary'">
              {{ auth.libelleRole }}
            </span>
            <span v-if="u.verifie" class="badge badge-verified ms-1">
              <i class="bi bi-patch-check-fill me-1"></i>Vérifié
            </span>
            <template v-if="estMembre">
              <div class="mt-2">
                <StarRating :note="u.note" :nb-avis="u.nbAvis" />
              </div>
              <p class="small text-muted mt-2 mb-0">
                Membre depuis {{ formatDate(u.membreDepuis) }}
              </p>
            </template>
            <p v-else class="small text-muted mt-2 mb-0">{{ u.fonction }}</p>
          </div>
        </div>

        <!-- Passager ou conducteur non vérifié : la demande conducteur -->
        <div v-if="peutDemander" id="devenir-conducteur" class="card mb-4"
          :class="{ 'border-warning': auth.estConducteurEnAttente }">
          <div class="card-body">
            <h3 class="h6 fw-bold">
              <i class="bi bi-car-front me-1 text-cm-primary"></i>
              {{ auth.estConducteurEnAttente ? "Vérification d'identité" : "Devenir conducteur" }}
            </h3>

            <!-- Demande envoyée, en attente -->
            <div v-if="demande && demande.statut === 'en_attente'">
              <p class="small mb-2">
                Demande envoyée le {{ formatDate(demande.date) }} pour votre
                {{ demande.vehicule.marque }} {{ demande.vehicule.modele }}
                ({{ demande.vehicule.immatriculation }}).
              </p>
              <p class="small text-muted mb-0">
                <i class="bi bi-hourglass-split me-1"></i>L'équipe vérifie
                votre identité. Vous pourrez publier des trajets dès sa
                validation, et vous garderez vos réservations de passager.
              </p>
            </div>

            <!-- Formulaire (première demande ou nouvelle tentative) -->
            <form v-else @submit.prevent="envoyerDemandeConducteur">
              <div v-if="demande && demande.statut === 'refusee'" class="alert alert-warning small py-2">
                Votre précédente demande n'a pas été validée :
                <strong>{{ demande.motifRefus }}</strong> Vous pouvez en envoyer une nouvelle.
              </div>
              <p v-else class="small text-muted">
                Indiquez votre véhicule et joignez vos justificatifs. Après
                vérification de votre identité, vous pourrez publier vos
                trajets et continuer à réserver comme passager.
              </p>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="form-label small" for="dc-marque">Marque</label>
                  <input id="dc-marque" v-model="formConducteur.marque" class="form-control form-control-sm" placeholder="Peugeot" required maxlength="50" />
                </div>
                <div class="col-6">
                  <label class="form-label small" for="dc-modele">Modèle</label>
                  <input id="dc-modele" v-model="formConducteur.modele" class="form-control form-control-sm" placeholder="208" required maxlength="50" />
                </div>
                <div class="col-6">
                  <label class="form-label small" for="dc-couleur">Couleur</label>
                  <input id="dc-couleur" v-model="formConducteur.couleur" class="form-control form-control-sm" placeholder="grise" maxlength="30" />
                </div>
                <div class="col-6">
                  <label class="form-label small" for="dc-places">Places passagers</label>
                  <select id="dc-places" v-model.number="formConducteur.nbPlaces" class="form-select form-select-sm">
                    <option v-for="n in 8" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label small" for="dc-immat">Immatriculation</label>
                  <input id="dc-immat" v-model="formConducteur.immatriculation" class="form-control form-control-sm"
                    placeholder="AB-123-CD" required pattern="[A-Za-z]{2}-?[0-9]{3}-?[A-Za-z]{2}"
                    title="Format AA-123-AA" />
                </div>
              </div>
              <div class="mb-2">
                <label class="form-label small" for="dc-identite">Pièce d'identité (PDF, JPG ou PNG, 5 Mo max)</label>
                <input id="dc-identite" type="file" accept=".pdf,.jpg,.jpeg,.png" class="form-control form-control-sm"
                  @change="choisirFichier($event, 'pieceIdentite')" />
              </div>
              <div class="mb-3">
                <label class="form-label small" for="dc-permis">Permis de conduire (PDF, JPG ou PNG, 5 Mo max)</label>
                <input id="dc-permis" type="file" accept=".pdf,.jpg,.jpeg,.png" class="form-control form-control-sm"
                  @change="choisirFichier($event, 'permis')" />
              </div>
              <p v-if="erreurConducteur" class="small text-danger mb-2" role="alert">
                {{ erreurConducteur }}
              </p>
              <button type="submit" class="btn btn-sm btn-cm-primary w-100" :disabled="envoiDemande">
                <span v-if="envoiDemande" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-upload me-1"></i>Envoyer ma demande
              </button>
              <p class="small text-muted mt-2 mb-0">
                <i class="bi bi-shield-lock me-1"></i>Vos justificatifs ne sont visibles que par
                l'équipe et sont effacés 30 jours après la décision.
              </p>
            </form>
          </div>
        </div>

        <!-- Conducteur vérifié : ses véhicules -->
        <div v-if="conducteurVerifie" class="card mb-4">
          <div class="card-body">
            <h3 class="h6 fw-bold mb-3">
              <i class="bi bi-car-front me-1 text-cm-primary"></i>Mes véhicules
            </h3>
            <div v-for="v in vehicules" :key="v.id" class="small py-1 border-bottom"
              :class="{ 'text-muted': !v.actif }">
              {{ v.libelle }} · {{ v.immatriculation }} · {{ v.nbPlaces }} places
              <span v-if="!v.actif" class="badge bg-secondary ms-1">inactif</span>
            </div>
            <button v-if="!formVehicule.ouvert" class="btn btn-sm btn-outline-cm mt-3"
              @click="formVehicule.ouvert = true">
              <i class="bi bi-plus me-1"></i>Ajouter un véhicule
            </button>
            <form v-else class="mt-3" @submit.prevent="ajouterVehicule">
              <div class="row g-2 mb-2">
                <div class="col-6"><input v-model="formVehicule.marque" class="form-control form-control-sm" placeholder="Marque" aria-label="Marque" required maxlength="50" /></div>
                <div class="col-6"><input v-model="formVehicule.modele" class="form-control form-control-sm" placeholder="Modèle" aria-label="Modèle" required maxlength="50" /></div>
                <div class="col-6"><input v-model="formVehicule.couleur" class="form-control form-control-sm" placeholder="Couleur" aria-label="Couleur" maxlength="30" /></div>
                <div class="col-6">
                  <select v-model.number="formVehicule.nbPlaces" class="form-select form-select-sm" aria-label="Places passagers">
                    <option v-for="n in 8" :key="n" :value="n">{{ n }} place(s)</option>
                  </select>
                </div>
                <div class="col-12"><input v-model="formVehicule.immatriculation" class="form-control form-control-sm" placeholder="AB-123-CD" aria-label="Immatriculation" required /></div>
              </div>
              <p v-if="erreurVehicule" class="small text-danger mb-2" role="alert">{{ erreurVehicule }}</p>
              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-sm btn-cm-primary">Ajouter</button>
                <button type="button" class="btn btn-sm btn-link text-muted" @click="formVehicule.ouvert = false">Annuler</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Conducteur : il peut aussi voyager comme passager -->
        <div v-if="auth.estConducteur" class="card mb-4">
          <div class="card-body">
            <h3 class="h6 fw-bold">
              <i class="bi bi-person-walking me-1 text-cm-primary"></i>Voyager comme passager
            </h3>
            <p class="small text-muted">
              En tant que conducteur, vous pouvez aussi réserver une place
              dans la voiture d'un autre membre.
            </p>
            <div class="d-flex gap-2 flex-wrap">
              <router-link :to="{ name: 'search' }" class="btn btn-sm btn-outline-cm">Chercher un trajet</router-link>
              <router-link :to="{ name: 'my-bookings' }" class="btn btn-sm btn-outline-cm">Mes réservations</router-link>
            </div>
          </div>
        </div>

        <!-- Favoris -->
        <div v-if="estMembre" class="card">
          <div class="card-body">
            <h3 class="h6 fw-bold mb-3">
              <i class="bi bi-star-fill text-cm-accent me-1"></i>Mes conducteurs favoris
            </h3>
            <p v-if="favoris.length === 0" class="small text-muted mb-0">
              Aucun favori pour l'instant.
            </p>
            <router-link v-for="f in favoris" :key="f.id"
              :to="{ name: 'public-profile', params: { id: f.id } }"
              class="d-flex align-items-center gap-2 py-2 text-decoration-none border-bottom">
              <span class="avatar avatar-sm">{{ initials(f) }}</span>
              <span class="small fw-semibold">{{ f.prenom }} {{ f.nom }}</span>
              <StarRating :note="f.note" small />
            </router-link>
          </div>
        </div>
      </div>

      <!-- Formulaires -->
      <div class="col-lg-8 reveal reveal-droite delai-2">
        <div v-if="!estMembre" class="card">
          <div class="card-body p-4">
            <p class="mb-0 text-muted">
              <i class="bi bi-shield-lock me-1"></i>Compte administrateur : il se gère
              directement dans la base (aucune création ni modification depuis le site).
            </p>
          </div>
        </div>

        <template v-else>
          <form class="card" @submit.prevent="save">
            <div class="card-body p-4">
              <h2 class="h6 fw-bold text-cm-primary mb-3">Informations personnelles</h2>

              <div v-if="saved" class="alert alert-success py-2 small">
                <i class="bi bi-check-circle me-1"></i>Profil mis à jour !
              </div>
              <div v-if="erreurProfil" class="alert alert-danger py-2 small" role="alert">
                {{ erreurProfil }}
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="prof-prenom">Prénom</label>
                  <input id="prof-prenom" v-model="form.prenom" class="form-control" required maxlength="100" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="prof-nom">Nom</label>
                  <input id="prof-nom" v-model="form.nom" class="form-control" required maxlength="100" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="prof-tel">Téléphone</label>
                  <input id="prof-tel" v-model="form.telephone" class="form-control" required placeholder="0639 12 34 56" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" for="prof-commune">Commune</label>
                  <select id="prof-commune" v-model="form.commune" class="form-select" required>
                    <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" for="prof-bio">Bio</label>
                  <textarea id="prof-bio" v-model="form.bio" class="form-control" rows="3" maxlength="500"
                    placeholder="Présentez-vous en quelques mots…"></textarea>
                </div>
              </div>

              <button type="submit" class="btn btn-cm-primary mt-4">
                <i class="bi bi-check-lg me-1"></i>Enregistrer les modifications
              </button>
            </div>
          </form>

          <form class="card mt-4" @submit.prevent="changerMotDePasse">
            <div class="card-body p-4">
              <h2 class="h6 fw-bold text-cm-primary mb-3">Mot de passe</h2>
              <div v-if="messageMdp" class="alert alert-success py-2 small">{{ messageMdp }}</div>
              <div v-if="erreurMdp" class="alert alert-danger py-2 small" role="alert">{{ erreurMdp }}</div>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label small fw-semibold" for="mdp-ancien">Mot de passe actuel</label>
                  <input id="mdp-ancien" v-model="formMdp.ancien" type="password" class="form-control" required autocomplete="current-password" />
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-semibold" for="mdp-nouveau">Nouveau</label>
                  <input id="mdp-nouveau" v-model="formMdp.nouveau" type="password" class="form-control" required minlength="8" autocomplete="new-password" />
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-semibold" for="mdp-confirmation">Confirmation</label>
                  <input id="mdp-confirmation" v-model="formMdp.confirmation" type="password" class="form-control" required autocomplete="new-password" />
                </div>
              </div>
              <button type="submit" class="btn btn-outline-cm mt-3">Changer le mot de passe</button>
            </div>
          </form>

          <form class="card border-danger mt-4" @submit.prevent="deleteAccount">
            <div class="card-body">
              <h3 class="h6 fw-bold text-danger mb-1">Zone dangereuse</h3>
              <p class="small text-muted">
                La suppression du compte est définitive (RGPD : droit à l'effacement).
                Vos données personnelles sont effacées ; l'historique des paiements
                est conservé sous un nom anonyme.
              </p>
              <div v-if="erreurSuppression" class="alert alert-danger py-2 small" role="alert">
                {{ erreurSuppression }}
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <input v-model="mdpSuppression" type="password" class="form-control w-auto"
                  placeholder="Votre mot de passe" aria-label="Mot de passe pour confirmer" required
                  autocomplete="current-password" />
                <button type="submit" class="btn btn-outline-danger">
                  <i class="bi bi-trash me-1"></i>Supprimer mon compte
                </button>
              </div>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
