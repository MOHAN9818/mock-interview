# AI Career Intelligence & Adaptive Mock Interview Platform

An enterprise-grade, full-stack **MERN + Gemini RAG** Career Intelligence platform featuring automated ATS resume analysis, job description semantic alignment, evidence extraction, adaptive multi-mode AI mock interviews, deterministic code complexity analysis, executive PDF assessment reporting, and career analytics.

---

## 🌟 Key Upgrades & Capabilities

### 1. Advanced ATS Resume Intelligence & Evidence Extraction
- **Exhaustive ATS Parsing**: Extracts skills, programming languages, frameworks, databases, developer tools, projects, work experience, internships, education, and certifications.
- **Line-by-Line Evidence Grounding**: Extracts verbatim quote snippets linking every detected skill to where it appears in the candidate's uploaded resume.
- **Weak Bullet Point Detection & AI Rewrites**: Pinpoints vague, low-impact descriptions and offers structured Before vs. After comparisons (Action Verb + Context + Quantified Metric) without fabricating achievements.
- **Missing Section Analysis**: Identifies omissions (such as CI/CD, unit testing, performance metrics, certifications).

### 2. Multi-Factor ATS Job-Description Matching
- **Required vs. Preferred Competencies**: Separates hard requirements from preferred qualifications.
- **Hybrid Alignment Engine**: Blends vector embeddings cosine similarity with lexical keyword overlap.
- **Project Relevance & Skill Alignment**: Computes distinct scores for project relevance, technical stack alignment, and overall benchmark compatibility.
- **Actionable ATS Recommendations**: Specific, transparent feedback to tailor the resume for the target role.

### 3. RAG Vector Knowledge Base & Prompt Injection Defense
- **Dynamic Semantic Chunking**: Chunks resume, job description, and curated engineering knowledge base docs with metadata (`sourceType`, `section`, `chunkIndex`, `estimatedTokens`).
- **Prompt Injection Defense**: Sanitizes input streams and document bodies to block prompt tampering and instruction overrides.
- **RAG-Grounded Adaptive Interviewing**: Synthesizes relevant knowledge chunks to dynamically steer question depth, follow-ups, and answer evaluations.

### 4. Adaptive AI Interview Studio & Multi-Modal Avatars
- **4 Interview Modes**:
  1. *Technical*: Deep dive into language runtime mechanics, concurrency, memory models, databases, and algorithms.
  2. *System Design & Scalability*: High-availability architecture, caching, database partitioning, and rate limiting.
  3. *Project Deep Dive*: Challenges specific architectural decisions and optimizations documented in the candidate's resume.
  4. *HR / Behavioral*: Assesses leadership, conflict resolution, and teamwork using the STAR method.
- **Dynamic Difficulty Adaptation**: Real-time progression across *Beginner (Easy)*, *Intermediate (Medium)*, and *Advanced (Hard)* based on live candidate performance.
- **Anti-Repetition Tracking**: Ensures diverse question coverage and avoids redundant topics.
- **Real-Time Voice & Video**: Web Speech voice synthesis audio replay, live browser speech transcription, webcam preview, and dynamic visual AI interviewer avatar states (`speaking`, `listening`, `evaluating`, `thinking`, `idle`).

### 5. Multi-Dimensional Evaluation & Deterministic Code Analyzer
- **Multi-Metric Scoring**: Technical Correctness, Relevance, Completeness, Clarity & Communication, Depth, and Problem Solving (0–100 scale).
- **Deterministic Code Validator**: Analyzes bracket balancing, syntax correctness, and algorithmic time/space complexity ($O(N)$, $O(N \log N)$, $O(N^2)$, $O(2^N)$) for coding questions.
- **Structured Explanations**: Strengths, mistakes identified, missing key concepts, and Senior-Level Model Answers.

### 6. Executive PDF Assessment Reports
- Multi-page PDF generated on-demand with:
  - Header badge and core competency benchmark progress cards.
  - ATS Matched vs. Missing skill breakdown.
  - AI Resume Bullet Rewrites and improvement suggestions.
  - Question-by-question candidate answer transcripts, evaluations, identified gaps, and senior model answers.
  - Personalized phased learning roadmap.

### 7. Career Analytics & Performance History
- Chronological score growth trend charts.
- Top-performing technical domains vs. topics requiring practice.
- Repeatedly missed concepts tracking across multiple sessions.
- Direct session review and PDF downloads.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, React Router 6, Recharts, Axios, Web Speech API.
- **Backend**: Node.js, Express.js (ES Modules), MongoDB & Mongoose.
- **AI & RAG Engine**: Google Gemini API (`gemini-3.6-flash`, `gemini-2.5-flash`), `gemini-embedding-2`, In-Memory Vector Store.
- **Document Processing & Reporting**: `pdf-parse`, `mammoth` (DOCX), `pdfkit` (PDF generation).
- **Security & Reliability**: JWT session authentication, bcrypt password hashing, sliding-window rate limiting (`aiRateLimiter`), prompt sanitization, compound MongoDB indexes (`userId + createdAt`).

---

## 🚀 Quick Start & Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB instance (local or Atlas URI)
- Google Gemini API Key

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file in `server/`:
```env
PORT=5000
FALLBACK_PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/mockinterview
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

Start backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Tests

Run backend unit and integration test suite:
```bash
cd server
npm test
```

Test coverage includes:
- Resume skill evidence extraction
- RAG chunking and cosine similarity
- Session knowledge store lexical & semantic retrieval
- Answer evaluation and score aggregation
- Deterministic code complexity & syntax validation
- Security middleware (rate limiter & prompt injection sanitization)

---

## 🛡️ Security & Privacy Notice
- Document uploads are processed securely in-memory.
- Sensitive environment variables and API keys must remain strictly in `server/.env` and should never be exposed in client code.
