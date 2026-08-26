# PATENT APPLICATION SPECIFICATION

## IN THE PATENT AND TRADEMARK OFFICE / INTERNATIONAL BUREAU (PCT)

---

### TITLE OF THE INVENTION
**SYSTEM AND METHOD FOR HYBRID DUAL-ENGINE EDGE-LOCAL ARTIFICIAL INTELLIGENCE INFERENCE WITH DYNAMIC FAILOVER, REAL-TIME CONTEXT SYNTHESIS, AND DISTRIBUTED ZERO-DEPENDENCY RUNTIME**

---

### INVENTORS
- **Aarush Singh** (Primary Inventor & Systems Architect)
- **Renuka** (Co-Inventor & Collaborator)

---

### 1. FIELD OF THE INVENTION
The present invention relates generally to distributed artificial intelligence (AI), edge computing, and client-server computer architectures. More particularly, the invention relates to a system, method, and computer-readable medium for seamlessly arbitrating large language model (LLM) inference requests across heterogeneous local hardware environments and distributed serverless edge networks, incorporating real-time internet search context injection, dynamic token expansion, snapshot state synchronization, and zero-dependency terminal execution across cross-platform mobile and desktop devices.

---

### 2. BACKGROUND OF THE INVENTION AND PRIOR ART
Modern artificial intelligence architectures typically fall into one of two polarized categories:
1. **Pure Cloud-Centric AI Platforms**: Require active high-speed broadband connections and transmit all user prompt data to centralized server farms. If the network disconnects, latency spikes, or API rate limits are reached, the entire service halts.
2. **Pure Local Edge AI Implementations**: Run entirely on the user’s local CPU/GPU (e.g., local Ollama/Llama engines). While offering privacy and offline functionality, local models suffer from severe memory constraints, inability to access real-time information, slow inference on low-power consumer devices, and premature output token truncation.

Prior art systems fail to provide an intelligent, deterministic arbitration mechanism that dynamically assesses local hardware availability against serverless edge network latency, fails over instantaneously without dropping conversational state, injects live zero-key web context into model prompts, and provides universal zero-dependency terminal deployment across multiple operating systems.

There is an acute technological need for a resilient, hybrid dual-engine architecture that unifies local offline privacy, instant edge-accelerated inference, automated real-time retrieval-augmented generation (RAG), and zero-dependency execution.

---

### 3. SUMMARY OF THE INVENTION
The present invention addresses the aforementioned deficiencies by providing an intelligent, fault-tolerant, hybrid dual-engine AI system termed **Bodh AI**.

#### Key Inventive Aspects:
1. **Dynamic Dual-Engine Arbitration & Seamless Failover Engine**:
   An intelligent client-edge arbiter continuously monitors the operational status of a local inference engine (e.g., Qwen3-8B running via local TCP daemon) and a distributed serverless edge network (e.g., Cloudflare Workers AI running Llama 3.1 8B). Inference requests dynamically route to the preferred engine with sub-millisecond automated failover if either engine experiences timeout, connection refusal, or hardware resource exhaustion.

2. **Zero-Key Real-Time Contextual Search Injection (RAG)**:
   A lightweight search integration module intercepts designated user queries, queries public search indices without external API keys, parses hierarchical titles, snippets, and tracking-stripped URLs, and injects structured real-time grounding context into the LLM inference prompt with automated bibliographic source attribution.

3. **Stateless Serverless Snapshot Sharing Mechanism**:
   A cryptographic snapshot generator extracts conversational memory graphs, generates unique URL tokens, and deploys standalone, sandboxed HTML renderers with responsive styling and syntax-highlighted code blocks across edge compute nodes worldwide.

4. **Multi-Format Persistence & Structured Export Subsystem**:
   A relational schema subsystem maintaining ACID compliance locally across sessions while providing one-click structured CSV/Excel relational data extraction with clickable worldwide sharing hyperlinks.

5. **Cross-Platform Universal Zero-Dependency Runtime**:
   A single-source self-installing architecture executable across Windows, macOS, Linux, Android (Termux), and iOS (Shortcuts/PWA) via single-line cryptographic shell and PowerShell delivery endpoints.

