# WeCRM

Monorepo do CRM em `/home/bernard/automation/we-crm`, separado do `we-refund`.

## Escopo atual

- Login com Better Auth sem cadastro público
- Bootstrap automático do usuário admin via `ADMIN_USER` e `ADMIN_PASSWORD`
- Multi-tenant com organizações
- CRUD de contatos
- CRUD de listas de contatos
- Adicionar e remover contatos de listas
- Tela administrativa básica para usuários

## Estrutura

- `apps/api`: API NestJS + Prisma + Better Auth
- `apps/web`: frontend React/Vite
- `packages/api-contract`: contratos `@ts-rest`
- `packages/ui`: componentes compartilhados copiados do `we-refund`
- `infra/init.sql`: criação do schema PostgreSQL `we-crm`

## Como subir

1. Copie `.env.example` para `.env`.
2. Se quiser subir o banco local por Docker, rode `docker compose -f infra/docker-compose.yml up -d`.
3. Garanta que o `DATABASE_URL` aponte para esse banco.
4. Rode `pnpm install`.
5. Rode `pnpm --filter @repo/api-contract build`.
6. Rode `pnpm generate`.
7. Rode `pnpm --filter api exec prisma migrate deploy`.
8. Rode `pnpm dev`.

## Atalho para desenvolvimento

Para subir banco, aplicar migration e iniciar API + frontend em um comando:

`pnpm dev:all`

Para derrubar o banco e encerrar os processos do projeto:

`pnpm stop`

## URLs padrão

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- API reference: `http://localhost:3000/reference`
