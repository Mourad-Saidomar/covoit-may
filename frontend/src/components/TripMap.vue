<script>
// ============================================================
// Composant TripMap : la carte d'un trajet (page détail)
// ------------------------------------------------------------
// L'itinéraire suit les routes : il est calculé par OSRM
// (router.project-osrm.org), un service gratuit basé sur les
// données OpenStreetMap. Il donne le tracé, la distance et la
// durée. Si le service ne répond pas, on trace une ligne droite
// en pointillés (« à vol d'oiseau ») et on le signale.
//
// Note : le serveur de démonstration d'OSRM convient à un projet
// comme celui-ci ; un vrai site utiliserait son propre serveur
// ou un service payant.
// ============================================================
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CENTRE_MAYOTTE, COORDONNEES_COMMUNES } from '../data/mapData'

// Les itinéraires déjà calculés (pour ne pas redemander le même)
const itinerairesEnCache = {}

// Demande l'itinéraire routier entre deux points [latitude, longitude]
async function chercherItineraire(depart, arrivee, signal) {
  const cle = depart.join(',') + ';' + arrivee.join(',')
  if (itinerairesEnCache[cle]) return itinerairesEnCache[cle]

  // OSRM attend "longitude,latitude"
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    depart[1] + ',' + depart[0] + ';' + arrivee[1] + ',' + arrivee[0] +
    '?overview=full&geometries=geojson'
  const reponse = await fetch(url, { signal: signal })
  const resultat = await reponse.json()
  if (resultat.code !== 'Ok' || !resultat.routes.length) {
    throw new Error('Itinéraire introuvable')
  }
  const route = resultat.routes[0]
  const itineraire = {
    // GeoJSON donne [longitude, latitude] : on inverse pour Leaflet
    points: route.geometry.coordinates.map(function (c) {
      return [c[1], c[0]]
    }),
    distance: route.distance, // en mètres
    duree: route.duration // en secondes
  }
  itinerairesEnCache[cle] = itineraire
  return itineraire
}

export default {
  name: 'TripMap',

  props: {
    trip: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      map: null,
      layers: null,
      // 'chargement' | 'route' | 'vol-oiseau'
      etat: 'chargement',
      distance: 0,
      duree: 0,
      controleur: null
    }
  },

  computed: {
    // "15,1 km par la route, environ 21 min"
    resume() {
      const km = (this.distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
      const minutes = Math.round(this.duree / 60)
      let temps = minutes + ' min'
      if (minutes >= 60) {
        temps = Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0')
      }
      return km + ' km par la route, environ ' + temps
    }
  },

  mounted() {
    this.creerCarte()
  },

  beforeUnmount() {
    if (this.controleur) this.controleur.abort()
    if (this.map) this.map.remove()
  },

  watch: {
    trip: {
      deep: true,
      handler() {
        this.afficherItineraire()
      }
    }
  },

  methods: {
    creerCarte() {
      this.map = L.map(this.$refs.carte, {
        scrollWheelZoom: false,
        zoomControl: true
      }).setView(CENTRE_MAYOTTE, 11)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; contributeurs OpenStreetMap, itinéraire OSRM'
      }).addTo(this.map)

      this.layers = L.layerGroup().addTo(this.map)
      this.afficherItineraire()
    },

    async afficherItineraire() {
      if (!this.map || !this.layers) return
      this.layers.clearLayers()

      const depart = COORDONNEES_COMMUNES[this.trip.depart]
      const arrivee = COORDONNEES_COMMUNES[this.trip.arrivee]
      if (!depart || !arrivee) {
        this.map.setView(CENTRE_MAYOTTE, 10)
        return
      }

      this.ajouterReperes(depart, arrivee)
      this.map.fitBounds(L.latLngBounds([depart, arrivee]), { padding: [40, 40], maxZoom: 13 })

      // On annule une éventuelle demande précédente
      if (this.controleur) this.controleur.abort()
      this.controleur = new AbortController()
      this.etat = 'chargement'

      try {
        const itineraire = await chercherItineraire(depart, arrivee, this.controleur.signal)
        this.distance = itineraire.distance
        this.duree = itineraire.duree
        this.etat = 'route'
        // On redessine tout : le tracé d'abord, les repères par-dessus.
        // Un liseré blanc sous la ligne verte la détache du fond de carte.
        this.layers.clearLayers()
        L.polyline(itineraire.points, { color: '#fff', weight: 9, opacity: 0.9 }).addTo(this.layers)
        const trace = L.polyline(itineraire.points, { color: '#2d6c58', weight: 5 }).addTo(this.layers)
        this.ajouterReperes(depart, arrivee)
        this.map.fitBounds(trace.getBounds(), { padding: [40, 40], maxZoom: 14 })
      } catch (erreur) {
        if (erreur.name === 'AbortError') return // demande annulée : rien à faire
        this.etat = 'vol-oiseau'
        L.polyline([depart, arrivee], { color: '#2d6c58', weight: 4, dashArray: '8 8' }).addTo(this.layers)
      }
    },

    // Rond vert au départ, rond corail à l'arrivée
    ajouterReperes(depart, arrivee) {
      L.circleMarker(depart, {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#2d6c58',
        fillOpacity: 1
      }).bindPopup(`<strong>Départ</strong><br>${this.trip.depart}`).addTo(this.layers)

      L.circleMarker(arrivee, {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#f57b57',
        fillOpacity: 1
      }).bindPopup(`<strong>Arrivée</strong><br>${this.trip.arrivee}`).addTo(this.layers)
    }
  }
}
</script>

<template>
  <section class="trip-map" aria-labelledby="trip-map-title">
    <div class="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-2">
      <h2 id="trip-map-title" class="h6 fw-bold mb-0">
        <i class="bi bi-map me-1 text-cm-primary"></i>Itinéraire sur la carte
      </h2>
      <span class="small text-muted" aria-live="polite">
        <template v-if="etat === 'chargement'">Calcul de l'itinéraire…</template>
        <template v-else-if="etat === 'route'">{{ resume }}</template>
        <template v-else>Itinéraire routier indisponible : tracé à vol d'oiseau</template>
      </span>
    </div>
    <div ref="carte" class="trip-map-canvas" aria-label="Carte interactive de l'itinéraire"></div>
  </section>
</template>

<style scoped>
.trip-map-canvas {
  height: 420px;
  border: 1px solid #dce6df;
  border-radius: 0.9rem;
  overflow: hidden;
}

@media (max-width: 575.98px) {
  .trip-map-canvas {
    height: 320px;
  }
}
</style>
