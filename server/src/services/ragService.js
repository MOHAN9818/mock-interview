import { chunkResume, chunkJobDescription } from './chunkingService.js';
import { getKnowledgeBaseChunks } from './knowledgeService.js';
import { getCachedEmbedding, cosineSimilarity, embedChunks } from './embeddingService.js';

/**
 * RAG Vector Storage & Retrieval Service.
 * Implements full RAG pipeline:
 * Documents -> Extraction -> Chunking -> Embedding -> Vector Store -> Similarity Search -> Top-K Chunks -> Grounding
 */
export class SessionKnowledgeStore {
  constructor() {
    this.chunks = []; // Array of chunk objects with embeddings
    this.isIndexed = false;
  }

  /**
   * Indexes candidate resume, target job description, and technical knowledge base into the vector store.
   */
  async initialize({
    resumeStructured = {},
    rawResumeText = '',
    jdStructured = {},
    rawJdText = ''
  } = {}) {
    const allRawChunks = [];

    // 1. Resume Chunks
    const resumeChunks = chunkResume(resumeStructured, rawResumeText);
    allRawChunks.push(...resumeChunks);

    // 2. Job Description Chunks
    const jdChunks = chunkJobDescription(jdStructured, rawJdText);
    allRawChunks.push(...jdChunks);

    // 3. Technical Knowledge Base Chunks
    const kbChunks = getKnowledgeBaseChunks();
    allRawChunks.push(...kbChunks);

    // Embed all chunks with caching
    this.chunks = await embedChunks(allRawChunks);
    this.isIndexed = true;
    return this.chunks.length;
  }

  /**
   * Retrieves top-K most relevant chunks given a search query.
   * Uses cosine similarity on embeddings with lexical fallback.
   */
  async retrieveRelevantChunks(query = '', filters = {}, topK = 5) {
    if (!query?.trim() || this.chunks.length === 0) {
      return [];
    }

    const queryEmbedding = await getCachedEmbedding(query);
    const scoredChunks = [];

    for (const chunk of this.chunks) {
      // Apply filters if provided
      if (filters.sourceType && chunk.sourceType !== filters.sourceType) {
        continue;
      }
      if (filters.excludeSourceType && chunk.sourceType === filters.excludeSourceType) {
        continue;
      }
      if (filters.sourceId && chunk.sourceId !== filters.sourceId) {
        continue;
      }

      let score = 0;
      if (queryEmbedding && queryEmbedding.length > 0 && chunk.embedding && chunk.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      } else {
        // Keyword / Lexical overlap fallback
        score = this.calculateLexicalOverlap(query, chunk.text);
      }

      // Minimum score threshold to prevent noise
      const minThreshold = filters.minScore ?? 0.15;
      if (score < minThreshold) {
        continue;
      }

      scoredChunks.push({
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        section: chunk.section,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata || {},
        citation: `[${chunk.sourceType.toUpperCase()} - ${chunk.section}]`,
        score: Number(score.toFixed(4))
      });
    }

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);

    // Deduplicate by text similarity or exact text
    const unique = [];
    const seenText = new Set();
    for (const item of scoredChunks) {
      const normalized = item.text.toLowerCase().trim();
      if (!seenText.has(normalized)) {
        seenText.add(normalized);
        unique.push(item);
      }
      if (unique.length >= topK) break;
    }

    return unique;
  }

  /**
   * Lexical fallback calculation based on token overlap.
   */
  calculateLexicalOverlap(query = '', text = '') {
    const tokenize = (str) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2);

    const queryTokens = new Set(tokenize(query));
    if (queryTokens.size === 0) return 0;

    const textTokens = tokenize(text);
    let matchCount = 0;
    for (const token of textTokens) {
      if (queryTokens.has(token)) {
        matchCount++;
      }
    }

    return Math.min(1, matchCount / (queryTokens.size * 2));
  }
}

/**
 * Creates and initializes a session knowledge store.
 */
export const createSessionKnowledgeStore = async (data = {}) => {
  const store = new SessionKnowledgeStore();
  await store.initialize(data);
  return store;
};
