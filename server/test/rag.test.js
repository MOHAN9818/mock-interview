import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkResume, chunkJobDescription, createChunk } from '../src/services/chunkingService.js';
import { cosineSimilarity } from '../src/services/embeddingService.js';
import { SessionKnowledgeStore } from '../src/services/ragService.js';

test('RAG - Chunking structured resume and job description', () => {
  const resume = {
    candidate_name: 'Jane Smith',
    summary: 'Senior Full Stack Developer specializing in React and Node.js.',
    skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
    projects: [
      {
        name: 'Distributed Chat System',
        description: 'WebSockets based scalable chat service.',
        technologies: ['Node.js', 'Redis', 'WebSockets']
      }
    ]
  };

  const chunks = chunkResume(resume);
  assert.ok(chunks.length >= 2, 'Should produce at least summary, skills, and project chunks');
  assert.equal(chunks[0].sourceType, 'resume');
  assert.ok(chunks[0].text.includes('Jane Smith'));
});

test('RAG - Cosine similarity calculation', () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];

  assert.equal(Number(cosineSimilarity(vecA, vecB).toFixed(2)), 1);
  assert.equal(Number(cosineSimilarity(vecA, vecC).toFixed(2)), 0);
});

test('RAG - SessionKnowledgeStore lexical fallback retrieval and filtering', async () => {
  const store = new SessionKnowledgeStore();
  store.chunks = [
    createChunk({
      sourceType: 'resume',
      sourceId: 'candidate_resume',
      section: 'skills',
      text: 'Node.js, Express, MongoDB, Redis, Docker, Microservices',
      chunkIndex: 0
    }),
    createChunk({
      sourceType: 'knowledge_base',
      sourceId: 'kb_react_0',
      section: 'React: Virtual DOM',
      text: 'React Fiber reconciler uses asynchronous rendering with diffing algorithms.',
      chunkIndex: 1
    })
  ];
  store.isIndexed = true;

  const results = await store.retrieveRelevantChunks('Node.js microservices', {}, 3);
  assert.ok(results.length > 0, 'Should retrieve relevant chunk');
  assert.equal(results[0].sourceType, 'resume');
  assert.ok(results[0].citation.includes('RESUME'));
});
