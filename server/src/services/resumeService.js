import { callGemini, parseJsonSafe } from './geminiService.js';

// Fallback technical skills dictionary for heuristic extraction if document has unusual formatting
const COMMON_TECH_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'HTML', 'CSS',
  'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'ASP.NET', 'Laravel',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra', 'Elasticsearch', 'DynamoDB', 'SQLite', 'Firebase',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Terraform', 'Linux', 'Nginx',
  'REST API', 'GraphQL', 'gRPC', 'WebSockets', 'Microservices', 'Git', 'Agile', 'Scrum', 'Kafka', 'RabbitMQ',
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy', 'Scikit-learn', 'NLP', 'Computer Vision'
];

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractFallbackSkills = (text = '') => {
  if (!text) return [];
  const found = new Set();
  const lowerText = text.toLowerCase();
  for (const kw of COMMON_TECH_KEYWORDS) {
    const escaped = escapeRegex(kw.toLowerCase());
    const regex = new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, 'i');
    if (regex.test(lowerText)) {
      found.add(kw);
    }
  }
  return Array.from(found);
};

export const extractStructuredResume = async (resumeText) => {
  if (!resumeText?.trim()) return null;

  const fallbackSkills = extractFallbackSkills(resumeText);

  const messages = [
    {
      role: 'system',
      content: `You are an elite enterprise ATS (Applicant Tracking System) parser and talent intelligence engine.
Your task is to exhaustively extract every skill, project, technology, framework, database, tool, role, and achievement from the candidate's resume text.

EXTRACTION RULES:
1. "skills": All general and specialized technical skills.
2. "programming_languages": Every language (e.g. JavaScript, Python, Java, C++, TypeScript, SQL, etc.).
3. "frameworks": All libraries & frameworks (e.g. React, Node.js, Express, Next.js, Django, Spring Boot, Tailwind, etc.).
4. "databases": All database engines (e.g. MongoDB, PostgreSQL, MySQL, Redis, DynamoDB, etc.).
5. "tools": All tools & platforms (e.g. Docker, Git, AWS, Kubernetes, Linux, Postman, Figma, etc.).
6. "projects": Array of projects with { "name": "Project Name", "description": "1-2 sentence overview", "technologies": ["tech1", "tech2"] }.
7. "experience": Array of work history { "title": "Role Title", "company": "Company Name", "duration": "Dates/Duration", "description": "Key achievements" }.
8. "education": Array of degrees { "degree": "Degree Title", "institution": "College/University", "year": "Year" }.
9. "candidate_name": Full name of candidate.

Return ONLY a valid JSON object matching:
{
  "candidate_name": "Full Name",
  "summary": "Professional summary or objective",
  "skills": ["Skill1", "Skill2"],
  "programming_languages": ["Lang1", "Lang2"],
  "frameworks": ["Framework1", "Framework2"],
  "databases": ["DB1", "DB2"],
  "tools": ["Tool1", "Tool2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project overview and architecture",
      "technologies": ["React", "Node.js", "MongoDB"]
    }
  ],
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Company Name",
      "duration": "2022 - Present",
      "description": "Responsibilities and accomplishments"
    }
  ],
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "institution": "University Name",
      "year": "2024"
    }
  ],
  "certifications": ["Cert1"]
}`
    },
    {
      role: 'user',
      content: `Extract all details from the following resume text:\n\n${resumeText.substring(0, 10000)}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.1);
  const parsed = parseJsonSafe(aiReply);

  if (parsed && typeof parsed === 'object') {
    // Merge any skills that might have been missed with fallback keyword extraction
    const combinedSkills = new Set([
      ...(parsed.skills || []),
      ...(parsed.programming_languages || []),
      ...(parsed.frameworks || []),
      ...(parsed.databases || []),
      ...(parsed.tools || []),
      ...fallbackSkills
    ]);

    return {
      candidate_name: parsed.candidate_name || 'Candidate',
      summary: parsed.summary || 'Software professional profile.',
      skills: Array.from(combinedSkills),
      programming_languages: parsed.programming_languages || fallbackSkills.filter(s => ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'SQL'].includes(s)),
      frameworks: parsed.frameworks || fallbackSkills.filter(s => ['React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Spring Boot'].includes(s)),
      databases: parsed.databases || fallbackSkills.filter(s => ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch'].includes(s)),
      tools: parsed.tools || fallbackSkills.filter(s => ['Docker', 'Kubernetes', 'AWS', 'Git', 'Linux'].includes(s)),
      projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : [
        { name: 'Core Software Development Project', description: 'Application built utilizing ' + fallbackSkills.slice(0, 4).join(', '), technologies: fallbackSkills.slice(0, 4) }
      ],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : []
    };
  }

  // Fallback if AI JSON parse completely fails
  return {
    candidate_name: 'Candidate',
    summary: 'Parsed Technical Profile',
    skills: fallbackSkills.length ? fallbackSkills : ['Software Engineering', 'Problem Solving', 'Web Development'],
    programming_languages: fallbackSkills.slice(0, 3),
    frameworks: fallbackSkills.slice(3, 6),
    databases: fallbackSkills.slice(6, 8),
    tools: ['Git', 'VS Code'],
    projects: [
      { name: 'Software Project', description: 'Full-stack application utilizing ' + fallbackSkills.slice(0, 3).join(', '), technologies: fallbackSkills.slice(0, 3) }
    ],
    experience: [],
    education: [],
    certifications: []
  };
};

export const analyzeResumeQuality = async (resumeText, structuredData) => {
  if (!resumeText) return { resume_score: 60 };

  const messages = [
    {
      role: 'system',
      content: `You are an executive Technical Recruiter and Career Coach.
Critically evaluate the candidate's resume text and extracted profile.

Score strictly based on:
- Technical depth and clarity
- Project complexity and quantifiable impact (metrics, scale, architecture)
- Skill relevance and completeness
- Formatting and professional presentation

Return ONLY a valid JSON object matching:
{
  "resume_score": 82,
  "strengths": [
    "Comprehensive full-stack tech stack with modern frameworks",
    "Clear project architecture descriptions"
  ],
  "weaknesses": [
    "Lacks measurable business metrics or performance benchmarks (e.g. latency reduced by X%)",
    "Missing automated testing and CI/CD details"
  ],
  "missing_information": [
    "Production deployment metrics",
    "Unit and integration testing methodologies"
  ],
  "skill_quality": "Strong coverage across frontend, backend, and database technologies.",
  "project_quality": "Good architectural foundation; could emphasize scale and concurrency.",
  "experience_quality": "Demonstrates relevant hands-on development expertise.",
  "resume_improvement_suggestions": [
    "Add quantitative results (e.g., 'Optimized query latency by 40% using Redis caching')",
    "Highlight automated test coverage and container orchestration tools"
  ]
}`
    },
    {
      role: 'user',
      content: `Resume Text:\n${resumeText.substring(0, 6000)}\n\nStructured Profile:\n${JSON.stringify(structuredData)}`
    }
  ];

  const aiReply = await callGemini(messages, 'gemini-3.6-flash', 'application/json', 0.2);
  const parsed = parseJsonSafe(aiReply);

  return parsed || {
    resume_score: 75,
    strengths: ['Identified relevant modern technologies in candidate profile'],
    weaknesses: ['Add more quantitative performance metrics to project descriptions'],
    missing_information: ['Continuous integration and automated testing details'],
    skill_quality: 'Solid technical foundation.',
    project_quality: 'Demonstrates functional software development capability.',
    experience_quality: 'Aligned with industry requirements.',
    resume_improvement_suggestions: ['Include metrics on latency, throughput, or user scale in project descriptions.']
  };
};