---

### 4. BRIEF DESCRIPTION OF THE DRAWINGS
- **FIG. 1** is a high-level system architecture diagram illustrating the interaction between the client terminal runtime, local inference daemon, serverless edge workers, and distributed databases.
- **FIG. 2** is a flowchart depicting the dynamic dual-engine routing and automatic failover algorithm.
- **FIG. 3** is a flowchart illustrating the real-time zero-key web search extraction and context injection process.
- **FIG. 4** is a schematic diagram of the stateless public snapshot sharing and edge-rendered web visualization architecture.

---

### 5. DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

#### 5.1 Dual-Engine Routing & Fallback Algorithm
Let $R_t$ denote an inference request at timestamp $t$. The system evaluates:
$$\text{Engine}(R_t) = \begin{cases} 
\text{CloudEdge}, & \text{if } P = \text{"cloud"} \land \text{Latency}(\text{CloudEdge}) < \tau_{\text{cloud}} \\
\text{LocalDaemon}, & \text{if } P = \text{"local"} \land \text{Status}(\text{LocalDaemon}) = \text{ONLINE} \\
\text{CloudEdge}, & \text{if } P = \text{"local"} \land \text{Status}(\text{LocalDaemon}) = \text{OFFLINE (Failover)}
\end{cases}$$

Upon failover, conversational state history $H = [m_1, m_2, \dots, m_k]$ is serialized into compressed JSON payloads and forwarded in-flight to prevent conversational context loss.

#### 5.2 Universal Single-Line Installer and Runtime
The serverless edge worker exposes dynamic MIME-type endpoints (`/install.ps1`, `/install.sh`, `/bodh.py`, `/uninstall.ps1`, `/uninstall.sh`) which perform automated prerequisite dependency discovery (Python runtime, Rich formatting library, HTTPX async client) and injects executable binaries into system PATH variables without requiring administrative root elevation.

---

### 6. CLAIMS

**What is claimed is:**

1. **A system for hybrid artificial intelligence inference, comprising:**
   - a client runtime operating on a user computing device;
   - a local inference engine operating locally on said computing device;
   - a distributed serverless edge artificial intelligence worker network;
   - an arbitration module configured to dynamically route user inference requests between said local inference engine and said serverless edge worker network based on user selection, network availability, and daemon health; and
   - an automated failover engine configured to intercept local daemon failure and re-route prompts along with serialized multi-turn conversation history to said serverless edge worker without loss of context.

2. **The system of claim 1, further comprising:**
   - a zero-key live web search subsystem configured to asynchronously fetch real-time web results, strip tracking redirection tokens, format search snippets into structured grounding prompts, and generate cited source attributions in the generated output.

3. **The system of claim 1, further comprising:**
   - a serverless snapshot sharing subsystem configured to serialize conversation graphs, assign unique cryptographic tokens, and render responsive, dark-mode standalone HTML representations at edge server nodes accessible worldwide.

4. **The system of claim 1, further comprising:**
   - an automated structured export subsystem configured to parse local relational SQLite database records and produce multi-table spreadsheet files containing clickable worldwide snapshot URLs.

5. **A method for zero-dependency cross-platform artificial intelligence execution, comprising:**
   - serving dynamic single-line shell and PowerShell installation scripts from serverless edge endpoints;
   - auto-detecting underlying operating system environments across Windows, macOS, Linux, and Android;
   - downloading and staging self-contained client scripts with embedded database schemas; and
   - executing asynchronous streaming inference with rich terminal markdown and syntax highlighting.

---

### 7. ABSTRACT OF THE DISCLOSURE
A hybrid dual-engine artificial intelligence computing platform and method is disclosed. The system includes a client terminal runtime capable of seamlessly arbitrating inference requests between a local offline neural network engine (e.g., Qwen3-8B) and a globally distributed serverless edge neural network (e.g., Llama 3.1 8B). The architecture features sub-millisecond dynamic failover, zero-key real-time internet search context synthesis, worldwide edge snapshot generation, one-click relational spreadsheet exports with active share URLs, and universal one-line self-installing execution across Windows, macOS, Linux, Android, and iOS environments.
