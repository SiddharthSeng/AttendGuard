/**
 * Backup & Restore IPC handlers.
 *
 * backup:export  → returns the raw SQLite file bytes as a base64 string.
 *                  The renderer writes it to disk via a save-dialog.
 *
 * backup:import  → accepts a base64-encoded SQLite file, validates it,
 *                  atomically replaces the live DB, and triggers a full reload.
 *
 * Why base64 through IPC?  We avoid touching the filesystem from the renderer
 * (no Node.js in renderer) — the main process owns file I/O, and base64 fits
 * comfortably inside a structured-clone IPC message for typical DB sizes (<50 MB).
 */
import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDb } from '../database'

const DB_HEADER = 'SQLite format 3\x00' // first 16 bytes of every valid SQLite file

export function registerBackupHandlers(): void {

  // ── Export: write a WAL checkpoint then stream bytes as base64 ────────────
  ipcMain.handle('backup:export', async () => {
    const db = getDb()

    // Force a WAL checkpoint so the file is fully consistent
    db.pragma('wal_checkpoint(FULL)')

    const dbPath = path.join(app.getPath('userData'), 'attendguard.db')
    const bytes  = fs.readFileSync(dbPath)
    return Buffer.from(bytes).toString('base64')
  })

  // ── Import: validate, atomically swap, reload ─────────────────────────────
  ipcMain.handle('backup:import', async (_e, base64: string) => {
    // 1. Decode
    let bytes: Buffer
    try {
      bytes = Buffer.from(base64, 'base64')
    } catch {
      throw new Error('Invalid backup data — could not decode.')
    }

    // 2. Validate SQLite magic header
    const magic = bytes.slice(0, 16).toString('binary')
    if (magic !== DB_HEADER) {
      throw new Error('File does not appear to be a valid SQLite database.')
    }

    // 3. Write to a temporary path first, then atomically rename
    const dbPath  = path.join(app.getPath('userData'), 'attendguard.db')
    const tmpPath = dbPath + '.import.tmp'

    try {
      fs.writeFileSync(tmpPath, bytes)

      // 4. Close the current DB connection (close releases the WAL lock)
      const db = getDb()
      db.close()

      // 5. Atomically replace
      fs.renameSync(tmpPath, dbPath)
    } catch (err) {
      // Clean up temp file on failure
      try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }
      throw err
    }

    // 6. Prompt a full app restart — simplest way to re-init the DB cleanly
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      const choice = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Backup restored',
        message: 'Backup was restored successfully. The app needs to restart to load the new data.',
        buttons: ['Restart now', 'Later']
      })
      if (choice.response === 0) {
        app.relaunch()
        app.exit(0)
      }
    }

    return { ok: true }
  })
}
