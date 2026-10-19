import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSkillEvidence } from '../src/services/resumeService.js';

test('Resume Service - extractSkillEvidence maps detected skills to source lines', () => {
  const sampleResume = `
John Doe
Software Engineer
Skills: JavaScript, React, Node.js, Express, MongoDB, Docker
Experience:
- Designed high-throughput microservices using Node.js and Redis caching.
- Built responsive user interfaces with React and Tailwind CSS.
Education:
- B.Tech in Computer Science (2024)
`;

  const skills = ['React', 'Node.js', 'Redis', 'Docker'];
  const evidence = extractSkillEvidence(sampleResume, skills);

  assert.ok(evidence['React'], 'Evidence for React should exist');
  assert.ok(evidence['React'].includes('React'), 'Evidence snippet should contain React');
  assert.ok(evidence['Node.js'].includes('Node.js'), 'Evidence snippet should contain Node.js');
  assert.ok(evidence['Docker'].includes('Docker'), 'Evidence snippet should contain Docker');
});
