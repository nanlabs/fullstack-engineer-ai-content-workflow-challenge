# Kubernetes Deployment

This project includes a Helm chart for deploying the full ACME Content Workflow stack to Kubernetes. The chart lives in [`k8s/acme-content/`](../k8s/acme-content/).

## Architecture

```
                ┌─────────┐
                │ Ingress │  (optional — disabled by default)
                └────┬────┘
                     │
              ┌──────┴──────┐
              │   Frontend   │  nginx + React SPA
              │  Deployment  │  (2 replicas)
              └──────┬───┬──┘
           /api/*    │   │  /*  → static files
              ┌──────┘   │
              ▼          │
        ┌──────────┐     │
        │ Backend  │     │
        │Deployment│     │
        │(2 replicas)    │
        └────┬─────┘     │
             │
        ┌────┴─────┐
        │PostgreSQL │
        │StatefulSet│
        │  (1 pod)  │
        └──────────┘
```

## Components

| Resource | Kind | Description |
|----------|------|-------------|
| PostgreSQL | StatefulSet + PVC | Single-replica database with 5Gi persistent volume |
| Backend | Deployment (2 replicas) | NestJS API behind a ClusterIP Service |
| Frontend | Deployment (2 replicas) | Nginx serving the React SPA + reverse-proxying `/api/*` to the backend |
| Ingress | Ingress (optional) | External traffic routing, disabled by default |
| ConfigMap | ConfigMap | Non-secret backend configuration (PORT, JWT_EXPIRATION, DATABASE_URL, etc.) |
| Secret | Secret | JWT_SECRET, API keys, POSTGRES_PASSWORD |

## Design Decisions

### Why Helm (not raw manifests)

- **Templated values** — A single `values.yaml` file exposes every configurable knob. Reviewers don't need to hunt through multiple YAML files to change a replica count or API key.
- **Release management** — `helm upgrade` with `--reuse-values` makes incremental updates safe. `helm rollback` provides instant recovery.
- **Environment separation** — Different `values-staging.yaml` / `values-production.yaml` files can override the same templates without duplicating manifests.

### Why StatefulSet for PostgreSQL (not a managed service)

- **Self-contained demo** — The chart runs the entire stack without external dependencies. No need for an RDS instance or CloudSQL database.
- **PVC retention** — The PersistentVolumeClaim is retained after `helm uninstall`, so data survives upgrades and accidental deletions.
- **Production recommendation** — In a real environment, replace the StatefulSet with a managed database (AWS RDS, GCP CloudSQL) and point `DATABASE_URL` at it via the ConfigMap.

### Why init containers for backend

The backend Deployment includes an init container that waits for PostgreSQL to accept connections before starting the NestJS app. This avoids race conditions during first deploy where the backend would crash-loop until the database is ready.

### Secrets handling

API keys and the JWT secret are stored in a Kubernetes `Secret` object. In production, these should be injected via:

- **Sealed Secrets** — Encrypt secrets in Git, decrypt them in-cluster.
- **External Secrets Operator** — Sync from AWS Secrets Manager, Vault, etc.
- **`--set` flags at install time** — For manual deployments, pass secrets as Helm values (they never touch Git).

The chart's `values.yaml` contains empty placeholders for API keys — they must be provided at install time.

## Quick Start

### Prerequisites

- Kubernetes cluster (1.25+)
- Helm 3.x
- Container images built and pushed to a registry

### Build & push images

```bash
docker build -t your-registry/acme-backend:latest ./backend
docker build -t your-registry/acme-frontend:latest ./frontend
docker push your-registry/acme-backend:latest
docker push your-registry/acme-frontend:latest
```

### Install

```bash
helm install acme ./k8s/acme-content \
  --set image.backend.repository=your-registry/acme-backend \
  --set image.frontend.repository=your-registry/acme-frontend \
  --set apiKeys.openai=sk-YOUR-KEY \
  --set backend.jwtSecret=$(openssl rand -hex 32)
```

### Upgrade

```bash
helm upgrade acme ./k8s/acme-content --reuse-values \
  --set image.backend.tag=v2
```

### Enable Ingress

```bash
helm install acme ./k8s/acme-content \
  --set ingress.enabled=true \
  --set ingress.host=acme.example.com \
  --set ingress.className=nginx
```

### Uninstall

```bash
helm uninstall acme
# PVC is retained — delete manually to wipe data:
# kubectl delete pvc data-acme-content-postgres-0
```

## Configuration Reference

All values in [`k8s/acme-content/values.yaml`](../k8s/acme-content/values.yaml):

| Parameter | Default | Description |
|-----------|---------|-------------|
| `replicaCount.backend` | `2` | Backend pod replicas |
| `replicaCount.frontend` | `2` | Frontend pod replicas |
| `backend.port` | `3000` | Backend container port |
| `backend.jwtSecret` | *(must override)* | JWT signing secret |
| `backend.jwtExpiration` | `24h` | JWT token TTL |
| `backend.defaultLlmProvider` | `gpt-5.4-mini` | Default AI model |
| `backend.resources.requests.cpu` | `100m` | Backend CPU request |
| `backend.resources.requests.memory` | `256Mi` | Backend memory request |
| `backend.resources.limits.cpu` | `500m` | Backend CPU limit |
| `backend.resources.limits.memory` | `512Mi` | Backend memory limit |
| `frontend.port` | `80` | Frontend container port |
| `apiKeys.openai` | `""` | OpenAI API key |
| `apiKeys.anthropic` | `""` | Anthropic API key |
| `apiKeys.google` | `""` | Google AI API key |
| `postgres.storage` | `5Gi` | PVC size |
| `postgres.storageClass` | `""` | Storage class (uses cluster default) |
| `ingress.enabled` | `false` | Enable Ingress resource |
| `ingress.host` | `acme-content.local` | Ingress hostname |
| `ingress.className` | `nginx` | Ingress class |
| `ingress.tls` | `[]` | TLS configuration |

## Health Checks

| Service | Probe | Endpoint / Command |
|---------|-------|--------------------|
| Backend | Readiness + Liveness | `GET /api/ai/providers` (HTTP 200) |
| PostgreSQL | Readiness | `pg_isready -U acme` |
| Frontend | Readiness + Liveness | `GET /` (HTTP 200) |
