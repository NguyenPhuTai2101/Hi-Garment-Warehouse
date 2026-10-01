import { createRouter, createWebHashHistory } from 'vue-router'
import ReceivingView from '../views/ReceivingView.vue'
import CartonListView from '../views/CartonListView.vue'
import PutawayView from '../views/PutawayView.vue'
import LookupView from '../views/LookupView.vue'
import InspectionListView from '../views/InspectionListView.vue'

const routes = [
  { path: '/', redirect: '/receiving' },
  { path: '/receiving', name: 'Receiving', component: ReceivingView },
  { path: '/cartons', name: 'Cartons', component: CartonListView },
  { path: '/putaway', name: 'Putaway', component: PutawayView },
  { path: '/lookup', name: 'Lookup', component: LookupView },
  { path: '/orders', name: 'Orders', component: InspectionListView }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
