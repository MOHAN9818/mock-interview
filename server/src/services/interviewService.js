import { callGemini, parseJsonSafe } from './geminiService.js';

/**
 * Generates structured, realistic, and progressively diverse interview questions:
 * - Phase 1 (Q1): Candidate self-introduction, career overview & primary technologies.
 * - Phase 2 (Q2): Deep dive into candidate's resume projects (architecture, challenges, role).
 * - Phase 3 (Q3): Core technical fundamentals / programming language & framework mechanics.
 * - Phase 4 (Q4): System design, data consistency, scalability, databases, or infrastructure (a fresh technical topic).
 * - Phase 5+ (Q5): Practical production debugging, architecture trade-offs & incident scenarios.
 *
 * Prevents getting stuck in recursive topic loops by advancing phases and rotating topics.
 */
export const generateInterviewQuestion = async (
  resumeStructured = {},
  jdStructured = {},
  difficulty = 'Medium',
  type = 'Technical',
  conversationHistory = [],
  previousAnswerEvaluation = null
) => {
  const targetRole = jdStructured?.role || 'Software Engineer';
  const requiredSkills = (jdStructured?.required_skills || []).join(', ');

  const candidateProjects = (resumeStructured?.projects || [])
    .map((p) => (typeof p === 'string' ? p : `${p.name || 'Project'}: ${p.description || ''}`))
    .join(' | ');

  const candidateSkills = [
    ...(resumeStructured?.skills || []),
    ...(resumeStructured?.programming_languages || []),
    ...(resumeStructured?.frameworks || []),
    ...(resumeStructured?.databases || []),
    ...(resumeStructured?.tools || [])
  ].join(', ');

  const primaryProject = resumeStructured?.projects?.[0]?.name || 'your primary engineering project';
  const candidateName = resumeStructured?.candidate_name || 'there';

  // Calculate current question number (1-based)
  const questionIndex = Math.floor(conversationHistory.length / 2) + 1;

  // Build compact Q&A history
  const previousTurns = [];
  for (let i = 0; i < conversationHistory.length; i += 2) {
    const q = conversationHistory[i]?.content;
    const a = conversationHistory[i + 1]?.content;
    if (q) previousTurns.push({ question: q, answer: a || '(No answer provided)' });
  }

  // PHASE 1: Introduction & Background Overview
  if (questionIndex === 1 || conversationHistory.length === 0) {
    const messages = [
      {
        role: 'system',
        content: `You are an elite, courteous AI Technical Interviewer conducting a realistic video interview for the position of "${targetRole}".
Generate Question 1 of the interview: The introductory question.
RULES:
1. Welcome the candidate briefly and invite them to give a concise self-introduction highlighting their technical background, core skills, and what they've recently been focusing on.
2. Keep it crisp, conversational, and direct (1-2 sentences maximum).
3. Do NOT ask multiple complex sub-questions.
4. Return ONLY a valid JSON object matching:
{
  "question": "To start off our interview, could you briefly introduce yourself, highlight your technical background, and share what technologies you've been working with recently?",
  "category": "Candidate Introduction & Background",
  "difficulty": "${difficulty}"
}`
      },
      {
        role: 'user',
        content: `Target Role: ${targetRole}\nCandidate Name: ${candidateName}\nCandidate Skills: ${candidateSkills || 'Software Development'}`
      }
    ];

    const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.3);
    const parsed = parseJsonSafe(reply);

    if (parsed?.question) {
      return {
        question: parsed.question,
        category: parsed.category || 'Candidate Introduction & Background',
        difficulty: parsed.difficulty || difficulty
      };
    }

    return {
      question: `To start off, could you please give a brief overview of your background, experience, and the primary technologies you work with?`,
      category: 'Candidate Introduction & Background',
      difficulty
    };
  }

  // PHASE 2: Project Deep-Dive & Architecture
  if (questionIndex === 2) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert AI Technical Interviewer.
