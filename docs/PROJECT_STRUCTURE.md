# Project Structure

This document outlines the structure of the Turborepo monorepo template.

## Directory Structure

```txt
root/
├── apps/                    # Application packages
│   ├── backend/             # Backend with NestJS
│   └── frontend/            # Frontend with React
├── docs/                    # Documentation
├── package.json             # Root package.json
├── turbo.json               # Turborepo configuration
├── compose.yml              # Docker compose configuration
└── pnpm-workspace.yaml      # PNPM workspace configuration

```

## Key Directories

### `apps/`

Contains all the applications in the monorepo. Each application is a separate package that can be developed and deployed independently.

- `bakcend/`: Backend application with NestJS + TS
- `frontend/`: Frontend application with React + TS

### Configuration Files

- `turbo.json`: Defines the pipeline and dependencies between packages
- `pnpm-workspace.yaml`: Configures the PNPM workspace
- `compose.yml`: Docker compose configuration for local development

## Package Management

### Adding a New Package

1. Create a new directory in `apps/`
2. Initialize the package with `package.json`
3. Add the package to the workspace in `pnpm-workspace.yaml`
4. Update `turbo.json` if necessary

## Development Workflow

1. Install dependencies: `pnpm install`
2. Start development: `pnpm dev`
3. Build packages: `pnpm build`
4. Run tests: `pnpm test`

## Best Practices

1. Use TypeScript for all packages
2. Follow the established directory structure
3. Keep package dependencies up to date
