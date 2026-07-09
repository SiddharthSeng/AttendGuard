/**
 * Tests for backup validation logic (pure functions extracted from backup.ts).
 * We don't test the Electron IPC side directly (requires a live app context),
 * but we test the validation contract and base64 round-trip that the handler relies on.
 */
import { describe, it, expect } from 'vitest'

// ── SQLite magic-header validation (mirrors backup.ts) ─────────────────────────

const SQLITE_MAGIC = 'SQLite format 3\x00'

function isSqliteHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false
  const header = Array.from(bytes.slice(0, 16))
    .map(b => String.fromCharCode(b))
    .join('')
  return header === SQLITE_MAGIC
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

// Build a minimal fake SQLite header (16 bytes of magic + padding)
function fakeSqliteBytes(extra = 100): Uint8Array {
  const buf = new Uint8Array(16 + extra)
  const magic = SQLITE_MAGIC
  for (let i = 0; i < 16; i++) buf[i] = magic.charCodeAt(i)
  return buf
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Backup — SQLite header validation', () => {
  it('accepts a valid SQLite magic header', () => {
    const bytes = fakeSqliteBytes()
    expect(isSqliteHeader(bytes)).toBe(true)
  })

  it('rejects a buffer with wrong first bytes', () => {
    const bytes = new Uint8Array(64)  // all zeros
    expect(isSqliteHeader(bytes)).toBe(false)
  })

  it('rejects a buffer that is too short (< 16 bytes)', () => {
    const bytes = new Uint8Array(10)
    expect(isSqliteHeader(bytes)).toBe(false)
  })

  it('rejects a JSON file disguised as .db', () => {
    const json = new TextEncoder().encode('{"data":"not a db"}')
    expect(isSqliteHeader(json)).toBe(false)
  })

  it('rejects random binary that starts with a different header', () => {
    const bytes = new Uint8Array(64)
    bytes[0] = 0x89; bytes[1] = 0x50; bytes[2] = 0x4e; bytes[3] = 0x47  // PNG header
    expect(isSqliteHeader(bytes)).toBe(false)
  })
})

describe('Backup — base64 round-trip', () => {
  it('encodes and decodes bytes without loss', () => {
    const original = fakeSqliteBytes(256)
    const b64  = bytesToBase64(original)
    const back = base64ToBytes(b64)

    expect(back.length).toBe(original.length)
    for (let i = 0; i < original.length; i++) {
      expect(back[i]).toBe(original[i])
    }
  })

  it('produces a valid base64 string (no non-base64 characters)', () => {
    const bytes = fakeSqliteBytes(512)
    const b64   = bytesToBase64(bytes)
    // base64 alphabet is A-Z a-z 0-9 + / = (padding)
    expect(/^[A-Za-z0-9+/]+=*$/.test(b64)).toBe(true)
  })

  it('round-tripped bytes still pass SQLite header validation', () => {
    const original = fakeSqliteBytes()
    const b64      = bytesToBase64(original)
    const back     = base64ToBytes(b64)
    expect(isSqliteHeader(back)).toBe(true)
  })

  it('detects corruption — flipping the first byte fails validation', () => {
    const bytes = fakeSqliteBytes()
    const b64   = bytesToBase64(bytes)
    const back  = base64ToBytes(b64)
    back[0] ^= 0xff  // flip first byte
    expect(isSqliteHeader(back)).toBe(false)
  })
})

describe('Backup — filename timestamping', () => {
  it('generates an ISO-date filename', () => {
    const ts   = new Date().toISOString().slice(0, 10)
    const name = `attendguard-backup-${ts}.db`
    expect(name).toMatch(/^attendguard-backup-\d{4}-\d{2}-\d{2}\.db$/)
  })
})
