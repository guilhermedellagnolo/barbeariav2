# 🏗️ Estrutura de Projetos na Vercel (Monorepo)

Sim, você precisa de **3 projetos separados** na Vercel, mesmo que estejam todos no mesmo repositório Git. Cada projeto terá sua própria configuração de diretório raiz ("Root Directory") e domínio.

## 1. Projeto: Site do Cliente (Principal)
*   **Nome na Vercel:** `site-barbearia` (exemplo)
*   **Root Directory:** `sitebarbeariapereira`
*   **Domínio:** `73.barber.com` (Domínio Principal)
    *   **Configuração de Domínio:** Você deve adicionar `*.73.barber.com` (Wildcard) neste projeto para que os subdomínios das barbearias (`domclassic.73.barber.com`, etc.) caiam aqui.

## 2. Projeto: Dashboard de Gestão (Admin)
*   **Nome na Vercel:** `dashboard-gestao`
*   **Root Directory:** `dashboardgeastao`
*   **Domínio:** `admin.73.barber.com` (ou `dashboard.73.barber.com`)
    *   Este projeto é onde você cria e edita as barbearias.

## 3. Projeto: App do Barbeiro
*   **Nome na Vercel:** `app-barbeiro`
*   **Root Directory:** `appdobabrbeirov1`
*   **Domínio:** `app.73.barber.com` (ou deixar o domínio padrão da Vercel `app-barbeiro.vercel.app` se preferir, mas usar um subdomínio é mais profissional).

---

### ⚠️ Por que separar?
Se você configurar apenas o "site" na raiz, a Vercel vai tentar rodar apenas o código do site. O código do Dashboard e do App, que estão em outras pastas, serão ignorados.

Para ter os 3 sistemas funcionando simultaneamente, você deve criar 3 projetos na Vercel, conectar todos ao **mesmo repositório**, mas apontar cada um para sua **pasta específica**.
