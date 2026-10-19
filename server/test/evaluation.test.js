import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCodeSnippet, generateFinalAssessment } from '../src/services/evaluationService.js';

test('Evaluation - evaluateCodeSnippet validates balanced brackets and detects O(N^2) loops', () => {
  const codeAnswer = `
\`\`\`javascript
function findPairs(arr, target) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] + arr[j] === target) {
        result.push([arr[i], arr[j]]);
      }
    }
  }
  return result;
}
\`\`\`
`;

  const analysis = evaluateCodeSnippet(codeAnswer);
  assert.equal(analysis.hasCode, true);
  assert.equal(analysis.syntaxValid, true);
  assert.equal(analysis.bracketBalance, 'Balanced');
  assert.ok(analysis.estimatedTimeComplexity.includes('O(N^2)'));
});

test('Evaluation - evaluateCodeSnippet detects unbalanced syntax', () => {
  const badCode = `
\`\`\`javascript
function broken(arr) {
  for (let i = 0; i < arr.length; i++ {
    console.log(arr[i]);
  }
\`\`\`
`;
  const analysis = evaluateCodeSnippet(badCode);
  assert.equal(analysis.hasCode, true);
  assert.equal(analysis.syntaxValid, false);
});

test('Evaluation - generateFinalAssessment aggregates multiple question scores correctly', async () => {
  const evaluations = [
    {
      technical_correctness: 80,
      communication: 85,
      problem_solving: 75,
      relevance: 90,
      completeness: 80,
      depth: 75,
      strengths: ['Clear terminology', 'Accurate concept'],
      weaknesses: ['Add more metrics'],
      mistakes_identified: [],
      missing_key_concepts: []
    },
    {
      technical_correctness: 70,
      communication: 75,
      problem_solving: 70,
      relevance: 80,
      completeness: 70,
      depth: 65,
      strengths: ['Covered fundamentals'],
      weaknesses: ['Shallow concurrency trade-offs'],
      mistakes_identified: ['Confused lock mechanisms'],
      missing_key_concepts: ['CAS operations']
    }
  ];

  const assessment = await generateFinalAssessment(
    evaluations,
    { resume_score: 85 },
    { job_match_score: 80 }
  );

  assert.ok(assessment.OverallScore > 0 && assessment.OverallScore <= 100);
  assert.equal(assessment.TechnicalKnowledge, 75);
  assert.ok(assessment.strengths.length > 0);
  assert.ok(assessment.ReadinessLevel);
});
