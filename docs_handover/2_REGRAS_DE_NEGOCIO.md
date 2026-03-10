# 🧠 Regras de Negócio e Lógica Central

Este documento detalha o funcionamento do "Cérebro" do sistema, localizado em `services/appointmentService.ts`.

## 1. Fuso Horário (UTC-3)
O sistema opera estritamente no Horário de Brasília. Como o `Date` do JavaScript e o banco de dados (Timestamptz) operam em UTC, realizamos uma conversão manual para garantir a integridade visual e lógica.

**A Regra de Ouro:**
Nunca confie no timezone local do navegador do cliente. Construa datas UTC que *representem* o horário de Brasília desejado.

### Exemplo de Implementação (`generateAvailableSlots`):
Ao verificar se um slot é válido, adicionamos 3 horas à data base para simular o UTC-3 antes de comparar com o timestamp atual.

```typescript
// Exemplo: Queremos validar o slot das 09:00 (Brasília).
// 09:00 BRT = 12:00 UTC.
const slotTimestamp = Date.UTC(
  current.getFullYear(),
  current.getMonth(),
  current.getDate(),
  current.getHours() + 3, // Adiciona 3h para obter o UTC equivalente
  current.getMinutes()
)
```

## 2. Trava de Antecedência (2 Horas)
Para evitar agendamentos de última hora que surpreendam o barbeiro, existe uma trava de segurança.

*   **Regra:** O cliente só vê slots disponíveis se `slotTime > now() + 2h`.
*   **Contexto:** Essa regra só se aplica ao `isClientContext = true`. O Admin (Barbeiro) pode agendar a qualquer momento.

```typescript
// services/appointmentService.ts
if (isClientContext && status === 'livre') {
  const now = new Date()
  const twoHoursFromNow = now.getTime() + (2 * 60 * 60 * 1000)
  
  if (slotTimestamp < twoHoursFromNow) {
    status = 'bloqueado' // UI renderiza como desabilitado
  }
}
```

## 3. Trava de Cancelamento
O cliente só pode cancelar seu próprio agendamento com a mesma antecedência de 2 horas.

```typescript
export async function cancelAppointment(appointmentId: string) {
  // ... busca agendamento ...
  if (appointmentDate.getTime() < twoHoursFromNow) {
    throw new Error("Cancelamento permitido apenas com 2 horas de antecedência.")
  }
  // ... realiza update ...
}
```

## 4. Single Source of Truth (SSOT)
Ambos os projetos (`appdobabrbeirov1` e `sitebarbeariapereira`) consomem a **mesma base de dados Supabase**.

Para garantir que o Site do Cliente acesse a barbearia correta neste MVP, utilizamos uma constante fixa que deve ser igual nos dois projetos:

```typescript
export const BARBERSHOP_ID = '3088ce7e-4b1f-4b7e-a3fc-fc97bb1f5a43'
```

*   **App do Barbeiro:** Usa este ID para filtrar os agendamentos no painel.
*   **Site do Cliente:** Usa este ID para buscar os barbeiros e criar os agendamentos.

## 5. Privacidade da Agenda
Na visualização pública (`page.tsx`), a UI **nunca** deve expor detalhes de agendamentos de terceiros.
*   Slots `ocupado` e `bloqueado` são renderizados visualmente idênticos (botão desabilitado, opacidade reduzida).
*   O texto "Ocupado" foi removido para evitar inferência de movimento da barbearia.
