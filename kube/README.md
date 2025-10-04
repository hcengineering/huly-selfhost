# Huly Kubernetes Deployment Guide

This repository contains Kubernetes manifests and configuration templates to deploy **Huly** on a working Kubernetes cluster.

---

## 🧩 Prerequisites

Before deploying, ensure you have a **functioning Kubernetes cluster** (v1.26+ recommended) with sufficient resources for stateful and stateless workloads.

### 1. CockroachDB (version: `latest-v24.2`)

Huly requires a **CockroachDB** database.  
> ⚠️ **Note:** Newer versions of CockroachDB (v25.x and above) are **not compatible** due to a known issue tracked here:  
> [hcengineering/platform#9963](https://github.com/hcengineering/platform/issues/9963)

Only **CockroachDB** is currently supported.  
Alternatives such as **PostgreSQL** and **YugabyteDB** are **not** supported — see the open issue for details:  
[hcengineering/platform#9831](https://github.com/hcengineering/platform/issues/9831)

Deploy CockroachDB using your preferred operator or Helm chart, and ensure connectivity from the namespace.

### 2. Redpanda

Huly uses **Redpanda** as the Kafka-compatible streaming backbone.

We recommend installing the **Redpanda Operator** and deploying a cluster within the same namespace:

```yaml
apiVersion: cluster.redpanda.com/v1alpha2
kind: Redpanda
metadata:
  name: redpanda
spec:
  clusterSpec:
    image:
      tag: v25.2.5
    statefulset:
      replicas: 3
    tls:
      enabled: false
```

This setup provides a minimal, non-TLS development cluster suitable for local and test environments.

### 3. Elasticsearch / OpenSearch

Huly requires an **Elasticsearch**-compatible search backend.

If you choose **OpenSearch**, note that:
- You must **disable security completely**, or
- Provide a **CA trusted by pod root**, or
- Place the service **behind a proxy** that translates plain HTTP to TLS.

> An issue is open to support `verify=false` for insecure configurations [hcengineering/platform#9974](https://github.com/hcengineering/platform/issues/9974)

### 4. MinIO (S3-Compatible Storage)

Configure **MinIO** or any other S3-compatible service for storage (attachments, media, etc.).

You must define the endpoint and credentials in your deployment environment — these values are provided via the `Secret` and `ConfigMap` manifests (see below).


## 🏗️ Deployment Overview

Each microservice is deployed as its own **Deployment** and **Service** pair within the namespace.

| Component     | Description |
|----------------|-------------|
| `account`      | Handles user identity, authentication, and account lifecycle. |
| `collaborator` | Manages user collaboration, roles, and access across workspaces. |
| `front`        | Public-facing frontend serving the main Huly UI. |
| `fulltext`     | Provides full-text indexing and search integration with Elasticsearch/OpenSearch. |
| `mail`         | Email sending and processing service for notifications. |
| `rekoni`       | Recommendation and analytics engine. |
| `stats`        | Metrics and statistics aggregation service. |
| `transactor`   | Core backend handling business logic and transactions. |
| `workspace`    | Orchestrates workspace creation, project data, and user sessions. |

These services are grouped and managed by the top-level **Kustomization** file (`kustomization.yaml`).

## 🌐 Example HTTP Route (Gateway API)

Below is an example **HTTPRoute** definition for exposing Huly via `huly.example.com`.  
This configuration enforces HTTPS and routes internal service paths appropriately.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: huly.example.com
spec:
  parentRefs:
    - name: wan
  hostnames:
    - "huly.example.com"
  rules:
    # Force HTTPS
    - matches:
      - headers:
        - name: "x-forwarded-proto"
          value: "http"
      filters:
      - type: RequestRedirect
        requestRedirect:
          scheme: https
          statusCode: 301

    # Route account service
    - matches:
      - path:
          type: PathPrefix
          value: /_account
      filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /
      backendRefs:
      - name: account
        namespace: huly
        port: 80

    # Route collaborator service
    - matches:
      - path:
          type: PathPrefix
          value: /_collaborator
      filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /
      backendRefs:
      - name: collaborator
        namespace: huly
        port: 80

    # Route rekoni service
    - matches:
      - path:
          type: PathPrefix
          value: /_rekoni
      filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /
      backendRefs:
      - name: rekoni
        namespace: huly
        port: 80

    # Route stats service
    - matches:
      - path:
          type: PathPrefix
          value: /_stats
      filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /
      backendRefs:
      - name: stats
        namespace: huly
        port: 80

    # Route transactor service
    - matches:
      - path:
          type: PathPrefix
          value: /_transactor
      filters:
      - type: URLRewrite
        urlRewrite:
          path:
            type: ReplacePrefixMatch
            replacePrefixMatch: /
      backendRefs:
      - name: transactor
        namespace: huly
        port: 80

    # Token-based routing (eyJ prefix)
    - matches:
      - path:
          type: PathPrefix
          value: /eyJ
      backendRefs:
      - name: transactor
        namespace: huly
        port: 80

    # Default route
    - matches:
      - path:
          type: PathPrefix
          value: /
      backendRefs:
      - name: front
        namespace: huly
        port: 80
```
