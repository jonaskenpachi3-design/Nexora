# 🚀 Nexora

> Aplicação full-stack para gerenciamento de tarefas, desenvolvida com Node.js, Express e PostgreSQL.

O **Nexora** é um sistema completo de produtividade criado para demonstrar a construção de uma aplicação web full-stack, desde a interface até a API, autenticação e persistência de dados em banco de dados relacional.

## ✨ Funcionalidades

- 🔐 Cadastro e login de usuários
- 🔑 Autenticação utilizando JWT
- 🔒 Senhas protegidas com bcrypt
- ➕ Criação de tarefas
- ✏️ Edição de tarefas
- 🗑️ Exclusão de tarefas
- ✅ Marcação de tarefas como concluídas
- 🎯 Sistema de prioridades
- 📅 Definição de prazo
- 🔍 Busca por tarefas
- 🏷️ Filtros de tarefas
- 📊 Estatísticas do usuário
- 📱 Interface responsiva
- 💾 Persistência de dados com PostgreSQL
- 🔌 API REST

## 🛠️ Tecnologias

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- Local Storage
- Design responsivo

### Backend

- Node.js
- Express
- REST API
- JWT
- bcrypt

### Banco de dados

- PostgreSQL
- SQL

### Ferramentas

- Git
- GitHub
- VS Code
- npm

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura simples de aplicação full-stack:

```text
┌──────────────────────┐
│      Frontend        │
│   HTML / CSS / JS    │
└──────────┬───────────┘
           │
           │ HTTP / REST
           ▼
┌──────────────────────┐
│       Backend        │
│   Node.js + Express  │
└──────────┬───────────┘
           │
           │ SQL
           ▼
┌──────────────────────┐
│     PostgreSQL       │
│      Database        │
└──────────────────────┘
