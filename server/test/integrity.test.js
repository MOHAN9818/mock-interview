import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateIntegrityAssessment,
  sanitizeAndValidateWarnings,
  INTEGRITY_CONFIG
} from '../src/services/integrityScoringService.js';

test('Integrity - Candidate completes interview without warnings', () => {
  const result = calculateIntegrityAssessment([], 85);

  assert.equal(result.integrityStatus, 'VERIFIED');
  assert.equal(result.integrityReviewRequired, false);
  assert.equal(result.warningCount, 0);
  assert.equal(result.qualifyingWarningCount, 0);
  assert.equal(result.originalScore, 85);
  assert.equal(result.integrityPenalty, 0);
  assert.equal(result.finalAdjustedScore, 85);
  assert.match(result.integrityReason, /zero qualifying warnings/i);
});

test('Integrity - Non-qualifying warnings do not count toward integrity threshold', () => {
  const rawWarnings = [
    { type: 'CAMERA_DISCONNECTED', duration: 4, explanation: 'Camera unplugged temporarily' },
    { type: 'DETECTION_UNRELIABLE', duration: 3, explanation: 'Low lighting condition' }
  ];

  const result = calculateIntegrityAssessment(rawWarnings, 80);

  assert.equal(result.warningCount, 2);
  assert.equal(result.qualifyingWarningCount, 0);
  assert.equal(result.integrityStatus, 'VERIFIED');
  assert.equal(result.integrityReviewRequired, false);
  assert.equal(result.integrityPenalty, 0);
  assert.equal(result.finalAdjustedScore, 80);
});

test('Integrity - Up to 10 qualifying warnings do not exceed threshold', () => {
  const warnings = Array.from({ length: 10 }, (_, i) => ({
    type: 'FACE_NOT_VISIBLE',
    timestamp: new Date(Date.now() + i * 30000).toISOString(),
    duration: 6,
    explanation: `Absence event ${i + 1}`
  }));

  const result = calculateIntegrityAssessment(warnings, 88);

  assert.equal(result.warningCount, 10);
  assert.equal(result.qualifyingWarningCount, 10);
  assert.equal(result.integrityStatus, 'VERIFIED');
  assert.equal(result.integrityReviewRequired, false);
  assert.equal(result.integrityPenalty, 0);
  assert.equal(result.finalAdjustedScore, 88);
});

test('Integrity - 11th qualifying warning triggers REVIEW_REQUIRED under standard policy', () => {
  const warnings = Array.from({ length: 11 }, (_, i) => ({
    type: 'FACE_NOT_VISIBLE',
    timestamp: new Date(Date.now() + i * 30000).toISOString(),
    duration: 7,
    explanation: `Absence event ${i + 1}`
  }));

  const result = calculateIntegrityAssessment(warnings, 92, { policy: 'standard' });

  assert.equal(result.warningCount, 11);
  assert.equal(result.qualifyingWarningCount, 11);
  assert.equal(result.integrityStatus, 'REVIEW_REQUIRED');
  assert.equal(result.integrityReviewRequired, true);
  // Under standard policy, score is not automatically zeroed, but flagged for review
  assert.equal(result.originalScore, 92);
  assert.equal(result.integrityPenalty, 0);
  assert.equal(result.finalAdjustedScore, 92);
  assert.match(result.integrityReason, /flagged for integrity review/i);
});

test('Integrity - Deduction policy calculates penalization while preserving original score', () => {
  const warnings = Array.from({ length: 12 }, (_, i) => ({
    type: 'FACE_NOT_VISIBLE',
    timestamp: new Date(Date.now() + i * 30000).toISOString(),
    duration: 8
  }));

  const result = calculateIntegrityAssessment(warnings, 85, { policy: 'deduction' });

  assert.equal(result.integrityStatus, 'REVIEW_REQUIRED');
  assert.equal(result.originalScore, 85);
  // Flat 20 + 2 excess * 5 = 30 deduction
  assert.equal(result.integrityPenalty, 30);
  assert.equal(result.finalAdjustedScore, 55);
});

test('Integrity - Configurable zero-score policy preserves original score for audit', () => {
  const warnings = Array.from({ length: 11 }, (_, i) => ({
    type: 'FACE_NOT_VISIBLE',
    timestamp: new Date(Date.now() + i * 30000).toISOString(),
    duration: 6
  }));

  const result = calculateIntegrityAssessment(warnings, 88, { policy: 'zero_score' });

  assert.equal(result.integrityStatus, 'REVIEW_REQUIRED');
  assert.equal(result.originalScore, 88);
  assert.equal(result.integrityPenalty, 88);
  assert.equal(result.finalAdjustedScore, 0);
  assert.match(result.integrityReason, /strict automated zero-score policy/i);
  assert.match(result.integrityReason, /Original score preserved for auditing/i);
});

test('Integrity - Sanitizes duplicate timestamps and invalid structures', () => {
  const duplicateTimestamp = new Date('2026-10-19T00:00:00Z').toISOString();
  const raw = [
    { type: 'FACE_NOT_VISIBLE', timestamp: duplicateTimestamp, duration: 5 },
    { type: 'FACE_NOT_VISIBLE', timestamp: duplicateTimestamp, duration: 5 }, // duplicate
    null,
    'invalid string entry',
    { type: 'UNKNOWN_CUSTOM_EVENT', timestamp: new Date('2026-10-19T00:01:00Z').toISOString() }
  ];

  const sanitized = sanitizeAndValidateWarnings(raw);
  assert.equal(sanitized.length, 2);
  assert.equal(sanitized[0].type, 'FACE_NOT_VISIBLE');
  assert.equal(sanitized[0].countedTowardIntegrity, true);
  assert.equal(sanitized[1].type, 'UNKNOWN_CUSTOM_EVENT');
  assert.equal(sanitized[1].countedTowardIntegrity, false);
});

test('Integrity - Server-side validation prevents spoofing countedTowardIntegrity', () => {
  // Client attempts to claim that FACE_NOT_VISIBLE should not count
  const maliciousClientPayload = [
    { type: 'FACE_NOT_VISIBLE', countedTowardIntegrity: false, duration: 10 }
  ];

  const sanitized = sanitizeAndValidateWarnings(maliciousClientPayload);
  assert.equal(sanitized[0].countedTowardIntegrity, true, 'Server must enforce countedTowardIntegrity for qualifying types');

  // Client attempts to claim that a technical disconnect should count as malpractice
  const maliciousTechPayload = [
    { type: 'CAMERA_DISCONNECTED', countedTowardIntegrity: true }
  ];
  const sanitizedTech = sanitizeAndValidateWarnings(maliciousTechPayload);
  assert.equal(sanitizedTech[0].countedTowardIntegrity, false, 'Server must not penalize technical disconnects');
});

test('Integrity - PDF Report includes integrity section and generates valid buffer', async () => {
  const { generatePdfReport } = await import('../src/services/reportService.js');
  const integrity = {
    integrityStatus: 'REVIEW_REQUIRED',
    originalScore: 85,
    finalAdjustedScore: 85,
    integrityPenalty: 0,
    qualifyingWarningCount: 11,
    warningCount: 12,
    integrityReason: 'Threshold exceeded; flagged for review.'
  };

  const buffer = await generatePdfReport(
    { candidate_name: 'Alex Developer' },
    { role: 'Senior Full Stack Engineer' },
    { OverallScore: 85 },
    {},
    [],
    integrity
  );

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
});

