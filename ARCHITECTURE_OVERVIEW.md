# Huly Self-Hosted Architecture Overview

## Service Overview

The Huly self-hosted deployment consists of 14 services working together. This section describes each service and its role in the platform.

### Application Services

| Service | Description |
|---------|-------------|
| **front** | Web application server that serves the Huly UI. Handles static assets, client-side routing, and coordinates with backend services for data and authentication. |
| **account** | Authentication and user management service. Handles user registration, login, JWT token generation/validation, and workspace membership. |
| **transactor** | Core transaction processing engine. Maintains WebSocket connections with clients for real-time updates, processes all data mutations, enforces business logic, and publishes events to the message queue. |
| **workspace** | Workspace lifecycle management. Handles workspace creation, initialization, upgrades, and configuration. Runs background jobs for workspace maintenance. |
| **collaborator** | Real-time document collaboration service using Y.js CRDT. Enables multiple users to edit documents simultaneously with automatic conflict resolution and presence awareness. |
| **fulltext** | Search indexing service. Consumes events from the message queue, extracts content from documents, and maintains the Elasticsearch search index for fast full-text search. |
| **rekoni** | Content intelligence service. Extracts text and structured data from binary documents (PDF, DOC, DOCX, RTF) to make them searchable. Used by fulltext service for indexing document attachments. |
| **stats** | Metrics collection service. Aggregates usage statistics and health metrics from all services for monitoring and debugging. |

### Infrastructure Services

| Service | Description |
|---------|-------------|
| **nginx** | Reverse proxy and SSL termination. Routes external requests to internal services, handles HTTPS certificates, and provides a single entry point for all client connections. |
| **cockroach** | CockroachDB - the primary database. Stores all application data including users, workspaces, documents, and metadata. Provides ACID transactions and horizontal scalability. |
| **elastic** | Elasticsearch search engine. Stores and indexes document content for fast full-text search queries. Managed by the fulltext service. |
| **minio** | S3-compatible object storage. Stores all binary files including attachments, images, and document blobs. Accessed directly by nginx for file downloads. |
| **redpanda** | Kafka-compatible event streaming platform. Provides reliable message delivery between services for asynchronous processing (e.g., search indexing after document changes). |
| **kvs (HulyKVS)** | Key-value store service. Provides fast key-value storage for application configuration, user preferences, and cached data. |

### Service Communication Patterns

- **Synchronous (HTTP/WebSocket)**: Client ↔ Nginx ↔ Services
- **Asynchronous (Events)**: Transactor → Redpanda → Fulltext
- **Direct Database**: Services → CockroachDB
- **File Storage**: Services → MinIO (via S3 API)

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Desktop[Desktop App]
    end
    
    subgraph "Reverse Proxy"
        Nginx[Nginx<br/>:80/:443]
    end
    
    subgraph "Frontend Layer"
        Front[Frontend Server<br/>:8080]
    end
    
    subgraph "Core Backend Services"
        Account[Account Service<br/>:3000<br/>Authentication & Users]
        Workspace[Workspace Service<br/>Workspace Management]
        Transactor[Transactor Service<br/>:3333<br/>Transaction Processing]
        Collaborator[Collaborator Service<br/>:3078<br/>Real-time Collaboration]
    end
    
    subgraph "Data Services"
        HulyKVS[HulyKVS<br/>:8094<br/>Key-Value Store]
        Fulltext[Fulltext Service<br/>:4700<br/>Search Indexing]
        Rekoni[Rekoni Service<br/>:4004<br/>AI/ML Recognition]
    end
    
    subgraph "Monitoring"
        Stats[Stats Service<br/>:4900<br/>Metrics Collection]
    end
    
    subgraph "Primary Database"
        CockroachDB[(CockroachDB<br/>:26257<br/>Distributed SQL)]
    end
    
    subgraph "Supporting Infrastructure"
        Elasticsearch[(Elasticsearch<br/>:9200<br/>Search Engine)]
        Minio[(MinIO<br/>:9000<br/>Object Storage)]
        Redpanda[Redpanda<br/>:9092<br/>Event Streaming]
    end
    
    Browser --> Nginx
    Desktop --> Nginx
    Nginx --> Front
    Nginx --> Account
    Nginx --> Transactor
    Nginx --> Collaborator
    
    Account --> CockroachDB
    Workspace --> CockroachDB
    Transactor --> CockroachDB
    Transactor --> Fulltext
    Transactor --> Redpanda
    
    HulyKVS --> CockroachDB
    
    Fulltext --> Elasticsearch
    Fulltext --> CockroachDB
    Fulltext --> Rekoni
    Fulltext --> Redpanda
    
    Workspace --> Redpanda
    Account --> Redpanda
    
    Collaborator --> Minio
    Front --> Minio
    
    style Front fill:#4A90E2
    style Account fill:#E24A4A
    style Transactor fill:#E24A4A
    style CockroachDB fill:#7ED321
    style Redpanda fill:#F5A623
    style Nginx fill:#009639
