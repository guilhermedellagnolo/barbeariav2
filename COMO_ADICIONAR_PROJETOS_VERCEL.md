# ➕ Como Criar Projetos Adicionais na Vercel

Você não adiciona mais diretórios no *mesmo* projeto. Você cria **NOVOS** projetos.

Siga este passo a passo para adicionar o Dashboard e o App:

1.  Vá para a página inicial do seu painel na Vercel (onde lista seus projetos).
2.  Clique no botão **"Add New..."** (geralmente no canto superior direito) -> Selecione **"Project"**.
3.  Na lista "Import Git Repository", encontre o **MESMO** repositório (`barbeariav2`) que você usou para o site e clique em **"Import"** novamente.
    *   *Nota: Sim, você pode importar o mesmo repositório várias vezes!*
4.  **Aqui está o segredo:** Na tela de configuração ("Configure Project"):
    *   Dê um nome diferente (ex: `dashboard-gestao`).
    *   Clique em **"Edit"** ao lado de **Root Directory**.
    *   Selecione a pasta `dashboardgeastao`.
    *   Clique em **Deploy**.

Repita o processo para o App:
1.  Add New -> Project.
2.  Import `barbeariav2` (de novo).
3.  Nome: `app-barbeiro`.
4.  **Root Directory** (Edit) -> Selecione `appdobabrbeirov1`.
5.  Deploy.

Assim você terá 3 projetos independentes na Vercel, todos atualizados pelo mesmo Git, mas servindo pastas diferentes.
