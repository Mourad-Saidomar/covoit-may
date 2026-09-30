<script>
// ============================================================
// Composant HeroCarte : la carte de Mayotte de l'accueil
// ------------------------------------------------------------
// Elle reprend l'idée du logo (l'île traversée par une route) :
// - l'île et son lagon (tracé IGN, voir carteMayotte.js) ;
// - en traits fins, les trajets proposés, parcourus par de petits
//   points (le « trafic ») ;
// - en grand, le trajet mis en avant : celui que la personne tape
//   dans la recherche, sinon les trajets proposés, l'un après
//   l'autre (toutes les 6 secondes). Une petite voiture le parcourt.
// Les villages sont placés grâce à leurs coordonnées GPS
// (mapData.js), converties en positions sur le dessin.
// Si la personne a demandé « moins d'animations », tout reste fixe.
// ============================================================
import { useDataStore } from "../stores/data";
import { COORDONNEES_COMMUNES, CENTRE_MAYOTTE } from "../data/mapData";
import {
  LARGEUR,
  HAUTEUR,
  TRACE_ILES,
  projeter,
} from "../data/carteMayotte";

// Durée d'affichage de chaque trajet proposé (en millisecondes)
const DUREE_PAR_TRAJET = 6000;

// Écrit un texte sans accents, sans majuscules et sans espaces
// autour, pour que "dembeni" corresponde à "Dembéni".
function simplifier(texte) {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Retrouve le nom exact d'un village à partir de ce qui est tapé.
// Renvoie null si le texte ne correspond à aucun village connu.
function trouverVillage(texte) {
  if (!texte) return null;
  const cherche = simplifier(texte);
  const trouve = Object.keys(COORDONNEES_COMMUNES).find(function (nom) {
    return simplifier(nom) === cherche;
  });
  return trouve || null;
}

// Distance entre deux points du dessin
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// La personne a-t-elle demandé moins d'animations (réglage système) ?
function mouvementReduitDemande() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default {
  name: "HeroCarte",

  props: {
    // Ce qui est tapé dans les champs Départ et Arrivée
    depart: { type: String, default: "" },
    arrivee: { type: String, default: "" },
  },

  data() {
    return {
      largeur: LARGEUR,
      hauteur: HAUTEUR,
      traceIles: TRACE_ILES,
      centre: projeter(CENTRE_MAYOTTE),
      mouvementReduit: mouvementReduitDemande(),
      // Numéro du trajet proposé mis en avant (il avance tout seul)
      indexDefilement: 0,
      minuteur: null,
    };
  },

  computed: {
    data() {
      return useDataStore();
    },
    // Les trajets ouverts (chargés depuis l'API par l'accueil),
    // du plus proche au plus lointain
    trajets() {
      return this.data.trajetsAVenir
        .slice()
        .sort(function (a, b) {
          return new Date(a.dateDepart) - new Date(b.dateDepart);
        });
    },
    villageDepart() {
      return trouverVillage(this.depart);
    },
    villageArrivee() {
      return trouverVillage(this.arrivee);
    },
    // Vrai quand la personne a commencé à taper un village connu
    rechercheEnCours() {
      return this.villageDepart !== null || this.villageArrivee !== null;
    },
    // Tous les trajets proposés, un seul par couple de villages
    // (même si le trajet existe dans les deux sens)
    reseau() {
      const traits = [];
      const dejaVus = [];
      this.trajets.forEach((t) => {
        const cle = [t.depart, t.arrivee].sort().join("-");
        const connus =
          COORDONNEES_COMMUNES[t.depart] && COORDONNEES_COMMUNES[t.arrivee];
        if (connus && !dejaVus.includes(cle)) {
          dejaVus.push(cle);
          traits.push({
            cle: cle,
            depart: t.depart,
            arrivee: t.arrivee,
            d: this.courbe(t.depart, t.arrivee),
            // plus le trait est long, plus le « trafic » met de temps
            duree: this.dureeParcours(t.depart, t.arrivee),
          });
        }
      });
      return traits;
    },
    // Le parcours dessiné en grand : { depart, arrivee } ou null
    parcours() {
      if (this.villageDepart && this.villageArrivee) {
        if (this.villageDepart === this.villageArrivee) return null;
        return { depart: this.villageDepart, arrivee: this.villageArrivee };
      }
      // La personne a commencé à taper : on montre seulement ses repères
      if (this.rechercheEnCours) return null;
      // Sinon : les trajets proposés, l'un après l'autre
      if (this.reseau.length === 0) return null;
      const trait = this.reseau[this.indexDefilement % this.reseau.length];
      return { depart: trait.depart, arrivee: trait.arrivee };
    },
    // Le chemin SVG du parcours mis en avant
    route() {
      if (!this.parcours) return null;
      return {
        cle: this.parcours.depart + "-" + this.parcours.arrivee,
        d: this.courbe(this.parcours.depart, this.parcours.arrivee),
        duree: this.dureeParcours(this.parcours.depart, this.parcours.arrivee),
      };
    },
    // Un petit point pour chaque village
    villages() {
      return Object.keys(COORDONNEES_COMMUNES).map(function (nom) {
        const point = projeter(COORDONNEES_COMMUNES[nom]);
        return { nom: nom, x: point.x, y: point.y };
      });
    },
    // Les repères : épingle au départ, rond à l'arrivée (comme le logo)
    reperes() {
      const depart = this.parcours ? this.parcours.depart : this.villageDepart;
      const arrivee = this.parcours ? this.parcours.arrivee : this.villageArrivee;
      const liste = [];
      if (depart) {
        liste.push({ type: "depart", nom: depart, ...projeter(COORDONNEES_COMMUNES[depart]) });
      }
      if (arrivee) {
        liste.push({ type: "arrivee", nom: arrivee, ...projeter(COORDONNEES_COMMUNES[arrivee]) });
      }
      return liste;
    },
  },

  watch: {
    // Nouveau parcours : la voiture repart quand la route est dessinée
    "route.cle"() {
      this.lancerVoiture();
    },
  },

  mounted() {
    this.lancerVoiture();
    if (!this.mouvementReduit) {
      this.minuteur = setInterval(() => {
        // On ne change pas de trajet pendant que la personne tape le sien
        if (!this.rechercheEnCours) this.indexDefilement++;
      }, DUREE_PAR_TRAJET);
    }
  },

  beforeUnmount() {
    clearInterval(this.minuteur);
  },

  methods: {
    // Courbe douce entre deux villages. Elle est bombée vers le
    // centre de l'île pour rester sur la terre plutôt qu'en mer.
    courbe(nomA, nomB) {
      const a = projeter(COORDONNEES_COMMUNES[nomA]);
      const b = projeter(COORDONNEES_COMMUNES[nomB]);
      const longueur = distance(a, b) || 1;
      const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // Direction perpendiculaire au segment a-b
      const nx = -(b.y - a.y) / longueur;
      const ny = (b.x - a.x) / longueur;
      const bosse = longueur * 0.2;
      let controle = { x: milieu.x + nx * bosse, y: milieu.y + ny * bosse };
      const autreCote = { x: milieu.x - nx * bosse, y: milieu.y - ny * bosse };
      if (distance(autreCote, this.centre) < distance(controle, this.centre)) {
        controle = autreCote;
      }
      return (
        "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) +
        "Q" + controle.x.toFixed(1) + " " + controle.y.toFixed(1) +
        " " + b.x.toFixed(1) + " " + b.y.toFixed(1)
      );
    },

    // Durée d'un parcours pour les animations : environ 1 seconde
    // pour 50 unités du dessin, jamais moins de 2,5 secondes
    dureeParcours(nomA, nomB) {
      const a = projeter(COORDONNEES_COMMUNES[nomA]);
      const b = projeter(COORDONNEES_COMMUNES[nomB]);
      return Math.max(2.5, distance(a, b) / 50).toFixed(1) + "s";
    },

    // La voiture démarre une fois la route dessinée (1,7 s).
    // beginElementAt lance l'animation SVG <animateMotion>.
    lancerVoiture() {
      this.$nextTick(() => {
        const mouvement = this.$refs.mouvementVoiture;
        if (mouvement && mouvement.beginElementAt) {
          mouvement.beginElementAt(1.7);
        }
      });
    },

    // Place le nom d'un repère à côté de lui, du côté de la mer
    // (à droite pour l'est de l'île, à gauche pour l'ouest). S'il
    // sortirait du cadre de la carte, il passe au-dessus du repère.
    etiquette(repere) {
      const largeurNom = repere.nom.length * 8 + 16; // estimation
      // Pour l'épingle, le nom s'aligne sur sa tête ronde
      const hauteurTete = repere.type === "depart" ? 16 : 0;
      const aDroite = repere.x > this.centre.x;
      const tientADroite = repere.x + 14 + largeurNom <= this.largeur;
      const tientAGauche = repere.x - 14 - largeurNom >= 0;

      if ((aDroite && tientADroite) || (!aDroite && tientAGauche)) {
        const x = repere.x + (aDroite ? 14 : -14);
        return {
          left: (x / this.largeur) * 100 + "%",
          top: ((repere.y - hauteurTete) / this.hauteur) * 100 + "%",
          transform: aDroite ? "translateY(-50%)" : "translate(-100%, -50%)",
        };
      }
      // Pas la place sur le côté : au-dessus, centré sur le repère
      return {
        left: (repere.x / this.largeur) * 100 + "%",
        top: ((repere.y - hauteurTete - 14) / this.hauteur) * 100 + "%",
        transform: "translate(-50%, -100%)",
      };
    },
  },
};
</script>

<template>
  <figure class="hero-carte">
    <div class="hero-carte-cadre">
      <svg
        class="hero-carte-dessin"
        :viewBox="'0 0 ' + largeur + ' ' + hauteur"
        aria-hidden="true"
        focusable="false"
      >
        <!-- Le lagon : un large contour clair autour des îles -->
        <path class="hero-carte-recif" :d="traceIles" />
        <path class="hero-carte-lagon" :d="traceIles" />
        <path class="hero-carte-ile" :d="traceIles" />

        <!-- Les trajets proposés -->
        <path
          v-for="(trait, i) in reseau"
          :id="'hc-trait-' + i"
          :key="trait.cle"
          class="hero-carte-trajet"
          :d="trait.d"
        />

        <!-- Le « trafic » : un point fait l'aller-retour sur chaque
             trajet proposé (animation SVG <animateMotion> qui suit
             le chemin indiqué par <mpath>). Tous partent tout de suite
             (sinon ils attendraient dans le coin du dessin) ; leurs
             durées différentes suffisent à les décaler. -->
        <template v-if="!mouvementReduit">
          <circle
            v-for="(trait, i) in reseau"
            :key="'trafic-' + trait.cle"
            class="hero-carte-trafic"
            r="2.4"
          >
            <animateMotion
              :dur="parseFloat(trait.duree) * 2 + i * 0.7 + 's'"
              begin="0s"
              repeatCount="indefinite"
              keyPoints="0;1;0"
              keyTimes="0;0.5;1"
              calcMode="linear"
            >
              <mpath :href="'#hc-trait-' + i" />
            </animateMotion>
          </circle>
        </template>

        <!-- Les villages -->
        <circle
          v-for="v in villages"
          :key="v.nom"
          class="hero-carte-village"
          :cx="v.x"
          :cy="v.y"
          r="2.6"
        />

        <!-- Le parcours mis en avant, dessiné comme la route du logo.
             Le masque le révèle du départ vers l'arrivée (animation
             "tracer" dans main.css). La clé :key recrée le groupe
             quand le parcours change : l'animation recommence. -->
        <g v-if="route" :key="route.cle">
          <path id="hc-route" :d="route.d" fill="none" />
          <mask id="hero-carte-masque" maskUnits="userSpaceOnUse">
            <path class="hero-carte-trace" :d="route.d" pathLength="1" />
          </mask>
          <g mask="url(#hero-carte-masque)">
            <path class="hero-carte-route" :d="route.d" />
            <path class="hero-carte-route-ligne" :d="route.d" />
          </g>

          <!-- La petite voiture qui parcourt la route (invisible avant
               son départ, lancé par lancerVoiture()) -->
          <g v-if="!mouvementReduit" class="hero-carte-voiture" opacity="0">
            <circle r="6" class="hero-carte-voiture-contour" />
            <circle r="3" class="hero-carte-voiture-centre" />
            <animateMotion
              id="hc-mouvement"
              ref="mouvementVoiture"
              :dur="route.duree"
              begin="indefinite"
              repeatCount="indefinite"
            >
              <mpath href="#hc-route" />
            </animateMotion>
            <set attributeName="opacity" to="1" begin="hc-mouvement.begin" />
          </g>
        </g>

        <!-- Repères : épingle au départ (avec une onde), rond à l'arrivée -->
        <g
          v-for="r in reperes"
          :key="r.type"
          :transform="'translate(' + r.x.toFixed(1) + ' ' + r.y.toFixed(1) + ')'"
        >
          <template v-if="r.type === 'depart'">
            <circle class="hero-carte-onde" cy="-16" r="9" />
            <path
              class="hero-carte-repere"
              d="M0 0C-2.5-5-9-9.5-9-16A9 9 0 1 1 9-16C9-9.5 2.5-5 0 0Z"
            />
            <circle class="hero-carte-repere-centre" cy="-16" r="3.6" />
          </template>
          <template v-else>
            <circle class="hero-carte-repere" r="8" />
            <circle class="hero-carte-repere-centre" r="3.4" />
          </template>
        </g>
      </svg>

      <!-- Noms des villages du parcours -->
      <span
        v-for="r in reperes"
        :key="'nom-' + r.type + '-' + r.nom"
        class="hero-carte-nom"
        :style="etiquette(r)"
        aria-hidden="true"
        >{{ r.nom }}</span
      >
    </div>
  </figure>
</template>
