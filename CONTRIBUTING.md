# Contributing

Thank you for your interest in contributing!

## Prerequisites

We use [Bun](https://bun.sh/) as our package manager and runtime. Please make sure you have it installed before you start.

## Development

### Setup

1. Clone the repository
2. Run `bun install` to install the dependencies
3. Create a `.env` file by copying the `.env.example` file and filling in the values
   ```bash
   cp .env.example .env
   ```
4. Run `bun db:push` to [push the database schema to the database](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema)
5. (Optional) Run `bun db:seed` to seed the database
6. Run `bun dev` to start the development server

### Linting and Formatting

We use [Biome](https://biomejs.dev/) for linting and formatting.

To run the linter and formatter, run `bun fix`.