```

---


## 2. Network Topology & Nginx Routing

```mermaid
graph TB
    subgraph "External Access"
        Client[Client Browser/Desktop]
    end
    
    subgraph "Reverse Proxy - Nginx :80/:443"
        Nginx[Nginx]
        
        subgraph "Route Mappings"
            R1["/ → front:8080"]
            R2["/_accounts → account:3000"]
            R3["/_transactor → transactor:3333"]
            R4["/_collaborator → collaborator:3078"]
            R5["/_rekoni → rekoni:4004"]
            R6["/_stats → stats:4900"]
            R7["/files → minio:9000"]
        end
    end
    
    subgraph "Application Services"
        Front[Front :8080]
        Account[Account :3000]
        Transactor[Transactor :3333]
        Collaborator[Collaborator :3078]
        Rekoni[Rekoni :4004]
        Stats[Stats :4900]
        Workspace[Workspace]
        Fulltext[Fulltext :4700]
        HulyKVS[HulyKVS :8094]
    end
    
    subgraph "Primary Database"
        CockroachDB[(CockroachDB :26257)]
    end
    
    subgraph "Supporting Infrastructure"
        Elasticsearch[(Elasticsearch :9200)]
        Minio[(MinIO :9000/:9001)]
        Redpanda[Redpanda :9092/:19092]
    end
    
    Client --> Nginx
    
    Nginx --> R1 --> Front
    Nginx --> R2 --> Account
    Nginx --> R3 --> Transactor
    Nginx --> R4 --> Collaborator
    Nginx --> R5 --> Rekoni
    Nginx --> R6 --> Stats
    Nginx --> R7 --> Minio
    
    style Nginx fill:#009639
    style Front fill:#4A90E2
    style Transactor fill:#E24A4A
    style CockroachDB fill:#7ED321
    style Redpanda fill:#F5A623
```

---

## 3. Event-Driven Architecture (Redpanda/Kafka)

```mermaid
graph LR
    subgraph "Event Producers"
        Transactor[Transactor<br/>Transaction Events]
        Workspace[Workspace<br/>Workspace Events]
        Account[Account<br/>Account Events]
    end
    
    subgraph "Event Bus"
        Redpanda[Redpanda<br/>Kafka Topics<br/>:9092]
    end
    
    subgraph "Event Consumers"
        Fulltext[Fulltext<br/>Indexing]
    end
    
    subgraph "Queue Configuration"
        QC[QUEUE_CONFIG<br/>redpanda:9092]
    end
    
    Transactor -->|Document Events| Redpanda
    Transactor -->|User Actions| Redpanda
    Workspace -->|Workspace Events| Redpanda
    Account -->|Account Events| Redpanda
    
    Redpanda -->|Index Events| Fulltext
    
    QC -.Config.-> Transactor
    QC -.Config.-> Workspace
    QC -.Config.-> Fulltext
    QC -.Config.-> Account
    
    style Redpanda fill:#F5A623
    style Transactor fill:#E24A4A
```

---

## 4. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant Nginx
    participant Front
    participant Account
    participant Transactor
    participant Workspace
    participant CockroachDB
    
    Client->>Nginx: Login Request
    Nginx->>Front: Proxy
    Front->>Account: Authenticate
    Account->>CockroachDB: Verify Credentials
    CockroachDB-->>Account: User Record
    Account->>Account: Generate Token<br/>(SERVER_SECRET)
    Account-->>Front: JWT Token
    Front-->>Client: Token + Workspace List
    
    Client->>Nginx: Connect to Workspace
    Nginx->>Account: Verify Token (/_accounts)
    Account-->>Nginx: Token Valid + User Info
    
    Nginx->>Workspace: Get Workspace Info
    Workspace->>CockroachDB: Query Workspace
    CockroachDB-->>Workspace: Workspace Data
    Workspace-->>Nginx: Workspace Config
    
    Client->>Nginx: WebSocket Connect
    Nginx->>Transactor: Proxy to /_transactor
    Transactor->>Account: Verify Token
    Account-->>Transactor: User Authorized
    Transactor->>CockroachDB: Load User Permissions
    Transactor-->>Client: Connected
    
    Note over Client,CockroachDB: All services share SERVER_SECRET<br/>for internal authentication
```

