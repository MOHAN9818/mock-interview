import { callGemini, parseJsonSafe } from './geminiService.js';

/**
 * Evaluates a candidate's answer with multi-dimensional criteria.
 * Assesses: Relevance, Technical Correctness, Completeness, Clarity, Communication, Depth, Problem Solving.
 * Provides: Identified mistakes, missing concepts, what was done well, and the IDEAL MODEL ANSWER.
 */
export const evaluateAnswer = async (question, answer, resumeStructured = {}, jdStructured = {}) => {
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
      strengths: [],
      weaknesses: ['No answer provided or answer was empty.'],
      mistakes_identified: ['Answer was empty or skipped.'],
      missing_key_concepts: ['Entire explanation of the requested technical topic.'],
      ideal_answer: `For this question, an ideal response should introduce the core concept, explain how it operates under the hood, discuss practical use cases, and highlight architectural trade-offs.`,
      feedback: 'The answer was empty or missing. Please provide a substantive response explaining the technical concepts.',
      recommended_followup: 'Can you please provide your perspective on this topic?',
      difficulty_for_next_question: 'easy'
    };
  }

  const prompt = `You are a strict, world-class technical interviewer and Principal Engineer assessing a candidate's response.
Critically evaluate the candidate's answer against the interview question. DO NOT give arbitrary high scores. Evaluate the ACTUAL content.

CRITICAL INSTRUCTIONS:
1. If the candidate gave a WRONG, VAGUE, or FACTUALLY INCORRECT answer:
   - Score Technical Correctness and Overall Score low (10-45).
   - In "mistakes_identified", explicitly list every technical error, misconception, or false statement.
   - In "missing_key_concepts", list all mandatory technical points they failed to mention.
2. If the candidate gave a PARTIAL or BASIC answer:
   - Score moderately (50-70).
   - Point out what was correct vs. what lacked depth or nuance.
3. If the candidate gave an EXCELLENT, comprehensive answer:
   - Score high (80-95).
   - Acknowledge architectural depth, trade-offs, and clarity.
4. "ideal_answer": Write a clear, professional, senior-engineer model answer (3-5 sentences) demonstrating how this question should be answered effectively in an interview.

Score each dimension strictly between 0 and 100:
- relevance (0-100): Directness to the specific question asked.
- technical_correctness (0-100): Accuracy of facts, terminology, and principles.
- completeness (0-100): Coverage of key components and edge cases.
- clarity (0-100): Structure, coherence, and conciseness.
- communication (0-100): Articulation and professional tone.
- depth (0-100): Low-level mechanics, scalability, and system understanding.
- problem_solving (0-100): Trade-offs, rationale, and real-world engineering judgment.

Calculate overall_answer_score:
(relevance * 0.20) + (technical_correctness * 0.25) + (completeness * 0.15) + (clarity * 0.15) + (depth * 0.15) + (problem_solving * 0.10)

Determine difficulty_for_next_question:
- "hard" if overall_answer_score >= 80
- "medium" if overall_answer_score between 55 and 79
- "easy" if overall_answer_score < 55

Return ONLY a valid JSON object matching:
{
  "relevance": 85,
  "technical_correctness": 78,
  "completeness": 65,
  "clarity": 88,
  "communication": 82,
  "depth": 70,
  "problem_solving": 75,
  "overall_answer_score": 77,
  "strengths": ["Correctly identified...", "Good explanation of..."],
  "weaknesses": ["Did not mention...", "Lacked detail on..."],
  "mistakes_identified": ["Confused X with Y...", "Incorrect claim that..."],
  "missing_key_concepts": ["Statelessness", "Signature verification", "Token expiration handling"],
  "ideal_answer": "An ideal answer should state: ...",
  "feedback": "2-3 sentences explaining exactly why this score was given, what was good, and specific guidance for improvement.",
  "recommended_followup": "Next probe question to test deeper understanding",
  "difficulty_for_next_question": "medium"
}`;

  const messages = [
    {
      role: 'system',
      content: prompt
    },
    {
      role: 'user',
      content: `Target Role: ${jdStructured?.role || 'Software Engineer'}\nInterview Question Asked:\n"${question}"\n\nCandidate's Actual Answer:\n"${answer}"`
    }
  ];

  const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.1);
  const parsed = parseJsonSafe(reply);

  if (parsed && typeof parsed === 'object') {
    const rel = Number(parsed.relevance) ?? 50;
    const tech = Number(parsed.technical_correctness) ?? 50;
    const comp = Number(parsed.completeness) ?? 50;
    const clar = Number(parsed.clarity) ?? 50;
    const comm = Number(parsed.communication) ?? 50;
    const depth = Number(parsed.depth) ?? 50;
    const prob = Number(parsed.problem_solving) ?? 50;
    const overall = parsed.overall_answer_score
      ? Number(parsed.overall_answer_score)
      : Math.round(rel * 0.2 + tech * 0.25 + comp * 0.15 + clar * 0.15 + depth * 0.15 + prob * 0.1);

    return {
      relevance: Math.min(100, Math.max(0, rel)),
      technical_correctness: Math.min(100, Math.max(0, tech)),
      completeness: Math.min(100, Math.max(0, comp)),
      clarity: Math.min(100, Math.max(0, clar)),
      communication: Math.min(100, Math.max(0, comm)),
      depth: Math.min(100, Math.max(0, depth)),
      problem_solving: Math.min(100, Math.max(0, prob)),
      overall_answer_score: Math.min(100, Math.max(0, overall)),
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length ? parsed.strengths : ['Addressed the general topic.'],
      weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length ? parsed.weaknesses : ['Needs more architectural depth.'],
      mistakes_identified: Array.isArray(parsed.mistakes_identified) ? parsed.mistakes_identified : [],
      missing_key_concepts: Array.isArray(parsed.missing_key_concepts) ? parsed.missing_key_concepts : [],
      ideal_answer: parsed.ideal_answer || `A comprehensive answer should define the fundamental principles, detail practical implementation mechanisms, and discuss system trade-offs.`,
      feedback: parsed.feedback || 'The answer was evaluated against technical accuracy and depth.',
      recommended_followup: parsed.recommended_followup || 'Could you elaborate on the underlying implementation details?',
      difficulty_for_next_question: ['easy', 'medium', 'hard'].includes(parsed.difficulty_for_next_question?.toLowerCase())
        ? parsed.difficulty_for_next_question.toLowerCase()
        : 'medium'
    };
  }

  // Fallback
  return {
    relevance: 50,
    technical_correctness: 50,
    completeness: 45,
    clarity: 55,
    communication: 55,
    depth: 40,
    problem_solving: 45,
    overall_answer_score: 48,
    strengths: ['Attempted to address the question.'],
    weaknesses: ['Lacked technical precision and deep conceptual coverage.'],
    mistakes_identified: ['Explanation was too high-level without concrete mechanics.'],
    missing_key_concepts: ['Core architecture principles', 'Real-world implementation details'],
    ideal_answer: `An ideal answer clearly explains the underlying mechanics, why this approach is chosen, and how trade-offs are managed in production.`,
    feedback: 'Candidate provided a general answer. Further detail on underlying mechanics is recommended.',
    recommended_followup: 'Can you provide a specific production use case for this?',
    difficulty_for_next_question: 'medium'
  };
};

