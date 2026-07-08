import { ElectronAPI } from '@electron-toolkit/preload'
import type { AttendGuardAPI } from '../../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    attendGuard: AttendGuardAPI
  }
}
