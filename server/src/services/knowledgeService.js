import { createChunk } from './chunkingService.js';

/**
 * Curated Technical Knowledge Base across key engineering disciplines.
 * Used to ground RAG retrieval for adaptive interview questions and evaluations.
 */
export const TECHNICAL_KNOWLEDGE_DOCS = [
  // Java & JVM
  {
    topic: 'Java',
    category: 'Programming Languages',
    section: 'Memory Model & Concurrency',
    text: 'Java Memory Model: Heap memory is split into Young Generation (Eden, S0, S1) and Old Generation (Tenured), plus Metaspace for class definitions. Garbage collection algorithms include G1GC, ZGC, and ParallelGC. In Java concurrency, volatile guarantees visibility across threads without mutual exclusion, while synchronized and ReentrantLock guarantee mutual exclusion and atomicity. Virtual threads (Project Loom) provide lightweight user-mode concurrency.'
  },
  {
    topic: 'Java',
    category: 'Programming Languages',
    section: 'Generics & Collections',
    text: 'Java Collections Framework: HashMap uses an array of buckets (linked list converted to red-black tree when bucket size exceeds 8 with TREEIFY_THRESHOLD). ConcurrentHashMap uses bucket-level locking (CAS + synchronized on head node) to support concurrent reads and writes without full table lock. Type erasure removes generic type parameters at compile time.'
  },

  // Spring Boot
  {
    topic: 'Spring Boot',
    category: 'Frameworks',
    section: 'IoC & Dependency Injection',
    text: 'Spring Framework core principles: Inversion of Control (IoC) container manages bean lifecycles (@Component, @Service, @Repository, @Controller). Bean scopes include Singleton (default, single instance per container), Prototype (new instance on every injection), Request, and Session. Dependency injection is achieved via constructor injection (preferred for immutability and testability), setter injection, or field injection (@Autowired).'
  },
  {
    topic: 'Spring Boot',
    category: 'Frameworks',
    section: 'Auto-configuration & AOP',
    text: 'Spring Boot Auto-Configuration: Evaluates @ConditionalOnClass, @ConditionalOnMissingBean, and application properties to configure beans automatically. Spring Aspect-Oriented Programming (AOP) uses dynamic proxies (JDK dynamic proxy for interfaces, CGLIB for classes) to implement cross-cutting concerns like @Transactional, security checks, and distributed logging.'
  },

  // SQL & Relational Databases
  {
    topic: 'SQL',
    category: 'Databases',
    section: 'Transactions & ACID',
    text: 'ACID Properties in Relational Databases: Atomicity (all-or-nothing), Consistency (integrity constraints preserved), Isolation (concurrent transactions do not interfere), and Durability (committed changes persist to WAL/disk). Isolation levels: Read Uncommitted (dirty reads), Read Committed (non-repeatable reads prevented via short locks/MVCC), Repeatable Read (phantom reads possible in standard SQL, prevented in InnoDB via Next-Key Locking), and Serializable.'
  },
  {
    topic: 'SQL',
    category: 'Databases',
    section: 'Indexing & Query Optimization',
    text: 'Relational Indexing: B-Tree / B+Tree indexes store sorted keys with pointers to data pages, allowing O(log N) lookups, range scans, and prefix matches. Composite indexes follow the Leftmost Prefix Rule. Execution plans (EXPLAIN ANALYZE) reveal index scans, index lookups, sequential table scans, and join strategies (Nested Loop, Hash Join, Merge Join).'
  },

  // MongoDB & NoSQL
  {
    topic: 'MongoDB',
    category: 'Databases',
    section: 'Document Model & Aggregations',
    text: 'MongoDB Architecture: Document-oriented NoSQL database storing BSON documents up to 16MB. Aggregation pipeline uses stages ($match, $group, $project, $lookup, $unwind) for data processing. Write concern (w: 1, w: "majority", j: true) and Read concern ("local", "majority", "linearizable") govern data consistency and replication guarantees across replica sets (Primary-Secondary election with Raft-like protocol).'
  },
  {
    topic: 'MongoDB',
    category: 'Databases',
    section: 'Sharding & Indexing',
    text: 'MongoDB Indexing & Sharding: Indexes use B-Trees (Single Field, Compound, Multikey for arrays, Geospatial, TTL, Text). Sharding distributes collections across shard clusters using Shard Keys (Ranged or Hashed) routed by Mongos query routers and Config Servers.'
  },

  // React
  {
    topic: 'React',
    category: 'Frontend',
    section: 'Reconciliation & Virtual DOM',
    text: 'React Architecture: Virtual DOM reconciler (Fiber) performs asynchronous, interruptible rendering using two phases: Render phase (pure, calculates diffs) and Commit phase (mutates real DOM). Keys in lists allow React to identify moved, added, or removed elements during reconciliation algorithm (O(N) heuristic).'
  },
  {
    topic: 'React',
    category: 'Frontend',
    section: 'Hooks & State Management',
    text: 'React Hooks Mechanics: useState, useEffect, useMemo, useCallback, and useRef rely on array/linked-list order of hooks within fiber nodes. Memoization with useMemo/useCallback prevents redundant calculations and reference changes. React 18 features Concurrent Rendering, automatic batching, Transitions (useTransition, useDeferredValue), and Server Components.'
  },

  // Node.js & Express
  {
    topic: 'Node.js',
    category: 'Backend',
    section: 'Event Loop & Libuv',
    text: 'Node.js Event Loop: Single-threaded JavaScript execution on top of V8 and libuv. Event loop phases: Timers (setTimeout/setInterval) -> Pending I/O callbacks -> Idle/Prepare -> Poll (incoming connections and I/O data) -> Check (setImmediate) -> Close callbacks. Microtasks (process.nextTick, Promise callbacks) execute immediately between phase transitions. Thread pool (default 4 threads) handles file I/O, DNS, and crypto operations.'
  },
  {
    topic: 'Express',
    category: 'Backend',
    section: 'Middleware Pipeline & Error Handling',
    text: 'Express.js Architecture: Connect-style middleware pipeline executing sequential functions (req, res, next). Error-handling middleware is identified by the 4-argument signature (err, req, res, next). Middleware best practices include payload sanitization, helmet security headers, rate-limiting, CORS configuration, and centralized async error handling wrappers.'
  },

  // REST APIs
  {
    topic: 'REST APIs',
    category: 'Architecture',
    section: 'HTTP Semantics & Idempotency',
    text: 'REST API Best Practices: Resource-oriented URI naming using nouns and plural forms. Correct HTTP methods: GET (safe, idempotent), POST (create, non-idempotent), PUT (replace entire resource, idempotent), PATCH (partial modification, non-idempotent by default), DELETE (remove, idempotent). HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized (unauthenticated), 403 Forbidden (authenticated without permission), 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Internal Error.'
  },

  // DBMS
  {
    topic: 'DBMS',
    category: 'Foundations',
    section: 'Database Normalization & Storage',
    text: 'Database Normalization: 1NF (atomic values, unique rows), 2NF (1NF + no partial key dependency on composite keys), 3NF (2NF + no transitive dependency on non-key columns), and BCNF. Normalization reduces update anomalies and data duplication, while strategic Denormalization improves read throughput in analytical and high-scale OLTP systems.'
  },

  // Operating Systems
  {
    topic: 'Operating Systems',
    category: 'Foundations',
    section: 'Processes, Threads & Memory Management',
    text: 'Operating System Fundamentals: Process vs. Thread. A process has isolated address space (code, data, heap, stack), while threads within a process share heap and global data but have private stacks. Inter-Process Communication (IPC) mechanisms: Pipes, Sockets, Shared Memory, Message Queues. Virtual memory uses Page Tables and TLB (Translation Lookaside Buffer) with Demand Paging and page replacement policies (LRU, FIFO). Deadlock conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.'
  },

  // Computer Networks
  {
    topic: 'Computer Networks',
    category: 'Foundations',
    section: 'TCP/IP & OSI Model',
    text: 'Computer Networks: OSI 7-layer vs TCP/IP 4-layer model. TCP 3-way handshake (SYN, SYN-ACK, ACK) and 4-way termination (FIN, ACK, FIN, ACK). TCP flow control uses sliding window; congestion control uses Slow Start, Congestion Avoidance, Fast Retransmit, and Fast Recovery. UDP is connectionless and low-overhead. HTTPS uses TLS 1.3 handshake (asymmetric key exchange using ECDH, symmetric data encryption using AES-GCM or ChaCha20).'
  },

  // OOP
  {
    topic: 'OOP',
    category: 'Foundations',
    section: 'SOLID Principles & Design Patterns',
    text: 'Object-Oriented Programming & SOLID Principles: Single Responsibility Principle, Open/Closed Principle, Liskov Substitution Principle, Interface Segregation Principle, and Dependency Inversion Principle. Core Design Patterns: Creational (Singleton, Factory, Builder), Structural (Adapter, Decorator, Facade, Proxy), and Behavioral (Observer, Strategy, Command, Chain of Responsibility).'
  },

  // Data Structures & Algorithms
  {
    topic: 'Data Structures',
    category: 'Algorithms',
    section: 'Trees, Graphs & Complexities',
    text: 'Data Structures & Algorithmic Complexity: Big-O Time and Space complexities. Arrays (O(1) access), Hash Maps (O(1) average lookup/insert, O(N) worst-case collision), Binary Search Trees (O(log N) balanced, O(N) degenerate), Heaps / Priority Queues (O(log N) push/pop, O(1) peek). Graph traversals: BFS (queue, shortest path in unweighted graphs) and DFS (stack/recursion, topological sort, cycle detection). Dynamic Programming solves problems with optimal substructure and overlapping subproblems via memoization (top-down) or tabulation (bottom-up).'
  },

  // System Design
  {
    topic: 'System Design',
    category: 'Architecture',
    section: 'Distributed Systems & Scalability',
    text: 'System Design Fundamentals: CAP Theorem (Consistency vs Availability vs Partition Tolerance under network splits) and PACELC theorem. Scalability strategies: Horizontal scaling (load balancing with round-robin, least connections, consistent hashing), Caching layers (Cache-Aside, Write-Through, Write-Back, Read-Through with Redis/Memcached), Database replication (Leader-Follower, Multi-Leader), and Asynchronous messaging with Kafka or RabbitMQ for event-driven decoupling.'
  },

  // Git / GitHub
  {
    topic: 'Git/GitHub',
    category: 'Tools & DevOps',
    section: 'Version Control & Branching Workflows',
    text: 'Git Version Control: Distributed VCS storing snapshots as directed acyclic graphs (DAG) of commit objects, trees, and blobs. Git merge vs. Git rebase (linear history vs. true branch topology). Resolving merge conflicts, interactive rebasing (git rebase -i), stashing, and Git workflows (GitFlow, Trunk-Based Development, GitHub Flow with PR reviews and CI automation).'
  },

  // Docker
  {
    topic: 'Docker',
    category: 'Containers',
    section: 'Containerization & Image Optimization',
    text: 'Docker Containerization: Namespaces (pid, net, ipc, mnt, uts, user) provide isolation; Cgroups (control groups) enforce resource constraints (CPU, memory, I/O limits). Dockerfile best practices: Multi-stage builds to minimize image footprint, non-root user execution, explicit layer caching, and minimizing image layers.'
  },

  // Kubernetes
  {
    topic: 'Kubernetes',
    category: 'Containers & Cloud',
    section: 'Container Orchestration & Pod Lifecycle',
    text: 'Kubernetes Architecture: Control Plane (API Server, etcd, Controller Manager, Scheduler) and Worker Nodes (Kubelet, Kube-Proxy, Container Runtime). Core primitives: Pods (atomic scheduling unit), Deployments (rolling updates, rollback), Services (ClusterIP, NodePort, LoadBalancer for stable networking), Ingress Controllers, ConfigMaps, and Secrets. Health probes: Liveness, Readiness, and Startup probes.'
  }
];

/**
 * Returns technical knowledge formatted as indexed chunks with metadata.
 */
export const getKnowledgeBaseChunks = () => {
  return TECHNICAL_KNOWLEDGE_DOCS.map((doc, idx) =>
    createChunk({
      sourceType: 'knowledge_base',
      sourceId: `kb_${doc.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${idx}`,
      section: `${doc.topic}: ${doc.section}`,
      text: `[${doc.topic} - ${doc.section}] ${doc.text}`,
      chunkIndex: idx
    })
  );
};