/**
 * Calculates transparent, weighted overall assessment scores across the complete session.
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
      strengths: [],
      weaknesses: [],
      summary: 'No evaluated questions in this session.'
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

  evaluations.forEach((ev) => {
    sumTech += Number(ev.technical_correctness || ev.overall_answer_score || 50);
    sumComm += Number(ev.communication || ev.clarity || 50);
    sumProb += Number(ev.problem_solving || ev.depth || 50);
    sumRel += Number(ev.relevance || 50);
    sumComp += Number(ev.completeness || 50);
    sumDepth += Number(ev.depth || 50);

    if (Array.isArray(ev.strengths)) allStrengths.push(...ev.strengths);
    if (Array.isArray(ev.weaknesses)) allWeaknesses.push(...ev.weaknesses);
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

  // Transparent, documented scoring formula:
  // Technical Knowledge: 30%
  // Problem Solving: 20%
  // Communication: 15%
  // Answer Relevance: 15%
  // Job Compatibility: 10%
  // Resume Quality: 10%
  const OverallScore = Math.round(
    TechnicalKnowledge * 0.3 +
    ProblemSolving * 0.2 +
    Communication * 0.15 +
    AnswerRelevance * 0.15 +
    JobCompatibility * 0.1 +
    ResumeQuality * 0.1
  );

  // De-duplicate top strengths and weaknesses
  const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
  const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 5);

  const performanceLevel =
    OverallScore >= 85
      ? 'Outstanding readiness'
      : OverallScore >= 70
      ? 'Strong competency with minor improvement areas'
      : OverallScore >= 55
      ? 'Developing competency requiring focused practice'
      : 'Fundamental gaps identified';

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
    strengths: uniqueStrengths.length ? uniqueStrengths : ['Demonstrated clear domain awareness.'],
    weaknesses: uniqueWeaknesses.length ? uniqueWeaknesses : ['Expand on low-level system tradeoffs and edge cases.'],
    summary: `Candidate achieved an overall benchmark score of ${OverallScore}/100 (${performanceLevel}). Technical Knowledge is at ${TechnicalKnowledge}%, Problem Solving at ${ProblemSolving}%, and Communication at ${Communication}%.`
  };
};
