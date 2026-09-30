<script>
// ============================================================
// Page d'information (à propos, CGU, confidentialité, cadre légal)
// ------------------------------------------------------------
// Une seule page pour les quatre : la route indique laquelle
// afficher (meta.page), et le texte vient de data/pagesInfo.js.
// À gauche, le sommaire de la page ; à droite, le texte.
// ============================================================
import { PAGES_INFO } from "../data/pagesInfo";

// Les quatre pages, dans l'ordre du pied de page
const LIENS = [
  { page: "a-propos", route: "about", titre: "À propos" },
  { page: "conditions-generales", route: "terms", titre: "Conditions générales" },
  { page: "confidentialite", route: "privacy", titre: "Confidentialité" },
  { page: "cadre-legal", route: "legal", titre: "Cadre légal" },
];

export default {
  name: "InfoView",

  computed: {
    // Le contenu de la page demandée
    contenu() {
      return PAGES_INFO[this.$route.meta.page];
    },
    // Les autres pages d'information (« À lire aussi »)
    autresPages() {
      return LIENS.filter((lien) => lien.page !== this.$route.meta.page);
    },
  },
};
</script>

<template>
  <div id="info-page" class="info-page">
    <header class="info-entete">
      <div class="container">
        <h1 class="info-titre">{{ contenu.titre }}</h1>
        <p class="info-intro">{{ contenu.intro }}</p>
      </div>
    </header>

    <div class="container py-5">
      <div class="row g-5">
        <!-- Sommaire (grand écran) -->
        <nav class="col-lg-3 d-none d-lg-block" aria-label="Sommaire de la page">
          <div class="info-sommaire">
            <p class="info-sommaire-titre">Sur cette page</p>
            <a
              v-for="s in contenu.sections"
              :key="s.id"
              :href="'#' + s.id"
              class="info-sommaire-lien"
              >{{ s.titre }}</a
            >
          </div>
        </nav>

        <article class="col-lg-9 info-texte">
          <p v-if="contenu.juridique" class="info-avertissement">
            Texte de démonstration rédigé pour le projet Covoit'May. Il doit
            être relu par un juriste avant une vraie mise en ligne.
          </p>

          <section
            v-for="s in contenu.sections"
            :id="s.id"
            :key="s.id"
            class="info-section"
          >
            <h2>{{ s.titre }}</h2>
            <p v-for="(p, i) in s.paragraphes" :key="i">{{ p }}</p>
            <ul v-if="s.liste">
              <li v-for="(element, i) in s.liste" :key="i">{{ element }}</li>
            </ul>
          </section>

          <footer class="info-voir-aussi">
            <h2>À lire aussi</h2>
            <router-link
              v-for="lien in autresPages"
              :key="lien.page"
              :to="{ name: lien.route }"
              >{{ lien.titre }}</router-link
            >
          </footer>
        </article>
      </div>
    </div>
  </div>
</template>
