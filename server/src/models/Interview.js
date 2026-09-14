import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  feedback: { type: String, default: '' },
  score: { type: Number, default: 0 },
  category: { type: String, default: 'General' },
  difficulty: { type: String, default: 'Medium' },
  evaluation: {
    relevance: { type: Number, default: 0 },
    technical_correctness: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    depth: { type: Number, default: 0 },
    problem_solving: { type: Number, default: 0 },
    overall_answer_score: { type: Number, default: 0 },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    mistakes_identified: [{ type: String }],
    missing_key_concepts: [{ type: String }],
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
    totalScore: { type: Number, default: 0 }, // 0 - 100 scale
    legacyScore: { type: Number, default: 0 }, // 0 - 10 scale for backward compatibility
    summary: { type: String, default: '' },
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
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
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
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model('Interview', interviewSchema);
