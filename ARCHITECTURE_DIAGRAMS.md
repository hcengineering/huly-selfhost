# Huly Self-Hosted Architecture Diagrams

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
    
    subgraph "Infrastructure"
        CockroachDB[(CockroachDB<br/>:26257<br/>Primary Database)]
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

## 2. Service Dependencies & Communication Flow

```mermaid
graph LR
    subgraph "Entry Point"
        Client[Client<br/>Browser/Desktop]
    end
    
    subgraph "Reverse Proxy"
        Nginx[Nginx<br/>:80/:443]
    end
    
    subgraph "Frontend"
        Front[Front Server<br/>:8080]
    end
    
    subgraph "Authentication"
        Account[Account<br/>:3000]
    end
    
    subgraph "Core Transaction Layer"
        Transactor[Transactor<br/>:3333]
        Workspace[Workspace<br/>Manager]
    end
    
    subgraph "Real-time Services"
        Collaborator[Collaborator<br/>:3078<br/>Document Sync]
    end
    
    subgraph "Storage & Data"
        HulyKVS[HulyKVS<br/>:8094]
    end
    
    subgraph "Search & Indexing"
        Fulltext[Fulltext<br/>:4700]
        Rekoni[Rekoni<br/>:4004<br/>AI/ML]
    end
    
    subgraph "Monitoring"
        Stats[Stats<br/>:4900]
    end
    
    subgraph "Infrastructure"
        CockroachDB[(CockroachDB)]
        Elastic[(Elasticsearch)]
        Minio[(MinIO)]
        Redpanda[Redpanda<br/>Kafka]
    end
    
    Client -->|HTTP/WS| Nginx
    Nginx -->|Proxy| Front
    Nginx -->|/_accounts| Account
    Nginx -->|/_transactor| Transactor
    Nginx -->|/_collaborator| Collaborator
    Nginx -->|/_rekoni| Rekoni
    Nginx -->|/_stats| Stats
    Nginx -->|/files| Minio
    
    Front -->|Auth| Account
    
    Transactor -->|DB| CockroachDB
    Transactor -->|Events| Redpanda
    Transactor -->|Search| Fulltext
    
    Workspace -->|DB| CockroachDB
    Workspace -->|Events| Redpanda
    
    Account -->|DB| CockroachDB
    Account -->|Events| Redpanda
    
    Collaborator -->|Storage| Minio
    
    Fulltext -->|Index| Elastic
    Fulltext -->|AI| Rekoni
    Fulltext -->|Events| Redpanda
    
    HulyKVS -->|DB| CockroachDB
    
    style Nginx fill:#009639
    style Front fill:#4A90E2
    style Transactor fill:#E24A4A
    style Account fill:#E24A4A
    style CockroachDB fill:#7ED321
    style Redpanda fill:#F5A623
```

---

## 3. Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant Nginx
    participant Front
    participant Account
    participant Transactor
    participant Fulltext
    participant CockroachDB
    participant Elasticsearch
    participant Redpanda
    participant Minio
    
    Client->>Nginx: HTTP Request
    Nginx->>Front: Proxy Request
    Front->>Account: Verify Token
    Account->>CockroachDB: Query User
    CockroachDB-->>Account: User Data
    Account-->>Front: Token Valid
    
    Client->>Nginx: WebSocket Connect
    Nginx->>Transactor: Proxy WebSocket
    Transactor->>CockroachDB: Load Workspace Data
    CockroachDB-->>Transactor: Workspace State
    Transactor-->>Client: Real-time Connection
    
    Client->>Transactor: Create Document
    Transactor->>CockroachDB: Save Document
    Transactor->>Redpanda: Publish Event
    
    Redpanda->>Fulltext: Index Event
    Fulltext->>CockroachDB: Fetch Document
    Fulltext->>Elasticsearch: Index Content
    
    Client->>Nginx: Upload File
    Nginx->>Minio: Store File
    Minio-->>Client: File URL
```

---

## 4. Infrastructure & Databases

```mermaid
graph TB
    subgraph "Primary Database"
        CR[(CockroachDB<br/>:26257<br/>Distributed SQL)]
    end
    
    subgraph "Search Engine"
        ES[(Elasticsearch<br/>:9200<br/>Fulltext Search)]
    end
    
    subgraph "Object Storage"
        Minio[(MinIO<br/>:9000<br/>S3-Compatible)]
    end
    
    subgraph "Message Queue"
        RP[Redpanda<br/>:9092<br/>Kafka-Compatible<br/>Event Streaming]
    end
    
    subgraph "Services Using CockroachDB"
        Account[Account]
        Workspace[Workspace]
        Transactor[Transactor]
        HulyKVS[HulyKVS]
        Fulltext[Fulltext]
    end
    
    subgraph "Services Using Elasticsearch"
        FT[Fulltext Service]
    end
    
    subgraph "Services Using MinIO"
        Collaborator[Collaborator]
        FrontS[Front]
    end
    
    subgraph "Services Using Redpanda"
        WS[Workspace]
        TR[Transactor]
        FTS[Fulltext]
        ACC[Account]
    end
    
    Account --> CR
    Workspace --> CR
    Transactor --> CR
    HulyKVS --> CR
    Fulltext --> CR
    
    FT --> ES
    
    Collaborator --> Minio
    FrontS --> Minio
    
    WS --> RP
    TR --> RP
    FTS --> RP
    ACC --> RP
    
    style CR fill:#7ED321
    style ES fill:#FFD700
    style Minio fill:#C92A2A
    style RP fill:#F5A623
