import React, { useState } from 'react';

/**
 * Comprehensive Post-Interview Intelligence Dashboard
 * Features:
 * - Overall Performance Score & Competency Breakdown Bars
 * - Question-by-Question Deep Analytics Accordion
 * - Skill Gap Analysis & Recommended Technologies
 * - Personalized Learning Roadmap
 * - Direct Executive PDF Report Downloader
 */
const InterviewDashboard = ({
  finalAssessment,
  skillGap,
  detailedFeedback = [],
  onDownloadPdf,
  onRestart,
  resumeQuality,
  matchScore,
  integrity,
  sessionWarnings = []
}) => {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [showWarningLog, setShowWarningLog] = useState(false);

  const rawOverall = finalAssessment?.OverallScore ?? 0;
  const originalScore = integrity?.originalScore !== undefined ? integrity.originalScore : rawOverall;
  const finalScore = integrity?.finalAdjustedScore !== undefined ? integrity.finalAdjustedScore : originalScore;
  const integrityPenalty = integrity?.integrityPenalty ?? 0;
  const integrityStatus = integrity?.integrityStatus || 'VERIFIED';
  const isReviewRequired = integrityStatus === 'REVIEW_REQUIRED';
  const qualifyingWarnings = integrity?.qualifyingWarningCount ?? 0;
  const totalWarnings = integrity?.warningCount ?? (integrity?.integrityWarnings?.length || sessionWarnings.length);
  const warningList = integrity?.integrityWarnings || sessionWarnings;

  const readiness = finalAssessment?.ReadinessLevel || (finalScore >= 75 ? 'High Readiness' : 'Moderate Readiness');

  const metrics = [
    { label: 'Technical Depth', score: finalAssessment?.TechnicalKnowledge ?? 0, color: 'bg-cyan-500' },
    { label: 'Problem Solving', score: finalAssessment?.ProblemSolving ?? 0, color: 'bg-indigo-500' },
    { label: 'Communication', score: finalAssessment?.Communication ?? 0, color: 'bg-emerald-500' },
    { label: 'Relevance', score: finalAssessment?.AnswerRelevance ?? 0, color: 'bg-amber-500' },
    { label: 'Completeness', score: finalAssessment?.Completeness ?? 0, color: 'bg-teal-500' },
    { label: 'Job Alignment', score: finalAssessment?.JobCompatibility ?? 0, color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Executive Score Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                Interview Evaluation Complete
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
                {readiness}
              </span>
              <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
                isReviewRequired
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                Integrity: {isReviewRequired ? 'Review Required' : 'Verified'}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100">
              Candidate Performance Intelligence Report
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {finalAssessment?.summary || 'Multi-dimensional evaluation across technical correctness, communication, problem-solving, and resume consistency.'}
            </p>
          </div>

          {/* Overall Score Circle Badge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-inner min-w-[170px]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {integrityPenalty > 0 ? 'Adjusted Score' : 'Overall Score'}
            </span>
            <span className="text-4xl font-extrabold text-cyan-400 mt-1">{finalScore}</span>
            <span className="text-xs text-slate-500">out of 100</span>
            {integrityPenalty > 0 && (
              <span className="text-[10px] text-amber-400 mt-1">
                Original Score: {originalScore}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Executive PDF Report</span>
          </button>

          <button
            onClick={onRestart}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
          >
            Start Another Session
          </button>
        </div>
      </div>

      {/* Camera Monitoring & Interview Integrity Audit Card */}
      <div className={`rounded-2xl border p-6 shadow-xl space-y-4 transition-all ${
        isReviewRequired
          ? 'bg-rose-950/20 border-rose-500/30'
          : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Camera Monitoring & Session Integrity Summary
              </h3>
              <p className="text-xs text-slate-400">
                Local browser-based visual verification and compliance audit
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isReviewRequired
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            {isReviewRequired ? '⚠ Review Required' : '✓ Verified'}
          </span>
        </div>

        {/* 4 Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Qualifying Warnings</p>
            <p className={`text-2xl font-extrabold mt-1 ${isReviewRequired ? 'text-rose-400' : 'text-slate-100'}`}>
              {qualifyingWarnings} <span className="text-xs font-normal text-slate-500">/ 10</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{totalWarnings} total events</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Original Tech Score</p>
            <p className="text-2xl font-extrabold text-cyan-400 mt-1">{originalScore}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Raw technical answer score</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Integrity Adjustment</p>
            <p className={`text-2xl font-extrabold mt-1 ${integrityPenalty > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {integrityPenalty > 0 ? `-${integrityPenalty} pts` : '0 pts'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{integrityPenalty > 0 ? 'Policy adjustment' : 'No deduction'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Final Adjusted Score</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{finalScore}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Authoritative score</p>
          </div>
        </div>

        {/* Audit Explanation Banner */}
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
          isReviewRequired
            ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-400 shrink-0">Audit Notice:</span>
            <span>
              {integrity?.integrityReason || (
                isReviewRequired
                  ? 'Your interview exceeded the permitted camera-monitoring warning threshold. The session has been flagged for integrity review in accordance with the configured policy.'
                  : 'Candidate maintained continuous presence and visibility. Integrity verified under standard camera monitoring threshold.'
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 italic">
            * Camera monitoring tracks candidate visual visibility. Warnings reflect session presence metrics and do not constitute definitive proof of malpractice.
          </p>
        </div>

        {/* Warning Event Log Toggle if warnings exist */}
        {warningList.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowWarningLog(!showWarningLog)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
            >
              <span>{showWarningLog ? 'Hide' : 'View'} Detected Monitoring Events ({warningList.length})</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showWarningLog ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showWarningLog && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Type</th>
                      <th className="pb-2 pr-3">Timestamp</th>
                      <th className="pb-2 pr-3">Duration</th>
                      <th className="pb-2 pr-3">Threshold Qualifying</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {warningList.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-2 pr-3 font-semibold text-slate-400">{w.warningNumber || idx + 1}</td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-cyan-300">{w.type}</td>
                        <td className="py-2 pr-3 text-slate-400">{new Date(w.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2 pr-3">{w.duration ? `${w.duration}s` : 'N/A'}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.countedTowardIntegrity
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {w.countedTowardIntegrity ? 'Yes (Counts)' : 'No (Technical)'}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400">{w.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Core Competency Metric Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-md">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-slate-300">{m.label}</span>
              <span className="font-bold text-slate-100">{m.score}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${m.color}`}
                style={{ width: `${m.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Question-by-Question Detailed Evaluations */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className="text-cyan-400">Detailed Question-by-Question Analysis</span>
        </h3>

        <div className="space-y-3">
          {detailedFeedback.map((item, idx) => {
            const ev = item.evaluation || {};
            const isExpanded = expandedIndex === idx;
            const score = item.score ? item.score * 10 : (ev.overall_answer_score || 60);

            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                      Q{idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-slate-200 line-clamp-1">
                      {item.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      score >= 75 ? 'bg-emerald-500/20 text-emerald-300' : score >= 55 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {score}/100
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800/80 bg-slate-900/40 space-y-4 text-sm">
                    {/* Candidate Answer */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your Answer:</p>
                      <p className="text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 italic leading-relaxed">
                        "{item.answer || '(No answer provided)'}"
                      </p>
                    </div>

                    {/* AI Feedback */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">AI Evaluation & Assessment:</p>
                      <p className="text-slate-200 bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-lg leading-relaxed">
                        {item.feedback || ev.feedback || 'The answer was evaluated based on technical accuracy and depth.'}
                      </p>
                    </div>

                    {/* Strengths & Weaknesses / Mistakes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Strengths */}
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                        <p className="text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                          <span>✓</span> Strengths Observed:
                        </p>
                        <ul className="text-xs text-slate-300 list-disc list-inside space-y-1 leading-relaxed">
                          {(ev.strengths && ev.strengths.length > 0 ? ev.strengths : ['Covered core fundamentals']).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Mistakes & Identified Gaps */}
                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
                        <p className="text-xs font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                          <span>✗</span> Mistakes & Gaps Identified:
                        </p>
                        <ul className="text-xs text-slate-300 list-disc list-inside space-y-1 leading-relaxed">
                          {(ev.mistakes_identified && ev.mistakes_identified.length > 0
                            ? ev.mistakes_identified
                            : (ev.weaknesses && ev.weaknesses.length > 0 ? ev.weaknesses : ['Needs deeper technical coverage of production trade-offs'])
                          ).map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Missing Key Concepts if available */}
                    {ev.missing_key_concepts && ev.missing_key_concepts.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
                        <p className="text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                          <span>⚠</span> Missing Key Concepts to Include:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ev.missing_key_concepts.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deterministic Code / Complexity Analysis if applicable */}
                    {ev.deterministic_code_analysis?.hasCode && (
                      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <span>⚡</span> Deterministic Code & Algorithmic Analysis:
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {ev.deterministic_code_analysis.bracketBalance}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <p className="text-slate-300">
                            <strong className="text-slate-400">Estimated Time:</strong> {ev.deterministic_code_analysis.estimatedTimeComplexity}
                          </p>
                          <p className="text-slate-300">
                            <strong className="text-slate-400">Estimated Space:</strong> {ev.deterministic_code_analysis.estimatedSpaceComplexity}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ideal Senior-Level Model Answer */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 via-slate-900 to-indigo-950/30 border border-cyan-500/40 shadow-inner">
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-cyan-500/20">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                          <span className="text-yellow-400">★</span> Ideal Model Answer (How you should answer):
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Senior Benchmark
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                        {ev.ideal_answer || item.ideal_answer || 'An ideal answer explains the core mechanism, provides practical architecture trade-offs, discusses performance bottlenecks, and connects directly to production best practices.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Skill Gap & Personalized Learning Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Gap Analysis */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-amber-400">Skill Gap & Industry Competency</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-1.5">Demonstrated Strengths:</p>
              <div className="flex flex-wrap gap-2">
                {(skillGap?.strong_skills || ['Software Architecture', 'Core Fundamentals']).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-rose-400 mb-1.5">Identified Skill Gaps:</p>
              <div className="flex flex-wrap gap-2">
                {(skillGap?.missing_skills || ['Distributed System Resilience', 'Advanced Caching']).map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-cyan-400 mb-1.5">Recommended Technologies to Master:</p>
              <div className="flex flex-wrap gap-2">
                {(skillGap?.recommended_technologies || ['Docker', 'Kubernetes', 'Redis', 'Kafka']).map((t, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Learning Roadmap */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-purple-400">Personalized Learning Roadmap</span>
          </h3>

          <div className="space-y-3 text-sm">
            {(skillGap?.personalized_learning_roadmap || [
              'Phase 1: Deep dive into missing core architectural and job-specific skills.',
              'Phase 2: Build an end-to-end distributed project demonstrating high concurrency and caching.',
              'Phase 3: Conduct timed mock technical interviews to refine verbal problem-solving articulation.'
            ]).map((step, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
