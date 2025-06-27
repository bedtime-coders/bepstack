<div align='center'>

<h1>Bepstack</h1>

[![Tests Status](https://github.com/bedtime-coders/bepstack/actions/workflows/tests.yml/badge.svg?event=push&branch=main&)](https://github.com/bedtime-coders/bepstack/actions/workflows/tests.yml?query=branch%3Amain+event%3Apush) [![Discord](https://img.shields.io/discord/1164270344115335320?label=Chat&color=5865f4&logo=discord&labelColor=121214)](https://discord.gg/8UcP9QB5AV) [![License](https://custom-icon-badges.demolab.com/github/license/bedtime-coders/bepstack?label=License&color=blue&logo=law&labelColor=0d1117)](https://github.com/bedtime-coders/bepstack/blob/main/LICENSE) [![Bun](https://img.shields.io/badge/Bun-14151a?logo=bun&logoColor=fbf0df)](https://bun.sh/) [![ElysiaJS](https://custom-icon-badges.demolab.com/badge/ElysiaJS-0f172b.svg?logo=elysia)](https://elysiajs.com/) [![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/) [![Biome](https://img.shields.io/badge/Biome-24272f?logo=biome&logoColor=f6f6f9)](https://biomejs.dev/) [![Scalar](https://img.shields.io/badge/Scalar-080808?logo=scalar&logoColor=e7e7e7)](https://scalar.com/) [![Star](https://custom-icon-badges.demolab.com/github/stars/bedtime-coders/bepstack?logo=star&logoColor=373737&label=Star)](https://github.com/bedtime-coders/bepstack/stargazers/)


[Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com) + [Prisma](https://www.prisma.io/) Stack

</div>

## What is this?

**Bepstack** is a collection of bleeding-edge technologies to build modern web applications.

Including:

- **B**: [Bun](https://bun.sh) - Runtime + package manager, [Biome](https://biomejs.dev) - Code quality
- **E**: [ElysiaJS](https://elysiajs.com) - HTTP Framework
- **P**: [Prisma](https://www.prisma.io) - ORM

This project demonstrates the stack in action via a [RealWorld](https://github.com/gothinkster/realworld) example.

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

6. (Optional) Start the [database studio](https://www.prisma.io/studio)
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

## Building for production

> [!TIP]
> See more info in ElysiaJS's [building for production](https://elysiajs.com/tutorial.html#build-for-production) guide.

1. Build the app

   ```bash
   bun run build # not `bun build`!
   ```

2. Run the production server (preview)

   ```bash
   bun preview
   ```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information, including how to set up your development environment.