```

---

## 5. Network Topology & Nginx Routing

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
    
    subgraph "Infrastructure Services"
        CockroachDB[(CockroachDB :26257)]
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

## 6. Event-Driven Architecture (Redpanda/Kafka)

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

## 7. Storage Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Client[Client Application]
    end
    
    subgraph "Reverse Proxy"
        Nginx[Nginx<br/>/files endpoint]
    end
    
    subgraph "Storage Services"
        Collaborator[Collaborator Service<br/>:3078<br/>Document Storage]
        Front[Front Service<br/>:8080<br/>File Upload]
    end
    
    subgraph "Metadata Storage"
        CockroachDB[(CockroachDB<br/>File Metadata<br/>Permissions<br/>References)]
    end
    
    subgraph "Blob Storage"
        Minio[(MinIO<br/>S3-Compatible<br/>Object Storage)]
        Buckets[Buckets:<br/>- huly-storage]
    end
    
    Client -->|Upload/Download| Nginx
    Nginx -->|/files| Minio
    
    Collaborator -->|Document Blobs| Minio
    Front -->|File Storage| Minio
    
    Minio --> Buckets
    
    style Minio fill:#C92A2A
    style CockroachDB fill:#7ED321
    style Nginx fill:#009639
```

---

## 8. Authentication & Authorization Flow

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

## 9. Service Categories & Responsibilities

```mermaid
mindmap
  root((Huly Self-Hosted))
    Authentication
      Account Service
        User Management
        Token Generation
        Workspace Assignment
      Stats Service
        Usage Tracking
        Metrics Collection
    
    Core Data
      Transactor
        Transaction Processing
        Real-time Updates
        Business Logic
      Workspace
        Workspace Management
        Initialization
    
    Storage
      HulyKVS
        Key-Value Store
        Configuration
      MinIO
        Object Storage
        File Management
    
    Search
      Fulltext Service
        Elasticsearch Integration
        Content Indexing
      Rekoni
        AI/ML Processing
        Content Recognition
    
    Real-time
      Collaborator
        Document Collaboration
        Y.js Synchronization
    
    Infrastructure
      Nginx
        Reverse Proxy
        SSL Termination
        Route Management
      CockroachDB
        Primary Database
        Distributed SQL
      Elasticsearch
        Search Engine
        Full-text Index
      Redpanda
        Event Streaming
        Message Queue
```

---

## 10. Docker Compose Service Map

```mermaid
graph TB
    subgraph "Docker Network: huly_net"
        subgraph "Entry Point"
            Nginx[nginx<br/>:80/:443<br/>nginx:1.21.3]
        end
        
        subgraph "Application Services"
            Front[front<br/>:8080<br/>hardcoreeng/front]
            Account[account<br/>:3000<br/>hardcoreeng/account]
            Transactor[transactor<br/>:3333<br/>hardcoreeng/transactor]
            Collaborator[collaborator<br/>:3078<br/>hardcoreeng/collaborator]
            Workspace[workspace<br/>hardcoreeng/workspace]
            Fulltext[fulltext<br/>:4700<br/>hardcoreeng/fulltext]
            Rekoni[rekoni<br/>:4004<br/>hardcoreeng/rekoni-service]
            Stats[stats<br/>:4900<br/>hardcoreeng/stats]
            HulyKVS[kvs<br/>:8094<br/>hardcoreeng/hulykvs]
        end
        
        subgraph "Infrastructure"
            CockroachDB[(cockroach<br/>:26257<br/>cockroachdb/cockroach)]
            Elasticsearch[(elastic<br/>:9200<br/>elasticsearch:7.14.2)]
            Minio[(minio<br/>:9000/:9001<br/>minio/minio)]
            Redpanda[redpanda<br/>:9092/:19092<br/>redpandadata/redpanda]
        end
    end
    
    subgraph "Volumes"
        V1[cr_data]
        V2[cr_certs]
        V3[elastic]
        V4[files]
        V5[redpanda]
    end
    
    CockroachDB --> V1
    CockroachDB --> V2
    Elasticsearch --> V3
    Minio --> V4
    Redpanda --> V5
    
    style Nginx fill:#009639
    style Front fill:#4A90E2
    style Transactor fill:#E24A4A
    style Account fill:#E24A4A
    style CockroachDB fill:#7ED321
    style Redpanda fill:#F5A623
    style Minio fill:#C92A2A
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
| **Infrastructure** | | | | |
| cockroach | cockroachdb/cockroach | 26257 | Primary database | - |
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
