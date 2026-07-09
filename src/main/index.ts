import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { registerSemesterHandlers } from './ipc/semesters'
import { registerCourseHandlers } from './ipc/courses'
import { registerAttendanceHandlers } from './ipc/attendance'
import { registerHolidayHandlers } from './ipc/holidays'
import { registerReminderHandlers, startMidnightReschedule } from './reminders'
import { registerBackupHandlers } from './ipc/backup'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.attendguard.app')

  // Initialize SQLite database
  initDatabase()

  // Register all IPC handlers
  registerSemesterHandlers()
  registerCourseHandlers()
  registerAttendanceHandlers()
  registerHolidayHandlers()
  registerReminderHandlers()
  registerBackupHandlers()

  // Schedule class reminders (fires today's; reschedules each midnight)
  startMidnightReschedule()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
