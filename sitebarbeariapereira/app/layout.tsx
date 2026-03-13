import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const barbeariaId = h.get('x-barbearia-id')

  let nome = 'Barbearia'
  let slogan = 'Agendamento Online'

  if (barbeariaId) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('barbearias')
        .select('nome, slogan_principal')
        .eq('id', barbeariaId)
        .single()

      if (data?.nome) nome = data.nome
      if (data?.slogan_principal) slogan = data.slogan_principal
    } catch {
      // fallback silencioso — metadata default
    }
  }

  return {
    title: `${nome} | ${slogan}`,
    description: `Agende seu corte de cabelo na ${nome}. Atendimento premium.`,
    generator: 'v0.app',
    // icons removidos para usar icon.tsx gerado dinamicamente
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