You are now in PHASE 2 of the interview: Resume Project Deep Dive.
The candidate has completed their introduction.
Now ask about a concrete project listed in their resume: "${primaryProject}".
RULES:
1. Ask the candidate to explain the architecture of this project, their specific role and technical contributions, and a key technical challenge they had to solve.
2. Be specific to their resume details if provided.
3. Keep the question crisp, clear, and professional (1-2 sentences).
4. Return ONLY a valid JSON object matching:
{
  "question": "In your resume, you mentioned building ${primaryProject}. Could you walk me through the high-level architecture of that application and the biggest technical challenge you solved while building it?",
  "category": "Project Architecture & Implementation",
  "difficulty": "${difficulty}"
}`
      },
      {
        role: 'user',
        content: `Target Role: ${targetRole}\nCandidate Projects: ${candidateProjects || primaryProject}\nCandidate Skills: ${candidateSkills}`
      }
    ];

    const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.3);
    const parsed = parseJsonSafe(reply);

    if (parsed?.question) {
      return {
        question: parsed.question,
        category: parsed.category || 'Project Architecture & Implementation',
        difficulty: parsed.difficulty || difficulty
      };
    }

    return {
      question: `In your resume, you highlighted ${primaryProject}. Can you walk me through its high-level architecture and explain the most complex technical challenge you overcame while building it?`,
      category: 'Project Architecture & Implementation',
      difficulty
    };
  }

  // PHASE 3: Core Technical & Framework Fundamentals
  if (questionIndex === 3) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert AI Technical Interviewer.
You are now in PHASE 3 of the interview: Core Technical & Framework Fundamentals.
IMPORTANT DIVERSIFICATION RULE:
- Transition away from project walkthroughs to test deep fundamental knowledge of their primary programming language or framework (e.g. JavaScript/TypeScript execution model, asynchronous programming, React lifecycle/hooks, Python memory/GIL, Java JVM/concurrency, or SQL transactions).
- Do NOT get stuck on the previous project. Rotate to core engineering depth.
- Return ONLY a valid JSON object matching:
{
  "question": "The question text here...",
  "category": "Core Technical Fundamentals",
  "difficulty": "${difficulty}"
}`
      },
      {
        role: 'user',
        content: `Target Role: ${targetRole}\nCandidate Skills: ${candidateSkills}\nRequired Skills: ${requiredSkills}\nPrevious Q&A: ${JSON.stringify(previousTurns)}`
      }
    ];

    const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.3);
    const parsed = parseJsonSafe(reply);

    if (parsed?.question) {
      return {
        question: parsed.question,
        category: parsed.category || 'Core Technical Fundamentals',
        difficulty: parsed.difficulty || difficulty
      };
    }

    return {
      question: `Moving to core engineering concepts: how does asynchronous execution and event-driven concurrency work in your primary backend or runtime environment?`,
      category: 'Core Technical Fundamentals',
      difficulty
    };
  }

  // PHASE 4: System Design, Scalability, Databases & Infrastructure (A New Domain)
  if (questionIndex === 4) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert AI Technical Interviewer.
You are now in PHASE 4 of the interview: System Design, Databases & Scalability.
IMPORTANT DIVERSIFICATION RULE:
- Explore a NEW technical topic not yet covered in questions 1-3.
- Focus on: Database optimization & indexing, caching strategies (e.g. Redis), API design (REST vs gRPC/WebSockets), message brokers (Kafka/RabbitMQ), microservices reliability, or containerization (Docker/Kubernetes).
- DO NOT repeat or loop back to topics already discussed.
- Return ONLY a valid JSON object matching:
{
  "question": "The question text here...",
  "category": "System Design & Scalability",
  "difficulty": "${difficulty}"
}`
      },
      {
        role: 'user',
        content: `Target Role: ${targetRole}\nCandidate Skills: ${candidateSkills}\nRequired Skills: ${requiredSkills}\nPrevious Questions Asked: ${previousTurns.map(t => t.question).join(' | ')}`
      }
    ];

    const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.3);
    const parsed = parseJsonSafe(reply);

    if (parsed?.question) {
      return {
        question: parsed.question,
        category: parsed.category || 'System Design & Scalability',
        difficulty: parsed.difficulty || difficulty
      };
    }

    return {
      question: `When scaling an application to handle high read and write throughput, what strategies do you use for database indexing and caching?`,
      category: 'System Design & Scalability',
      difficulty
    };
  }

  // PHASE 5+: Production Debugging, Incident Scenarios & Engineering Trade-offs
  const messages = [
    {
      role: 'system',
      content: `You are an expert AI Technical Interviewer.
You are now in PHASE 5 of the interview: Production Scenarios & Real-World Problem Solving.
RULES:
1. Present a realistic production or engineering trade-off scenario (e.g., sudden latency spike in production, resolving database connection pool exhaustion, handling race conditions, or designing backward-compatible API migrations).
2. Ask how the candidate would systematically investigate, troubleshoot, and resolve the issue.
3. Keep the scenario realistic, clear, and concise (1-2 sentences).
4. Return ONLY a valid JSON object matching:
{
  "question": "The question text here...",
  "category": "Production Scenarios & Incident Resolution",
  "difficulty": "${difficulty}"
}`
    },
    {
      role: 'user',
      content: `Target Role: ${targetRole}\nCandidate Skills: ${candidateSkills}\nRequired Skills: ${requiredSkills}\nPrevious Questions Asked: ${previousTurns.map(t => t.question).join(' | ')}`
    }
  ];

  const reply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.3);
  const parsed = parseJsonSafe(reply);

  if (parsed?.question) {
    return {
      question: parsed.question,
      category: parsed.category || 'Production Scenarios & Incident Resolution',
      difficulty: parsed.difficulty || difficulty
    };
  }

  return {
    question: `Suppose a critical microservice in production experiences a sudden latency spike causing request timeouts. How would you systematically diagnose the root cause and mitigate the issue?`,
    category: 'Production Scenarios & Incident Resolution',
    difficulty
  };
};
