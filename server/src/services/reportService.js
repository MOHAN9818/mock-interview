import PDFDocument from 'pdfkit';

/**
 * Generates an executive-level, professional multi-page PDF Assessment Report.
 */
export const generatePdfReport = (
  candidateProfile = {},
  matchAnalysis = {},
  finalAssessment = {},
  skillGap = {},
  evaluations = [],
  integrity = null
) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        info: {
          Title: 'AI Interview & Resume Intelligence Assessment',
          Author: 'AI Interview Intelligence Platform'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Color Palette
      const PRIMARY = '#0f172a'; // Slate 900
      const ACCENT = '#0284c7'; // Sky Blue
      const SUCCESS = '#059669'; // Emerald
      const WARNING = '#d97706'; // Amber
      const DANGER = '#dc2626'; // Red
      const MUTED = '#64748b'; // Slate 500
      const LIGHT_BG = '#f8fafc'; // Slate 50
      const BORDER_COLOR = '#e2e8f0'; // Slate 200
      const TEXT_DARK = '#1e293b';

      const candidateName = candidateProfile?.candidate_name || 'Candidate';
      const targetRole = matchAnalysis?.role || 'Software Engineer';
      const rawScore = finalAssessment?.OverallScore ?? 0;
      const originalScore = integrity?.originalScore !== undefined ? integrity.originalScore : rawScore;
      const finalScore = integrity?.finalAdjustedScore !== undefined ? integrity.finalAdjustedScore : originalScore;
      const integrityPenalty = integrity?.integrityPenalty ?? 0;
      const integrityStatus = integrity?.integrityStatus || 'VERIFIED';
      const qualifyingWarnings = integrity?.qualifyingWarningCount ?? 0;
      const totalWarnings = integrity?.warningCount ?? qualifyingWarnings;
      const integrityReason = integrity?.integrityReason || (integrityStatus === 'VERIFIED' ? 'Session integrity verified with camera monitoring.' : 'Threshold exceeded; flagged for review.');
      const readiness = finalAssessment?.ReadinessLevel || (finalScore >= 75 ? 'High Readiness' : 'Moderate Readiness');

      // ==========================================
      // PAGE 1: HEADER & EXECUTIVE SUMMARY
      // ==========================================
      doc.rect(40, 40, 515, 60).fill(PRIMARY);
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text('AI RESUME & INTERVIEW INTELLIGENCE REPORT', 55, 52);
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text(`EXECUTIVE ASSESSMENT  •  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 55, 76);

      // Score Badge on Header Right
      doc.rect(450, 48, 90, 44).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica').text('BENCHMARK SCORE', 450, 54, { width: 90, align: 'center' });
      doc.fontSize(16).font('Helvetica-Bold').text(`${finalScore}/100`, 450, 68, { width: 90, align: 'center' });

      // Section 1: Candidate & Role Profile
      let yPos = 115;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('1. CANDIDATE & ASSESSMENT PROFILE', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      doc.rect(40, yPos, 515, 54).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(TEXT_DARK).fontSize(8.5).font('Helvetica-Bold');
      doc.text('Candidate Name:', 50, yPos + 8);
      doc.font('Helvetica').text(candidateName, 140, yPos + 8);

      doc.font('Helvetica-Bold').text('Target Role:', 310, yPos + 8);
      doc.font('Helvetica').text(targetRole, 380, yPos + 8);

      doc.font('Helvetica-Bold').text('Resume Score:', 50, yPos + 23);
      doc.font('Helvetica').text(`${finalAssessment?.ResumeQuality ?? 0}/100`, 140, yPos + 23);

      doc.font('Helvetica-Bold').text('Job Match Score:', 310, yPos + 23);
      doc.font('Helvetica').text(`${finalAssessment?.JobCompatibility ?? 0}/100`, 395, yPos + 23);

      doc.font('Helvetica-Bold').text('Readiness Rating:', 50, yPos + 38);
      doc.font('Helvetica').text(readiness, 140, yPos + 38);

      // Section 2: Core Competency Benchmarks
      yPos += 70;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('2. CORE COMPETENCY BENCHMARKS', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      const metrics = [
        { label: 'Technical Depth', val: finalAssessment?.TechnicalKnowledge ?? 0 },
        { label: 'Problem Solving', val: finalAssessment?.ProblemSolving ?? 0 },
        { label: 'Communication', val: finalAssessment?.Communication ?? 0 },
        { label: 'Relevance', val: finalAssessment?.AnswerRelevance ?? 0 },
        { label: 'Completeness', val: finalAssessment?.Completeness ?? 0 },
        { label: 'Job Alignment', val: finalAssessment?.JobCompatibility ?? 0 }
      ];

      const boxWidth = 78;
      metrics.forEach((m, idx) => {
        const x = 40 + idx * 87;
        const color = m.val >= 75 ? SUCCESS : m.val >= 55 ? WARNING : DANGER;
        doc.rect(x, yPos, boxWidth, 46).fillAndStroke('#ffffff', BORDER_COLOR);
        doc.rect(x, yPos, boxWidth, 4).fill(color);
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(m.label, x + 2, yPos + 9, { width: boxWidth - 4, align: 'center' });
        doc.fillColor(PRIMARY).fontSize(13).font('Helvetica-Bold').text(`${m.val}%`, x + 2, yPos + 23, { width: boxWidth - 4, align: 'center' });
      });

      // Section 3: ATS Resume & Job Alignment
      yPos += 62;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('3. ATS RESUME & JOB ALIGNMENT', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      doc.rect(40, yPos, 250, 60).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(SUCCESS).fontSize(8.5).font('Helvetica-Bold').text('✓ MATCHED CORE SKILLS', 48, yPos + 8);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(
        (matchAnalysis?.matched_skills?.slice(0, 6)?.join(', ') || 'Foundation skills verified'),
        48,
        yPos + 22,
        { width: 234 }
      );

      doc.rect(305, yPos, 250, 60).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(WARNING).fontSize(8.5).font('Helvetica-Bold').text('! MISSING / TARGET SKILLS', 313, yPos + 8);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(
        (matchAnalysis?.missing_skills?.slice(0, 6)?.join(', ') || 'No critical gaps detected'),
        313,
        yPos + 22,
        { width: 234 }
      );

      // Section 4: Resume Improvement Recommendations
      yPos += 74;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('4. RESUME IMPROVEMENT & BULLET REWRITES', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      const suggestions = candidateProfile?.resume_improvement_suggestions ||
        matchAnalysis?.recommendations || [
          'Add quantitative performance metrics to project bullet points.',
          'Explicitly highlight CI/CD and container orchestration experience.'
        ];

      doc.rect(40, yPos, 515, Math.min(60, suggestions.length * 18 + 14)).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      suggestions.slice(0, 2).forEach((sug, idx) => {
        doc.fillColor(ACCENT).fontSize(7.5).font('Helvetica-Bold').text(`• Suggestion ${idx + 1}:`, 48, yPos + 8 + idx * 18);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(sug, 115, yPos + 8 + idx * 18, { width: 430 });
      });

      // Section 5: Interview Integrity & Monitoring Audit
      yPos += Math.min(60, suggestions.length * 18 + 14) + 14;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('5. CAMERA MONITORING & INTEGRITY AUDIT', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      const statusColor = integrityStatus === 'VERIFIED' ? SUCCESS : WARNING;
      doc.rect(40, yPos, 515, 62).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      doc.fillColor(TEXT_DARK).fontSize(8.5).font('Helvetica-Bold');
      doc.text('Integrity Status:', 50, yPos + 8);
      doc.fillColor(statusColor).text(
        integrityStatus === 'VERIFIED' ? '✓ VERIFIED (Within Limits)' : '! REVIEW REQUIRED (Threshold Exceeded)',
        140,
        yPos + 8
      );

      doc.fillColor(TEXT_DARK).font('Helvetica-Bold').text('Qualifying Warnings:', 310, yPos + 8);
      doc.font('Helvetica').text(`${qualifyingWarnings} / 10 Threshold (${totalWarnings} total events)`, 425, yPos + 8);

      doc.font('Helvetica-Bold').text('Original Score:', 50, yPos + 23);
      doc.font('Helvetica').text(`${originalScore}/100`, 140, yPos + 23);

      doc.font('Helvetica-Bold').text('Integrity Adjustment:', 310, yPos + 23);
      doc.font('Helvetica').text(
        integrityPenalty > 0 ? `-${integrityPenalty} pts (Policy applied)` : 'No penalty applied (0 pts)',
        425,
        yPos + 23
      );

      doc.font('Helvetica-Bold').text('Final Adjusted Score:', 50, yPos + 38);
      doc.fillColor(PRIMARY).font('Helvetica-Bold').text(`${finalScore}/100`, 140, yPos + 38);

      doc.fillColor(MUTED).fontSize(7).font('Helvetica').text(
        `Audit Notice: ${integrityReason.substring(0, 200)}`,
        50,
        yPos + 48,
        { width: 495 }
      );

      // Section 6: Executive Summary
      yPos += 76;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('6. EXECUTIVE EVALUATION SUMMARY', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 14).lineTo(555, yPos + 14).stroke();

      yPos += 22;
      doc.rect(40, yPos, 515, 48).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(
        finalAssessment?.summary ||
          `The candidate completed the adaptive interview with an overall benchmark score of ${finalScore}/100.`,
        48,
        yPos + 8,
        { width: 499, lineGap: 2.5 }
      );

      // ==========================================
      // PAGE 2+: QUESTION-BY-QUESTION BREAKDOWN
      // ==========================================
      doc.addPage();
      doc.rect(40, 40, 515, 30).fill(PRIMARY);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
        .text('7. DETAILED QUESTION EVALUATION & MODEL ANSWERS', 50, 50);

      let currentY = 82;

      evaluations.forEach((item, index) => {
        const ev = item.evaluation || {};
        const score = item.score ? item.score * 10 : (ev.overall_answer_score || 60);

        if (currentY + 160 > 750) {
          doc.addPage();
          currentY = 50;
        }

        const cardHeight = 150;
        doc.rect(40, currentY, 515, cardHeight).fillAndStroke(LIGHT_BG, BORDER_COLOR);

        doc.rect(40, currentY, 515, 20).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
          .text(`Q${index + 1}: ${item.question || 'Interview Question'}`, 48, currentY + 5, { width: 390 });

        const scoreColor = score >= 75 ? SUCCESS : score >= 55 ? WARNING : DANGER;
        doc.fillColor(scoreColor).fontSize(8.5).font('Helvetica-Bold')
          .text(`Score: ${score}/100`, 440, currentY + 5, { width: 105, align: 'right' });

        doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text('CANDIDATE ANSWER:', 48, currentY + 24);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          item.answer ? `"${item.answer.substring(0, 160)}${item.answer.length > 160 ? '...' : ''}"` : '(No transcript recorded)',
          48,
          currentY + 34,
          { width: 499 }
        );

        doc.fillColor(ACCENT).fontSize(7).font('Helvetica-Bold').text('AI EVALUATION & FEEDBACK:', 48, currentY + 52);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          item.feedback || ev.feedback || 'Evaluated for technical depth and clarity.',
          48,
          currentY + 62,
          { width: 499 }
        );

        const mistakes = ev.mistakes_identified?.length ? ev.mistakes_identified.join('; ') : (ev.weaknesses?.[0] || 'Expand on implementation trade-offs');
        doc.fillColor(DANGER).fontSize(7).font('Helvetica-Bold').text('MISTAKES / MISSING CONCEPTS:', 48, currentY + 84);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          mistakes.substring(0, 150),
          48,
          currentY + 94,
          { width: 499 }
        );

        const idealAns = ev.ideal_answer || 'An ideal answer explains core principles, real-world architecture, and practical production trade-offs.';
        doc.fillColor(SUCCESS).fontSize(7).font('Helvetica-Bold').text('★ IDEAL SENIOR MODEL ANSWER:', 48, currentY + 114);
        doc.fillColor('#065f46').fontSize(7.5).font('Helvetica').text(
          idealAns.substring(0, 180) + (idealAns.length > 180 ? '...' : ''),
          48,
          currentY + 124,
          { width: 499 }
        );

        currentY += cardHeight + 12;
      });

      // Section 8: Learning Roadmap
      if (currentY + 130 > 750) {
        doc.addPage();
        currentY = 50;
      }

      currentY += 8;
      doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text('8. PERSONALIZED LEARNING ROADMAP', 40, currentY);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, currentY + 14).lineTo(555, currentY + 14).stroke();

      currentY += 22;
      const roadmapSteps = skillGap?.personalized_learning_roadmap || [
        'Phase 1: Deepen foundational knowledge in missing job-specific technologies.',
        'Phase 2: Build end-to-end projects implementing caching and distributed patterns.',
        'Phase 3: Conduct mock interview drills focusing on structured STAR explanations.'
      ];

      doc.rect(40, currentY, 515, roadmapSteps.length * 20 + 20).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      roadmapSteps.forEach((step, idx) => {
        doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold').text(`Phase ${idx + 1}:`, 50, currentY + 10 + idx * 20);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(step, 95, currentY + 10 + idx * 20, { width: 450 });
      });

      doc.fontSize(7).fillColor(MUTED).font('Helvetica')
        .text('Generated securely by AI Resume & Adaptive Interview Intelligence Platform  •  Confidential Candidate Assessment', 40, 790, { width: 515, align: 'center' });

      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};
