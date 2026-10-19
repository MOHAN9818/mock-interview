import crypto from 'crypto';
import { getGeminiEmbedding } from './geminiService.js';

// In-memory embedding cache to prevent redundant Gemini API calls
const embeddingCache = new Map();

/**
 * Generates a SHA-256 hash for a given text snippet.
 */
export const hashText = (text = '') => {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
};

/**
 * Calculates cosine similarity between two numerical vectors.
 */
export const cosineSimilarity = (vecA = [], vecB = []) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Retrieves or generates embedding for a text snippet with caching.
 */
export const getCachedEmbedding = async (text = '') => {
  const clean = text.trim();
  if (!clean) return [];

  const key = hashText(clean);
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key);
  }

  const embedding = await getGeminiEmbedding(clean);
  if (embedding && embedding.length > 0) {
    embeddingCache.set(key, embedding);
  }
  return embedding || [];
};

/**
 * Embeds a collection of chunk objects, populating their .embedding property.
 */
export const embedChunks = async (chunks = []) => {
  const embeddedChunks = [];
  for (const chunk of chunks) {
    if (!chunk.text) continue;
    const vector = await getCachedEmbedding(chunk.text);
    embeddedChunks.push({
      ...chunk,
      embedding: vector
    });
  }
  return embeddedChunks;
};
