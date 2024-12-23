# Quick Start with Kind
> [!NOTE]
> kind does not require kubectl, but you will not be able to perform some of the examples in our docs without it. To install kubectl see the upstream kubectl installation docs.

## Install 

**macOS:**
```bash
# For Intel Macs
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.26.0/kind-darwin-amd64
# For M1 / ARM Macs
[ $(uname -m) = arm64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.26.0/kind-darwin-arm64
chmod +x ./kind
mv ./kind /some-dir-in-your-PATH/kind
```

**Linux:**
```bash
# For AMD64 / x86_64
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.26.0/kind-linux-amd64
# For ARM64
[ $(uname -m) = aarch64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.26.0/kind-linux-arm64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

## Setup cluster with port forwarding 

> [!NOTE]
> On the host computer, `localhost:80` should be accessible.

```bash
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF
```

Deploy the ingress nginx controller:
```bash
kubectl apply -f https://kind.sigs.k8s.io/examples/ingress/deploy-ingress-nginx.yaml
```

Wait the nginx controller to be ready:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

Add host entries to be able to work with ingresses from the host machine:
```bash
sudo cp -p /etc/hosts /tmp/hosts
echo "127.0.0.1       huly.example" | sudo tee -a /etc/hosts
echo "127.0.0.1       account.huly.example" | sudo tee -a /etc/hosts
```

Deploy Huly with `kubectl`:

```bash
kubectl apply -R -f .
```

Wait until the front app is coming up:
```bash
kubectl wait --for=condition=Avaiable deployment/front --timeout 3m
```

Now, launch your web and and (enjoy Huly!)[http://huly.example]!


## Cleanup

Restore hosts file:
```bash
sudo mv /tmp/hosts /etc/hosts
```

Cleanup Huly:
```bash
kubectl delete -R -f .
```

Delete kind cluster:
```bash
kind delete cluster
```