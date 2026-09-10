/// <reference types="vite/client" />
import type { DimeApi } from '../../shared/types'
declare global { interface Window { dime: DimeApi } }
export {}
