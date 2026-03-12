import { headers } from 'next/headers'
import BarbeariaPage from './barbearia-page'

const FALLBACK_ID = process.env.NEXT_PUBLIC_BARBEARIA_ID || 'fc398d1d-9c4e-4a93-9d45-8ebbaa1cf39a'

export default async function Page() {
  const h = await headers()
  const barbeariaId = h.get('x-barbearia-id') || FALLBACK_ID

  return <BarbeariaPage barbeariaId={barbeariaId} />
}
