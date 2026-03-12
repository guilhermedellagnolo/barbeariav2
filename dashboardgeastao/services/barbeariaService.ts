import { supabase } from "@/lib/supabase"
import type { Barbearia, BarbeariaRow, BarbeiroRow, NovaBarbearia } from "@/lib/types"

// ─── Helpers de transformacao ──────────────────────────────────────────────────

function rowToBarbearia(
  row: BarbeariaRow,
  barbeiros: BarbeiroRow[],
  totalAgendamentos: number
): Barbearia {
  return {
    id: row.id,
    nome: row.nome,
    subdominio: row.subdominio,
    dominio_customizado: row.dominio_customizado || undefined,
    slogan_principal: row.slogan_principal || "",
    descricao_hero: row.descricao_hero || "",
    descricao_rodape: row.descricao_rodape || "",
    endereco: row.endereco || "",
    telefone: row.telefone || "",
    horarios_texto: row.horarios_texto || "",
    ano_fundacao: row.ano_fundacao ? parseInt(row.ano_fundacao, 10) : new Date().getFullYear(),
    foto_fundo_url: row.foto_fundo_url || "",
    fotos_galeria: row.fotos_galeria || [],
    plano: row.plano as Barbearia["plano"],
    valor_mensalidade: row.valor_mensalidade ?? 0,
    data_vencimento: row.data_vencimento || "",
    status_pagamento: row.status_pagamento as Barbearia["status_pagamento"],
    email_responsavel: row.email_responsavel || "",
    telefone_responsavel: row.telefone_responsavel || "",
    observacoes: row.observacoes || "",
    ativo: row.ativo,
    barbeiros: barbeiros.map((b) => ({
      id: b.id,
      nome: b.nome,
      foto_url: b.foto_url || "",
      ativo: b.ativo ?? true,
    })),
    total_agendamentos: totalAgendamentos,
  }
}

// ─── Fetch All (via API Route) ────────────────────────────────────────────────

export async function fetchBarbearias(): Promise<Barbearia[]> {
  const res = await fetch("/api/admin/barbearias", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || "Erro ao buscar barbearias")
  }

  const data = await res.json()
  return data as Barbearia[]
}

// ─── Fetch Single (Client-side direto para leitura rapida) ────────────────────
// Mantemos leitura direta pois RLS permitira SELECT publico
export async function fetchBarbeariaById(id: string): Promise<Barbearia | null> {
  const { data: row, error } = await supabase
    .from("barbearias")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !row) return null

  const { data: barbeiros } = await supabase
    .from("barbeiros")
    .select("id, barbearia_id, nome, foto_url, ativo")
    .eq("barbearia_id", id)

  const { count } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("barbearia_id", id)

  return rowToBarbearia(
    row as BarbeariaRow,
    (barbeiros || []) as BarbeiroRow[],
    count || 0
  )
}

// ─── Create (via API Route) ───────────────────────────────────────────────────

export async function createBarbearia(data: NovaBarbearia): Promise<Barbearia> {
  const res = await fetch("/api/admin/barbearias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", data }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || "Erro ao criar barbearia")
  }

  const result = await res.json()
  
  // Retornar o objeto completo buscando-o novamente
  const created = await fetchBarbeariaById(result.id)
  if (!created) throw new Error("Barbearia criada mas não encontrada")
  return created
}

// ─── Update (via API Route) ───────────────────────────────────────────────────

export async function updateBarbearia(barbearia: Barbearia): Promise<void> {
  const res = await fetch("/api/admin/barbearias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", data: barbearia }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || "Erro ao atualizar barbearia")
  }
}

// ─── Toggle Ativo (via API Route) ─────────────────────────────────────────────

export async function toggleAtivo(id: string, ativo: boolean): Promise<void> {
  const res = await fetch("/api/admin/barbearias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      action: "toggle", 
      data: { id, ativo } 
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || "Erro ao alterar status")
  }
}
