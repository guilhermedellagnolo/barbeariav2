// ─── Session Store ──────────────────────────────────────────────────────────
// Armazena os IDs da sessão atual do barbeiro logado.
// Usado pelos services para filtrar queries por barbearia/barbeiro.
// ────────────────────────────────────────────────────────────────────────────

let _barbeariaId: string | null = null
let _barbeiroId: string | null = null
let _barbeiroNome: string | null = null

export function setSessionIds(barbeariaId: string, barbeiroId: string, barbeiroNome?: string) {
  _barbeariaId = barbeariaId
  _barbeiroId = barbeiroId
  _barbeiroNome = barbeiroNome || null
}

export function clearSession() {
  _barbeariaId = null
  _barbeiroId = null
  _barbeiroNome = null
}

export function getBarbeariaId(): string {
  if (!_barbeariaId) throw new Error("Sessão não inicializada. Faça login primeiro.")
  return _barbeariaId
}

export function getBarbeiroId(): string {
  if (!_barbeiroId) throw new Error("Sessão não inicializada. Faça login primeiro.")
  return _barbeiroId
}

export function getBarbeiroNome(): string | null {
  return _barbeiroNome
}

export function isSessionReady(): boolean {
  return _barbeariaId !== null && _barbeiroId !== null
}
