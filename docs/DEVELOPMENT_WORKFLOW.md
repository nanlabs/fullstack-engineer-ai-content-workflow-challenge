# Development Workflow

This document outlines the development workflow and best practices for working with the Turborepo monorepo.

## Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development**

   ```bash
   npm run dev
   ```

   This will start all applications in development mode with hot reloading.

## Available Scripts

### Root Level Scripts

| Script   | Description                                |
| -------- | ------------------------------------------ |
| `dev`    | Start all applications in development mode |
| `build`  | Build all packages and applications        |
| `test`   | Run tests across all packages              |
| `lint`   | Run linting across all packages            |
| `format` | Format all files with Prettier             |
| `clean`  | Clean all build artifacts                  |

### Package Level Scripts

Each package in `apps/` and `packages/` can have its own scripts. Common ones include:

| Script  | Description              |
| ------- | ------------------------ |
| `dev`   | Start development server |
| `build` | Build the package        |
| `test`  | Run tests                |
| `lint`  | Run linting              |

## Development Process

### 1. Creating a New Feature

1. Create a new branch from `main`

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes in the relevant packages
3. Run tests and linting

   ```bash
   npm run test
   npm run lint
   ```

4. Create a changeset for versioning

   ```bash
   npm run changeset
   ```

5. Commit your changes

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

### 2. Working with Dependencies

- **Adding a new dependency to a package**

  ```bash
  cd packages/your-package
  npm run add package-name
  ```

- **Adding a workspace dependency**

  ```bash
  cd packages/your-package
  npm run add @your-scope/package-name --workspace
  ```

### 3. Testing Changes

- Run tests for all packages

  ```bash
  npm run test
  ```

- Run tests for a specific package

  ```bash
  npm run test --filter=package-name
  ```

- Run tests in watch mode

  ```bash
  npm run test --watch
  ```

### 4. Building Packages

- Build all packages

  ```bash
  npm run build
  ```

- Build a specific package

  ```bash
  npm run build --filter=package-name
  ```

## Best Practices

1. **Package Organization**
   - Keep related code together
   - Use clear package names
   - Document package dependencies

2. **Versioning**
   - Use changesets for versioning
   - Follow semantic versioning
   - Keep changelogs up to date

3. **Testing**
   - Write tests for new features
   - Maintain test coverage
   - Run tests before committing

4. **Code Quality**
   - Follow the established code style
   - Run linters before committing
   - Keep dependencies up to date

5. **Documentation**
   - Document new features
   - Update README files
   - Keep API documentation current

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check for circular dependencies
   - Verify all dependencies are installed
   - Check TypeScript configurations

2. **Test Failures**
   - Check for environment variables
   - Verify test setup
   - Check for timing issues

3. **Dependency Issues**
   - Clear node_modules: `npm run clean`
   - Reinstall dependencies: `npm install`
   - Check for version conflicts

### Getting Help

If you encounter issues:

1. Check the [Turborepo documentation](https://turbo.build/repo/docs)
2. Search existing issues
3. Ask in the [Turborepo Discord](https://turbo.build/discord)
