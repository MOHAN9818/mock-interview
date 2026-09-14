import React from 'react';

/**
 * Visual AI Interviewer Avatar with dynamic animations for states:
 * 'speaking', 'listening', 'evaluating', 'thinking', 'idle'
 */
const AIAvatar = ({ state = 'idle', interviewerName = 'AI Interviewer' }) => {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isEvaluating = state === 'evaluating';
  const isThinking = state === 'thinking';

  // Badge configuration based on current real-time AI state
  const getBadgeConfig = () => {
    switch (state) {
      case 'speaking':
        return {
          text: 'AI Asking Question...',
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400 animate-ping'
        };
      case 'listening':
        return {
          text: 'Listening to Candidate...',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400 animate-pulse'
        };
      case 'evaluating':
        return {
          text: 'Evaluating Answer Depth...',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400 animate-spin'
        };
      case 'thinking':
        return {
          text: 'Synthesizing Next Question...',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400 animate-bounce'
        };
      default:
        return {
          text: 'Waiting for Candidate',
          bg: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
          dot: 'bg-slate-500'
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[220px] rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-900/90 border border-slate-800/80 p-6 overflow-hidden shadow-inner">
      {/* Background ambient lighting */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isSpeaking
            ? 'bg-cyan-500/10'
            : isListening
            ? 'bg-emerald-500/10'
            : isEvaluating
            ? 'bg-amber-500/10'
            : 'bg-transparent'
        }`}
      />

      {/* Dynamic Status Indicator Badge */}
      <div className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium backdrop-blur-md ${badge.bg}`}>
        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
        <span>{badge.text}</span>
      </div>

      <div className="absolute top-4 right-4 z-10 text-xs font-semibold tracking-wider uppercase text-slate-400">
        {interviewerName}
      </div>

      {/* Avatar Central Visual */}
      <div className="relative flex items-center justify-center my-auto">
        {/* Outer Pulsing Aura Rings */}
        <div
          className={`absolute w-36 h-36 rounded-full transition-all duration-700 ${
            isSpeaking
              ? 'border-2 border-cyan-400/50 animate-ping opacity-30'
              : isListening
              ? 'border-2 border-emerald-400/50 animate-ping opacity-30'
              : isEvaluating
              ? 'border-2 border-amber-400/50 animate-spin opacity-40'
              : 'opacity-0 scale-90'
          }`}
        />
        
        <div
          className={`absolute w-32 h-32 rounded-full transition-all duration-500 blur-sm ${
            isSpeaking
              ? 'bg-cyan-500/20'
              : isListening
              ? 'bg-emerald-500/20'
              : isEvaluating
              ? 'bg-amber-500/20'
              : 'bg-slate-800/20'
          }`}
        />

        {/* AI Interviewer Avatar Core */}
        <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden group">
          <svg className="w-14 h-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z"
              className="opacity-30 fill-slate-800"
            />
            <circle cx="9" cy="8" r="1.5" className={`fill-current transition-colors duration-300 ${isSpeaking ? 'text-cyan-400' : isListening ? 'text-emerald-400' : 'text-slate-400'}`} />
            <circle cx="15" cy="8" r="1.5" className={`fill-current transition-colors duration-300 ${isSpeaking ? 'text-cyan-400' : isListening ? 'text-emerald-400' : 'text-slate-400'}`} />
            <path
              strokeLinecap="round"
              d="M9 8h6"
              className={`transition-colors duration-300 ${isSpeaking ? 'text-cyan-400' : isListening ? 'text-emerald-400' : 'text-slate-600'}`}
            />
            {isSpeaking ? (
              <path strokeLinecap="round" d="M8 13c1.5 2 6.5 2 8 0" className="stroke-cyan-300 stroke-2 animate-pulse" />
            ) : isListening ? (
              <path strokeLinecap="round" d="M9 13h6" className="stroke-emerald-300 stroke-2 animate-pulse" />
            ) : (
              <path strokeLinecap="round" d="M10 13h4" className="stroke-slate-500" />
            )}
          </svg>
        </div>
      </div>

      {/* Voice Waveform Equalizer during speech */}
      <div className="flex items-center justify-center gap-1.5 h-6 mt-3 z-10">
        {[40, 75, 90, 60, 85, 50, 95, 65, 45].map((h, i) => (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-200 ${
              isSpeaking
                ? 'bg-cyan-400 animate-pulse'
                : isListening
                ? 'bg-emerald-400 animate-pulse'
                : isEvaluating
                ? 'bg-amber-400/50'
                : 'bg-slate-700/50'
            }`}
            style={{
              height: isSpeaking ? `${(i % 3 + 1) * 6 + 6}px` : isListening ? `${(i % 2 + 1) * 4 + 4}px` : '4px',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AIAvatar;
