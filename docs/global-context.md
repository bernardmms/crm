# WeCRM Global Context

This file serves as the working context for new agent instances. The goal is to reduce rediscovery and maintain consistency when creating or adjusting features in this monorepo.

## Overview

WeCRM is a CRM monorepo with a backend, frontend, and shared packages.

- `apps/api`: NestJS API using Prisma, Better Auth, and ts-rest.
- `apps/web`: React + Vite + React Router frontend.
- `packages/api-contract`: shared API contracts and schemas using `@ts-rest/core` and `zod`.
- `packages/ui`: shared component library.
- `infra`: database and local environment assets, including `init.sql` and `docker-compose.yml`.

The main database uses PostgreSQL with a dedicated `we-crm` schema.

## Current Functional Scope

The product is focused on:

- authentication via Better Auth with no public sign-up;
- automatic admin user bootstrap via `ADMIN_USER` and `ADMIN_PASSWORD`;
- multi-tenancy with organizations, members, and invitations;
- contact CRUD;
- contact list CRUD;
- contact-to-list relationships;
- admin area for user management;
- prospecting/campaign data from campaign integration sources.

## System Architecture

### Backend

The backend at `apps/api` uses NestJS and Prisma.

- `AppModule` registers `ConfigModule`, `TsRestModule`, domain modules, and a global Prisma exception filter.
- Environment validation requires at minimum: `PORT`, `FRONTEND_URL`, `NODE_ENV`, and `BETTER_AUTH_BASE_URL`.
- The main modules are `AuthModule`, `AdminModule`, `ContactModule`, `ContactListModule`, `OrganizationModule`, and `CampaignDataModule`.

### Frontend

The frontend at `apps/web` uses React 19, Vite, React Router, Sonner, and shared components from `@repo/ui`.

- Pages are organized by domain under `src/modules`.
- Main routes cover login, home, contacts, lists, prospecting, admin, and organizations.
- The frontend consumes shared contracts from `@repo/api-contract`.

### Shared Contracts

`packages/api-contract` is the source of truth for HTTP routes and schemas.

- The package exports `contract` as the main router.
- Contracts are split by domain: auth, admin, contact, contact-list, and campaign-data.
- Validation uses `zod`.

## Extension Rules

When creating or modifying a feature, follow this order:

1. Update the schema and contract in `packages/api-contract`.
2. Implement or adjust the corresponding endpoint in `apps/api`.
3. Update consumption on the frontend in `apps/web`.
4. If persistence changes, update Prisma and regenerate the client.

Do not introduce a new way of modeling the domain without a clear reason. Reuse existing modules and patterns before creating new structure.

## Notes for New Agents

- The project is multi-tenant; nearly every feature must respect `organizationId` or the organization context where applicable.
- The API contract must remain aligned with the actual implementation; `TsRestModule` validates both request body and response.
- Use existing shared components and request clients before duplicating UI or request logic.
- Preserve domain separation within `apps/web/src/modules` and `apps/api/src`.
- Consult the Prisma schema before adding new relations — several entities already have bindings to `User` and `Organization`.

## Core Entities and Domains

### Identity and Access

- `User`, `Session`, `Account`, and `Verification` are handled by the Better Auth integration.
- `AuthModule` covers email/password sign-in, sign-out, and current session retrieval.

### Organizations

- `Organization`, `Member`, and `Invitation` back the multi-tenant model.
- A `User` can have members and sent invitations.

### CRM

- `Contact` represents a contact with basic data and notes.
- `ContactList` represents contact lists.
- `ContactListEntry` links a contact to a list.

### Admin and Prospecting

- The admin domain covers listing, creating, editing, and removing users.
- The campaign data domain covers listing campaigns, databases, and associated persons/companies.

## Local Development Flow

The most useful commands, at a high level, are:

- `pnpm install`
- `pnpm --filter @repo/api-contract build`
- `pnpm generate`
- `pnpm dev` or `pnpm dev:all`

If the change touches Prisma or contracts, verify that the client and types have been regenerated before completing the task.

## What to Keep in Mind When Implementing New Features

Prioritize consistency with what already exists:

- keep routes and schemas declared declaratively in the contract;
- prefer adding logic to the correct domain module;
- avoid unnecessary coupling between domains;
- preserve the validation and error-handling patterns already used by the API;
- keep the frontend domain-oriented, not scattered as loose components without context.

## Quick Entry Files

- [README.md](../README.md)
- [package.json](../package.json)
- [apps/api/src/app.module.ts](../apps/api/src/app.module.ts)
- [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma)
- [packages/api-contract/index.ts](../packages/api-contract/index.ts)
- [apps/web/src/main.tsx](../apps/web/src/main.tsx)

## Summary for Agents

When a new agent instance receives a task in this repo, the standard path is: understand the contract in the shared package, locate the domain module in the API, assess the Prisma impact, and then reflect the change in the frontend. The project is small enough to support this flow without inventing new abstractions.