import { callGemini, parseJsonSafe, getGeminiEmbedding } from './geminiService.js';

export const analyzeJobDescription = async (jdText) => {
  if (!jdText?.trim()) return null;

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert technical recruiter and talent architect. Extract exhaustive structured information from the provided Job Description. Return ONLY a valid JSON object matching the following structure: { "role": "", "company": "", "required_skills": [], "preferred_skills": [], "programming_languages": [], "frameworks": [], "databases": [], "cloud_devops": [], "experience_requirements": "", "education_requirements": "", "key_responsibilities": [] }'
    },
    {
      role: 'user',
      content: `Extract the following Job Description into the structured JSON schema:\n\n${jdText}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.2);
  return (
    parseJsonSafe(aiReply) || {
      role: 'Software Engineer',
      required_skills: ['Problem Solving', 'Data Structures', 'Software Design'],
      key_responsibilities: ['Design and build reliable software systems']
    }
  );
};

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
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

export const matchResumeToJob = async (resumeStructured = {}, jdStructured = {}) => {
  // Combine skills to create a semantic profile
  const resumeSkills = [
    ...(resumeStructured.skills || []),
    ...(resumeStructured.programming_languages || []),
    ...(resumeStructured.frameworks || [])
  ];

  const jdSkills = [
    ...(jdStructured.required_skills || []),
    ...(jdStructured.programming_languages || []),
    ...(jdStructured.frameworks || [])
  ];

  const resumeSkillsText = resumeSkills.join(', ');
  const jdSkillsText = jdSkills.join(', ');

  let semanticMatchScore = 0;
  if (resumeSkillsText && jdSkillsText) {
    const resumeEmb = await getGeminiEmbedding(resumeSkillsText);
    const jdEmb = await getGeminiEmbedding(jdSkillsText);
    semanticMatchScore = cosineSimilarity(resumeEmb, jdEmb);
  }

  // Deep comparative ATS analysis via Gemini
  const messages = [
    {
      role: 'system',
      content: `You are an advanced enterprise ATS (Applicant Tracking System) matching engine.
Compare the Candidate Profile against the Job Description.

Analyze:
1. Exact matched skills
2. Partially matched / related skills (e.g., PostgreSQL vs MySQL, React vs Vue)
3. Critical missing skills required for the job
4. Irrelevant or non-matching skills
5. Calculate job_match_score between 0 and 100 based on core technical alignment and depth.

Return ONLY a valid JSON object matching:
{
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["missingSkill1", "missingSkill2"],
  "partially_matched_skills": ["partialSkill1"],
  "relevant_experience_summary": "Summary of relevant experience...",
  "overall_job_compatibility_reasoning": "Clear explanation of candidate fit...",
  "job_match_score": 82
}`
    },
    {
      role: 'user',
      content: `Candidate Profile:\n${JSON.stringify(resumeStructured)}\n\nJob Description:\n${JSON.stringify(
        jdStructured
      )}\n\nSemantic Vector Similarity: ${(semanticMatchScore * 100).toFixed(1)}%`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.2);
  const matchResult = parseJsonSafe(aiReply) || {};

  let finalScore = matchResult.job_match_score;
  if (typeof finalScore === 'string') {
    finalScore = parseInt(finalScore.replace(/[^0-9]/g, ''), 10);
  }
  if (isNaN(finalScore) || finalScore == null) {
    finalScore = Math.max(50, Math.round(semanticMatchScore * 100));
  }

  return {
    semantic_similarity: Math.round(semanticMatchScore * 100),
    matched_skills: matchResult.matched_skills || resumeSkills.slice(0, 4),
    missing_skills: matchResult.missing_skills || [],
    partially_matched_skills: matchResult.partially_matched_skills || [],
    relevant_experience_summary: matchResult.relevant_experience_summary || 'Skills and experience analyzed.',
    overall_job_compatibility_reasoning:
      matchResult.overall_job_compatibility_reasoning || 'Candidate profile matched against job requirements.',
    job_match_score: Math.min(100, Math.max(0, finalScore))
  };
};

export const analyzeSkillGapAndCareer = async (
  resumeStructured = {},
  jdStructured = {},
  interviewPerformance = {}
) => {
  const messages = [
    {
      role: 'system',
      content: `You are an executive Career Counselor and Talent Development Director.
Synthesize the candidate's resume, job requirements, and actual live interview performance into actionable intelligence.

Return ONLY a valid JSON object matching:
{
  "strong_skills": ["demonstrated strengths"],
  "missing_skills": ["key missing competencies"],
  "weak_skills": ["competencies needing improvement"],
  "recommended_technologies": ["tech stack suggestions"],
  "recommended_learning_topics": ["specific subject areas to master"],
  "suitable_job_roles": ["Roles candidate is already competitive for or close to"],
  "interview_preparation_recommendations": ["Actionable interview tips"],
  "personalized_learning_roadmap": [
    "Phase 1 (Week 1-2): ...",
    "Phase 2 (Week 3-4): ...",
    "Phase 3 (Month 2): ..."
  ]
}`
    },
    {
      role: 'user',
      content: `Candidate Resume Profile: ${JSON.stringify(resumeStructured)}\nJob Description Requirements: ${JSON.stringify(
        jdStructured
      )}\nInterview Performance Assessment: ${JSON.stringify(interviewPerformance)}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.2);
  return (
    parseJsonSafe(aiReply) || {
      strong_skills: resumeStructured?.skills?.slice(0, 3) || ['Technical Foundations'],
      missing_skills: jdStructured?.required_skills?.slice(0, 3) || ['System Optimization'],
      weak_skills: ['Deep architecture trade-offs'],
      recommended_technologies: ['Docker', 'Kubernetes', 'Redis', 'TypeScript'],
      recommended_learning_topics: ['Distributed Systems', 'Microservices', 'Database Indexing'],
      suitable_job_roles: [jdStructured?.role || 'Software Engineer', 'Full Stack Developer', 'Backend Engineer'],
      interview_preparation_recommendations: [
        'Practice articulating system trade-offs using the STAR method',
        'Review edge-case handling in data storage and caching'
      ],
      personalized_learning_roadmap: [
        'Phase 1: Deep dive into core system fundamentals and missing job skills.',
        'Phase 2: Build an end-to-end distributed project demonstrating high concurrency and caching.',
        'Phase 3: Conduct timed mock technical interviews to refine verbal problem-solving articulation.'
      ]
    }
  );
};
