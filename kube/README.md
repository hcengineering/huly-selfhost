# Huly Kubernetes Deployment

This folder contains a sample configuration for Huly Kubernetes deployment.

## Requires

Requires a working kubernetes cluster with min one node. Each node should have min 2 vCPUs and 4GB of RAM.

If you don't have any k8s cluster, consider using the [kind setup](QUICKSTART.md).

## Check and update configuration

Huly deployment configuration is located in [config.yaml](config/config.yaml) and [secret.yaml](config/secret.yaml) files.
The sample configuration assume that Huly is available on huly.example hostname with dedicated hostname per service.

## Deploy Huly to Kubernetes

Deploy Huly with `kubectl`.

```bash
kubectl apply -R -f .
```

Now, launch your web browser and enjoy Huly!
