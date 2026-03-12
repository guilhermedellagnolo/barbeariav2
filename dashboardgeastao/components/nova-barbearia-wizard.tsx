"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  UserCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ImageUpload } from "@/components/image-upload"
import { uploadFotoFundo, uploadFotoBarbeiro } from "@/services/uploadService"
import type { NovaBarbearia, Plano } from "@/lib/types"

interface NovaBarbeariaWizardProps {
  onBack: () => void
  onCreate: (barbearia: NovaBarbearia) => void
  saving?: boolean
}

const initialData: NovaBarbearia = {
  nome: "",
  subdominio: "",
  email_responsavel: "",
  telefone_responsavel: "",
  plano: "mensal",
  valor_mensalidade: 149.90,
  slogan_principal: "",
  descricao_hero: "",
  descricao_rodape: "",
  endereco: "",
  telefone: "",
  horarios_texto: "",
  ano_fundacao: new Date().getFullYear(),
  foto_fundo_url: "",
  barbeiros: [],
}

const steps = [
  { id: 1, title: "Dados Básicos", description: "Informações principais" },
  { id: 2, title: "Personalização", description: "Configurar o site" },
  { id: 3, title: "Barbeiros", description: "Equipe + acesso" },
]

export function NovaBarbeariaWizard({ onBack, onCreate, saving }: NovaBarbeariaWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<NovaBarbearia>(initialData)
  const [newBarbeiro, setNewBarbeiro] = useState({ nome: "", foto_url: "", ativo: true, email: "", senha: "" })
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [showNewPassword, setShowNewPassword] = useState(false)

  const updateField = <K extends keyof NovaBarbearia>(field: K, value: NovaBarbearia[K]) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  // ── Barbeiros ──────────────────────────────────────────────────────────────
  const addBarbeiro = () => {
    if (newBarbeiro.nome && newBarbeiro.email && newBarbeiro.senha.length >= 6) {
      setData((prev) => ({
        ...prev,
        barbeiros: [...prev.barbeiros, { ...newBarbeiro }],
      }))
      setNewBarbeiro({ nome: "", foto_url: "", ativo: true, email: "", senha: "" })
      setShowNewPassword(false)
    }
  }

  const removeBarbeiro = (index: number) => {
    setData((prev) => ({
      ...prev,
      barbeiros: prev.barbeiros.filter((_, i) => i !== index),
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.nome && data.subdominio && data.email_responsavel
      case 2:
        return true
      case 3:
        return data.barbeiros.length > 0
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1)
    } else {
      onCreate(data)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    } else {
      onBack()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Nova Barbearia
          </h1>
          <p className="text-muted-foreground">
            Cadastre uma nova barbearia na plataforma
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  currentStep > step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground/30"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="size-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground/50"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-0.5 w-8 sm:w-16",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Dados Básicos */}
      {currentStep === 1 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Dados Básicos</CardTitle>
            <CardDescription>
              Informações principais da barbearia e responsável
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Barbearia *</Label>
                <Input
                  id="nome"
                  value={data.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Ex: Barbearia Premium"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdominio">Subdomínio *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdominio"
                    value={data.subdominio}
                    onChange={(e) =>
                      updateField(
                        "subdominio",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="premium"
                    className="bg-background border-input"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">.t3barber.com.br</span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Responsável *</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email_responsavel}
                  onChange={(e) => updateField("email_responsavel", e.target.value)}
                  placeholder="contato@exemplo.com"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_resp">Telefone do Responsável</Label>
                <Input
                  id="telefone_resp"
                  value={data.telefone_responsavel}
                  onChange={(e) => updateField("telefone_responsavel", e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-background border-input"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plano">Plano</Label>
                <Select
                  value={data.plano}
                  onValueChange={(value: Plano) => updateField("plano", value)}
                >
                  <SelectTrigger className="bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teste">Teste (14 dias grátis)</SelectItem>
                    <SelectItem value="mensal">Mensal - R$ 149,90</SelectItem>
                    <SelectItem value="trimestral">Trimestral - R$ 179,90/mês</SelectItem>
                    <SelectItem value="semestral">Semestral - R$ 169,90/mês</SelectItem>
                    <SelectItem value="anual">Anual - R$ 149,90/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor da Mensalidade (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={data.valor_mensalidade}
                  onChange={(e) =>
                    updateField("valor_mensalidade", parseFloat(e.target.value))
                  }
                  className="bg-background border-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Personalização */}
      {currentStep === 2 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Personalização do Site</CardTitle>
            <CardDescription>
              Configure a aparência e informações do site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slogan">Slogan Principal</Label>
                <Input
                  id="slogan"
                  value={data.slogan_principal}
                  onChange={(e) => updateField("slogan_principal", e.target.value)}
                  placeholder="Ex: Tradição e estilo desde 2010"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano_fundacao">Ano de Fundação</Label>
                <Input
                  id="ano_fundacao"
                  type="number"
                  value={data.ano_fundacao}
                  onChange={(e) => updateField("ano_fundacao", parseInt(e.target.value))}
                  className="bg-background border-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao_hero">Descrição Hero</Label>
              <Textarea
                id="descricao_hero"
                value={data.descricao_hero}
                onChange={(e) => updateField("descricao_hero", e.target.value)}
                placeholder="Texto principal que aparece na home do site..."
                className="bg-background border-input"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao_rodape">Descrição Rodapé</Label>
              <Input
                id="descricao_rodape"
                value={data.descricao_rodape}
                onChange={(e) => updateField("descricao_rodape", e.target.value)}
                placeholder="Texto curto para o rodapé..."
                className="bg-background border-input"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={data.endereco}
                  onChange={(e) => updateField("endereco", e.target.value)}
                  placeholder="Rua, número - Bairro - Cidade/UF"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone da Barbearia</Label>
                <Input
                  id="telefone"
                  value={data.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-background border-input"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="horarios">Horários de Funcionamento</Label>
                <Input
                  id="horarios"
                  value={data.horarios_texto}
                  onChange={(e) => updateField("horarios_texto", e.target.value)}
                  placeholder="Seg-Sex: 9h-20h | Sáb: 9h-18h"
                  className="bg-background border-input"
                />
              </div>
              <div className="space-y-2">
                <ImageUpload
                  label="Foto de Fundo"
                  value={data.foto_fundo_url}
                  onChange={(url) => updateField("foto_fundo_url", url)}
                  onUpload={(file) => uploadFotoFundo(file, data.subdominio || "temp")}
                  aspectRatio="video"
                  hint="Recomendado: 1920x1080 (16:9)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Barbeiros */}
      {currentStep === 3 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Barbeiros</CardTitle>
            <CardDescription>
              Adicione os barbeiros com email e senha para acesso ao app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-dashed border-border p-4 space-y-4">
              <p className="text-sm font-medium text-foreground">Adicionar Barbeiro</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="barbeiro_nome">Nome *</Label>
                  <Input
                    id="barbeiro_nome"
                    value={newBarbeiro.nome}
                    onChange={(e) =>
                      setNewBarbeiro((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    placeholder="Nome do barbeiro"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <ImageUpload
                    label="Foto do Barbeiro"
                    value={newBarbeiro.foto_url}
                    onChange={(url) => setNewBarbeiro((prev) => ({ ...prev, foto_url: url }))}
                    onUpload={(file) => uploadFotoBarbeiro(file, data.subdominio || "temp", newBarbeiro.nome || "barbeiro")}
                    aspectRatio="square"
                    hint="Recomendado: 400x400 (quadrada)"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="barbeiro_email">
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5" />
                      Email de acesso *
                    </span>
                  </Label>
                  <Input
                    id="barbeiro_email"
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
                  <Label htmlFor="barbeiro_senha">
                    <span className="flex items-center gap-1.5">
                      <Lock className="size-3.5" />
                      Senha de acesso *
                    </span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="barbeiro_senha"
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
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  O barbeiro usará esse email e senha para acessar o app de gerenciamento da agenda
                </p>
                <Button
                  onClick={addBarbeiro}
                  disabled={!newBarbeiro.nome || !newBarbeiro.email || newBarbeiro.senha.length < 6}
                  variant="secondary"
                  className="gap-2 shrink-0"
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            {data.barbeiros.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Barbeiros Adicionados ({data.barbeiros.length})
                </p>
                <div className="grid gap-3">
                  {data.barbeiros.map((barbeiro, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg bg-muted p-3"
                    >
                      <Avatar className="size-10">
                        <AvatarImage src={barbeiro.foto_url} alt={barbeiro.nome} />
                        <AvatarFallback>
                          <UserCircle className="size-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {barbeiro.nome}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          <span className="truncate">{barbeiro.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }))}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                          title="Ver senha"
                        >
                          {showPasswords[index] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => removeBarbeiro(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                      {showPasswords[index] && (
                        <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded">
                          {barbeiro.senha}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.barbeiros.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Adicione pelo menos um barbeiro para continuar
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} className="gap-2">
          <ArrowLeft className="size-4" />
          {currentStep === 1 ? "Cancelar" : "Voltar"}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed() || saving} className="gap-2">
          {currentStep === 3 ? (
            saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Criar Barbearia
              </>
            )
          ) : (
            <>
              Próximo
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
