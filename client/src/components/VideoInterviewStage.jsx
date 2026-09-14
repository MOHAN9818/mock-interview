import React, { useRef, useEffect } from 'react';
import AIAvatar from './AIAvatar';

/**
 * Integrated Video Interview Room
 * Incorporates:
 * - AI Interviewer Avatar representation with active states
 * - Live Candidate Webcam with preview controls
 * - Live Question Overlay Card ("Question X of N", Category, Difficulty)
 * - Candidate Answer Area (Transcript + Text Editing)
 * - Real-time Voice Capture Controls & Multi-state Submit Button
 */
const VideoInterviewStage = ({
  questionNumber = 1,
  totalQuestions = 5,
  currentQuestion = '',
  questionCategory = 'General',
  questionDifficulty = 'Medium',
  currentAnswer = '',
  onAnswerChange,
  onSubmitAnswer,
  onStartVoice,
  isListening = false,
  isLoading = false,
  cameraOn = false,
  onToggleCamera,
  aiState = 'idle',
  interviewerName = 'Senior AI Interviewer',
  onReplayQuestion,
  isCompleted = false
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let activeStream = null;
    if (cameraOn && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then((stream) => {
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('Webcam stream error:', err);
        });
    } else if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraOn]);

  // Determine Submit Button status & label
  const getSubmitButtonConfig = () => {
    if (isLoading) {
      return {
        label: 'Evaluating Answer & Reasoning...',
        disabled: true,
        className: 'bg-amber-600/80 text-white cursor-wait animate-pulse'
      };
    }
    if (isListening) {
      return {
        label: 'Recording in Progress...',
        disabled: false,
        className: 'bg-emerald-600 hover:bg-emerald-500 text-white'
      };
    }
    if (!currentAnswer.trim()) {
      return {
        label: 'Submit Answer',
        disabled: true,
        className: 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
      };
    }
    return {
      label: 'Submit Answer',
      disabled: false,
      className: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
    };
  };

  const submitBtn = getSubmitButtonConfig();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Video Stage Layout: Dual Screen (AI Interviewer + Candidate Camera) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl relative overflow-hidden">
        
        {/* Left Video Cell: AI Interviewer Virtual Stream */}
        <div className="relative rounded-xl overflow-hidden min-h-[260px] flex flex-col">
          <AIAvatar state={aiState} interviewerName={interviewerName} />
          
          {/* Quick Action overlay for speech replay */}
          {currentQuestion && (
            <button
              onClick={onReplayQuestion}
              title="Replay Question Audio"
              className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-cyan-400 backdrop-blur-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <span>Replay Audio</span>
            </button>
          )}
        </div>

        {/* Right Video Cell: Candidate Webcam Stream */}
        <div className="relative rounded-xl overflow-hidden min-h-[260px] bg-slate-900 border border-slate-800/80 flex items-center justify-center">
          {cameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
              <svg className="w-12 h-12 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <p className="text-sm font-medium">Candidate Camera Off</p>
              <p className="text-xs text-slate-600 max-w-xs">Enable camera to simulate a genuine face-to-face AI video interview.</p>
            </div>
          )}

          {/* Camera Header Badge & Toggle Button */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-medium text-slate-300 backdrop-blur-sm">
            <span className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span>Candidate (You)</span>
          </div>

          <button
            onClick={onToggleCamera}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 backdrop-blur-sm transition-all"
          >
            {cameraOn ? 'Turn Off Cam' : 'Enable Camera'}
          </button>
        </div>

        {/* Live Active Question Overlay Inside the Video Stage Container */}
        <div className="col-span-1 lg:col-span-2 rounded-xl bg-slate-900/95 border border-cyan-500/30 p-5 shadow-lg backdrop-blur-md mt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider">
                Question {questionNumber} of {totalQuestions}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {questionCategory}
              </span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
              questionDifficulty?.toLowerCase() === 'hard'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : questionDifficulty?.toLowerCase() === 'easy'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              Difficulty: {questionDifficulty}
            </span>
          </div>

          <h3 className="text-lg md:text-xl font-semibold text-slate-100 leading-relaxed">
            {currentQuestion || 'Preparing your personalized interview question...'}
          </h3>
        </div>
      </div>

      {/* Answer & Submission Interaction Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-slate-200">Your Answer / Spoken Transcript</h4>
            {isListening && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Transcribing Speech...
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>

        {/* Real-time editable answer textarea */}
        <textarea
          rows={5}
          disabled={isLoading || isCompleted}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Speak using the microphone or type your technical response here in detail..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 transition-colors"
        />

        {/* Controls: Voice Toggle + Multi-State Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onStartVoice}
            disabled={isLoading || isCompleted}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            } disabled:opacity-50`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>{isListening ? 'Stop Speaking' : '🎤 Speak Answer'}</span>
          </button>

          <button
            type="button"
            onClick={onSubmitAnswer}
            disabled={submitBtn.disabled}
            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${submitBtn.className}`}
          >
            {submitBtn.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoInterviewStage;
