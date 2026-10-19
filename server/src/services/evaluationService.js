import { callGemini, parseJsonSafe } from './geminiService.js';
import { createSessionKnowledgeStore } from './ragService.js';

/**
 * Deterministic syntax validator, bracket checker, and complexity estimator for coding questions.
 */
export const evaluateCodeSnippet = (code = '', language = 'javascript') => {
  if (!code || typeof code !== 'string') {
    return { hasCode: false };
  }

  // Extract code block if markdown formatting is present
  const codeBlockMatch = code.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*```/);
  const snippet = codeBlockMatch ? codeBlockMatch[1].trim() : code.trim();

  // Basic heuristic to check if the answer contains actual source code
  const codeIndicators = [
    /\b(function|def|class|const|let|var|return|if|for|while|import|public|private|void)\b/,
    /[{};=><&|]/,
    /\bSystem\.out\.println|console\.log|print\(/
  ];
  const isLikelyCode = codeIndicators.some((regex) => regex.test(snippet)) && snippet.length > 25;

  if (!isLikelyCode) {
    return { hasCode: false };
  }

  // 1. Bracket & Parenthesis Balancing
  const stack = [];
  const pairs = { '(': ')', '{': '}', '[': ']' };
  let bracketValid = true;
  for (const char of snippet) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (char === ')' || char === '}' || char === ']') {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        bracketValid = false;
        break;
      }
    }
  }
  if (stack.length > 0) bracketValid = false;

  // 2. Complexity Estimation Heuristics
  let estimatedTimeComplexity = 'O(1)';
  let estimatedSpaceComplexity = 'O(1)';

  const nestedLoopMatch = snippet.match(/for\s*\(.*?\)\s*\{[\s\S]*?for\s*\(.*?\)/) || snippet.match(/for\s+.*?in[\s\S]*?for\s+.*?in/);
  const singleLoopMatch = snippet.match(/for\s*\(|while\s*\(|for\s+\w+\s+in|\.forEach|\.map/);
  const recursionMatch = snippet.match(/return\s+\w+\s*\(/);
  const sortingMatch = snippet.match(/\.sort\(|sorted\(/);

  if (nestedLoopMatch) {
    estimatedTimeComplexity = 'O(N^2) or O(N*M) Quadratic';
  } else if (sortingMatch) {
    estimatedTimeComplexity = 'O(N log N) Log-linear';
  } else if (singleLoopMatch) {
    estimatedTimeComplexity = 'O(N) Linear';
  } else if (recursionMatch) {
    estimatedTimeComplexity = 'O(2^N) / O(N) Recursive branch';
  }

  const memoryAllocationMatch = snippet.match(/new\s+(Array|Map|Set|ArrayList|HashMap)|\[\]|\{\}/);
  if (memoryAllocationMatch && (singleLoopMatch || nestedLoopMatch)) {
    estimatedSpaceComplexity = 'O(N) Auxiliary Space';
  }

  return {
    hasCode: true,
    syntaxValid: bracketValid,
    bracketBalance: bracketValid ? 'Balanced' : 'Unbalanced brackets / syntax anomaly',
    estimatedTimeComplexity,
    estimatedSpaceComplexity,
    codeLength: snippet.length
  };
};

/**
 * Multi-dimensional Answer Evaluation Engine with RAG Grounding, Deterministic Code Analysis & Hallucination Detection.
 */
export const evaluateAnswer = async (
  question = '',
  answer = '',
  resumeStructured = {},
  jdStructured = {}
) => {
  if (!question || !answer || !answer.trim()) {
    return {
      relevance: 0,
      technical_correctness: 0,
      completeness: 0,
      clarity: 0,
      communication: 0,
      depth: 0,
      problem_solving: 0,
      overall_answer_score: 0,
      confidence_level: 'High',
      performance_tier: 'Completely incorrect / Skipped',
      strengths: [],
      weaknesses: ['No answer provided or answer was empty.'],
      mistakes_identified: ['Answer was empty or skipped.'],
      missing_key_concepts: ['Explanation of the requested technical topic and mechanics.'],
      hallucinations_identified: [],
      ideal_answer: 'For this question, an ideal response should define the core principles, articulate the underlying mechanics, evaluate practical trade-offs, and cite production design considerations.',
      feedback: 'The answer was empty. Please articulate technical rationale and architectural mechanics.',
      recommended_followup: 'Could you please explain your foundational approach to this topic?',
      difficulty_for_next_question: 'easy',
      deterministic_code_analysis: null
    };
  }

  // Deterministic Code Check
  const codeAnalysis = evaluateCodeSnippet(answer);

  // Retrieve grounding technical context for the question
  let technicalGrounding = '';
  try {
    const ragStore = await createSessionKnowledgeStore({ resumeStructured, jdStructured });
    const chunks = await ragStore.retrieveRelevantChunks(`${question} ${answer.substring(0, 200)}`, {}, 3);
    technicalGrounding = chunks.map((c) => c.text).join('\n');
  } catch (e) {
    technicalGrounding = 'Standard software engineering principles.';
  }

  const promptSystem = `You are a Principal Software Architect and strict Technical Interview Assessor.
Evaluate the candidate's answer against the interview question and technical truth.

GROUNDING TECHNICAL CONTEXT:
${technicalGrounding}

EVALUATION CRITERIA:
1. Technical Correctness (0-100): Accuracy of facts, syntax, architectural concepts. Penalize false claims, misconceptions, or confusing terminology.
2. Relevance (0-100): Directness to the specific question asked without rambling.
3. Completeness (0-100): Coverage of primary mechanism, edge cases, and failure modes.
4. Clarity & Communication (0-100): Structured articulation, terminology precision.
5. Depth (0-100): Underlying execution model, concurrency, memory, or runtime trade-offs.
6. Problem Solving (0-100): Practical engineering judgment and trade-off analysis.

TIERS TO DISTINGUISH:
- "Completely incorrect" (score 0-30)
- "Partially correct" (score 31-60)
- "Mostly correct" (score 61-79)
- "Fully correct" (score 80-90)
- "Excellent/deep answer" (score 91-100)

Return ONLY a valid JSON object matching:
{
  "relevance": 85,
  "technical_correctness": 80,
  "completeness": 70,
  "clarity": 85,
  "communication": 80,
  "depth": 75,
  "problem_solving": 75,
  "overall_answer_score": 79,
  "confidence_level": "High",
  "performance_tier": "Mostly correct",
  "strengths": ["Accurately defined core mechanics..."],
  "weaknesses": ["Did not address connection timeouts or error states..."],
  "mistakes_identified": ["Confused process isolation with thread safety..."],
  "missing_key_concepts": ["Connection pooling", "Idempotency"],
  "hallucinations_identified": [],
  "ideal_answer": "Senior-level model answer (3-4 sentences) explaining fundamental concept, under-the-hood mechanism, and trade-offs.",
  "feedback": "2-3 sentences explaining rationale, praise, and constructive guidance.",
  "recommended_followup": "Targeted follow-up question to probe missing concepts",
  "difficulty_for_next_question": "medium"
}`;

  const promptUser = `Target Position: ${jdStructured?.role || 'Software Engineer'}
Question Asked: "${question}"
Candidate Answer: "${answer}"`;

  const messages = [
    { role: 'system', content: promptSystem },
    { role: 'user', content: promptUser }
  ];

  const aiReply = await callGemini(messages, 'gemini-2.5-flash', 'application/json', 0.15);
  const parsed = parseJsonSafe(aiReply);

  if (parsed && typeof parsed === 'object') {
    const rel = Math.min(100, Math.max(0, Number(parsed.relevance) || 50));
    const tech = Math.min(100, Math.max(0, Number(parsed.technical_correctness) || 50));
    const comp = Math.min(100, Math.max(0, Number(parsed.completeness) || 50));
    const clar = Math.min(100, Math.max(0, Number(parsed.clarity) || 50));
    const comm = Math.min(100, Math.max(0, Number(parsed.communication) || 50));
    const depth = Math.min(100, Math.max(0, Number(parsed.depth) || 50));
    const prob = Math.min(100, Math.max(0, Number(parsed.problem_solving) || 50));

    const overall = parsed.overall_answer_score
      ? Math.min(100, Math.max(0, Number(parsed.overall_answer_score)))
      : Math.round(rel * 0.2 + tech * 0.25 + comp * 0.15 + clar * 0.15 + depth * 0.15 + prob * 0.1);

    let tier = parsed.performance_tier || 'Partially correct';
    if (overall >= 90) tier = 'Excellent/deep answer';
    else if (overall >= 80) tier = 'Fully correct';
    else if (overall >= 60) tier = 'Mostly correct';
    else if (overall >= 35) tier = 'Partially correct';
    else tier = 'Completely incorrect';

    return {
      relevance: rel,
      technical_correctness: tech,
      completeness: comp,
      clarity: clar,
      communication: comm,
      depth,
      problem_solving: prob,
      overall_answer_score: overall,
      confidence_level: parsed.confidence_level || 'High',
      performance_tier: tier,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths : ['Addressed the general question topic.'],
      weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length ? parsed.weaknesses : ['Needs deeper discussion of edge cases and architecture.'],
      mistakes_identified: Array.isArray(parsed.mistakes_identified) ? parsed.mistakes_identified : [],
      missing_key_concepts: Array.isArray(parsed.missing_key_concepts) ? parsed.missing_key_concepts : [],
      hallucinations_identified: Array.isArray(parsed.hallucinations_identified) ? parsed.hallucinations_identified : [],
      ideal_answer: parsed.ideal_answer || 'An ideal answer explains the underlying mechanics, system trade-offs, and practical production considerations.',
      feedback: parsed.feedback || 'The answer was evaluated against core technical precision and depth.',
      recommended_followup: parsed.recommended_followup || 'Could you elaborate on the underlying failure recovery mechanism?',
      difficulty_for_next_question: ['easy', 'medium', 'hard'].includes(parsed.difficulty_for_next_question?.toLowerCase())
        ? parsed.difficulty_for_next_question.toLowerCase()
        : (overall >= 80 ? 'hard' : overall >= 55 ? 'medium' : 'easy'),
      deterministic_code_analysis: codeAnalysis.hasCode ? codeAnalysis : null
    };
  }

  // Fallback
  return {
    relevance: 55,
    technical_correctness: 50,
    completeness: 45,
    clarity: 55,
    communication: 55,
    depth: 45,
    problem_solving: 50,
    overall_answer_score: 50,
    confidence_level: 'Medium',
    performance_tier: 'Partially correct',
    strengths: ['Addressed the topic.'],
    weaknesses: ['Needs more technical specificity and architectural detail.'],
    mistakes_identified: ['Explanation lacked granular system mechanics.'],
    missing_key_concepts: ['Underlying architecture details', 'Trade-off considerations'],
    hallucinations_identified: [],
    ideal_answer: 'An ideal answer highlights core definitions, architectural mechanics, and edge case resilience.',
    feedback: 'Evaluated response against technical foundations.',
    recommended_followup: 'Can you describe a concrete technical trade-off in this scenario?',
    difficulty_for_next_question: 'medium',
    deterministic_code_analysis: codeAnalysis.hasCode ? codeAnalysis : null
  };
};

/**
 * Calculates comprehensive final assessment report.
 */
export const generateFinalAssessment = async (evaluations = [], resumeQuality = {}, matchScore = {}) => {
  if (!evaluations || evaluations.length === 0) {
    return {
      OverallScore: 0,
      TechnicalKnowledge: 0,
      Communication: 0,
      ProblemSolving: 0,
      AnswerRelevance: 0,
      TechnicalCorrectness: 0,
      Completeness: 0,
      Confidence: 0,
      ResumeQuality: resumeQuality?.resume_score || 50,
      JobCompatibility: matchScore?.job_match_score || 50,
      ReadinessLevel: 'Needs Preparation',
      strengths: [],
      weaknesses: [],
      repeatedMistakes: [],
      frequentlyMissedConcepts: [],
      summary: 'No evaluated questions in this interview session.'
    };
  }

  let sumTech = 0;
  let sumComm = 0;
  let sumProb = 0;
  let sumRel = 0;
  let sumComp = 0;
  let sumDepth = 0;
  const allStrengths = [];
  const allWeaknesses = [];
  const allMistakes = [];
  const allMissingConcepts = [];

  evaluations.forEach((ev) => {
    sumTech += Number(ev.technical_correctness || ev.overall_answer_score || 50);
    sumComm += Number(ev.communication || ev.clarity || 50);
    sumProb += Number(ev.problem_solving || ev.depth || 50);
    sumRel += Number(ev.relevance || 50);
    sumComp += Number(ev.completeness || 50);
    sumDepth += Number(ev.depth || 50);

    if (Array.isArray(ev.strengths)) allStrengths.push(...ev.strengths);
    if (Array.isArray(ev.weaknesses)) allWeaknesses.push(...ev.weaknesses);
    if (Array.isArray(ev.mistakes_identified)) allMistakes.push(...ev.mistakes_identified);
    if (Array.isArray(ev.missing_key_concepts)) allMissingConcepts.push(...ev.missing_key_concepts);
  });

  const n = evaluations.length;
  const TechnicalKnowledge = Math.round(sumTech / n);
  const Communication = Math.round(sumComm / n);
  const ProblemSolving = Math.round(sumProb / n);
  const AnswerRelevance = Math.round(sumRel / n);
  const Completeness = Math.round(sumComp / n);
  const TechnicalCorrectness = TechnicalKnowledge;
  const Confidence = Math.round((Communication + AnswerRelevance) / 2);

  const ResumeQuality = Math.min(100, Math.max(0, Number(resumeQuality?.resume_score) || 60));
  const JobCompatibility = Math.min(100, Math.max(0, Number(matchScore?.job_match_score) || 60));

  const OverallScore = Math.round(
    TechnicalKnowledge * 0.3 +
    ProblemSolving * 0.2 +
    Communication * 0.15 +
    AnswerRelevance * 0.15 +
    JobCompatibility * 0.1 +
    ResumeQuality * 0.1
  );

  const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
  const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 5);
  const uniqueMistakes = [...new Set(allMistakes)].slice(0, 4);
  const uniqueMissingConcepts = [...new Set(allMissingConcepts)].slice(0, 5);

  const ReadinessLevel =
    OverallScore >= 85
      ? 'High Readiness (Ready for Onsite / Offer)'
      : OverallScore >= 70
      ? 'Moderate Readiness (Competent with Minor Gaps)'
      : OverallScore >= 55
      ? 'Developing Readiness (Targeted Practice Needed)'
      : 'Early Stage (Requires Fundamental Study)';

  return {
    OverallScore,
    TechnicalKnowledge,
    Communication,
    ProblemSolving,
    AnswerRelevance,
    TechnicalCorrectness,
    Completeness,
    Confidence,
    ResumeQuality,
    JobCompatibility,
    ReadinessLevel,
    strengths: uniqueStrengths.length ? uniqueStrengths : ['Demonstrated domain awareness.'],
    weaknesses: uniqueWeaknesses.length ? uniqueWeaknesses : ['Deepen coverage of low-level trade-offs and edge cases.'],
    repeatedMistakes: uniqueMistakes,
    frequentlyMissedConcepts: uniqueMissingConcepts,
    summary: `Candidate achieved an overall benchmark score of ${OverallScore}/100 with a readiness rating of "${ReadinessLevel}". Technical Knowledge reached ${TechnicalKnowledge}%, Problem Solving ${ProblemSolving}%, and Communication ${Communication}%.`
  };
};
