<script>
// ============================================================
// Page d'accueil
// ------------------------------------------------------------
// Elle contient : le grand bandeau (hero), les prochains
// trajets, les chiffres clés, "comment ça marche",
// les avantages et un appel pour devenir conducteur.
// ============================================================
import { useDataStore } from "../stores/data";
import SearchForm from "../components/SearchForm.vue";
import TripCard from "../components/TripCard.vue";
import HeroCarte from "../components/HeroCarte.vue";
import SqueletteTrajet from "../components/SqueletteTrajet.vue";
import { revelerApresChargement } from "../utils/chargement";
import { formatPrice, messageErreur } from "../utils/format";

export default {
  name: "HomeView",

  components: { SearchForm, TripCard, HeroCarte, SqueletteTrajet },

  data() {
    return {
      // Vrai pendant le chargement des prochains trajets (API)
      chargement: true,
      erreur: "",
      // Ce qui est tapé dans la recherche du hero (la carte le suit)
      recherche: { depart: "", arrivee: "" },
      // Hauteur du slogan, en pixels : sur tablette, la carte prend
      // la même hauteur (voir mounted et main.css « Hero »)
      hauteurSlogan: 0,
      observateur: null,
      // Les 4 étapes de "Comment ça marche"
      etapes: [
        {
          icone: "bi-search",
          titre: "Recherchez",
          texte:
            "Indiquez votre départ, votre arrivée et votre horaire : trouvez un trajet près de chez vous.",
        },
        {
          icone: "bi-person-check",
          titre: "Choisissez en confiance",
          texte:
            "Consultez le profil, les avis et le badge « identité vérifiée » des conducteurs.",
        },
        {
          icone: "bi-credit-card",
          titre: "Réservez & payez",
          texte:
            "Réservation en ligne, paiement sécurisé par carte. Le conducteur confirme votre place.",
        },
        {
          icone: "bi-chat-heart",
          titre: "Voyagez ensemble",
          texte:
            "Messagerie intégrée pour vous coordonner, puis laissez un avis après le trajet.",
        },
      ],
      // Les 4 avantages du covoiturage
      avantages: [
        {
          icone: "bi-piggy-bank",
          titre: "Moins cher",
          texte: "Partagez les frais d'essence sur vos trajets quotidiens.",
        },
        {
          icone: "bi-tree",
          titre: "Moins de voitures",
          texte:
            "Réduisez les embouteillages de Kawéni et l'empreinte carbone.",
        },
        {
          icone: "bi-people",
          titre: "Plus de lien social",
          texte: "Voyagez entre voisins de quartier et de village.",
        },
        {
          icone: "bi-clock-history",
          titre: "Gain de temps",
          texte:
            "Fini les longues attentes : coordonnez-vous en quelques clics.",
        },
      ],
    };
  },

  computed: {
    // Le store des données
    data() {
      return useDataStore();
    },
    // Les 4 prochains trajets à afficher
    prochainsTrajets() {
      return this.data.trajetsAVenir.slice(0, 4);
    },
    // Les chiffres clés affichés dans le bandeau vert,
    // calculés à partir des trajets ouverts renvoyés par l'API
    chiffres() {
      const trajets = this.data.trajetsAVenir;
      let places = 0;
      let totalPrix = 0;
      trajets.forEach(function (t) {
        places = places + t.placesDispo;
        totalPrix = totalPrix + t.prix;
      });
      const prixMoyen = trajets.length ? totalPrix / trajets.length : 0;
      return [
        {
          icone: "bi-signpost-2-fill",
          valeur: trajets.length,
          label: "Trajets à venir",
        },
        {
          icone: "bi-people-fill",
          valeur: places,
          label: "Places disponibles",
        },
        {
          icone: "bi-geo-alt-fill",
          valeur: this.data.communes.length,
          label: "Communes couvertes",
        },
        {
          icone: "bi-cash-coin",
          valeur: formatPrice(prixMoyen),
          label: "Prix moyen d'une place",
        },
      ];
    },
  },

  // Au chargement de la page : squelettes, puis les trajets de l'API
  async mounted() {
    // La hauteur du slogan change avec la largeur de l'écran : on la suit.
    // La mise à jour attend l'image suivante (requestAnimationFrame) et
    // ignore les écarts de moins de 2 px : la carte change la largeur du
    // slogan, qui pourrait sinon se remesurer en boucle.
    if (window.ResizeObserver) {
      this.observateur = new ResizeObserver((entrees) => {
        const hauteur = Math.round(entrees[0].contentRect.height);
        requestAnimationFrame(() => {
          if (Math.abs(hauteur - this.hauteurSlogan) >= 2) this.hauteurSlogan = hauteur;
        });
      });
      this.observateur.observe(this.$refs.slogan);
    }
    try {
      await this.data.chargerTrajetsAVenir();
    } catch (erreur) {
      this.erreur = messageErreur(erreur);
    } finally {
      this.chargement = false;
      revelerApresChargement();
    }
  },

  beforeUnmount() {
    if (this.observateur) this.observateur.disconnect();
  },
};
</script>

