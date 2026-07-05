# SupplyFlow — Sistema de Gestão de Suprimentos

Sistema web para gestão de requisições de materiais de obra, com portal do engenheiro, painel administrativo e extração automática de dados via Inteligência Artificial.

## ✨ Funcionalidades

- **Portal do Engenheiro**: criação de requisições de materiais com itens, unidades e quantidades, além de acompanhamento do status do pedido (pendente, aprovado, a caminho da obra, finalizado).
- - **Extração automática com IA**: upload de foto ou PDF da requisição física, com leitura automática dos dados (engenheiro, data, número da solicitação) via Google Gemini.
  - - **Painel Administrativo**: visão global dos pedidos, gestão de fornecedores (CRUD) e geração de relatórios.
    - - **Exportação de relatórios**: em PDF e Excel.
      - - **Autenticação**: login por usuário e senha (JWT), com diferenciação de papéis (administrador e engenheiro).
        - - **Tema claro/escuro**.
         
          - ## 🛠️ Tecnologias
         
          - **Frontend**
          - - Next.js 16 / React 19
            - - TypeScript
              - - Tailwind CSS 4
                - - next-themes
                  - - jsPDF / jsPDF-AutoTable (exportação em PDF)
                    - - xlsx + file-saver (exportação em Excel)
                     
                      - **Backend**
                      - - Node.js / Express
                        - - TypeScript
                          - - Supabase (banco de dados PostgreSQL)
                            - - JWT + bcrypt (autenticação)
                              - - Multer (upload de arquivos)
                                - - Google Generative AI (Gemini) para extração de dados
                                 
                                  - ## 📁 Estrutura do projeto
                                 
                                  - ```
                                    sistema-suprimentos/
                                    ├── backend/          # API Node.js/Express
                                    │   └── src/
                                    │       ├── database/  # conexão com Supabase
                                    │       ├── services/  # integração com IA (Gemini)
                                    │       └── index.ts   # rotas da API
                                    ├── frontend/         # Aplicação Next.js
                                    │   └── src/
                                    │       ├── app/
                                    │       │   ├── admin/  # painel administrativo (fornecedores, relatórios)
                                    │       │   └── page.tsx  # portal do engenheiro
                                    │       └── components/
                                    ├── supabase_*.sql     # scripts de criação das tabelas no Supabase
                                    ├── setup.bat          # instala as dependências
                                    └── run.bat            # inicia backend e frontend
                                    ```

                                    ## 🚀 Como rodar localmente

                                    ### Pré-requisitos
                                    - Node.js instalado
                                    - - Uma conta e projeto no [Supabase](https://supabase.com)
                                      - - Uma chave de API do [Google Gemini](https://ai.google.dev/)
                                       
                                        - ### Instalação
                                       
                                        - ```bash
                                          # Clone o repositório
                                          git clone https://github.com/Joao-Ewerton93/sistema-suprimentos.git
                                          cd sistema-suprimentos

                                          # Instale as dependências (backend + frontend)
                                          setup.bat
                                          ```

                                          ### Configuração

                                          Crie um arquivo `.env` na pasta `backend/` com as variáveis abaixo (nunca compartilhe ou faça commit deste arquivo — mantenha os valores reais em segredo):

                                          ```
                                          SUPABASE_URL=
                                          SUPABASE_SERVICE_ROLE_KEY=
                                          JWT_SECRET=
                                          ADMIN_PASSWORD=
                                          GEMINI_API_KEY=
                                          FRONTEND_URL=http://localhost:3000
                                          ```

                                          Execute os scripts SQL (`supabase_usuarios.sql`, `supabase_fornecedores.sql`, `supabase_roles.sql`, `supabase_alter_login.sql`) no SQL Editor do Supabase para criar as tabelas necessárias.

                                          ### Executando

                                          ```bash
                                          run.bat
                                          ```

                                          - Portal do Engenheiro: http://localhost:3000
                                          - - Painel Administrativo: http://localhost:3000/admin
                                            - - API Backend: http://localhost:3001/api/health
                                             
                                              - ## 🔒 Segurança
                                             
                                              - Nunca faça commit de senhas, chaves de API ou outros segredos no repositório. Utilize sempre variáveis de ambiente (arquivo `.env`, ignorado pelo `.gitignore`) para armazenar credenciais como `ADMIN_PASSWORD`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY`.
                                             
                                              - ## 🌐 Deploy
                                             
                                              - O projeto está publicado em produção: [sistema-suprimentos.vercel.app](https://sistema-suprimentos.vercel.app)
                                             
                                              - ## 📄 Licença
                                             
                                              - Defina aqui a licença do projeto (ex: MIT), caso deseje tornar o código aberto.
                                              - 
