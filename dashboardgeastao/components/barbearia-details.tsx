"use client"

import { useState } from "react"
import { ArrowLeft, Save, Plus, Trash2, UserCircle, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { ImageUpload } from "@/components/image-upload"
import { uploadFotoFundo, uploadFotoBarbeiro, uploadFotoGaleria } from "@/services/uploadService"
import type { Barbearia, Barbeiro, Plano, StatusPagamento } from "@/lib/types"

interface BarbeariaDetailsProps {
  barbearia: Barbearia
  onBack: () => void
  onSave: (barbearia: Barbearia) => void
  saving?: boolean
}

export function BarbeariaDetails({ barbearia: initialBarbearia, onBack, onSave, saving }: BarbeariaDetailsProps) {
  const [barbearia, setBarbearia] = useState<Barbearia>(initialBarbearia)
  const [newBarbeiro, setNewBarbeiro] = useState({ nome: "", foto_url: "", email: "", senha: "" })
  const [galeriaInput, setGaleriaInput] = useState("")
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [showNewPassword, setShowNewPassword] = useState(false)

  const updateField = <K extends keyof Barbearia>(field: K, value: Barbearia[K]) => {
    setBarbearia((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(barbearia)
  }

  const addBarbeiro = () => {
    if (newBarbeiro.nome && newBarbeiro.email && newBarbeiro.senha.length >= 6) {
      const barbeiro: Barbeiro = {
        id: `new-${Date.now()}`,
        nome: newBarbeiro.nome,
        foto_url: newBarbeiro.foto_url || "",
        ativo: true,
        email: newBarbeiro.email,
        novaSenha: newBarbeiro.senha,
      }
      setBarbearia((prev) => ({
        ...prev,
        barbeiros: [...prev.barbeiros, barbeiro],
      }))
      setNewBarbeiro({ nome: "", foto_url: "", email: "", senha: "" })
      setShowNewPassword(false)
    }
  }

  const updateBarbeiro = (id: string, field: keyof Barbeiro, value: string | boolean) => {
    setBarbearia((prev) => ({
      ...prev,
      barbeiros: prev.barbeiros.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }))
  }

  const removeBarbeiro = (id: string) => {
    setBarbearia((prev) => ({
      ...prev,
      barbeiros: prev.barbeiros.filter((b) => b.id !== id),
    }))
  }

  const addGaleriaUrl = () => {
    if (galeriaInput) {
      setBarbearia((prev) => ({
        ...prev,
        fotos_galeria: [...prev.fotos_galeria, galeriaInput],
      }))
      setGaleriaInput("")
    }
  }

  const removeGaleriaUrl = (index: number) => {
    setBarbearia((prev) => ({
      ...prev,
      fotos_galeria: prev.fotos_galeria.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {barbearia.nome}
          </h1>
          <p className="text-muted-foreground">
            {barbearia.dominio_customizado || `${barbearia.subdominio}.app`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="site" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="site">Dados do Site</TabsTrigger>
          <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Informações Básicas</CardTitle>
              <CardDescription>Dados principais da barbearia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={barbearia.nome}
                    onChange={(e) => updateField("nome", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slogan">Slogan Principal</Label>
                  <Input
                    id="slogan"
                    value={barbearia.slogan_principal}
                    onChange={(e) => updateField("slogan_principal", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao_hero">Descrição Hero</Label>
                <Textarea
                  id="descricao_hero"
                  value={barbearia.descricao_hero}
                  onChange={(e) => updateField("descricao_hero", e.target.value)}
                  className="bg-background border-input"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao_rodape">Descrição Rodapé</Label>
                <Input
                  id="descricao_rodape"
                  value={barbearia.descricao_rodape}
                  onChange={(e) => updateField("descricao_rodape", e.target.value)}
                  className="bg-background border-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Contato e Localização</CardTitle>
              <CardDescription>Informações de contato e endereço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={barbearia.endereco}
                    onChange={(e) => updateField("endereco", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={barbearia.telefone}
                    onChange={(e) => updateField("telefone", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground whitespace-nowrap">instagram.com/</span>
                  <Input
                    id="instagram_url"
                    value={barbearia.instagram_url?.replace('https://instagram.com/', '') || ''}
                    onChange={(e) => updateField("instagram_url", `https://instagram.com/${e.target.value.replace('https://instagram.com/', '')}`)}
                    placeholder="usuario"
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="horarios">Horários de Funcionamento</Label>
                  <Input
                    id="horarios"
                    value={barbearia.horarios_texto}
                    onChange={(e) => updateField("horarios_texto", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fundacao">Ano de Fundação</Label>
                  <Input
                    id="fundacao"
                    type="number"
                    value={barbearia.ano_fundacao}
                    onChange={(e) => updateField("ano_fundacao", parseInt(e.target.value))}
                    className="bg-background border-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Domínio</CardTitle>
              <CardDescription>Configurações de domínio do site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subdominio">Subdomínio</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdominio"
                      value={barbearia.subdominio}
                      onChange={(e) => updateField("subdominio", e.target.value)}
                      className="bg-background border-input"
                    />
                    <span className="text-muted-foreground whitespace-nowrap">.app</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dominio_customizado">Domínio Customizado</Label>
                  <Input
                    id="dominio_customizado"
                    value={barbearia.dominio_customizado || ""}
                    onChange={(e) => updateField("dominio_customizado", e.target.value)}
                    placeholder="exemplo.com.br"
                    className="bg-background border-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Imagens</CardTitle>
              <CardDescription>Fotos do site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <ImageUpload
                  label="Foto de Fundo"
                  value={barbearia.foto_fundo_url}
                  onChange={(url) => updateField("foto_fundo_url", url)}
                  onUpload={(file) => uploadFotoFundo(file, barbearia.subdominio || "temp")}
                  aspectRatio="video"
                  hint="Recomendado: 1920x1080 (16:9)"
                />
              </div>

              <div className="space-y-2">
                <Label>Galeria de Fotos</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {barbearia.fotos_galeria.map((foto, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={foto}
                        alt={`Galeria ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 size-6"
                        onClick={() => removeGaleriaUrl(index)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  {barbearia.fotos_galeria.length < 6 && (
                    <ImageUpload
                      value=""
                      onChange={(url) => {
                        if (url) {
                          setBarbearia((prev) => ({
                            ...prev,
                            fotos_galeria: [...prev.fotos_galeria, url],
                          }))
                        }
                      }}
                      onUpload={(file) => uploadFotoGaleria(file, barbearia.subdominio || "temp", barbearia.fotos_galeria.length)}
                      aspectRatio="square"
                      hint="Adicionar foto"
                      className="h-full"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicione até 6 fotos para mostrar o ambiente e serviços ({barbearia.fotos_galeria.length}/6)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="barbeiros" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Barbeiros</CardTitle>
                <CardDescription>Equipe de barbeiros desta barbearia</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Adicionar Barbeiro
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Novo Barbeiro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-barbeiro-nome">Nome *</Label>
                      <Input
                        id="new-barbeiro-nome"
                        value={newBarbeiro.nome}
                        onChange={(e) =>
                          setNewBarbeiro((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        placeholder="Nome do barbeiro"
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-barbeiro-email">
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3.5" />
                          Email de acesso *
                        </span>
                      </Label>
                      <Input
                        id="new-barbeiro-email"
                        type="email"
                        value={newBarbeiro.email}
                        onChange={(e) =>
                          setNewBarbeiro((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="barbeiro@email.com"
                        className="bg-background border-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-barbeiro-senha">
                        <span className="flex items-center gap-1.5">
                          <Lock className="size-3.5" />
                          Senha de acesso *
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="new-barbeiro-senha"
                          type={showNewPassword ? "text" : "password"}
                          value={newBarbeiro.senha}
                          onChange={(e) =>
                            setNewBarbeiro((prev) => ({ ...prev, senha: e.target.value }))
                          }
                          placeholder="Mínimo 6 caracteres"
                          className="bg-background border-input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {newBarbeiro.senha && newBarbeiro.senha.length < 6 && (
                        <p className="text-xs text-destructive">Mínimo 6 caracteres</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <ImageUpload
                        label="Foto do Barbeiro"
                        value={newBarbeiro.foto_url}
                        onChange={(url) => setNewBarbeiro((prev) => ({ ...prev, foto_url: url }))}
                        onUpload={(file) => uploadFotoBarbeiro(file, barbearia.subdominio || "temp", newBarbeiro.nome || "barbeiro")}
                        aspectRatio="square"
                        hint="Recomendado: 400x400"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        onClick={addBarbeiro}
                        disabled={!newBarbeiro.nome || !newBarbeiro.email || newBarbeiro.senha.length < 6}
                      >
                        Adicionar
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {barbearia.barbeiros.map((barbeiro) => (
                  <Card key={barbeiro.id} className="bg-muted border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="size-12">
                          <AvatarImage src={barbeiro.foto_url} alt={barbeiro.nome} />
                          <AvatarFallback>
                            <UserCircle className="size-8" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={barbeiro.nome}
                            onChange={(e) =>
                              updateBarbeiro(barbeiro.id, "nome", e.target.value)
                            }
                            placeholder="Nome"
                            className="bg-background border-input h-8"
                          />
                          {barbeiro.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                              <Mail className="size-3" />
                              <span>{barbeiro.email}</span>
                            </div>
                          )}
                          <div className="relative">
                            <Input
                              type={showPasswords[barbeiro.id] ? "text" : "password"}
                              value={barbeiro.novaSenha || ""}
                              onChange={(e) =>
                                updateBarbeiro(barbeiro.id, "novaSenha", e.target.value)
                              }
                              placeholder="Nova senha (deixe vazio para manter)"
                              className="bg-background border-input h-8 text-xs pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [barbeiro.id]: !prev[barbeiro.id] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPasswords[barbeiro.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={barbeiro.ativo}
                                onCheckedChange={(checked) =>
                                  updateBarbeiro(barbeiro.id, "ativo", checked)
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {barbeiro.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => removeBarbeiro(barbeiro.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {barbearia.barbeiros.length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    Nenhum barbeiro cadastrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Plano e Pagamento</CardTitle>
              <CardDescription>Informações financeiras da barbearia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plano">Plano</Label>
                  <Select
                    value={barbearia.plano}
                    onValueChange={(value: Plano) => updateField("plano", value)}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="teste">Teste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor da Mensalidade (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={barbearia.valor_mensalidade}
                    onChange={(e) =>
                      updateField("valor_mensalidade", parseFloat(e.target.value))
                    }
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vencimento">Data de Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={barbearia.data_vencimento}
                    onChange={(e) => updateField("data_vencimento", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status do Pagamento</Label>
                  <Select
                    value={barbearia.status_pagamento}
                    onValueChange={(value: StatusPagamento) =>
                      updateField("status_pagamento", value)
                    }
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_dia">Em dia</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="teste">Teste</SelectItem>
                      <SelectItem value="cortesia">Cortesia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Responsável</CardTitle>
              <CardDescription>Contato do responsável financeiro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email_responsavel">Email</Label>
                  <Input
                    id="email_responsavel"
                    type="email"
                    value={barbearia.email_responsavel}
                    onChange={(e) => updateField("email_responsavel", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone_responsavel">Telefone</Label>
                  <Input
                    id="telefone_responsavel"
                    value={barbearia.telefone_responsavel}
                    onChange={(e) => updateField("telefone_responsavel", e.target.value)}
                    className="bg-background border-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={barbearia.observacoes}
                  onChange={(e) => updateField("observacoes", e.target.value)}
                  className="bg-background border-input"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
