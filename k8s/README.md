# Kubernetes Deployment — Helm Chart

Helm chart for deploying the ACME Content Workflow stack to Kubernetes.

## Components

| Service    | Kind         | Description                        |
|------------|--------------|------------------------------------|
| PostgreSQL | StatefulSet  | Database with persistent volume    |
| Backend    | Deployment   | NestJS API (2 replicas default)    |
| Frontend   | Deployment   | Nginx serving React SPA + reverse proxy |
| Ingress    | Ingress      | Optional, disabled by default      |

## Prerequisites

- Kubernetes cluster (1.25+)
- Helm 3.x
- Container images built and pushed to a registry

### Build & push images

```bash
# From the project root
docker build -t your-registry/acme-backend:latest ./backend
docker build -t your-registry/acme-frontend:latest ./frontend
docker push your-registry/acme-backend:latest
docker push your-registry/acme-frontend:latest
```

## Install

```bash
helm install acme ./k8s/acme-content \
  --set image.backend.repository=your-registry/acme-backend \
  --set image.frontend.repository=your-registry/acme-frontend \
  --set apiKeys.openai=sk-YOUR-KEY \
  --set backend.jwtSecret=$(openssl rand -hex 32)
```

## Upgrade

```bash
helm upgrade acme ./k8s/acme-content --reuse-values \
  --set image.backend.tag=v2
```

## Uninstall

```bash
helm uninstall acme
```

> **Note:** The PostgreSQL PVC is retained after uninstall. Delete it manually if you want to wipe data.

## Configuration

All values are documented in [values.yaml](acme-content/values.yaml). Key overrides:

| Parameter                       | Default              | Description               |
|---------------------------------|----------------------|---------------------------|
| `replicaCount.backend`          | `2`                  | Backend pod replicas      |
| `replicaCount.frontend`         | `2`                  | Frontend pod replicas     |
| `backend.jwtSecret`             | *(change me)*        | JWT signing secret        |
| `backend.defaultLlmProvider`    | `gpt-5.4-mini`       | Default AI model          |
| `apiKeys.openai`                | `""`                 | OpenAI API key            |
| `apiKeys.anthropic`             | `""`                 | Anthropic API key         |
| `apiKeys.google`                | `""`                 | Google AI API key         |
| `postgres.storage`              | `5Gi`                | PVC size for PostgreSQL   |
| `ingress.enabled`               | `false`              | Enable ingress resource   |
| `ingress.host`                  | `acme-content.local` | Ingress hostname          |

## Enable Ingress

```bash
helm install acme ./k8s/acme-content \
  --set ingress.enabled=true \
  --set ingress.host=acme.example.com \
  --set ingress.className=nginx
```

## Architecture

```
                ┌─────────┐
                │ Ingress │  (optional)
                └────┬────┘
                     │
              ┌──────┴──────┐
              │   Frontend   │  (nginx + SPA)
              │  Deployment  │
              └──────┬───┬──┘
           /api/*    │   │  /*  → static files
              ┌──────┘   │
              ▼          │
        ┌──────────┐     │
        │ Backend  │     │
        │Deployment│     │
        └────┬─────┘     │
             │
        ┌────┴─────┐
        │PostgreSQL│
        │StatefulSet│
        └──────────┘
```
