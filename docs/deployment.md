# Deployment Guide

## Deploying to Kubernetes

Before deploying, ensure `kubectl` is configured to point at your target cluster. Update `k8s/secret.yaml` with real credentials (see _Updating Secrets_ below), then apply the manifests in order:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

To verify all pods are running: `kubectl get pods -n acme-content-workflow`. The backend init container (`prisma-migrate`) will run `prisma db push` before the application container starts, ensuring the database schema is in sync on every deployment.

## Setting Up ArgoCD

Install ArgoCD into your cluster if it is not already present (`kubectl create namespace argocd && kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`). Once ArgoCD is running, update the `repoURL` field in `k8s/argocd-application.yaml` to point at your actual Git repository, then apply the manifest:

```bash
kubectl apply -f k8s/argocd-application.yaml
```

ArgoCD will poll the `k8s/` path on the `main` branch and automatically sync any changes (with `prune` and `selfHeal` enabled). Access the ArgoCD UI by port-forwarding: `kubectl port-forward svc/argocd-server -n argocd 8080:443`, then log in with the initial admin password retrieved via `kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d`.

## Updating Secrets

Never commit real credentials to source control. To update a secret value in-cluster, edit `k8s/secret.yaml` locally with the new values and re-apply it, or use `kubectl` directly:

```bash
kubectl create secret generic acme-secrets \
  --namespace acme-content-workflow \
  --from-literal=DATABASE_URL="postgresql://postgres:<password>@postgres-service:5432/acme_content_db" \
  --from-literal=ANTHROPIC_API_KEY="<key>" \
  --from-literal=OPENAI_API_KEY="<key>" \
  --from-literal=POSTGRES_PASSWORD="<password>" \
  --dry-run=client -o yaml | kubectl apply -f -
```

For production workloads, consider using a secrets management solution such as Sealed Secrets, External Secrets Operator, or HashiCorp Vault to avoid storing plaintext credentials in the repository.

## Scaling Services

To scale the backend or frontend horizontally, use `kubectl scale`:

```bash
# Scale backend to 4 replicas
kubectl scale deployment backend --replicas=4 -n acme-content-workflow

# Scale frontend to 3 replicas
kubectl scale deployment frontend --replicas=3 -n acme-content-workflow
```

To make a replica count change permanent, update the `replicas` field in the corresponding manifest (`k8s/backend.yaml` or `k8s/frontend.yaml`) and commit the change. ArgoCD will detect the drift and sync the cluster back to the desired state. For automatic scaling based on CPU or memory usage, add a `HorizontalPodAutoscaler` resource targeting the deployment.