---

## Service Summary Table

| Service | Container | Port | Purpose | Dependencies |
|---------|-----------|------|---------|--------------|
| **Reverse Proxy** | | | | |
| nginx | nginx:1.21.3 | 80/443 | Reverse proxy, SSL termination | all services |
| **Frontend** | | | | |
| front | hardcoreeng/front | 8080 | Web application server | account, minio |
| **Core** | | | | |
| account | hardcoreeng/account | 3000 | Authentication & user management | cockroach, redpanda |
| transactor | hardcoreeng/transactor | 3333 | Transaction processing (WebSocket) | cockroach, redpanda, fulltext |
| workspace | hardcoreeng/workspace | - | Workspace management | cockroach, redpanda, minio |
| collaborator | hardcoreeng/collaborator | 3078 | Real-time document collaboration | account, minio |
| **Storage** | | | | |
| kvs (HulyKVS) | hardcoreeng/hulykvs | 8094 | Key-value store | cockroach |
| **Search** | | | | |
| fulltext | hardcoreeng/fulltext | 4700 | Full-text search indexing | elasticsearch, cockroach, rekoni, redpanda |
| rekoni | hardcoreeng/rekoni-service | 4004 | AI/ML recognition service | - |
| **Monitoring** | | | | |
| stats | hardcoreeng/stats | 4900 | Metrics collection | - |
| **Primary Database** | | | | |
| cockroach | cockroachdb/cockroach | 26257 | Distributed SQL database | - |
| **Supporting Infrastructure** | | | | |
| elastic | elasticsearch:7.14.2 | 9200 | Search engine | - |
| minio | minio/minio | 9000/9001 | Object storage | - |
| redpanda | redpandadata/redpanda | 9092/19092 | Event streaming (Kafka) | - |

---

## Environment Variables Summary

### Common Configuration
- `SECRET` / `SERVER_SECRET`: Shared authentication secret
- `STORAGE_CONFIG`: `minio|minio?accessKey=minioadmin&secretKey=minioadmin`
- `QUEUE_CONFIG`: `redpanda:9092`

### Database Configuration
- `DB_URL`: CockroachDB connection string (e.g., `postgresql://user:pass@cockroach:26257/huly`)
- `FULLTEXT_DB_URL`: `http://elastic:9200`

### Service URLs (Internal)
- `ACCOUNTS_URL`: `http://account:3000`
- `TRANSACTOR_URL`: `ws://transactor:3333`
- `FULLTEXT_URL`: `http://fulltext:4700`
- `REKONI_URL`: `http://rekoni:4004`
- `STATS_URL`: `http://stats:4900`

### External URLs (via Nginx)
- Frontend: `http(s)://${HOST_ADDRESS}/`
- Accounts API: `http(s)://${HOST_ADDRESS}/_accounts`
- Transactor WebSocket: `ws(s)://${HOST_ADDRESS}/_transactor`
- Collaborator WebSocket: `ws(s)://${HOST_ADDRESS}/_collaborator`
- Files: `http(s)://${HOST_ADDRESS}/files`
- Rekoni: `http(s)://${HOST_ADDRESS}/_rekoni`
- Stats: `http(s)://${HOST_ADDRESS}/_stats`

---

## Services NOT Included in Self-Hosted

The following services are available in Huly Cloud/Enterprise but **not included** in the self-hosted deployment:

| Service | Purpose |
|---------|---------|
| Datalake | Advanced blob storage management |
| Hulylake | Storage adapter API |
| HulyPulse | WebSocket push notifications |
| HulyGun | Event processing |
| Redis | Cache & pub/sub |
| Rating | Content rating service |
| Print | PDF generation |
| Sign | Digital signatures |
| Payment | Billing integration |
| Export | Data export |
| Analytics | Analytics collection |
| Process | Workflow automation |
| Stream | Video streaming |
| Media | Media processing |
| Preview | Thumbnail generation |
| Backup/Backup-API | Backup services |
| Jaeger | Distributed tracing |
