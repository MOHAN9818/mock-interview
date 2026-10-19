/**
 * Authoritative Server-Side Integrity & Camera Monitoring Evaluation Service
 *
 * Implements configurable policies for warning threshold validation,
 * malpractice-risk classification, and score adjustments.
 *
 * IMPORTANT:
 * - Authoritative calculations are strictly performed on the backend.
 * - The system does not treat camera warnings as definitive proof of cheating.
 * - Preserves the original technical/answer score for auditability.
 */

export const INTEGRITY_CONFIG = {
  // Number of qualifying warnings allowed before triggering review
  QUALIFYING_THRESHOLD: 10,

  // Default policy: 'standard' (flag for review, 0 penalty),
  // 'deduction' (percentage/point deduction), or 'zero_score' (policy-based zero score)
  POLICY: process.env.INTEGRITY_PENALTY_POLICY || 'standard',

  // Configurable deductions if 'deduction' policy is enabled
  FLAT_PENALTY: Number(process.env.INTEGRITY_FLAT_PENALTY || 20),
  PER_WARNING_PENALTY: Number(process.env.INTEGRITY_PER_WARNING_PENALTY || 5),

  // Recognized warning categories
  WARNING_TYPES: {
    FACE_NOT_VISIBLE: {
      type: 'FACE_NOT_VISIBLE',
      description: 'Candidate face was absent from camera view for continuous threshold period.',
      isQualifying: true
    },
    CAMERA_DISCONNECTED: {
      type: 'CAMERA_DISCONNECTED',
      description: 'Camera video feed was disconnected, muted, or hardware became unavailable.',
      isQualifying: false // Technical camera issues do not count as malpractice
    },
    DETECTION_UNRELIABLE: {
      type: 'DETECTION_UNRELIABLE',
      description: 'Browser face detection model or lighting conditions temporarily degraded.',
      isQualifying: false // Technical monitoring failures do not count against candidate
    }
  }
};

/**
 * Validates and sanitizes warning events received from client.
 * Discards duplicates, verifies valid types, and ensures proper qualifying flags.
 */
export const sanitizeAndValidateWarnings = (rawWarnings = []) => {
  if (!Array.isArray(rawWarnings)) {
    return [];
  }

  const sanitized = [];
  const seenTimestamps = new Set();

  rawWarnings.forEach((w, index) => {
    if (!w || typeof w !== 'object') return;

    const rawType = String(w.type || '').toUpperCase();
    const typeDef = INTEGRITY_CONFIG.WARNING_TYPES[rawType] || {
      type: rawType || 'UNKNOWN_WARNING',
      description: w.explanation || 'Unspecified camera monitoring event',
      isQualifying: false
    };

    // Prevent duplicate event submission at identical millisecond timestamps
    const timestampStr = w.timestamp ? new Date(w.timestamp).toISOString() : new Date().toISOString();
    const dedupeKey = `${typeDef.type}_${timestampStr}`;
    if (seenTimestamps.has(dedupeKey)) return;
    seenTimestamps.add(dedupeKey);

    sanitized.push({
      warningNumber: sanitized.length + 1,
      type: typeDef.type,
      timestamp: new Date(timestampStr),
      duration: Math.max(0, Number(w.duration) || 0),
      explanation: w.explanation || typeDef.description,
      // Authoritatively determine whether this counts toward integrity threshold
      countedTowardIntegrity: Boolean(typeDef.isQualifying)
    });
  });

  return sanitized;
};

/**
 * Authoritatively calculates integrity status, penalties, and adjusted score.
 *
 * @param {Array} rawWarnings - List of warning events reported by client
 * @param {number} originalScore - Original technical assessment score (0-100)
 * @param {Object} options - Optional config overrides (e.g. for testing)
 * @returns {Object} Full integrity assessment result
 */
export const calculateIntegrityAssessment = (rawWarnings = [], originalScore = 0, options = {}) => {
  const threshold = options.threshold !== undefined ? options.threshold : INTEGRITY_CONFIG.QUALIFYING_THRESHOLD;
  const policy = options.policy || INTEGRITY_CONFIG.POLICY;

  const validOriginalScore = Math.min(100, Math.max(0, Math.round(Number(originalScore) || 0)));
  const sanitizedWarnings = sanitizeAndValidateWarnings(rawWarnings);

  const totalWarnings = sanitizedWarnings.length;
  const qualifyingWarnings = sanitizedWarnings.filter((w) => w.countedTowardIntegrity);
  const qualifyingCount = qualifyingWarnings.length;

  const thresholdExceeded = qualifyingCount > threshold;
  const integrityStatus = thresholdExceeded ? 'REVIEW_REQUIRED' : 'VERIFIED';
  const integrityReviewRequired = thresholdExceeded;

  let integrityPenalty = 0;
  let reason = '';

  if (!thresholdExceeded) {
    integrityPenalty = 0;
    if (qualifyingCount === 0) {
      reason = 'Candidate maintained continuous camera visibility. Integrity verified with zero qualifying warnings.';
    } else {
      reason = `Candidate accumulated ${qualifyingCount} qualifying warning(s), within permitted threshold of ${threshold}. No integrity penalty applied.`;
    }
  } else {
    // Threshold exceeded (> 10 warnings, starting on the 11th warning)
    const excess = qualifyingCount - threshold;

    if (policy === 'zero_score') {
      integrityPenalty = validOriginalScore;
      reason = `Policy outcome: Exceeded qualifying warning threshold (${qualifyingCount}/${threshold} warnings). In accordance with the strict automated zero-score policy, adjusted score set to 0. Session flagged for integrity review. Original score preserved for auditing.`;
    } else if (policy === 'deduction') {
      const computedDeduction = INTEGRITY_CONFIG.FLAT_PENALTY + excess * INTEGRITY_CONFIG.PER_WARNING_PENALTY;
      integrityPenalty = Math.min(validOriginalScore, Math.round(computedDeduction));
      reason = `Policy outcome: Exceeded qualifying warning threshold (${qualifyingCount}/${threshold} warnings). Deducted ${integrityPenalty} points per policy. Session flagged for integrity review.`;
    } else {
      // Standard / Recommended policy: Flag for human review, no automatic score destruction
      integrityPenalty = 0;
      reason = `The session exceeded the qualifying warning threshold (${qualifyingCount}/${threshold} warnings) and has been flagged for integrity review. Original technical score remains intact pending reviewer inspection.`;
    }
  }

  const finalAdjustedScore = Math.max(0, validOriginalScore - integrityPenalty);

  return {
    integrityStatus,
    integrityReviewRequired,
    warningCount: totalWarnings,
    qualifyingWarningCount: qualifyingCount,
    integrityWarnings: sanitizedWarnings,
    originalScore: validOriginalScore,
    technicalScore: validOriginalScore,
    integrityPenalty,
    finalAdjustedScore,
    integrityReason: reason,
    integrityPolicy: policy,
    threshold
  };
};
