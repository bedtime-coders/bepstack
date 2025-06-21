# Bedstack (Stripped) Architecture

## Overview

**Bedstack (Stripped)** is a _distilled version_ of [the full Bedstack architecture](https://github.com/bedtime-coders/bedstack/blob/main/ARCHITECTURE.md). It keeps the _feature-sliced, modular structure_ but simplifies the layering for _rapid prototyping_.

Each feature is self-contained and designed for clarity, fast development, and maintainability - without the overhead of full enterprise layering.

## Design Philosophy

- Keep the structure familiar by following the same _horizontal layout_ as Bedstack (one folder per domain feature).

- Collapse _vertical layers_ by combining controller, service, and repository logic in a single plugin file.

- Prioritize speed-to-code by minimizing boilerplate and maximizing clarity.

- Maintain _modularity_ by keeping each domain isolated and portable.

## Layer Breakdown (Per Feature)

Each domain entity (e.g. `articles/`, `comments/`, `users/`) looks like this:

```plaintext
entities/
├── plugin.ts               # Unified entry point (controller + service + repo)
├── schema.ts               # Prisma ORM schema
├── model.ts                # TypeBox DTOs (request/response shapes)
├── interfaces/             # TypeScript types and interfaces
│   └── article.interface.ts
├── mappers/                # Small helper mappers (if needed)
│   └── to-article.dto.ts
```

> [!NOTE]
> Notice the usage of `entities` instead of `entity` - this is on purpose. We follow the NestJS convention of pluralizing the entity in the folder and filenames.

### 🧩 `entities.plugin.ts`

_Controller_, _service_, and _repository_ - all in one file.

Defines routes, handles logic, and interacts with the database, powered by [ElysiaJS](https://elysiajs.com).

### 🧬 `entities.schema.ts`

Database tables and relations using [Prisma ORM](https://www.prisma.io).

### 🧾 `entities.model.ts`

[DTOs](https://elysiajs.com/essential/best-practice.html#model) defined with [Elysia.t](https://elysiajs.com/essential/validation) (a thin wrapper around [TypeBox](https://github.com/sinclairzx81/typebox)), with types inferred automatically.

Example: 

```ts
export const CreateArticle = t.Object({
  title: t.String(),
  body: t.String(),
});

export type CreateArticle = typeof CreateArticle.static;
```

### 🧠 `interfaces/`

Domain models and type definitions.

Example: `Article`, `ArticleRow`, etc.

### 🔁 `mappers/`

Map between DB rows and DTOs (e.g. camelCase conversion, date formatting).

> [!NOTE]
> Bedstack (Stripped) has much fewer mappers than the full Bedstack - since there are fewer layers.

### Project-Level Structure

```plaintext
src/
├── articles/              # Domain entity
├── comments/              # Domain entity
├── users/                 # Domain entity
├── profiles/              # Domain entity
├── tags/                  # Domain entity
├── core/                  # Core (app, db, env, core plugins)
├── shared/                # Shared constants, utils, types, plugins, etc.
├── index.ts               # Main entry point, mounts plugins
prisma/                   # Migrations, reset, seed
```

### When to Use Bedstack (Stripped)

#### ✅ Ideal for:

- Internal tools

- MVPs and prototypes

- Hackathons or proof-of-concept apps

- Fast experimentation with full-stack logic

#### ❌ Not ideal for:

- Large-scale systems with deep domain logic

- Complex business rules requiring separation of concerns

- Teams that need fine-grained testing or enterprise observability

### See Also

- [Bedstack Full Architecture](https://github.com/bedtime-coders/bedstack/blob/main/ARCHITECTURE.md)
- [ElysiaJS Docs](https://elysiajs.com/docs)
- [Prisma ORM Docs](https://www.prisma.io/docs)
- [TypeBox Docs](https://typebox.io/docs)
