import { sanitizeForPrompt } from '../middleware/security.js';

export const createChunk = ({
  sourceType = 'unknown',
  sourceId = 'default',
  section = 'general',
  text = '',
  chunkIndex = 0,
  metadata = {}
}) => {
  const sanitized = sanitizeForPrompt(text).trim();
  const estimatedTokens = Math.ceil(sanitized.length / 4);

  return {
    sourceType,
    sourceId,
    section,
    text: sanitized,
    chunkIndex,
    metadata: {
      estimatedTokens,
      timestamp: Date.now(),
      ...metadata
    }
  };
};

/**
 * Splits plain text or sectioned text into meaningful chunks.
 * Ensures chunks are neither too small (< 80 chars unless isolated) nor too large (> 800 chars).
 */
export const chunkText = (
  rawText = '',
  {
    sourceType = 'document',
    sourceId = 'doc-1',
    section = 'general',
    maxChunkSize = 650,
    chunkOverlap = 100
  } = {}
) => {
  if (!rawText || typeof rawText !== 'string') return [];

  const cleanedText = rawText.replace(/\r\n/g, '\n').trim();
  if (!cleanedText) return [];

  // If text is short, return as a single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [
      createChunk({
        sourceType,
        sourceId,
        section,
        text: cleanedText,
        chunkIndex: 0
      })
    ];
  }

  // Split by double newlines or paragraphs first
  const paragraphs = cleanedText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).trim().length <= maxChunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      if (currentChunk.trim().length > 60) {
        chunks.push(
          createChunk({
            sourceType,
            sourceId,
            section,
            text: currentChunk,
            chunkIndex: chunkIndex++
          })
        );
      }

      // If single paragraph is larger than maxChunkSize, chunk by sentence
      if (para.length > maxChunkSize) {
        const sentences = para.match(/[^.!?]+[.!?]+|\S+/g) || [para];
        let sentenceChunk = '';
        for (const sentence of sentences) {
          if ((sentenceChunk + ' ' + sentence).trim().length <= maxChunkSize) {
            sentenceChunk = sentenceChunk ? `${sentenceChunk} ${sentence}` : sentence;
          } else {
            if (sentenceChunk.trim()) {
              chunks.push(
                createChunk({
                  sourceType,
                  sourceId,
                  section,
                  text: sentenceChunk,
                  chunkIndex: chunkIndex++
                })
              );
            }
            sentenceChunk = sentence;
          }
        }
        currentChunk = sentenceChunk;
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk && currentChunk.trim()) {
    chunks.push(
      createChunk({
        sourceType,
        sourceId,
        section,
        text: currentChunk,
        chunkIndex: chunkIndex++
      })
    );
  }

  return chunks;
};

/**
 * Chunks structured resume objects into section-specific chunks with metadata.
 */
