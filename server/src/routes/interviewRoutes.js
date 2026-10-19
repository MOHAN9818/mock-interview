import express from 'express';
import jwt from 'jsonwebtoken';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import Interview from '../models/Interview.js';
import { extractStructuredResume, analyzeResumeQuality } from '../services/resumeService.js';
import { analyzeJobDescription, matchResumeToJob, analyzeSkillGapAndCareer } from '../services/matchingService.js';
import { generateInterviewQuestion } from '../services/interviewService.js';
import { evaluateAnswer, generateFinalAssessment } from '../services/evaluationService.js';
import { generatePdfReport } from '../services/reportService.js';
import { calculateIntegrityAssessment } from '../services/integrityScoringService.js';
import { aiRateLimiter, sanitizeForPrompt } from '../middleware/security.js';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const router = express.Router();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token missing',
      code: 'AUTH_TOKEN_MISSING'
    });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token',
      code: 'AUTH_INVALID_TOKEN'
    });
  }
};

const extractResumeText = async (fileName = '', mimeType = '', fileContent = '') => {
  if (!fileContent) return '';
  const normalizedName = (fileName || '').toLowerCase();
  const normalizedMime = (mimeType || '').toLowerCase();

  try {
    const buffer = Buffer.from(fileContent, 'base64');
    // Limit buffer size to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('File exceeds maximum allowable size (10MB)');
    }

    if (normalizedMime === 'application/pdf' || normalizedName.endsWith('.pdf')) {
      try {
        if (typeof pdfParseModule === 'function') {
          const parsed = await pdfParseModule(buffer);
          return (parsed.text || '').trim();
        } else if (pdfParseModule?.PDFParse) {
          const parser = new pdfParseModule.PDFParse({ data: buffer });
          const parsed = await parser.getText();
          return (parsed.text || '').trim();
        } else {
          const parsed = await pdfParseModule(buffer);
          return (parsed.text || '').trim();
        }
      } catch (pdfErr) {
        console.warn('PDF parser attempt error:', pdfErr.message);
        return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    }

    if (
      normalizedMime.includes('word') ||
      normalizedName.endsWith('.docx') ||
      normalizedName.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').trim();
    }

    return buffer.toString('utf8');
  } catch (error) {
    console.error('Resume extraction error:', error.message);
    return '';
  }
};

// 1. Resume Parsing & ATS Intelligence
router.post('/parse-resume', authenticate, aiRateLimiter(), async (req, res) => {
  try {
    const { fileName = '', mimeType = '', fileContent = '' } = req.body;
    if (!fileContent) {
      return res.status(400).json({
        success: false,
        error: 'No file content provided for resume upload',
        code: 'RESUME_CONTENT_MISSING'
      });
    }

    const extractedText = await extractResumeText(fileName, mimeType, fileContent);
    if (!extractedText || extractedText.length < 20) {
      return res.status(422).json({
        success: false,
        error: 'Could not extract readable text from the uploaded document. Please check the file format.',
        code: 'RESUME_PARSE_FAILED'
      });
    }

    const structuredData = await extractStructuredResume(extractedText);
    const resumeQuality = await analyzeResumeQuality(extractedText, structuredData);

    const role = structuredData?.experience?.[0]?.title || 'Software Engineer';
    const summary =
      resumeQuality?.resume_improvement_suggestions?.[0] || 'Resume parsed successfully.';

    res.json({
      success: true,
      extractedText: extractedText.slice(0, 12000),
      summary,
      role,
      structuredData,
      resumeQuality
    });
  } catch (error) {
    console.error('Parse resume route error:', error.message);
    res.status(500).json({
      success: false,
      error: 'An internal error occurred while parsing resume.',
      code: 'SERVER_RESUME_ERROR'
    });
  }
});

// 2. Job Description Analysis
router.post('/analyze-jd', authenticate, aiRateLimiter(), async (req, res) => {
  try {
    const { jdText } = req.body;
    if (!jdText?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Job description text is required',
        code: 'JD_TEXT_MISSING'
      });
    }
    const cleanJdText = sanitizeForPrompt(jdText);
    const structuredJd = await analyzeJobDescription(cleanJdText);
    res.json({ success: true, structuredJd });
  } catch (error) {
    console.error('Analyze JD error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze job description.',
      code: 'SERVER_JD_ERROR'
    });
  }
});

