import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  feedback: { type: String, default: '' },
  score: { type: Number, default: 0 },
  category: { type: String, default: 'General' },
  difficulty: { type: String, default: 'Medium' },
  adaptationReason: { type: String, default: '' },
  retrievedGrounding: [{ type: String }],
  evaluation: {
    relevance: { type: Number, default: 0 },
    technical_correctness: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    depth: { type: Number, default: 0 },
    problem_solving: { type: Number, default: 0 },
    overall_answer_score: { type: Number, default: 0 },
    confidence_level: { type: String, default: 'High' },
    performance_tier: { type: String, default: 'Partially correct' },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    mistakes_identified: [{ type: String }],
    missing_key_concepts: [{ type: String }],
    hallucinations_identified: [{ type: String }],
    ideal_answer: { type: String, default: '' },
    feedback: { type: String, default: '' },
    recommended_followup: { type: String, default: '' },
    difficulty_for_next_question: { type: String, default: 'medium' }
  }
});

const interviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    difficulty: { type: String, required: true },
    type: { type: String, required: true },
    questions: [questionSchema],
    totalScore: { type: Number, default: 0 }, // 0 - 100 scale (adjusted benchmark score)
    legacyScore: { type: Number, default: 0 }, // 0 - 10 scale for backward compatibility
    summary: { type: String, default: '' },
    // Camera Monitoring & Integrity Fields
    integrityStatus: {
      type: String,
      enum: ['VERIFIED', 'REVIEW_REQUIRED', 'FLAGGED'],
      default: 'VERIFIED'
    },
    warningCount: { type: Number, default: 0 },
    qualifyingWarningCount: { type: Number, default: 0 },
    integrityWarnings: [
      {
        warningNumber: { type: Number },
        type: { type: String },
        timestamp: { type: Date, default: Date.now },
        duration: { type: Number, default: 0 },
        explanation: { type: String, default: '' },
        countedTowardIntegrity: { type: Boolean, default: false }
      }
    ],
    originalScore: { type: Number, default: 0 },
    integrityPenalty: { type: Number, default: 0 },
    finalAdjustedScore: { type: Number, default: 0 },
    integrityReason: { type: String, default: '' },
    integrityReviewRequired: { type: Boolean, default: false },
    integrityPolicy: { type: String, default: 'standard' },
    resumeQuality: { type: mongoose.Schema.Types.Mixed },
    matchScore: { type: mongoose.Schema.Types.Mixed },
    finalAssessment: {
      OverallScore: { type: Number, default: 0 },
      TechnicalKnowledge: { type: Number, default: 0 },
      Communication: { type: Number, default: 0 },
      ProblemSolving: { type: Number, default: 0 },
      AnswerRelevance: { type: Number, default: 0 },
      TechnicalCorrectness: { type: Number, default: 0 },
      Completeness: { type: Number, default: 0 },
      Confidence: { type: Number, default: 0 },
      ResumeQuality: { type: Number, default: 0 },
      JobCompatibility: { type: Number, default: 0 },
      ReadinessLevel: { type: String, default: 'Developing' },
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      repeatedMistakes: [{ type: String }],
      frequentlyMissedConcepts: [{ type: String }],
      summary: { type: String, default: '' }
    },
    skillGap: {
      strong_skills: [{ type: String }],
      missing_skills: [{ type: String }],
      weak_skills: [{ type: String }],
      recommended_technologies: [{ type: String }],
      recommended_learning_topics: [{ type: String }],
      suitable_job_roles: [{ type: String }],
      interview_preparation_recommendations: [{ type: String }],
      personalized_learning_roadmap: [{ type: String }]
    },
    candidateProfile: { type: mongoose.Schema.Types.Mixed },
    jobProfile: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'completed' },
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Interview', interviewSchema);

