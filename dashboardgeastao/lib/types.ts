export type Plano = "mensal" | "trimestral" | "semestral" | "anual" | "teste"

export type StatusPagamento = "em_dia" | "pendente" | "atrasado" | "teste" | "cortesia"

export interface Barbeiro {
  id: string
  nome: string
  foto_url: string
  ativo: boolean
}

export interface Barbearia {
  id: string
  nome: string
  subdominio: string
  dominio_customizado?: string
  slogan_principal: string
  descricao_hero: string
  descricao_rodape: string
  endereco: string
  telefone: string
  horarios_texto: string
  ano_fundacao: number
  foto_fundo_url: string
  fotos_galeria: string[]
  plano: Plano
  valor_mensalidade: number
  data_vencimento: string
  status_pagamento: StatusPagamento
  email_responsavel: string
  telefone_responsavel: string
  observacoes: string
  ativo: boolean
  barbeiros: Barbeiro[]
  total_agendamentos: number
}

export interface NovoBarbeiro {
  nome: string
  foto_url: string
  ativo: boolean
  email: string
  senha: string
}

export interface NovaBarbearia {
  nome: string
  subdominio: string
  email_responsavel: string
  telefone_responsavel: string
  plano: Plano
  valor_mensalidade: number
  slogan_principal: string
  descricao_hero: string
  descricao_rodape: string
  endereco: string
  telefone: string
  horarios_texto: string
  ano_fundacao: number
  foto_fundo_url: string
  barbeiros: NovoBarbeiro[]
}
