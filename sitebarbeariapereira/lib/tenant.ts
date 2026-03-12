import { headers } from 'next/headers'

const FALLBACK_ID = process.env.NEXT_PUBLIC_BARBEARIA_ID || 'fc398d1d-9c4e-4a93-9d45-8ebbaa1cf39a'

/**
 * Extrai o barbearia_id do header x-barbearia-id injetado pelo middleware.
 * Uso exclusivo em Server Components e Server Actions.
 */
export async function getBarbeariaId(): Promise<string> {
  const h = await headers()
  return h.get('x-barbearia-id') || FALLBACK_ID
}
