# Família Finance

Aplicativo completo de gestão financeira familiar com login, onboarding, dashboard e perfil do usuário, usando dados simulados e integração com PocketBase (Skip Cloud).

## Versão
1.0.0

## Descrição
O Família Finance é um aplicativo PWA de gestão financeira familiar que oferece controle de gastos, orçamento, investimentos, dívidas, cartões de crédito, terapia financeira com IA, diário emocional, desafios e planejador doméstico. Tudo em português brasileiro, com suporte a modo escuro e acessibilidade WCAG 2.1 AA.

## Tech Stack
- **React 19** — Framework de UI
- **TypeScript** — Tipagem estática
- **Vite** — Build tool e dev server
- **TailwindCSS 3** — Estilização utilitária
- **shadcn/ui** — Componentes de UI acessíveis
- **PocketBase (Skip Cloud)** — Backend e banco de dados
- **lucide-react** — Ícones
- **recharts** — Gráficos
- **zod** — Validação de schemas

## Setup Local

### Pré-requisitos
- Node.js 20+
- pnpm

### Passos
1. Clone o repositório
2. Instale as dependências: `pnpm install`
3. Configure as variáveis de ambiente: copie `.env.example` para `.env` e preencha `VITE_POCKETBASE_URL`
4. Inicie o dev server: `pnpm dev`
5. Acesse: `http://localhost:5173`

## Variáveis de Ambiente
| Variável | Descrição |
|---|---|
| `VITE_POCKETBASE_URL` | URL do backend PocketBase (Skip Cloud) |

## Estrutura de Pastas
```
src/
├── components/      # Componentes reutilizáveis
├── hooks/           # Hooks customizados (auth, theme, realtime, etc.)
├── lib/             # Utilitários e helpers
├── pages/           # Páginas da aplicação
├── services/        # Camada de dados (PocketBase CRUD)
├── types/           # Definições de tipos TypeScript
└── main.tsx         # Entrypoint
pocketbase/
├── hooks/           # Funções serverless (rotas customizadas)
└── migrations/      # Migrações de schema do PocketBase
public/              # Assets estáticos (manifest, sw, icons)
```

## Coleções do Banco de Dados
- `users` — Usuários autenticados
- `families` — Famílias
- `members` — Membros da família
- `family_invites` — Convites
- `categories` — Categorias de transações
- `transactions` — Transações financeiras
- `credit_cards` — Cartões de crédito
- `invoices` — Faturas
- `invoice_items` — Itens de fatura
- `investments` — Investimentos
- `debts` — Dívidas
- `ai_conversations` — Conversas com IA
- `emotional_journal` — Diário emocional
- `challenges` — Desafios financeiros
- `household_tasks` — Tarefas domésticas

## Edge Functions / Hooks
- `financial_advisor` — Consultora financeira com IA (chat + insights)
- `parse_invoice` — Parse de faturas de cartão
- `convert_invoice_items` — Conversão de itens em transações
- `emotional_analysis` — Análise emocional de gastos
- `validate_invite_code` — Validação de códigos de convite
- `join_family` — Entrar em uma família via convite
- `log-error` — Recebimento de erros do frontend
- `health-check` — Verificação de saúde da aplicação

## Deploy
O deploy é gerenciado pelo Skip Cloud. O build de produção usa Vite com minificação, code splitting e compressão.

1. Faça push das alterações
2. O Skip Cloud builda e deploya automaticamente
3. URLs de produção:
   - Frontend: `https://familiafinance.goskip.app`
   - Backend: `https://familia-finance-8ef10.shrd00.internal.goskip.dev`

## Acessibilidade
- WCAG 2.1 AA compliance
- Navegação por teclado
- ARIA labels e roles
- Skip links
- Suporte a leitores de tela
- Contraste de cores adequado

## Modo Escuro
- Toggle no header e na página de perfil
- Opções: Claro, Escuro, Sistema
- Persistência em localStorage
- Transições suaves de 200ms
