import {createRouter, createWebHashHistory } from 'vue-router'
import HeroView from '../views/hero.vue'
import HeaderView from '../views/header.vue'
import FooterView from '../views/footer.vue'


const routes = [
    {
        path: '/',
        name: 'home',
        component: HeroView
    },

    {
        path: '/about',
        name: 'about',
        component: HeaderView
    },

    {
        path: '/contact',
        name: 'contact',
        component: FooterView
    }

]




const router = createRouter({
    history: createWebHashHistory(),
    base: import.meta.env.BASE_URL,
    routes
})

export default router