import { callGemini, parseJsonSafe } from './geminiService.js';
import { getCachedEmbedding, cosineSimilarity } from './embeddingService.js';

export const analyzeJobDescription = async (jdText = '') => {
  if (!jdText?.trim()) return null;

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert technical recruiter and talent architect. Extract exhaustive structured information from the provided Job Description. Return ONLY a valid JSON object matching: { "role": "", "company": "", "required_skills": [], "preferred_skills": [], "programming_languages": [], "frameworks": [], "databases": [], "cloud_devops": [], "experience_requirements": "", "education_requirements": "", "key_responsibilities": [] }'
    },
    {
      role: 'user',
      content: `Extract the following Job Description into structured JSON:\n\n${jdText.substring(0, 8000)}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-2.5-flash', 'application/json', 0.2);
  return (
    parseJsonSafe(aiReply) || {
      role: 'Software Engineer',
      required_skills: ['Problem Solving', 'Data Structures', 'Software Design'],
      preferred_skills: ['Cloud Platforms', 'CI/CD'],
      programming_languages: ['JavaScript', 'Python'],
      frameworks: ['React', 'Node.js'],
      databases: ['MongoDB', 'PostgreSQL'],
      cloud_devops: ['Docker', 'AWS'],
      experience_requirements: '2+ years software development',
      key_responsibilities: ['Design and build scalable software systems']
    }
  );
};

export const matchResumeToJob = async (resumeStructured = {}, jdStructured = {}) => {
  const resumeSkills = [
    ...(resumeStructured.skills || []),
    ...(resumeStructured.programming_languages || []),
    ...(resumeStructured.frameworks || []),
    ...(resumeStructured.databases || []),
    ...(resumeStructured.tools || [])
  ];

  const requiredSkills = jdStructured.required_skills || [];
  const preferredSkills = jdStructured.preferred_skills || [];
  const jdSkills = [
    ...requiredSkills,
    ...preferredSkills,
    ...(jdStructured.programming_languages || []),
    ...(jdStructured.frameworks || []),
    ...(jdStructured.databases || []),
    ...(jdStructured.cloud_devops || [])
  ];

  const resumeSkillsText = resumeSkills.join(', ');
  const jdSkillsText = jdSkills.join(', ');

  let semanticSimilarity = 0;
  if (resumeSkillsText && jdSkillsText) {
    const resumeEmb = await getCachedEmbedding(resumeSkillsText);
    const jdEmb = await getCachedEmbedding(jdSkillsText);
    semanticSimilarity = cosineSimilarity(resumeEmb, jdEmb);
  }

  // Calculate keyword overlap percentage
  const resumeSkillsLower = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const matchedRequired = requiredSkills.filter((s) => resumeSkillsLower.has(s.toLowerCase()));
  const missingRequired = requiredSkills.filter((s) => !resumeSkillsLower.has(s.toLowerCase()));
  const matchedPreferred = preferredSkills.filter((s) => resumeSkillsLower.has(s.toLowerCase()));
  const missingPreferred = preferredSkills.filter((s) => !resumeSkillsLower.has(s.toLowerCase()));

  const keywordOverlapScore = jdSkills.length > 0
    ? Math.round((matchedRequired.length * 1.5 + matchedPreferred.length) / Math.max(1, requiredSkills.length * 1.5 + preferredSkills.length) * 100)
    : Math.round(semanticSimilarity * 100);

  const messages = [
    {
      role: 'system',
      content: `You are an advanced enterprise ATS (Applicant Tracking System) and talent matching engine.
Compare the Candidate Profile against the Job Description.

Analyze:
1. Exact matched skills (Languages, Frameworks, Databases, Tools)
2. Partially matched / transferable skills (e.g., PostgreSQL vs MySQL, React vs Vue, AWS vs GCP)
3. Critical missing required skills vs nice-to-have preferred skills
4. Project relevance score (0-100) based on projects in candidate profile vs job role
5. Technical alignment score (0-100)
6. Calculate overall job_match_score between 0 and 100 based on core technical alignment and required competencies. Note: this is a benchmark metric, not a hiring guarantee.
7. Provide actionable recommendations for improving the resume against this job.

Return ONLY a valid JSON object matching:
{
  "matched_skills": ["skill1", "skill2"],
  "matched_required_skills": ["req1"],
  "missing_required_skills": ["req2"],
  "matched_preferred_skills": ["pref1"],
  "missing_preferred_skills": ["pref2"],
  "partially_matched_skills": ["partialSkill1"],
  "project_relevance_score": 85,
  "technical_skill_alignment": 80,
  "relevant_experience_summary": "1-2 sentence summary of candidate relevant experience",
  "overall_job_compatibility_reasoning": "Clear, explainable summary of candidate alignment with target role",
  "job_match_score": 82,
  "recommendations": [
    "Highlight experience with Docker containerization in project descriptions",
    "Add measurable API performance metrics"
  ]
}`
    },
    {
      role: 'user',
      content: `Candidate Profile:\n${JSON.stringify(resumeStructured, null, 2)}\n\nJob Requirements:\n${JSON.stringify(
        jdStructured,
        null,
        2
      )}\n\nVector Semantic Similarity: ${(semanticSimilarity * 100).toFixed(1)}%\nKeyword Overlap Score: ${keywordOverlapScore}%`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-2.5-flash', 'application/json', 0.2);
  const matchResult = parseJsonSafe(aiReply) || {};

  let finalScore = matchResult.job_match_score;
  if (typeof finalScore === 'string') {
    finalScore = parseInt(finalScore.replace(/[^0-9]/g, ''), 10);
  }
  if (isNaN(finalScore) || finalScore == null) {
    finalScore = Math.max(50, Math.round(semanticSimilarity * 50 + Math.min(100, keywordOverlapScore) * 0.5));
  }

  const verifiedMatchedSkills = matchResult.matched_skills || resumeSkills.slice(0, 6);
  const evidence = {};
  if (resumeStructured.skill_evidence) {
    verifiedMatchedSkills.forEach((s) => {
      if (resumeStructured.skill_evidence[s]) {
        evidence[s] = resumeStructured.skill_evidence[s];
      }
    });
  }

  return {
    semantic_similarity: Math.round(semanticSimilarity * 100),
    keyword_overlap_score: Math.min(100, Math.max(0, keywordOverlapScore)),
    matched_skills: verifiedMatchedSkills,
    missing_skills: matchResult.missing_required_skills || matchResult.missing_skills || missingRequired,
    matched_required_skills: matchResult.matched_required_skills || matchedRequired,
    missing_required_skills: matchResult.missing_required_skills || missingRequired,
    matched_preferred_skills: matchResult.matched_preferred_skills || matchedPreferred,
    missing_preferred_skills: matchResult.missing_preferred_skills || missingPreferred,
    partially_matched_skills: matchResult.partially_matched_skills || [],
    project_relevance_score: matchResult.project_relevance_score || Math.round(finalScore * 0.95),
    technical_skill_alignment: matchResult.technical_skill_alignment || finalScore,
    relevant_experience_summary: matchResult.relevant_experience_summary || 'Candidate technical profile analyzed against job requirements.',
    overall_job_compatibility_reasoning:
      matchResult.overall_job_compatibility_reasoning || 'Candidate profile shows foundational alignment with the target role.',
    job_match_score: Math.min(100, Math.max(0, finalScore)),
    evidence_snippets: evidence,
    recommendations: matchResult.recommendations || [
      'Tailor project bullet points to explicitly mention target role technologies.',
      'Quantify results with performance metrics (latency, scale, throughput).'
    ]
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
      content: `You are an executive Technical Career Coach and Engineering Director.
Synthesize the candidate's resume, job requirements, and actual live interview performance into an actionable skill-gap analysis and personalized roadmap.

Return ONLY a valid JSON object matching:
{
  "strong_skills": ["demonstrated strengths"],
  "missing_skills": ["key missing competencies"],
  "weak_skills": ["competencies needing improvement based on interview"],
  "recommended_technologies": ["tech stack suggestions"],
  "recommended_learning_topics": ["specific subject areas to master"],
  "suitable_job_roles": ["Roles candidate is competitive for"],
  "interview_preparation_recommendations": ["Actionable interview preparation advice"],
  "personalized_learning_roadmap": [
    "Phase 1 (Weeks 1-2): ...",
    "Phase 2 (Weeks 3-4): ...",
    "Phase 3 (Month 2): ..."
  ]
}`
    },
    {
      role: 'user',
      content: `Candidate Resume Profile: ${JSON.stringify(resumeStructured, null, 2)}\nJob Description Requirements: ${JSON.stringify(
        jdStructured,
        null,
        2
      )}\nInterview Performance Assessment: ${JSON.stringify(interviewPerformance, null, 2)}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-2.5-flash', 'application/json', 0.2);
  return (
    parseJsonSafe(aiReply) || {
      strong_skills: resumeStructured?.skills?.slice(0, 4) || ['Technical Foundations'],
      missing_skills: jdStructured?.required_skills?.slice(0, 3) || ['System Optimization'],
      weak_skills: ['Deep architectural trade-offs', 'High-concurrency failure modes'],
      recommended_technologies: ['Docker', 'Kubernetes', 'Redis', 'TypeScript', 'PostgreSQL'],
      recommended_learning_topics: ['Distributed Systems', 'Database Indexing & MVCC', 'Microservices Resilience'],
      suitable_job_roles: [jdStructured?.role || 'Software Engineer', 'Full Stack Engineer', 'Backend Developer'],
      interview_preparation_recommendations: [
        'Structure technical answers using the STAR method (Situation, Task, Action, Result)',
        'Explicitly explain architectural trade-offs between memory, latency, and consistency',
        'Review concurrency primitives and connection pooling best practices'
      ],
      personalized_learning_roadmap: [
        'Phase 1 (Weeks 1-2): Master core system fundamentals, data structures, and database indexing strategies.',
        'Phase 2 (Weeks 3-4): Build and benchmark a distributed microservice implementing Redis caching and rate-limiting.',
        'Phase 3 (Month 2): Practice simulated timed technical interviews with live verbal explanations of architectural trade-offs.'
      ]
    }
  );
};