// 3. ATS Resume-to-Job Matching
router.post('/match-job', authenticate, aiRateLimiter(), async (req, res) => {
  try {
    const { resumeStructured, jdStructured } = req.body;
    if (!resumeStructured) {
      return res.status(400).json({
        success: false,
        error: 'Resume structured profile required for matching',
        code: 'RESUME_DATA_MISSING'
      });
    }
    const matchResult = await matchResumeToJob(resumeStructured, jdStructured || {});
    res.json({ success: true, matchResult });
  } catch (error) {
    console.error('Match job error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to compute job matching score.',
      code: 'SERVER_MATCH_ERROR'
    });
  }
});

// 4. Turn-by-Turn Adaptive AI Session (with RAG Grounding)
router.post('/ai-session', authenticate, aiRateLimiter(), async (req, res) => {
  try {
    const {
      resumeStructured = {},
      jdStructured = {},
      difficulty = 'Medium',
      type = 'Technical',
      conversation = [],
      currentAnswer = ''
    } = req.body;

    let previousEvaluation = null;
    if (conversation.length > 0 && currentAnswer && currentAnswer.trim()) {
      const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === 'assistant');
      const lastQuestion = lastAssistantMsg?.content || '';
      if (lastQuestion) {
        previousEvaluation = await evaluateAnswer(
          lastQuestion,
          currentAnswer.trim(),
          resumeStructured,
          jdStructured
        );
      }
    }

    const nextQuestionObj = await generateInterviewQuestion(
      resumeStructured,
      jdStructured,
      difficulty,
      type,
      conversation,
      previousEvaluation
    );

    res.json({
      success: true,
      question: nextQuestionObj.question,
      category: nextQuestionObj.category,
      difficulty: nextQuestionObj.difficulty,
      adaptationReason: nextQuestionObj.adaptationReason || '',
      retrievedGrounding: nextQuestionObj.retrievedGrounding || [],
      previousEvaluation
    });
  } catch (error) {
    console.error('AI Session generation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Unable to generate next interview question.',
      code: 'SERVER_INTERVIEW_ERROR'
    });
  }
});

// 5. Final Evaluation & Submission
router.post('/submit', authenticate, aiRateLimiter(), async (req, res) => {
  try {
    const {
      role,
      difficulty,
      type,
      questions = [],
      resumeStructured = {},
      jdStructured = {},
      resumeQuality = {},
      matchScore = {},
      integrityWarnings = [],
      integrityPolicy
    } = req.body;

    const evaluatedQuestions = [];
    for (const q of questions) {
      let evaluation = q.evaluation;
      if (!evaluation || !evaluation.overall_answer_score) {
        evaluation = await evaluateAnswer(q.question, q.answer || '', resumeStructured, jdStructured);
      }
      evaluatedQuestions.push({
        question: q.question,
        answer: q.answer || '',
        score: Math.round((evaluation.overall_answer_score || 50) / 10),
        feedback: evaluation.feedback || 'Evaluated',
        category: q.category || 'Technical',
        difficulty: q.difficulty || difficulty,
        adaptationReason: q.adaptationReason || '',
        retrievedGrounding: q.retrievedGrounding || [],
        evaluation
      });
    }

    const finalAssessment = await generateFinalAssessment(
      evaluatedQuestions.map((q) => q.evaluation),
      resumeQuality,
      matchScore
    );
    const skillGap = await analyzeSkillGapAndCareer(resumeStructured, jdStructured, finalAssessment);

    const rawTechnicalScore = finalAssessment?.OverallScore || 60;

    // Authoritative Server-Side Integrity Evaluation
    const integrityOutcome = calculateIntegrityAssessment(
      integrityWarnings,
      rawTechnicalScore,
      { policy: integrityPolicy }
    );

    const interview = await Interview.create({
      userId: req.userId,
      role: jdStructured?.role || role || 'Software Engineer',
      difficulty,
      type,
      questions: evaluatedQuestions,
      totalScore: integrityOutcome.finalAdjustedScore,
      legacyScore: Math.round(integrityOutcome.finalAdjustedScore / 10),
      originalScore: integrityOutcome.originalScore,
      integrityPenalty: integrityOutcome.integrityPenalty,
      finalAdjustedScore: integrityOutcome.finalAdjustedScore,
      integrityStatus: integrityOutcome.integrityStatus,
      integrityReviewRequired: integrityOutcome.integrityReviewRequired,
      integrityReason: integrityOutcome.integrityReason,
      warningCount: integrityOutcome.warningCount,
      qualifyingWarningCount: integrityOutcome.qualifyingWarningCount,
      integrityWarnings: integrityOutcome.integrityWarnings,
      integrityPolicy: integrityOutcome.integrityPolicy,
      summary: finalAssessment?.summary || 'Interview completed.',
      finalAssessment,
      skillGap,
      matchScore,
      resumeQuality,
      candidateProfile: resumeStructured,
      jobProfile: jdStructured,
      status: 'completed'
    });

    res.status(201).json({
      success: true,
      interview,
      finalAssessment,
      skillGap,
      integrity: integrityOutcome,
      feedback: `Session complete. Benchmark technical score: ${integrityOutcome.originalScore}/100. Final adjusted score: ${integrityOutcome.finalAdjustedScore}/100 (Status: ${integrityOutcome.integrityStatus}).`,
      summary: interview.summary
    });
  } catch (error) {
    console.error('Submit interview error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Unable to finalize and save interview assessment.',
      code: 'SERVER_SUBMIT_ERROR'
    });
  }
});

