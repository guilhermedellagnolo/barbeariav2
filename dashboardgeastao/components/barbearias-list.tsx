"use client"

import { useState } from "react"
import { Search, Plus, Users, Calendar, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Barbearia, StatusPagamento, Plano } from "@/lib/types"

interface BarbeariasListProps {
  barbearias: Barbearia[]
  onSelectBarbearia: (barbearia: Barbearia) => void
  onNewBarbearia: () => void
  onToggleAtivo: (id: string, ativo: boolean) => void
}

const statusColors: Record<StatusPagamento, string> = {
  em_dia: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pendente: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  atrasado: "bg-red-500/20 text-red-400 border-red-500/30",
  teste: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  cortesia: "bg-violet-500/20 text-violet-400 border-violet-500/30",
}

const statusLabels: Record<StatusPagamento, string> = {
  em_dia: "Em dia",
  pendente: "Pendente",
  atrasado: "Atrasado",
  teste: "Teste",
  cortesia: "Cortesia",
}

const planoLabels: Record<Plano, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  teste: "Teste",
}

export function BarbeariasList({
  barbearias,
  onSelectBarbearia,
  onNewBarbearia,
  onToggleAtivo,
}: BarbeariasListProps) {
  const [search, setSearch] = useState("")

  const filteredBarbearias = barbearias.filter((b) =>
    b.nome.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Barbearias
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as barbearias cadastradas na plataforma
          </p>
        </div>
        <Button onClick={onNewBarbearia} className="gap-2">
          <Plus className="size-4" />
          Nova Barbearia
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Barbearias
            </CardTitle>
            <Globe className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{barbearias.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
            <div className="size-2 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {barbearias.filter((b) => b.ativo).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Barbeiros
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {barbearias.reduce((acc, b) => acc + b.barbeiros.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Agendamentos
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {barbearias.reduce((acc, b) => acc + b.total_agendamentos, 0).toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Domínio</TableHead>
                  <TableHead className="text-muted-foreground">Plano</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-center">Ativo</TableHead>
                  <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-muted-foreground text-center">Barbeiros</TableHead>
                  <TableHead className="text-muted-foreground text-center">Agendamentos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarbearias.map((barbearia) => (
                  <TableRow
                    key={barbearia.id}
                    className="border-border cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onSelectBarbearia(barbearia)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {barbearia.nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {barbearia.dominio_customizado || `${barbearia.subdominio}.app`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {planoLabels[barbearia.plano]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[barbearia.status_pagamento]}>
                        {statusLabels[barbearia.status_pagamento]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={barbearia.ativo}
                          onCheckedChange={(checked) => {
                            onToggleAtivo(barbearia.id, checked)
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(barbearia.data_vencimento)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {barbearia.barbeiros.length}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {barbearia.total_agendamentos.toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBarbearias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma barbearia encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
