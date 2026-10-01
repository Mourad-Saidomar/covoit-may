<!-- ============================================================
  Composant CodeVerification : saisie d'un code à 6 chiffres
  (reçu par email), une case par chiffre.
  - le curseur passe tout seul à la case suivante ;
  - coller « 123456 » remplit les 6 cases ;
  - Retour arrière dans une case vide revient à la précédente ;
  - sur téléphone : clavier numérique, et le code peut être proposé
    automatiquement (autocomplete="one-time-code").
  Utilisation : <CodeVerification v-model="code" @complet="valider" />
============================================================ -->
<template>
  <div class="code-verification" role="group" aria-label="Code à 6 chiffres">
    <input
      v-for="(chiffre, i) in chiffres"
      :key="i"
      :ref="(el) => (cases[i] = el)"
      class="code-case"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      maxlength="6"
      :autocomplete="i === 0 ? 'one-time-code' : 'off'"
      :aria-label="'Chiffre ' + (i + 1)"
      :value="chiffre"
      :disabled="desactive"
      @input="saisir(i, $event)"
      @keydown="touche(i, $event)"
      @paste.prevent="coller($event)"
      @focus="$event.target.select()"
    />
  </div>
</template>

<script>
export default {
  name: 'CodeVerification',

  props: {
    modelValue: { type: String, default: '' },
    desactive: { type: Boolean, default: false }
  },

  emits: ['update:modelValue', 'complet'],

  data() {
    return { cases: [] }
  },

  computed: {
    chiffres() {
      return Array.from({ length: 6 }, (_, i) => this.modelValue[i] || '')
    }
  },

  mounted() {
    this.$nextTick(() => this.cases[0] && this.cases[0].focus())
  },

  methods: {
    publier(valeur) {
      const code = valeur.replace(/\D/g, '').slice(0, 6)
      this.$emit('update:modelValue', code)
      if (code.length === 6) this.$emit('complet', code)
      return code
    },

    saisir(i, evenement) {
      const tape = evenement.target.value.replace(/\D/g, '')
      // Saisie automatique du téléphone : les 6 chiffres arrivent d'un coup
      if (tape.length > 1) {
        const code = this.publier(tape)
        this.cases[Math.min(code.length, 5)].focus()
        return
      }
      const tableau = this.chiffres.slice()
      tableau[i] = tape
      this.publier(tableau.join(''))
      evenement.target.value = tape
      if (tape && i < 5) this.cases[i + 1].focus()
    },

    touche(i, evenement) {
      if (evenement.key === 'Backspace' && !this.chiffres[i] && i > 0) {
        evenement.preventDefault()
        const tableau = this.chiffres.slice()
        tableau[i - 1] = ''
        this.publier(tableau.join(''))
        this.cases[i - 1].focus()
      } else if (evenement.key === 'ArrowLeft' && i > 0) {
        this.cases[i - 1].focus()
      } else if (evenement.key === 'ArrowRight' && i < 5) {
        this.cases[i + 1].focus()
      }
    },

    coller(evenement) {
      const code = this.publier((evenement.clipboardData || window.clipboardData).getData('text'))
      this.cases[Math.min(code.length, 5)].focus()
    }
  }
}
</script>
