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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const router = express.Router();

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authorization token missing' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const extractResumeText = async (fileName = '', mimeType = '', fileContent = '') => {
  if (!fileContent) return '';
  const normalizedName = (fileName || '').toLowerCase();
  const normalizedMime = (mimeType || '').toLowerCase();
  try {
    if (normalizedMime === 'application/pdf' || normalizedName.endsWith('.pdf')) {
      const buffer = Buffer.from(fileContent, 'base64');
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const parsedPdf = await parser.getText();
      return (parsedPdf.text || '').trim();
    }
    if (
      normalizedMime.includes('word') ||
      normalizedName.endsWith('.docx') ||
      normalizedName.endsWith('.doc')
    ) {
      const buffer = Buffer.from(fileContent, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').trim();
    }
    return Buffer.from(fileContent, 'base64').toString('utf8');
  } catch (error) {
    console.error('Resume extraction error:', error);
    return '';
  }
};

// 1. Resume Parsing & ATS Intelligence
router.post('/parse-resume', authenticate, async (req, res) => {
  try {
    const { fileName = '', mimeType = '', fileContent = '' } = req.body;
    const extractedText = await extractResumeText(fileName, mimeType, fileContent);
    if (!extractedText) throw new Error('Could not extract text from the uploaded file.');

    const structuredData = await extractStructuredResume(extractedText);
    const resumeQuality = await analyzeResumeQuality(extractedText, structuredData);

    const role = structuredData?.experience?.[0]?.title || 'Software Engineer';
    const summary =
      resumeQuality?.resume_improvement_suggestions?.[0] || 'Resume parsed successfully.';

    res.json({
      extractedText: extractedText.slice(0, 12000),
      summary,
      role,
      structuredData,
      resumeQuality,
      success: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Job Description Analysis
router.post('/analyze-jd', authenticate, async (req, res) => {
  try {
    const { jdText } = req.body;
    if (!jdText?.trim()) return res.status(400).json({ message: 'Job description text is required' });
    const structuredJd = await analyzeJobDescription(jdText);
    res.json({ structuredJd });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ATS Resume-to-Job Matching
router.post('/match-job', authenticate, async (req, res) => {
  try {
    const { resumeStructured, jdStructured } = req.body;
    const matchResult = await matchResumeToJob(resumeStructured, jdStructured);
    res.json({ matchResult });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Turn-by-Turn Adaptive AI Session
router.post('/ai-session', authenticate, async (req, res) => {
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
    if (conversation.length > 0 && currentAnswer) {
      const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === 'assistant');
      const lastQuestion = lastAssistantMsg?.content || '';
      if (lastQuestion) {
        previousEvaluation = await evaluateAnswer(lastQuestion, currentAnswer, resumeStructured, jdStructured);
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
      question: nextQuestionObj.question,
      category: nextQuestionObj.category,
      difficulty: nextQuestionObj.difficulty,
      adaptationReason: nextQuestionObj.adaptationReason || '',
      previousEvaluation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Final Evaluation & Submission
router.post('/submit', authenticate, async (req, res) => {
  try {
    const {
      role,
      difficulty,
      type,
      questions = [],
      resumeStructured = {},
      jdStructured = {},
      resumeQuality = {},
      matchScore = {}
    } = req.body;

    const evaluatedQuestions = [];
    for (const q of questions) {
      let evaluation = q.evaluation;
      if (!evaluation || !evaluation.overall_answer_score) {
        evaluation = await evaluateAnswer(q.question, q.answer, resumeStructured, jdStructured);
      }
      evaluatedQuestions.push({
        question: q.question,
        answer: q.answer,
        score: Math.round((evaluation.overall_answer_score || 60) / 10), // 0-10 scale
        feedback: evaluation.feedback || 'Evaluated',
        category: q.category || 'Technical',
        difficulty: q.difficulty || difficulty,
        evaluation
      });
    }

    const finalAssessment = await generateFinalAssessment(
      evaluatedQuestions.map((q) => q.evaluation),
      resumeQuality,
      matchScore
    );
    const skillGap = await analyzeSkillGapAndCareer(resumeStructured, jdStructured, finalAssessment);

    const interview = await Interview.create({
      userId: req.userId,
      role: jdStructured?.role || role || 'Software Engineer',
      difficulty,
      type,
      questions: evaluatedQuestions,
      totalScore: finalAssessment?.OverallScore || 60,
      legacyScore: Math.round((finalAssessment?.OverallScore || 60) / 10),
      summary: finalAssessment?.summary || 'Interview completed.',
      finalAssessment,
      skillGap,
      matchScore,
      resumeQuality,
      candidateProfile: resumeStructured,
      jobProfile: jdStructured
    });

    res.status(201).json({
      interview,
      finalAssessment,
      skillGap,
      feedback: `Session complete. Your benchmark performance score is ${interview.totalScore}/100.`,
      summary: interview.summary
    });
  } catch (error) {
    console.error('Submit interview error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 6. User History
router.get('/history', authenticate, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ interviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 7. Executive PDF Generation
router.post('/generate-pdf', authenticate, async (req, res) => {
  try {
    const { candidateProfile, matchAnalysis, finalAssessment, skillGap, evaluations } = req.body;
    const pdfBuffer = await generatePdfReport(
      candidateProfile,
      matchAnalysis,
      finalAssessment,
      skillGap,
      evaluations
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Interview_Assessment_Report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate PDF Error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
