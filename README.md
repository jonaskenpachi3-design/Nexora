# 🚀 Nexora

Gerenciador de tarefas full-stack desenvolvido para praticar frontend, backend, API REST, autenticação e PostgreSQL.

## Stack

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- PostgreSQL
- JWT
- bcrypt

## Funcionalidades

- Cadastro
- Login
- Autenticação por JWT
- CRUD de tarefas
- Prioridades
- Prazo
- Filtro
- Busca
- Estatísticas
- Conclusão de tarefas
- Exclusão e edição

## Estrutura

```text
nexora/
├── db/
│   └── schema.sql
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Como executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o banco PostgreSQL

Crie um banco chamado `nexora` e execute:

```text
db/schema.sql
```

### 3. Configurar variáveis

Copie `.env.example` para `.env` e configure:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexora
JWT_SECRET=uma-chave-secreta-forte
```

### 4. Iniciar

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Próximas melhorias

- Recuperação de senha
- Refresh token
- Paginação
- Categorias
- Dashboard com gráficos
- Upload de avatar
- Testes automatizados
- Docker
- Deploy do backend
- Deploy do PostgreSQL

## Autor

Jonas Sousa
