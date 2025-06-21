<div align='center'>

<img src="public/logo-mini.png" alt="Logo for Bedstack RealWorld example" width=200>
<h1>Bedstack (Stripped)</h1>

[![Tests Status](https://github.com/bedtime-coders/bedstack-stripped/actions/workflows/tests.yml/badge.svg?event=push&branch=main&)](https://github.com/bedtime-coders/bedstac/actions/workflows/tests.yml?query=branch%3Amain+event%3Apush) [![Discord](https://img.shields.io/discord/1164270344115335320?label=Chat&color=5865f4&logo=discord&labelColor=121214)](https://discord.gg/8UcP9QB5AV) [![License](https://custom-icon-badges.demolab.com/github/license/bedtime-coders/bedstack-stripped?label=License&color=blue&logo=law&labelColor=0d1117)](https://github.com/bedtime-coders/bedstack-stripped/blob/main/LICENSE) [![Bun](https://img.shields.io/badge/Bun-14151a?logo=bun&logoColor=fbf0df)](https://bun.sh/) [![ElysiaJS](https://custom-icon-badges.demolab.com/badge/ElysiaJS-0f172b.svg?logo=elysia)](https://elysiajs.com/) [![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=000)](https://drizzle.team/) [![Biome](https://img.shields.io/badge/Biome-24272f?logo=biome&logoColor=f6f6f9)](https://biomejs.dev/) [![Scalar](https://img.shields.io/badge/Scalar-080808?logo=scalar&logoColor=e7e7e7)](https://scalar.com/) [![Star](https://custom-icon-badges.demolab.com/github/stars/bedtime-coders/bedstack-stripped?logo=star&logoColor=373737&label=Star)](https://github.com/bedtime-coders/bedstack-stripped/stargazers/)

⚡ Stripped version of [Bedstack](https://github.com/bedtime-coders/bedstack) for rapid prototyping

</div>

## Bedstack: Bun + ElysiaJS + Drizzle Stack

**Bedstack** is a collection of bleeding-edge technologies to build modern web applications.

Including:

- **B**: [Bun](https://bun.sh) - Runtime + package manager, [Biome](https://biomejs.dev) - Code quality
- **E**: [ElysiaJS](https://elysiajs.com) - HTTP Framework
- **D**: [Drizzle](https://orm.drizzle.team) - ORM

## How is this different from Bedstack?

This is a stripped version of [Bedstack](https://github.com/bedtime-coders/bedstack) for rapid prototyping, with the same core design, but simplified. See our [ARCHITECTURE.md](./ARCHITECTURE.md) for more details!

## Development

1. Install dependencies

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and fill in the values

   ```bash
   cp .env.example .env
   ```

3. Start the database server

   ```bash
   bun db:start
   ```

4. Push the database schema to the database

   ```bash
   bun db:push
   ```

5. Start the development server

   ```bash
   bun dev
   ```

6. (Optional) Start the [database studio](https://orm.drizzle.team/drizzle-studio/overview)
   ```bash
   bun db:studio
   ```


## Testing

Run all tests:
```bash
bun run test # Not `bun test`!
```

Or run different test suites individually:
```bash
bun test:api # Run the API tests
bun test:unit # Run the unit tests
```

> [!TIP]
> To create test-specific environment configuration, create a `.env.test` file. You may use `.env.test.example` as a template:
> ```bash
> cp .env.test.example .env.test
> ```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information, including how to set up your development environment.
