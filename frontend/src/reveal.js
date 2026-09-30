// ============================================================
// Petit script d'animation au scroll (niveau débutant)
// ------------------------------------------------------------
// Principe :
// 1. Dans le HTML, on met la classe "reveal" sur un élément
//    (et en option "reveal-gauche", "reveal-droite" ou "reveal-zoom").
// 2. Au départ, le CSS rend ces éléments invisibles.
// 3. Quand l'élément devient visible à l'écran (grâce à
//    IntersectionObserver, un outil fourni par le navigateur),
//    on lui ajoute la classe "visible".
// 4. Le CSS fait alors une transition douce vers l'état normal.
// ============================================================

let observateur = null;

function obtenirObservateur() {
  if (
    observateur ||
    typeof window === "undefined" ||
    !("IntersectionObserver" in window)
  ) {
    return observateur;
  }

  observateur = new IntersectionObserver(
    function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add("visible");
          observateur.unobserve(entree.target);
        }
      });
    },
    { threshold: 0.01 },
  );

  return observateur;
}

// Fonction à appeler après chaque changement de page :
// elle trouve tous les éléments .reveal et les fait surveiller
export function activerReveal() {
  if (typeof document === "undefined") return;

  const lancer = function () {
    const elements = document.querySelectorAll(".reveal:not(.visible)");
    const observateurActif = obtenirObservateur();

    elements.forEach(function (element) {
      if (observateurActif) {
        observateurActif.observe(element);
      } else {
        element.classList.add("visible");
      }
    });
  };

  // Laisser Vue terminer le rendu de la vue et de ses données calculées.
  window.requestAnimationFrame(lancer);
}
