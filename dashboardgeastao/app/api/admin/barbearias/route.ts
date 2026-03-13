import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"

// ─── POST: Criar Barbearia completa (barbearia + barbeiros + horários + auth) ──
export async function POST(request: NextRequest) {
  const supabase = getAdminClient()

  try {
    const body = await request.json()
    const { action, data } = body as { action: string; data: any }

    // ── ACTION: create ─────────────────────────────────────────────────────
    if (action === "create") {
      // 1. Criar contas auth para barbeiros
      const emailToUserId = new Map<string, string>()
      const authErrors: string[] = []
      for (const barber of data.barbeiros || []) {
        if (!barber.email || !barber.senha) continue
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: barber.email,
          password: barber.senha,
          email_confirm: true,
          user_metadata: { nome: barber.nome, role: "barbeiro" },
        })
        if (authError) {
          console.error(`[Admin] Erro auth ${barber.email}:`, authError.message)
          authErrors.push(`${barber.nome} (${barber.email}): ${authError.message}`)
        } else if (authData.user) {
          emailToUserId.set(barber.email, authData.user.id)
        }
      }

      // Se NENHUMA conta auth foi criada e havia barbeiros com credenciais, erro fatal
      if (authErrors.length > 0 && emailToUserId.size === 0 && (data.barbeiros || []).some((b: any) => b.email && b.senha)) {
        return NextResponse.json(
          { error: `Falha ao criar contas dos barbeiros: ${authErrors.join("; ")}` },
          { status: 400 }
        )
      }

      // 2. Inserir barbearia
      const { data: row, error: errBarbearia } = await supabase
        .from("barbearias")
        .insert({
          nome: data.nome,
          subdominio: data.subdominio,
          slogan_principal: data.slogan_principal || "",
          descricao_hero: data.descricao_hero || "",
          descricao_rodape: data.descricao_rodape || "",
          endereco: data.endereco || "",
          telefone: data.telefone || "",
          horarios_texto: data.horarios_texto || "",
          instagram_url: data.instagram_url || null,
          ano_fundacao: String(data.ano_fundacao || new Date().getFullYear()),
          foto_fundo_url: data.foto_fundo_url || "",
          fotos_galeria: [],
          plano: data.plano || "mensal",
          valor_mensalidade: data.valor_mensalidade || 0,
          data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status_pagamento: data.plano === "teste" ? "teste" : "em_dia",
          email_responsavel: data.email_responsavel || "",
          telefone_responsavel: data.telefone_responsavel || "",
          observacoes: "",
          ativo: true,
        })
        .select()
        .single()

      if (errBarbearia || !row) {
        return NextResponse.json(
          { error: `Erro ao criar barbearia: ${errBarbearia?.message}` },
          { status: 500 }
        )
      }

      // 3. Inserir barbeiros com usuario_id vinculado
      if (data.barbeiros?.length > 0) {
        // Log para debug
        console.log("Barbeiros para inserir:", JSON.stringify(data.barbeiros.map((b: any) => ({
          nome: b.nome,
          email: b.email,
          foundUserId: emailToUserId.get(b.email)
        })), null, 2))

        const { data: insertedBarbers, error: errB } = await supabase
          .from("barbeiros")
          .insert(
            data.barbeiros.map((b: any) => ({
              barbearia_id: row.id,
              nome: b.nome,
              foto_url: b.foto_url || null,
              ativo: b.ativo ?? true,
              usuario_id: emailToUserId.get(b.email) || null,
            }))
          )
          .select("id, usuario_id")

        if (errB) {
          return NextResponse.json(
            { error: `Erro ao inserir barbeiros: ${errB.message}` },
            { status: 500 }
          )
        }

        // 3.1 Criar horarios_trabalho default (Seg-Sáb 9-19h, Dom folga)
        if (insertedBarbers?.length) {
          // Verificar se algum barbeiro ficou sem usuario_id (erro silencioso)
          const missingAuth = insertedBarbers.filter((b: any) => !b.usuario_id)
          if (missingAuth.length > 0) {
            console.warn("[Admin] ATENÇÃO: Barbeiros criados sem usuario_id:", missingAuth)
          }

          const horariosDefault = insertedBarbers.flatMap((barber: any) =>
            [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
              barbeiro_id: barber.id,
              dia_semana: dia,
              inicio: "09:00",
              fim: "19:00",
              inicio_almoco: "12:00",
              fim_almoco: "13:00",
              trabalha: dia >= 1 && dia <= 6,
              duracao_slot: 30,
            }))
          )
          const { error: errH } = await supabase
            .from("horarios_trabalho")
            .insert(horariosDefault)
          if (errH) console.error("[Admin] Erro horários default:", errH.message)
        }
      }

      return NextResponse.json({
        id: row.id,
        success: true,
        authWarnings: authErrors.length > 0 ? authErrors : undefined
      })
    }

    // ── ACTION: update ─────────────────────────────────────────────────────
    if (action === "update") {
      const { id, ...fields } = data

      // Atualizar barbearia
      const { error: errUpdate } = await supabase
        .from("barbearias")
        .update({
          nome: fields.nome,
          subdominio: fields.subdominio,
          dominio_customizado: fields.dominio_customizado || null,
          slogan_principal: fields.slogan_principal,
          descricao_hero: fields.descricao_hero,
          descricao_rodape: fields.descricao_rodape,
          endereco: fields.endereco,
          telefone: fields.telefone,
          horarios_texto: fields.horarios_texto,
          instagram_url: fields.instagram_url,
          ano_fundacao: String(fields.ano_fundacao),
          foto_fundo_url: fields.foto_fundo_url,
          fotos_galeria: fields.fotos_galeria,
          plano: fields.plano,
          valor_mensalidade: fields.valor_mensalidade,
          data_vencimento: fields.data_vencimento || null,
          status_pagamento: fields.status_pagamento,
          email_responsavel: fields.email_responsavel,
          telefone_responsavel: fields.telefone_responsavel,
          observacoes: fields.observacoes,
          ativo: fields.ativo,
        })
        .eq("id", id)

      if (errUpdate) {
        return NextResponse.json({ error: errUpdate.message }, { status: 500 })
      }

      // Sync barbeiros (diff-based)
      if (fields.barbeiros) {
        // 1. Criar contas auth para novos barbeiros ou barbeiros que tiveram email alterado (se aplicável)
        // Nota: Neste MVP, não estamos tratando alteração de email/senha no update, apenas criação de novos.
        const emailToUserId = new Map<string, string>()
        
        for (const barber of fields.barbeiros) {
          // Se for novo (id começa com "new-") e tem credenciais
          // Compatibilidade: BarbeariaDetails envia 'novaSenha', NovaBarbeariaWizard envia 'senha'
          const password = barber.senha || barber.novaSenha

          if (barber.id.startsWith("new-") && barber.email && password) {
             const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: barber.email,
              password: password,
              email_confirm: true,
              user_metadata: { nome: barber.nome, role: "barbeiro" },
            })
            if (authError) {
              console.error(`[Admin] Erro auth update ${barber.email}:`, authError.message)
            } else if (authData.user) {
              emailToUserId.set(barber.email, authData.user.id)
            }
          }
        }

        await syncBarbeiros(supabase, id, fields.barbeiros, emailToUserId)
      }

      return NextResponse.json({ success: true })
    }

    // ── ACTION: toggle ─────────────────────────────────────────────────────
    if (action === "toggle") {
      const { id, ativo } = data
      
      const { error } = await supabase
        .from("barbearias")
        .update({ ativo })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
  } catch (err: any) {
    console.error("[Admin API] Erro:", err)
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 })
  }
}

