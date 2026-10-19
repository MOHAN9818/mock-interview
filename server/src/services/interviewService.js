import { callGemini, parseJsonSafe } from './geminiService.js';
import { createSessionKnowledgeStore } from './ragService.js';

/**
 * Generates an adaptive, RAG-grounded interview question.
 *
 * Architecture:
 * Candidate Profile + Job Requirements + Conversation History + Previous Answer Evaluation
 *   -> Synthesize Retrieval Query
 *   -> Vector Search over Session Knowledge Store (Resume, JD, Technical KB)
 *   -> Retrieve Top-K Relevant Chunks
 *   -> Ground Gemini LLM with Retrieved Technical Context
 *   -> Generate Adaptive Question tailored to candidate performance level
 */
export const generateInterviewQuestion = async (
  resumeStructured = {},
  jdStructured = {},
  initialDifficulty = 'Medium',
  type = 'Technical',
  conversationHistory = [],
  previousAnswerEvaluation = null
) => {
  const targetRole = jdStructured?.role || 'Software Engineer';
  const candidateName = resumeStructured?.candidate_name || 'Candidate';
  const questionIndex = Math.floor(conversationHistory.length / 2) + 1;

  // 1. Build compact Q&A turn history & extracted past topics
  const previousTurns = [];
  const askedTopics = [];
  for (let i = 0; i < conversationHistory.length; i += 2) {
    const q = conversationHistory[i]?.content;
    const a = conversationHistory[i + 1]?.content;
    if (q) {
      previousTurns.push({ question: q, answer: a || '(No answer provided)' });
      askedTopics.push(q);
    }
  }

  // 2. Mode-Specific Prompt Directives
  let modeDirective = 'Focus on core technical proficiency, architectural patterns, and practical engineering trade-offs.';
  if (type?.toLowerCase().includes('hr') || type?.toLowerCase().includes('behavioral')) {
    modeDirective = 'Focus strictly on behavioral assessment (STAR method: Situation, Task, Action, Result), leadership, cross-functional collaboration, conflict resolution, and handling production pressure.';
  } else if (type?.toLowerCase().includes('system') || type?.toLowerCase().includes('design')) {
    modeDirective = 'Focus on large-scale distributed system design, high availability, database partitioning, caching strategies, rate limiting, and failure modes.';
  } else if (type?.toLowerCase().includes('project')) {
    modeDirective = 'Focus deeply on the specific engineering projects and achievements explicitly documented in the candidate resume, challenging their architectural choices, concurrency models, and trade-offs.';
  }

  // 3. Determine Dynamic Difficulty & Adaptation Strategy
  let currentDifficulty = initialDifficulty;
  let adaptationReason = `Initial question based on ${type} setup.`;
  let focusStrategy = 'general_competency';

  if (previousAnswerEvaluation) {
    const techScore = Number(previousAnswerEvaluation.technical_correctness || previousAnswerEvaluation.overall_answer_score || 60);
    const compScore = Number(previousAnswerEvaluation.completeness || 60);
    const probScore = Number(previousAnswerEvaluation.problem_solving || 60);
    const missingConcepts = previousAnswerEvaluation.missing_key_concepts || [];

    if (techScore < 50) {
      currentDifficulty = 'Easy';
      focusStrategy = 'address_missing_fundamentals';
      adaptationReason = `Previous answer showed gaps (${missingConcepts.slice(0, 2).join(', ') || 'fundamental mechanics'}). Prompting on core conceptual building blocks.`;
    } else if (techScore <= 75) {
      currentDifficulty = 'Medium';
      focusStrategy = compScore < 55 ? 'probe_completeness' : 'medium_depth_tradeoff';
      adaptationReason = `Candidate demonstrated moderate understanding. Probing deeper on architectural trade-offs and edge-case handling.`;
    } else {
      currentDifficulty = 'Hard';
      focusStrategy = probScore < 60 ? 'scenario_problem_solving' : 'system_design_scaling';
      adaptationReason = `Candidate demonstrated strong mastery. Escalating difficulty to distributed system design, high concurrency, and failure recovery.`;
    }
  }

  // 4. Formulate RAG Search Query
  let ragQuery = '';
  if (questionIndex === 1) {
    ragQuery = `${targetRole} introductory skills ${resumeStructured?.skills?.slice(0, 5).join(' ') || ''}`;
  } else if (previousAnswerEvaluation?.missing_key_concepts?.length) {
    ragQuery = `${previousAnswerEvaluation.missing_key_concepts.join(' ')} ${targetRole}`;
  } else if (previousAnswerEvaluation?.recommended_followup) {
    ragQuery = `${previousAnswerEvaluation.recommended_followup} ${targetRole}`;
  } else {
    const techList = [
      ...(resumeStructured?.programming_languages || []),
      ...(resumeStructured?.frameworks || []),
      ...(jdStructured?.required_skills || [])
    ].slice(0, 5).join(' ');
    ragQuery = `${techList} ${targetRole} ${type} fundamentals`;
  }

  // 5. Retrieve Grounding Chunks via RAG Store
  let retrievedChunks = [];
  try {
    const ragStore = await createSessionKnowledgeStore({
      resumeStructured,
      jdStructured
    });
    retrievedChunks = await ragStore.retrieveRelevantChunks(ragQuery, {}, 4);
  } catch (err) {
    console.warn('RAG retrieval fallback:', err.message);
  }

  const ragContextSnippet = retrievedChunks.length > 0
    ? retrievedChunks.map((c) => `[Source: ${c.section}] ${c.text}`).join('\n\n')
    : 'Standard industry engineering standards for ' + targetRole;

  const previousEvalInfo = previousAnswerEvaluation
    ? `Last Score: ${previousAnswerEvaluation.overall_answer_score || 50}\nMistakes: ${(previousAnswerEvaluation.mistakes_identified || []).join(', ')}\nMissing Concepts: ${(previousAnswerEvaluation.missing_key_concepts || []).join(', ')}\nRecommended Followup: ${previousAnswerEvaluation.recommended_followup || 'None'}`
    : 'None (First Question)';

  // 6. Compose System Prompt with Adaptive Rules & RAG Grounding
  const promptSystem = `You are a Principal Software Engineer and elite AI Technical Interviewer conducting a realistic, adaptive video interview for the position of "${targetRole}".

INTERVIEW CONFIGURATION:
- Mode: ${type} (${modeDirective})
- Candidate: ${candidateName}
- Question Number: ${questionIndex}
- Dynamic Difficulty Target: ${currentDifficulty}
- Adaptation Strategy: ${focusStrategy}
- Adaptation Reason: ${adaptationReason}

RAG RETRIEVED GROUNDING KNOWLEDGE (Use to inform question depth without quoting verbatim):
${ragContextSnippet}

PREVIOUS EVALUATION SIGNALS:
${previousEvalInfo}

ANTI-REPETITION CONSTRAINT:
Do not repeat questions on topics already covered: ${askedTopics.join(' | ') || 'None yet'}.

ADAPTIVE QUESTION GENERATION RULES:
1. If question 1: Warmly welcome the candidate, asking them to introduce themselves and discuss their background relevant to ${type}.
2. If previous answer was weak (score < 50): Ask a supportive follow-up clarifying the missing concept (${previousAnswerEvaluation?.missing_key_concepts?.[0] || 'core mechanics'}).
3. If previous answer was strong (score > 80): Increase difficulty to system design, concurrency, or failure recovery.
4. Keep the question conversational, direct, and concise (1-2 sentences).
5. DO NOT copy the RAG snippet word-for-word; synthesize it naturally into the question.
6. Return ONLY a valid JSON object matching:
{
  "question": "The interview question text here...",
  "category": "e.g., Spring Boot Architecture / STAR Behavioral / Concurrency / System Design",
  "difficulty": "${currentDifficulty}",
  "adaptationReason": "${adaptationReason}"
}`;

  const promptUser = `Previous Questions & Answers in this session:
${previousTurns.length > 0 ? JSON.stringify(previousTurns, null, 2) : 'None (Starting interview)'}

Generate Question ${questionIndex} now.`;

  const messages = [
    { role: 'system', content: promptSystem },
    { role: 'user', content: promptUser }
  ];

  const aiReply = await callGemini(messages, 'gemini-2.5-flash', 'application/json', 0.25);
  const parsed = parseJsonSafe(aiReply);

  if (parsed?.question) {
    return {
      question: parsed.question,
      category: parsed.category || (questionIndex === 1 ? 'Candidate Introduction & Background' : `${type} Evaluation`),
      difficulty: parsed.difficulty || currentDifficulty,
      adaptationReason: parsed.adaptationReason || adaptationReason,
      retrievedGrounding: retrievedChunks.map((c) => c.section)
    };
  }

  // Fallback if LLM parsing fails
  const fallbackQuestions = [
    `To start off our interview, could you briefly introduce yourself, highlight your engineering background, and summarize your primary tech stack?`,
    `Could you walk me through the high-level architecture of one of your most complex projects and the technical decisions you made?`,
    `In your primary programming environment, how do you handle asynchronous operations and concurrent resource management?`,
    `When designing a scalable system with high read and write throughput, what strategies do you apply for caching and database indexing?`,
    `Suppose a production service experiences a sudden spike in latency and request timeouts. How would you systematically diagnose and mitigate the root cause?`
  ];

  const defaultQuestion = fallbackQuestions[Math.min(questionIndex - 1, fallbackQuestions.length - 1)];

  return {
    question: defaultQuestion,
    category: questionIndex === 1 ? 'Candidate Introduction' : 'System Architecture',
    difficulty: currentDifficulty,
    adaptationReason: adaptationReason,
    retrievedGrounding: []
  };
};
