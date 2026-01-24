import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Chat from '../views/Chat.vue'
import SessionList from '../views/SessionList.vue'
import ModelManagement from '../views/ModelManagement.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
    {
        path: '/chat/:characterId',
        name: 'Chat',
        component: Chat,
    },
    {
        path: '/sessions',
        name: 'Sessions',
        component: SessionList,
    },
    {
        path: '/models',
        name: 'ModelManagement',
        component: ModelManagement,
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