<template>
  <div>
    <!-- HERO : trois zones placées par une grille (main.css, « Hero ») :
         - mobile : le slogan, la recherche, puis la carte ;
         - tablette : le slogan et la carte côte à côte, à la même
           hauteur, la recherche en dessous sur toute la largeur ;
         - ordinateur : le slogan et la recherche à gauche, la carte à droite.
         La carte suit ce qui est tapé dans le formulaire. -->
    <section id="hero-section" class="hero-section">
      <div class="container">
        <div class="hero-grille">
          <div ref="slogan" class="hero-slogan">
            <h1 class="hero-titre">Même trajet,<br />même voiture.</h1>
            <p class="hero-texte">
              Chaque jour, des habitants de Mayotte proposent les trajets
              qu'ils font déjà. Réservez une place et partagez les frais
              d'essence.
            </p>
          </div>
          <div class="hero-recherche">
            <SearchForm
              aria-label="Rechercher un trajet"
              @changement="recherche = $event"
            />
            <p class="hero-inscription">
              Pas encore de compte ?
              <router-link to="/inscription">Créer mon compte</router-link>
            </p>
          </div>
          <div
            class="hero-zone-carte"
            :style="hauteurSlogan ? { '--hauteur-slogan': hauteurSlogan + 'px' } : null"
          >
            <HeroCarte
              :depart="recherche.depart"
              :arrivee="recherche.arrivee"
            />
          </div>
        </div>
      </div>

      <!-- Le rivage : la mer du hero passe par le récif et le lagon
           (mêmes couleurs que la carte) avant le sable de la suite -->
      <svg
        class="hero-rivage"
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          class="hero-rivage-recif"
          d="M0 22C160 10 300 30 470 20S760 8 930 18 1230 30 1440 14V64H0Z"
        />
        <path
          class="hero-rivage-lagon"
          d="M0 24C160 12 300 32 470 22S760 10 930 20 1230 32 1440 16V64H0Z"
        />
        <path
          class="hero-rivage-sable"
          d="M0 44C200 34 380 52 600 42S980 30 1180 42 1360 48 1440 40V68H0Z"
        />
      </svg>
    </section>

    <!-- PROCHAINS TRAJETS -->
    <section id="next-trips-section" class="container py-5">
      <div
        class="d-flex justify-content-between align-items-center mb-4 reveal"
      >
        <h2 class="section-title h3 mb-0">
          <i class="bi bi-signpost-2 text-cm-primary me-2"></i>Prochains départs
        </h2>
        <router-link to="/recherche" class="btn btn-outline-cm btn-sm">
          Tout voir <i class="bi bi-arrow-right"></i>
        </router-link>
      </div>
      <!-- Pendant le chargement : des squelettes de cartes -->
      <div v-if="chargement" aria-busy="true" aria-label="Chargement des trajets">
        <SqueletteTrajet v-for="n in 3" :key="n" />
      </div>
      <div v-else-if="erreur" class="alert alert-warning" role="alert">
        <i class="bi bi-wifi-off me-1"></i>{{ erreur }}
      </div>
      <template v-else>
        <!-- On affiche une carte pour chaque trajet -->
        <div
          v-for="(trajet, i) in prochainsTrajets"
          :key="trajet.id"
          class="reveal"
          :class="'delai-' + Math.min(i + 1, 4)"
        >
          <TripCard :trip="trajet" />
        </div>
        <p
          v-if="prochainsTrajets.length === 0"
          class="text-muted text-center py-4"
        >
          Aucun trajet à venir pour l'instant.
        </p>
      </template>
    </section>

    <!-- CHIFFRES CLÉS -->
    <section id="stats-section" class="bg-cm-primary text-white py-5">
      <div class="container">
        <div class="row g-4 text-center">
          <div
            v-for="(c, i) in chiffres"
            :key="i"
            class="col-6 col-lg-3 reveal reveal-zoom"
            :class="'delai-' + (i + 1)"
          >
            <i class="bi fs-2 text-cm-accent" :class="c.icone"></i>
            <div class="display-6 fw-bold mt-1">{{ c.valeur }}</div>
            <div class="small text-white-50">{{ c.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- COMMENT ÇA MARCHE -->
    <section id="how-it-works" class="bg-white py-5">
      <div class="container">
        <h2 class="section-title h3 text-center mb-5 reveal">
          Comment ça marche ?
        </h2>
        <div class="row g-4 text-center">
          <div
            v-for="(etape, i) in etapes"
            :key="i"
            class="col-md-6 col-lg-3 reveal reveal-zoom"
            :class="'delai-' + (i + 1)"
          >
            <div class="step-icon mb-3">
              <i class="bi" :class="etape.icone"></i>
            </div>
            <h3 class="h6 fw-bold">{{ i + 1 }}. {{ etape.titre }}</h3>
            <p class="small text-muted">{{ etape.texte }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- LES AVANTAGES -->
    <section id="benefits-section" class="container py-5">
      <h2 class="section-title h3 text-center mb-5 reveal">
        Pourquoi Covoit'May ?
      </h2>
      <div class="row g-4">
        <div
          v-for="(a, i) in avantages"
          :key="i"
          class="col-md-6 col-lg-3 reveal"
          :class="[
            i % 2 === 0 ? 'reveal-gauche' : 'reveal-droite',
            'delai-' + (i + 1),
          ]"
        >
          <div class="card card-hover h-100 text-center p-3">
            <div class="card-body">
              <i class="bi fs-1 text-cm-primary" :class="a.icone"></i>
              <h3 class="h6 fw-bold mt-3">{{ a.titre }}</h3>
              <p class="small text-muted mb-0">{{ a.texte }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- APPEL POUR DEVENIR CONDUCTEUR -->
    <section id="driver-cta" class="bg-cm-primary text-white py-5">
      <div class="container text-center">
        <h2 class="h3 fw-bold mb-3 reveal reveal-zoom">
          Vous avez une voiture ?
        </h2>
        <p class="lead mb-4 text-white-75 reveal delai-1">
          Publiez vos trajets quotidiens et couvrez vos frais d'essence,<br
            class="d-none d-md-block"
          />
          sans que ce soit un métier.
        </p>
        <div class="reveal delai-2">
          <router-link
            to="/inscription?role=conducteur"
            class="btn btn-cm-accent btn-lg"
          >
            <i class="bi bi-car-front me-1"></i>Devenir conducteur
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>
