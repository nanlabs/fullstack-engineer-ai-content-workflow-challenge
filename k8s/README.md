# Kubernetes + Argo CD setup

This folder contains a baseline deployment for:

- `backend` (NestJS API)
- `frontend` (Vite app)
- `postgres`
- `redis`

## 1) Update container images

Edit `k8s/base/backend-deployment.yaml` and `k8s/base/frontend-deployment.yaml` (or the overlay image tags) with your real registry images.

## 2) Update secrets

Before applying manifests, replace placeholders in:

- `k8s/base/app-secret.yaml`

At minimum:

- `DB_PASSWORD`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` (optional if not used)

## 3) Deploy with kubectl + kustomize

```bash
kubectl apply -k k8s/overlays/dev
```

## 4) Argo CD application

`argocd/application.yaml` points to this repo and path `k8s/overlays/dev`.

Update:

- `spec.source.repoURL`

Then apply:

```bash
kubectl apply -f argocd/application.yaml
```
