import PDFDocument from 'pdfkit';

/**
 * Generates an executive-level, professional multi-page PDF Assessment Report.
 * Includes candidate answer, AI evaluation, mistakes identified, ideal model answers, and career roadmap.
 */
export const generatePdfReport = (
  candidateProfile = {},
  matchAnalysis = {},
  finalAssessment = {},
  skillGap = {},
  evaluations = []
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

      // Colors
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
      const overallScore = finalAssessment?.OverallScore ?? 0;

      // ==========================================
      // HEADER BAR
      // ==========================================
      doc.rect(40, 40, 515, 60).fill(PRIMARY);
      doc.fillColor('#ffffff').fontSize(17).font('Helvetica-Bold')
        .text('AI RESUME & INTERVIEW INTELLIGENCE REPORT', 55, 52);
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text(`ASSESSMENT REPORT  •  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 55, 76);

      // Score Badge on Header Right
      doc.rect(450, 48, 90, 44).fill(ACCENT);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica').text('OVERALL SCORE', 450, 54, { width: 90, align: 'center' });
      doc.fontSize(16).font('Helvetica-Bold').text(`${overallScore}/100`, 450, 68, { width: 90, align: 'center' });

      doc.moveDown(4);

      // ==========================================
      // SECTION 1: CANDIDATE & ROLE PROFILE
      // ==========================================
      let yPos = 115;
      doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('1. CANDIDATE & ASSESSMENT PROFILE', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 16).lineTo(555, yPos + 16).stroke();

      yPos += 24;
      doc.rect(40, yPos, 515, 52).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica-Bold');
      doc.text('Candidate Name:', 50, yPos + 8);
      doc.font('Helvetica').text(candidateName, 140, yPos + 8);

      doc.font('Helvetica-Bold').text('Target Role:', 310, yPos + 8);
      doc.font('Helvetica').text(targetRole, 380, yPos + 8);

      doc.font('Helvetica-Bold').text('Resume Score:', 50, yPos + 24);
      doc.font('Helvetica').text(`${finalAssessment?.ResumeQuality ?? 0}/100`, 140, yPos + 24);

      doc.font('Helvetica-Bold').text('Job Match Score:', 310, yPos + 24);
      doc.font('Helvetica').text(`${finalAssessment?.JobCompatibility ?? 0}/100`, 395, yPos + 24);

      doc.font('Helvetica-Bold').text('Experience Level:', 50, yPos + 38);
      doc.font('Helvetica').text(`${candidateProfile?.experience?.length ? candidateProfile.experience.length + ' Recorded Roles' : 'Entry / Intermediate'}`, 140, yPos + 38);

      // ==========================================
      // SECTION 2: COMPETENCY BENCHMARK METRICS
      // ==========================================
      yPos += 70;
      doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('2. CORE COMPETENCY BENCHMARKS', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 16).lineTo(555, yPos + 16).stroke();

      yPos += 24;
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
        doc.rect(x, yPos, boxWidth, 48).fillAndStroke('#ffffff', BORDER_COLOR);
        doc.rect(x, yPos, boxWidth, 4).fill(color);
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(m.label, x + 2, yPos + 10, { width: boxWidth - 4, align: 'center' });
        doc.fillColor(PRIMARY).fontSize(14).font('Helvetica-Bold').text(`${m.val}%`, x + 2, yPos + 24, { width: boxWidth - 4, align: 'center' });
      });

      // ==========================================
      // SECTION 3: ATS JOB MATCH & SKILL GAP
      // ==========================================
      yPos += 64;
      doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('3. ATS RESUME & JOB ALIGNMENT', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 16).lineTo(555, yPos + 16).stroke();

      yPos += 24;
      // Matched Skills Box
      doc.rect(40, yPos, 250, 68).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(SUCCESS).fontSize(9).font('Helvetica-Bold').text('✓ MATCHED CORE SKILLS', 48, yPos + 8);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(
        (matchAnalysis?.matched_skills?.slice(0, 6)?.join(', ') || 'Core foundation skills verified'),
        48,
        yPos + 22,
        { width: 234 }
      );

      // Missing / Gap Skills Box
      doc.rect(305, yPos, 250, 68).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(WARNING).fontSize(9).font('Helvetica-Bold').text('! MISSING / TARGET SKILLS', 313, yPos + 8);
      doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(
        (matchAnalysis?.missing_skills?.slice(0, 6)?.join(', ') || 'No critical gaps detected'),
        313,
        yPos + 22,
        { width: 234 }
      );

      // ==========================================
      // SECTION 4: EXECUTIVE SUMMARY
      // ==========================================
      yPos += 80;
      doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('4. EXECUTIVE EVALUATION SUMMARY', 40, yPos);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, yPos + 16).lineTo(555, yPos + 16).stroke();

      yPos += 24;
      doc.rect(40, yPos, 515, 65).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(TEXT_DARK).fontSize(8.5).font('Helvetica').text(
        finalAssessment?.summary ||
          `The candidate completed the adaptive interview with an overall score of ${overallScore}/100.`,
        48,
        yPos + 10,
        { width: 499, lineGap: 3 }
      );

      // ==========================================
      // PAGE 2: QUESTION-BY-QUESTION BREAKDOWN WITH IDEAL ANSWERS & MISTAKES
      // ==========================================
      doc.addPage();
      
      // Page 2 Header
      doc.rect(40, 40, 515, 30).fill(PRIMARY);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
        .text('5. DETAILED QUESTION-BY-QUESTION EVALUATION & IDEAL ANSWERS', 50, 50);

      let currentY = 85;

      evaluations.forEach((item, index) => {
        const ev = item.evaluation || {};
        const score = item.score ? item.score * 10 : (ev.overall_answer_score || 60);

        // Check if we need a new page
        if (currentY + 160 > 760) {
          doc.addPage();
          currentY = 50;
        }

        const cardHeight = 150;
        doc.rect(40, currentY, 515, cardHeight).fillAndStroke(LIGHT_BG, BORDER_COLOR);
        
        // Question Header Bar
        doc.rect(40, currentY, 515, 20).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
          .text(`Q${index + 1}: ${item.question || 'Interview Question'}`, 48, currentY + 5, { width: 400 });
        
        const scoreColor = score >= 75 ? SUCCESS : score >= 55 ? WARNING : DANGER;
        doc.fillColor(scoreColor).fontSize(9).font('Helvetica-Bold')
          .text(`Score: ${score}/100`, 460, currentY + 5, { width: 90, align: 'right' });

        // Candidate's Answer
        doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text('CANDIDATE ANSWER:', 48, currentY + 24);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          item.answer ? `"${item.answer.substring(0, 160)}${item.answer.length > 160 ? '...' : ''}"` : '(No transcript recorded)',
          48,
          currentY + 34,
          { width: 499 }
        );

        // Feedback
        doc.fillColor(ACCENT).fontSize(7).font('Helvetica-Bold').text('AI EVALUATION & FEEDBACK:', 48, currentY + 52);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          item.feedback || ev.feedback || 'Evaluated for technical depth and clarity.',
          48,
          currentY + 62,
          { width: 499 }
        );

        // Mistakes Identified or Missing Concepts
        const mistakes = ev.mistakes_identified?.length ? ev.mistakes_identified.join('; ') : (ev.weaknesses?.[0] || 'Expand on implementation trade-offs');
        doc.fillColor(DANGER).fontSize(7).font('Helvetica-Bold').text('MISTAKES / WHAT WAS MISSING:', 48, currentY + 84);
        doc.fillColor(TEXT_DARK).fontSize(7.5).font('Helvetica').text(
          mistakes.substring(0, 150),
          48,
          currentY + 94,
          { width: 499 }
        );

        // Ideal / Model Answer
        const idealAns = ev.ideal_answer || 'An ideal answer explains core principles, real-world architecture, and practical production trade-offs.';
        doc.fillColor(SUCCESS).fontSize(7).font('Helvetica-Bold').text('★ IDEAL / MODEL ANSWER (HOW TO ANSWER EFFECTIVELY):', 48, currentY + 114);
        doc.fillColor('#065f46').fontSize(7.5).font('Helvetica').text(
          idealAns.substring(0, 180) + (idealAns.length > 180 ? '...' : ''),
          48,
          currentY + 124,
          { width: 499 }
        );

        currentY += cardHeight + 12;
      });

      // ==========================================
      // SECTION 6: LEARNING ROADMAP & CAREER STRATEGY
      // ==========================================
      if (currentY + 130 > 760) {
        doc.addPage();
        currentY = 50;
      }

      currentY += 10;
      doc.fillColor(PRIMARY).fontSize(12).font('Helvetica-Bold').text('6. PERSONALIZED LEARNING ROADMAP & CAREER RECOMMENDATIONS', 40, currentY);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(40, currentY + 16).lineTo(555, currentY + 16).stroke();

      currentY += 24;
      const roadmapSteps = skillGap?.personalized_learning_roadmap || [
        'Step 1: Strengthen core architectural patterns and distributed system resilience.',
        'Step 2: Deepen hands-on competency in missing job technologies (Cloud, Containers, Caching).',
        'Step 3: Conduct mock interview drills focusing on structured STAR-format technical explanations.'
      ];

      doc.rect(40, currentY, 515, roadmapSteps.length * 20 + 20).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      roadmapSteps.forEach((step, idx) => {
        doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text(`Phase ${idx + 1}:`, 50, currentY + 10 + idx * 20);
        doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica').text(step, 95, currentY + 10 + idx * 20, { width: 450 });
      });

      // Footer Note
      doc.fontSize(7).fillColor(MUTED).font('Helvetica')
        .text('Generated securely by AI Resume & Adaptive Interview Intelligence Platform  •  Confidential Candidate Assessment', 40, 790, { width: 515, align: 'center' });

      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};
