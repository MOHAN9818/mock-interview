import { useState, useEffect, useRef, useCallback } from 'react';
import * as mpFace from '@mediapipe/face_detection';

const FaceDetectionClass = mpFace.FaceDetection || mpFace.default?.FaceDetection || window.FaceDetection;

/**
 * Camera Monitoring & Face Detection Hook
 *
 * Configurable browser-side face tracking with absence timing, cooldown enforcement,
 * technical fault isolation, and full integrity threshold tracking.
 */
export const useCameraMonitoring = ({
  videoRef,
  cameraOn = false,
  isInterviewActive = true,
  faceAbsenceThresholdMs = 6000, // 6 seconds continuous absence threshold
  warningCooldownMs = 12000,     // 12 seconds cooldown between warnings
  detectionIntervalMs = 600,     // 600ms interval for balanced CPU utilization
  maxQualifyingWarnings = 10     // 10 warnings threshold
}) => {
  const [faceDetected, setFaceDetected] = useState(null); // null = unknown/initializing
  const [detectionStatus, setDetectionStatus] = useState('idle'); // 'idle' | 'initializing' | 'active' | 'face_missing' | 'cooldown' | 'unreliable' | 'camera_off' | 'camera_error'
  const [warnings, setWarnings] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  // Internal refs to preserve values across renders without re-triggers
  const absenceStartTimeRef = useRef(null);
  const lastWarningTimeRef = useRef(0);
  const detectorRef = useRef(null);
  const isDetectorReadyRef = useRef(false);
  const isProcessingFrameRef = useRef(false);
  const intervalIdRef = useRef(null);
  const consecutiveFailuresRef = useRef(0);
  const warnedThisAbsenceRef = useRef(false);

  // Qualifying warning count calculation
  const qualifyingCount = warnings.filter((w) => w.countedTowardIntegrity).length;
  const isThresholdExceeded = qualifyingCount > maxQualifyingWarnings;

  const dismissNotification = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const addWarning = useCallback((warningData) => {
    setWarnings((prev) => {
      // Avoid duplicate consecutive warning types within 2 seconds
      const last = prev[prev.length - 1];
      if (last && last.type === warningData.type && Date.now() - new Date(last.timestamp).getTime() < 2000) {
        return prev;
      }

      const warningNumber = prev.length + 1;
      const fullWarning = {
        warningNumber,
        type: warningData.type,
        timestamp: new Date().toISOString(),
        duration: warningData.duration || 0,
        explanation: warningData.explanation || '',
        countedTowardIntegrity: Boolean(warningData.countedTowardIntegrity)
      };

      const nextList = [...prev, fullWarning];
      const newQualifying = nextList.filter((w) => w.countedTowardIntegrity).length;

      if (warningData.countedTowardIntegrity) {
        if (newQualifying > maxQualifyingWarnings) {
          setActiveNotification({
            type: 'danger',
            title: 'Monitoring Threshold Exceeded',
            message: 'Your interview has exceeded the permitted camera-monitoring warning threshold. The session has been flagged for integrity review.'
          });
        } else {
          setActiveNotification({
            type: 'warning',
            title: `Camera Warning (${newQualifying}/${maxQualifyingWarnings})`,
            message: 'Your face has not been detected for several seconds. Please check your camera and return to the interview screen.'
          });
        }
      } else {
        // Non-qualifying / technical alert
        setActiveNotification({
          type: 'info',
          title: 'Camera Device Notice',
          message: warningData.explanation || 'Camera status update.'
        });
      }

      return nextList;
    });
  }, [maxQualifyingWarnings]);

  // Initialize MediaPipe Face Detection
  useEffect(() => {
    let isMounted = true;

    if (!FaceDetectionClass) {
      console.warn('FaceDetection library is not available; falling back.');
      setDetectionStatus('unreliable');
      return;
    }

    try {
      const faceDetection = new FaceDetectionClass({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });

      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      });

      faceDetection.onResults((results) => {
        if (!isMounted) return;
        isProcessingFrameRef.current = false;

        const hasFace = Array.isArray(results?.detections) && results.detections.length > 0;
        const now = Date.now();

        if (hasFace) {
          setFaceDetected(true);
          setDetectionStatus('active');
          consecutiveFailuresRef.current = 0;
          absenceStartTimeRef.current = null;
          warnedThisAbsenceRef.current = false;
        } else {
          setFaceDetected(false);
          setDetectionStatus('face_missing');

          if (!absenceStartTimeRef.current) {
            absenceStartTimeRef.current = now;
          }

          const absenceDuration = now - absenceStartTimeRef.current;
          const timeSinceLastWarning = now - lastWarningTimeRef.current;

          // Trigger warning if continuous absence exceeds threshold and cooldown has elapsed
          if (
            absenceDuration >= faceAbsenceThresholdMs &&
            timeSinceLastWarning >= warningCooldownMs &&
            !warnedThisAbsenceRef.current
          ) {
            lastWarningTimeRef.current = now;
            warnedThisAbsenceRef.current = true; // Avoid duplicate warning for same continuous event

            addWarning({
              type: 'FACE_NOT_VISIBLE',
              duration: Math.round(absenceDuration / 1000),
              explanation: 'Candidate face was not detected in camera view for continuous threshold period.',
              countedTowardIntegrity: true
            });
          }
        }
      });

      detectorRef.current = faceDetection;
      isDetectorReadyRef.current = true;
    } catch (err) {
      console.warn('MediaPipe initialization warning:', err);
      setDetectionStatus('unreliable');
      addWarning({
        type: 'DETECTION_UNRELIABLE',
        duration: 0,
        explanation: 'Local face detection service degraded. Technical notice: no penalty applied.',
        countedTowardIntegrity: false
      });
    }

    return () => {
      isMounted = false;
      isDetectorReadyRef.current = false;
      if (detectorRef.current && typeof detectorRef.current.close === 'function') {
        try {
          detectorRef.current.close();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [faceAbsenceThresholdMs, warningCooldownMs, addWarning]);

  // Continuous frame evaluation loop
  useEffect(() => {
    if (!cameraOn || !isInterviewActive) {
      setDetectionStatus(cameraOn ? 'idle' : 'camera_off');
      setFaceDetected(null);
      absenceStartTimeRef.current = null;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    const processTick = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      if (isProcessingFrameRef.current) {
        return; // Skip if previous frame still processing
      }

      if (detectorRef.current && isDetectorReadyRef.current) {
        try {
          isProcessingFrameRef.current = true;
          await detectorRef.current.send({ image: video });
        } catch (err) {
          isProcessingFrameRef.current = false;
          consecutiveFailuresRef.current += 1;

          if (consecutiveFailuresRef.current > 5) {
            setDetectionStatus('unreliable');
          }
        }
      }
    };

    intervalIdRef.current = setInterval(processTick, detectionIntervalMs);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [cameraOn, isInterviewActive, detectionIntervalMs, videoRef]);

  // Monitor video track disconnection
  useEffect(() => {
    if (!cameraOn || !videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject;
    const videoTracks = stream.getVideoTracks();

    const handleTrackEnded = () => {
      setDetectionStatus('camera_error');
      addWarning({
        type: 'CAMERA_DISCONNECTED',
        duration: 0,
        explanation: 'Camera feed was disconnected or muted by system.',
        countedTowardIntegrity: false
      });
    };

    videoTracks.forEach((track) => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      videoTracks.forEach((track) => {
        track.removeEventListener('ended', handleTrackEnded);
      });
    };
  }, [cameraOn, videoRef, addWarning]);

  const resetMonitoring = useCallback(() => {
    setWarnings([]);
    setFaceDetected(null);
    setActiveNotification(null);
    absenceStartTimeRef.current = null;
    lastWarningTimeRef.current = 0;
    warnedThisAbsenceRef.current = false;
  }, []);

  return {
    faceDetected,
    detectionStatus,
    warnings,
    qualifyingCount,
    totalWarningCount: warnings.length,
    isThresholdExceeded,
    activeNotification,
    dismissNotification,
    resetMonitoring,
    addWarning
  };
};
