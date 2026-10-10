## 🌐 Demo

🚀 **Nexora Online:**  
https://nexora-3gl1.onrender.com/

# 🚀 Nexora

<p align="center">
  <img src="public/nexora-logo.png" alt="Nexora Logo" width="120">
</p>

<h1 align="center">Nexora</h1>

<p align="center">
  Sistema Full Stack de gerenciamento de tarefas
</p>

<p align="center">
  <strong>Organize. Priorize. Conclua.</strong>
</p>

<p align="center">
  Node.js • Express • PostgreSQL • JavaScript • JWT • Chart.js
</p>

---

## 📌 Sobre o projeto

O **Nexora** é um sistema Full Stack de gerenciamento de tarefas desenvolvido para demonstrar, na prática, conhecimentos de desenvolvimento web, criação de APIs, autenticação, banco de dados e construção de interfaces modernas.

O sistema permite que usuários criem suas próprias contas e gerenciem suas tarefas através de um dashboard completo.

Cada usuário possui seus próprios dados e tarefas, protegidos por autenticação utilizando **JWT**.

O projeto foi desenvolvido com foco em:

- Desenvolvimento Full Stack
- API REST
- Autenticação
- Banco de dados relacional
- CRUD
- Segurança básica
- Interface responsiva
- Experiência do usuário
- Organização de código
- Deploy em ambiente de produção

---

# 🎯 Objetivo

O objetivo principal do Nexora é demonstrar a construção de uma aplicação completa, conectando:

```text
Frontend
   ↓
JavaScript
   ↓
API REST
   ↓
Node.js + Express
   ↓
PostgreSQL
```

---

## ✨ Funcionalidades

- **Autenticação:** cadastro e login com senha criptografada e sessão via JWT (7 dias).
- **Tarefas:** criar, editar, excluir e marcar como concluída, com título, descrição, prioridade (baixa, média ou alta) e prazo opcional.
- **Quadro:** colunas de pendentes e concluídas, com arrastar e soltar para concluir ou reabrir uma tarefa.
- **Busca e filtros:** busca por título e descrição; filtro por todas, pendentes, concluídas ou prioridade alta.
- **Dashboard:** contadores e gráficos (status e prioridade) com Chart.js.
- **Avisos:** tarefas atrasadas ou com prazo próximo aparecem no painel de notificações, com opção de notificações do navegador.
- **Dados isolados:** cada usuário só enxerga e altera as próprias tarefas.

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript, [Chart.js](https://www.chartjs.org/) (via CDN) |
| Backend | Node.js, Express 5, API REST |
| Autenticação | `jsonwebtoken`, `bcryptjs` |
| Banco de dados | PostgreSQL, `pg` (node-postgres) |
| Hospedagem | Render |

---

## 📁 Estrutura do projeto

```text
nexora/
├── db/
│   └── schema.sql        # Tabelas users e tasks
├── public/               # Frontend estático
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── nexora-logo.png
├── .env.example
├── package.json
└── server.js             # API e servidor de arquivos estáticos
```

---

## 🚀 Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18.11 ou superior (necessário para `node --watch` e Express 5)
- [PostgreSQL](https://www.postgresql.org/) em execução (local ou na nuvem)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/jonaskenpachi3-design/Nexora.git
cd Nexora

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de ambiente e edite os valores
cp .env.example .env

# 4. Crie as tabelas no banco
psql "$DATABASE_URL" -f db/schema.sql

# 5. Inicie a aplicação
npm run dev     # reinicia a cada alteração
# ou
npm start
```

A aplicação sobe em `http://localhost:3000` (ou na porta definida em `PORT`). O servidor encerra na inicialização se `DATABASE_URL` ou `JWT_SECRET` não estiverem definidas.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL. |
| `JWT_SECRET` | Sim | Chave usada para assinar os tokens. Use um valor longo e aleatório. |
| `PORT` | Não | Porta do servidor. Padrão: `3000`. |
| `NODE_ENV` | Não | Com `production`, a conexão com o banco usa SSL. |

---

## 🔌 API

Todas as rotas de tarefas exigem o cabeçalho `Authorization: Bearer <token>`. Erros retornam `{ "message": "..." }`.

| Método | Rota | Auth | Descrição |
| --- | --- | :-: | --- |
| GET | `/api/health` | Não | Verifica servidor e banco. |
| POST | `/api/auth/register` | Não | Cria a conta e devolve o token. |
| POST | `/api/auth/login` | Não | Autentica e devolve o token. |
| GET | `/api/me` | Sim | Dados do usuário autenticado. |
| GET | `/api/tasks` | Sim | Lista as tarefas do usuário. |
| POST | `/api/tasks` | Sim | Cria uma tarefa. |
| PUT | `/api/tasks/:id` | Sim | Atualiza uma tarefa. |
| PATCH | `/api/tasks/:id/toggle` | Sim | Alterna entre pendente e concluída. |
| DELETE | `/api/tasks/:id` | Sim | Exclui uma tarefa. |

Corpo de `POST /api/tasks` e `PUT /api/tasks/:id`:

```json
{
  "title": "Entregar relatório",
  "description": "Versão final em PDF",
  "priority": "high",
  "due_date": "2026-10-20"
}
```

`title` é obrigatório. `priority` aceita `low`, `medium` ou `high` (qualquer outro valor vira `medium`). `due_date` é opcional, no formato `YYYY-MM-DD`.

---

## 🔒 Segurança

- Senhas guardadas com hash `bcrypt`; nunca em texto puro.
- Sessão por token JWT assinado com `JWT_SECRET`.
- Consultas SQL parametrizadas e sempre filtradas pelo `user_id` do token.
- Conteúdo das tarefas é escapado antes de ser exibido no navegador.

---

## ☁️ Deploy

1. Crie um banco PostgreSQL e aplique o `db/schema.sql`.
2. Crie um *Web Service* no [Render](https://render.com/) apontando para este repositório.
3. Comando de build: `npm install`. Comando de start: `npm start`.
4. Defina `NODE_ENV=production`, `DATABASE_URL` e `JWT_SECRET`.

---

## ⚠️ Limitações conhecidas

- O projeto não possui testes automatizados.
- O token JWT fica no `localStorage` do navegador.
- Não há limite de tentativas de login.

---

## 👤 Autor

Desenvolvido por **Jonas Sousa**.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE).
