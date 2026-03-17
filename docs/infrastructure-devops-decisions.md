# Infrastructure & DevOps Decisions

## Kubernetes

The system is designed to run on Kubernetes to allow horizontal scaling of API services and background workers.

## Argo Workflows

Argo can be used to orchestrate and manage complex workflows or batch jobs related to AI content generation pipelines.

## Swagger API Documentation

Swagger is used to automatically generate API documentation, making it easier for developers to understand and interact with the backend endpoints.

## GitHub Actions

GitHub Actions is used for CI/CD automation, including:

- Running unit tests
- Linting
- Building the application
- Ensuring code quality before merging

## Unit Testing

Unit tests ensure reliability of the core business logic such as workflow orchestration and AI service integrations.