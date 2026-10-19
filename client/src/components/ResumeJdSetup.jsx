import React, { useState } from 'react';

/**
 * Pre-Interview Resume ATS Parser & Job Match Setup Component
 */
const ResumeJdSetup = ({
  onFileUpload,
  onAnalyzeJd,
  onStartInterview,
  resumeStructured,
  resumeQuality,
  jdStructured,
  matchScore,
  setup,
  setSetup,
  isLoading,
  error
}) => {
  const [jdInput, setJdInput] = useState('');
  const [selectedSkillEvidence, setSelectedSkillEvidence] = useState(null);
  const [activeTab, setActiveTab] = useState('skills'); // 'skills' | 'improvements' | 'match_breakdown'

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="max-w-3xl">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold uppercase tracking-wider">
            Phase 1: ATS Resume & Career Intelligence
          </span>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">
            Configure Your Adaptive AI Interview Session
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Upload your resume and optional job description. Our RAG-grounded AI intelligence engine indexes your projects, skills, and target competencies to deliver an adaptive, personalized mock interview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Resume Upload */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
                Upload Candidate Resume
              </h4>
              {resumeQuality?.resume_score && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  ATS Score: {resumeQuality.resume_score}/100
                </span>
              )}
            </div>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 bg-slate-950/60 cursor-pointer transition-all group">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={onFileUpload}
                disabled={isLoading}
                className="hidden"
              />
              <svg className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
              <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300">
                {resumeStructured?.candidate_name ? `Loaded: ${resumeStructured.candidate_name}` : 'Select Resume (PDF, DOCX, TXT)'}
              </span>
              <span className="text-xs text-slate-500 mt-1">Automatic ATS skill, project & evidence extraction</span>
            </label>

            {/* Resume Extracted Intel Tabs */}
            {resumeStructured && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('skills')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'skills' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Skills & Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('improvements')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === 'improvements' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI Bullet Rewrites ({resumeQuality?.bullet_improvements_comparison?.length || resumeQuality?.weak_bullet_points?.length || 0})
                  </button>
                </div>

                {activeTab === 'skills' && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <p className="font-semibold text-cyan-400">Click a verified skill to see resume evidence quote:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {[...(resumeStructured.skills || []), ...(resumeStructured.programming_languages || [])].map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedSkillEvidence(selectedSkillEvidence === s ? null : s)}
                          className={`px-2 py-0.5 rounded border transition-colors ${
                            selectedSkillEvidence === s
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {selectedSkillEvidence && resumeStructured.skill_evidence?.[selectedSkillEvidence] && (
                      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-slate-200 text-xs">
                        <span className="text-cyan-300 font-bold">Evidence for "{selectedSkillEvidence}": </span>
                        <span className="italic">"{resumeStructured.skill_evidence[selectedSkillEvidence]}"</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'improvements' && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs max-h-56 overflow-y-auto">
                    {(resumeQuality?.bullet_improvements_comparison || [
                      {
                        section: 'Experience',
                        before: 'Built application features',
                        after: 'Architected scalable full-stack features with Node.js and React, optimizing load times.'
                      }
                    ]).map((comp, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <span>{comp.section || 'Resume Bullet'}</span>
                          <span className="text-purple-400 uppercase">AI Rewrite</span>
                        </div>
                        <p className="text-rose-300/90 line-through">Before: {comp.before || comp.original}</p>
                        <p className="text-emerald-300 font-medium">After: {comp.after || comp.suggested}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Job Description & Target Match */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                Target Job Description (Optional)
              </h4>
              {matchScore?.job_match_score && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Match: {matchScore.job_match_score}%
                </span>
              )}
            </div>

            <textarea
              rows={4}
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              placeholder="Paste Job Description / Requirements here to tailor questions specifically to company needs..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              onClick={() => onAnalyzeJd(jdInput)}
              disabled={isLoading || !jdInput.trim() || !resumeStructured}
              className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition-colors"
            >
              Analyze & Match Against Resume
            </button>

            {/* Matching analysis chips & breakdown */}
            {matchScore && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Project Relevance</span>
                    <span className="font-bold text-slate-200">{matchScore.project_relevance_score || 85}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Keyword Overlap</span>
                    <span className="font-bold text-slate-200">{matchScore.keyword_overlap_score || matchScore.semantic_similarity || 80}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold">Matched Required:</span>
                    <span className="text-slate-300">{(matchScore.matched_required_skills || matchScore.matched_skills || []).slice(0, 4).join(', ') || 'Core Stack'}</span>
                  </div>
                  {matchScore.missing_skills?.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-semibold">Missing/Gap:</span>
                      <span className="text-slate-300">{matchScore.missing_skills.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Interview Parameter Customization & Launch */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
          Session Parameters & Launch
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Target Role</label>
            <input
              type="text"
              value={setup.role}
              onChange={(e) => setSetup({ ...setup, role: e.target.value })}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Interview Mode</label>
            <select
              value={setup.type || 'Technical'}
              onChange={(e) => setSetup({ ...setup, type: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Technical">Technical (Core Stack)</option>
              <option value="System Design">System Design & Scalability</option>
              <option value="Project-Deep-Dive">Project Deep Dive</option>
              <option value="HR / Behavioral">HR / Behavioral (STAR)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Difficulty Level</label>
            <select
              value={setup.difficulty}
              onChange={(e) => setSetup({ ...setup, difficulty: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Easy">Beginner / Foundational</option>
              <option value="Medium">Intermediate (Standard)</option>
              <option value="Hard">Advanced (Architect)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Question Count</label>
            <input
              type="number"
              min={1}
              max={10}
              value={setup.maxQuestions}
              onChange={(e) => setSetup({ ...setup, maxQuestions: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={onStartInterview}
              disabled={isLoading || !resumeStructured}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
            >
              {isLoading ? 'Initializing RAG Session...' : 'Launch AI Video Interview'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 rounded-xl">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResumeJdSetup;