// ── GET: Listar barbearias (com barbeiros e contagem) ──────────────────────
export async function GET() {
  const supabase = getAdminClient()

  try {
    // 1. Buscar barbearias
    const { data: rows, error } = await supabase
      .from("barbearias")
      .select("*")
      .order("nome")

    if (error) throw new Error(error.message)
    if (!rows?.length) return NextResponse.json([])

    const ids = rows.map((r: any) => r.id)

    // 2. Barbeiros (1 query)
    const { data: allBarbeiros } = await supabase
      .from("barbeiros")
      .select("id, barbearia_id, nome, foto_url, ativo, usuario_id")
      .in("barbearia_id", ids)

    // 2.1 Buscar emails dos auth users vinculados
    const userIds = (allBarbeiros || []).map((b: any) => b.usuario_id).filter(Boolean)
    const emailByUserId: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (authUsers?.users) {
        for (const u of authUsers.users) {
          emailByUserId[u.id] = u.email || ""
        }
      }
    }

    // 3. Contagem de agendamentos (1 query)
    const { data: agendCounts } = await supabase
      .from("agendamentos")
      .select("barbearia_id")
      .in("barbearia_id", ids)

    // Agrupar
    const barbeirosByBarb: Record<string, any[]> = {}
    for (const b of allBarbeiros || []) {
      if (!barbeirosByBarb[b.barbearia_id]) barbeirosByBarb[b.barbearia_id] = []
      barbeirosByBarb[b.barbearia_id].push(b)
    }

    const countByBarb: Record<string, number> = {}
    for (const a of agendCounts || []) {
      countByBarb[a.barbearia_id] = (countByBarb[a.barbearia_id] || 0) + 1
    }

    // 4. Montar resposta
    const result = rows.map((row: any) => ({
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
      plano: row.plano,
      valor_mensalidade: row.valor_mensalidade ?? 0,
      data_vencimento: row.data_vencimento || "",
      status_pagamento: row.status_pagamento,
      email_responsavel: row.email_responsavel || "",
      telefone_responsavel: row.telefone_responsavel || "",
      observacoes: row.observacoes || "",
      ativo: row.ativo,
      barbeiros: (barbeirosByBarb[row.id] || []).map((b: any) => ({
        id: b.id,
        nome: b.nome,
        foto_url: b.foto_url || "",
        ativo: b.ativo ?? true,
        email: b.usuario_id ? (emailByUserId[b.usuario_id] || "") : "",
      })),
      total_agendamentos: countByBarb[row.id] || 0,
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Sync barbeiros (diff-based) ──────────────────────────────────────────────
async function syncBarbeiros(supabase: any, barbeariaId: string, barbeiros: any[], emailToUserId: Map<string, string> = new Map()) {
  const { data: existing } = await supabase
    .from("barbeiros")
    .select("id")
    .eq("barbearia_id", barbeariaId)

  const existingIds = new Set((existing || []).map((b: any) => b.id))
  const newIds = new Set(barbeiros.map((b: any) => b.id))

  // Deletar removidos
  const toDelete = [...existingIds].filter((id) => !newIds.has(id))
  if (toDelete.length > 0) {
    await supabase.from("barbeiros").delete().in("id", toDelete)
  }

  // Inserir novos
  const toInsert = barbeiros.filter((b: any) => b.id.startsWith("new-"))
  if (toInsert.length > 0) {
    const newBarbers = await supabase.from("barbeiros").insert(
      toInsert.map((b: any) => ({
        barbearia_id: barbeariaId,
        nome: b.nome,
        foto_url: b.foto_url || null,
        ativo: b.ativo,
        usuario_id: emailToUserId.get(b.email) || null // Vincula usuario_id recém-criado
      }))
    ).select("id")

    // Criar horários padrão para os novos barbeiros
    if (newBarbers.data?.length) {
      const horariosDefault = newBarbers.data.flatMap((barber: any) =>
        [0, 1, 2, 3, 4, 5, 6].map((dia: number) => ({
          barbeiro_id: barber.id,
          dia_semana: dia,
          inicio: "09:00",
          fim: "19:00",
          inicio_almoco: "12:00",
          fim_almoco: "13:00",
          trabalha: dia >= 1 && dia <= 6,
          duracao_slot: 30,
        }))
      )
      await supabase.from("horarios_trabalho").insert(horariosDefault)
    }
  }

  // Atualizar existentes
  const toUpdate = barbeiros.filter((b: any) => existingIds.has(b.id))
  for (const b of toUpdate) {
    await supabase
      .from("barbeiros")
      .update({ nome: b.nome, foto_url: b.foto_url || null, ativo: b.ativo })
      .eq("id", b.id)

    // Se veio nova senha, atualizar no auth
    if (b.novaSenha && b.novaSenha.length >= 6) {
      // Buscar o usuario_id deste barbeiro
      const { data: barberRow } = await supabase
        .from("barbeiros")
        .select("usuario_id")
        .eq("id", b.id)
        .single()

      if (barberRow?.usuario_id) {
        const { error: pwErr } = await supabase.auth.admin.updateUserById(
          barberRow.usuario_id,
          { password: b.novaSenha }
        )
        if (pwErr) console.error(`[Admin] Erro ao atualizar senha de ${b.nome}:`, pwErr.message)
      }
    }
  }
}