export const chunkResume = (structuredResume = {}, rawText = '') => {
  const chunks = [];
  const candidateName = structuredResume.candidate_name || 'Candidate';
  let chunkIndex = 0;

  // 1. Summary Chunk
  if (structuredResume.summary) {
    chunks.push(
      createChunk({
        sourceType: 'resume',
        sourceId: 'candidate_resume',
        section: 'summary',
        text: `Candidate: ${candidateName}. Summary: ${structuredResume.summary}`,
        chunkIndex: chunkIndex++
      })
    );
  }

  // 2. Technical Skills & Stack
  const allSkills = [
    ...(structuredResume.skills || []),
    ...(structuredResume.programming_languages || []),
    ...(structuredResume.frameworks || []),
    ...(structuredResume.databases || []),
    ...(structuredResume.tools || [])
  ];
  if (allSkills.length > 0) {
    chunks.push(
      createChunk({
        sourceType: 'resume',
        sourceId: 'candidate_resume',
        section: 'skills',
        text: `Technical Core Competencies & Skills for ${candidateName}: Languages: ${(structuredResume.programming_languages || []).join(', ') || 'General'}. Frameworks: ${(structuredResume.frameworks || []).join(', ')}. Databases: ${(structuredResume.databases || []).join(', ')}. Tools: ${(structuredResume.tools || []).join(', ')}. All Skills: ${allSkills.join(', ')}`,
        chunkIndex: chunkIndex++
      })
    );
  }

  // 3. Projects Chunks
  if (Array.isArray(structuredResume.projects)) {
    structuredResume.projects.forEach((proj, idx) => {
      const projName = typeof proj === 'string' ? proj : proj.name || `Project ${idx + 1}`;
      const projDesc = typeof proj === 'string' ? '' : proj.description || '';
      const projTech = Array.isArray(proj?.technologies) ? proj.technologies.join(', ') : '';
      chunks.push(
        createChunk({
          sourceType: 'resume',
          sourceId: 'candidate_resume',
          section: 'projects',
          text: `Project: ${projName}. Description: ${projDesc}. Technologies used: ${projTech}`,
          chunkIndex: chunkIndex++
        })
      );
    });
  }

  // 4. Experience Chunks
  if (Array.isArray(structuredResume.experience)) {
    structuredResume.experience.forEach((exp, idx) => {
      const title = exp.title || 'Engineering Role';
      const company = exp.company || 'Company';
      const duration = exp.duration || '';
      const desc = exp.description || '';
      chunks.push(
        createChunk({
          sourceType: 'resume',
          sourceId: 'candidate_resume',
          section: 'experience',
          text: `Role: ${title} at ${company} (${duration}). Key Responsibilities & Achievements: ${desc}`,
          chunkIndex: chunkIndex++
        })
      );
    });
  }

  // Fallback to raw text chunking if structured chunks are sparse
  if (chunks.length === 0 && rawText) {
    return chunkText(rawText, {
      sourceType: 'resume',
      sourceId: 'candidate_resume',
      section: 'general'
    });
  }

  return chunks;
};

/**
 * Chunks job description into section-specific chunks with metadata.
 */
export const chunkJobDescription = (structuredJd = {}, rawJdText = '') => {
  const chunks = [];
  const role = structuredJd.role || 'Software Engineer';
  let chunkIndex = 0;

  // 1. Role & Requirements Overview
  const reqSkills = (structuredJd.required_skills || []).join(', ');
  const prefSkills = (structuredJd.preferred_skills || []).join(', ');
  chunks.push(
    createChunk({
      sourceType: 'job_description',
      sourceId: 'target_jd',
      section: 'requirements',
      text: `Target Position: ${role}. Required Skills: ${reqSkills || 'Engineering Foundations'}. Preferred Skills: ${prefSkills || 'None listed'}. Experience: ${structuredJd.experience_requirements || 'Industry standard'}.`,
      chunkIndex: chunkIndex++
    })
  );

  // 2. Technical Stack
  const techStack = [
    ...(structuredJd.programming_languages || []),
    ...(structuredJd.frameworks || []),
    ...(structuredJd.databases || []),
    ...(structuredJd.cloud_devops || [])
  ].join(', ');
  if (techStack) {
    chunks.push(
      createChunk({
        sourceType: 'job_description',
        sourceId: 'target_jd',
        section: 'tech_stack',
        text: `Target Role Technical Stack: Languages & Frameworks: ${(structuredJd.programming_languages || []).concat(structuredJd.frameworks || []).join(', ')}. Databases & Infrastructure: ${(structuredJd.databases || []).concat(structuredJd.cloud_devops || []).join(', ')}.`,
        chunkIndex: chunkIndex++
      })
    );
  }

  // 3. Key Responsibilities
  if (Array.isArray(structuredJd.key_responsibilities) && structuredJd.key_responsibilities.length > 0) {
    chunks.push(
      createChunk({
        sourceType: 'job_description',
        sourceId: 'target_jd',
        section: 'responsibilities',
        text: `Key Responsibilities for ${role}: ${structuredJd.key_responsibilities.join('; ')}`,
        chunkIndex: chunkIndex++
      })
    );
  }

  // Fallback to raw text if structured is empty
  if (chunks.length === 0 && rawJdText) {
    return chunkText(rawJdText, {
      sourceType: 'job_description',
      sourceId: 'target_jd',
      section: 'general'
    });
  }

  return chunks;
};