// 6. User History
router.get('/history', authenticate, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, interviews });
  } catch (error) {
    console.error('History fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve interview history.',
      code: 'SERVER_HISTORY_ERROR'
    });
  }
});

// 7. Comprehensive Career Analytics Aggregation
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId }).sort({ createdAt: -1 });
    if (!interviews || interviews.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalInterviews: 0,
          averageScore: 0,
          trend: [],
          strongestTopics: [],
          weakestTopics: [],
          repeatedMissedConcepts: [],
          readinessOverview: 'No interview sessions recorded yet.',
          recommendedNextFocus: 'Launch your first mock interview to generate personalized career intelligence.'
        }
      });
    }

    const scores = interviews.map((i) => (i.totalScore > 10 ? i.totalScore : i.totalScore * 10));
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const topicMap = new Map();
    const missedConceptCounts = new Map();
    const strengthsCount = new Map();

    interviews.forEach((session) => {
      (session.questions || []).forEach((q) => {
        const cat = q.category || 'General';
        const sc = q.score ? q.score * 10 : (q.evaluation?.overall_answer_score || 50);
        if (!topicMap.has(cat)) topicMap.set(cat, { sum: 0, count: 0 });
        const entry = topicMap.get(cat);
        entry.sum += sc;
        entry.count += 1;

        (q.evaluation?.missing_key_concepts || []).forEach((c) => {
          missedConceptCounts.set(c, (missedConceptCounts.get(c) || 0) + 1);
        });
        (q.evaluation?.strengths || []).forEach((s) => {
          strengthsCount.set(s, (strengthsCount.get(s) || 0) + 1);
        });
      });
    });

    const topicAverages = Array.from(topicMap.entries()).map(([topic, data]) => ({
      topic,
      avgScore: Math.round(data.sum / data.count),
      count: data.count
    }));

    topicAverages.sort((a, b) => b.avgScore - a.avgScore);
    const strongestTopics = topicAverages.filter((t) => t.avgScore >= 70).slice(0, 5);
    const weakestTopics = topicAverages.filter((t) => t.avgScore < 70).slice(0, 5);

    const repeatedMissedConcepts = Array.from(missedConceptCounts.entries())
      .map(([concept, count]) => ({ concept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const trend = [...interviews].reverse().map((item, idx) => ({
      sessionName: `Session ${idx + 1}`,
      role: item.role,
      difficulty: item.difficulty,
      score: item.totalScore > 10 ? item.totalScore : item.totalScore * 10,
      date: new Date(item.createdAt).toLocaleDateString()
    }));

    res.json({
      success: true,
      analytics: {
        totalInterviews: interviews.length,
        averageScore,
        trend,
        strongestTopics,
        weakestTopics: weakestTopics.length ? weakestTopics : topicAverages.slice(-2),
        repeatedMissedConcepts,
        readinessOverview:
          averageScore >= 80
            ? 'High Readiness across multiple sessions.'
            : averageScore >= 65
            ? 'Solid foundation with targeted areas for technical refinement.'
            : 'Early stage - active practice recommended on missing core concepts.',
        recommendedNextFocus:
          weakestTopics.length > 0
            ? `Deepen mastery in ${weakestTopics.map((t) => t.topic).join(', ')}`
            : 'Continue simulating timed system design interviews.'
      }
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Unable to calculate career analytics.',
      code: 'SERVER_ANALYTICS_ERROR'
    });
  }
});

// 8. Executive PDF Generation
router.post('/generate-pdf', authenticate, aiRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }), async (req, res) => {
  try {
    const { candidateProfile, matchAnalysis, finalAssessment, skillGap, evaluations, integrity } = req.body;
    const pdfBuffer = await generatePdfReport(
      candidateProfile,
      matchAnalysis,
      finalAssessment,
      skillGap,
      evaluations,
      integrity
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Interview_Assessment_Report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF assessment report.',
      code: 'SERVER_PDF_ERROR'
    });
  }
});

export default router;
