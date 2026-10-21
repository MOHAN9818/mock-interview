import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import HistoryPage from './HistoryPage';
import ResumeJdSetup from './components/ResumeJdSetup';
import VideoInterviewStage from './components/VideoInterviewStage';
import InterviewDashboard from './components/InterviewDashboard';

const AuthPage = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, form);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onAuth(response.data.user);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Backend may be waking up on Render (~30-50s). Please try again in a few moments.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to reach server. If the backend is on a free tier, it may be waking up. Please retry shortly.');
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            AI
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">AI Mock Interview</h1>
            <p className="text-xs text-cyan-400 font-medium">Adaptive RAG-Grounded Intelligence Platform</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          {isLogin ? 'Sign in to access your AI interview workspace.' : 'Create an account to start practice mock interviews.'}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Email Address</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              placeholder="candidate@example.com"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Password</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              placeholder="••••••••"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold p-3 text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? "Don't have an account? Create one" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  // Phase control: 'setup' | 'interview' | 'results'
  const [currentPhase, setCurrentPhase] = useState('setup');
  const [setup, setSetup] = useState({ role: '', difficulty: 'Medium', type: 'Technical', maxQuestions: 5 });

  // Data states
  const [resumeStructured, setResumeStructured] = useState(null);
  const [resumeQuality, setResumeQuality] = useState(null);
  const [jdStructured, setJdStructured] = useState(null);
  const [matchScore, setMatchScore] = useState(null);

  // Live Interview States
  const [conversation, setConversation] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionCategory, setQuestionCategory] = useState('Introduction');
  const [questionDifficulty, setQuestionDifficulty] = useState('Medium');
  const [adaptationReason, setAdaptationReason] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [aiState, setAiState] = useState('idle'); // 'speaking' | 'listening' | 'evaluating' | 'thinking' | 'idle'

  // Media & Voice states
  const [isListening, setIsListening] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Assessment results
  const [detailedFeedback, setDetailedFeedback] = useState([]);
  const [finalAssessment, setFinalAssessment] = useState(null);
  const [skillGap, setSkillGap] = useState(null);
  const [history, setHistory] = useState([]);
  const [sessionWarnings, setSessionWarnings] = useState([]);
  const [integrityResult, setIntegrityResult] = useState(null);

  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Load history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await api.get('/interviews/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(response.data.interviews || []);
      } catch (err) {
        console.error('History fetch error:', err);
      }
    };
    fetchHistory();
  }, []);

  // Text-To-Speech for AI Interviewer Voice (Browser SpeechSynthesis)
  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setAiState('speaking');
    utterance.onend = () => setAiState('idle');
    utterance.onerror = () => setAiState('idle');

    window.speechSynthesis.speak(utterance);
  };

  // Resume Upload Handler
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsLoading(true);
      setError('');

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(file);
      });

      const response = await api.post(
        '/interviews/parse-resume',
        {
          fileName: file.name,
          mimeType: file.type,
          fileContent: base64
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        setResumeStructured(response.data.structuredData);
        setResumeQuality(response.data.resumeQuality);
        if (response.data.role && !setup.role) {
          setSetup((prev) => ({ ...prev, role: response.data.role }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error parsing resume document.');
    } finally {
      setIsLoading(false);
    }
  };

  // JD Analysis & Matching Handler
  const handleAnalyzeJd = async (jdText) => {
    if (!jdText?.trim() || !resumeStructured) {
      setError('Please upload and extract a resume first.');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const jdResp = await api.post(
        '/interviews/analyze-jd',
        { jdText },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const structuredJd = jdResp.data.structuredJd;
      setJdStructured(structuredJd);

      const matchResp = await api.post(
        '/interviews/match-job',
        { resumeStructured, jdStructured: structuredJd },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMatchScore(matchResp.data.matchResult);
      if (structuredJd?.role) {
        setSetup((prev) => ({ ...prev, role: structuredJd.role }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error analyzing and matching job description.');
    } finally {
      setIsLoading(false);
    }
  };

  // Launch AI Video Interview (with RAG Grounding)
  const startInterview = async () => {
    if (!resumeStructured) {
      setError('Please upload and analyze a resume first.');
      return;
    }
    setError('');
    setIsLoading(true);
    setAiState('thinking');
    setDetailedFeedback([]);
    setFinalAssessment(null);
    setSkillGap(null);
    setConversation([]);
    setCurrentAnswer('');
    setSessionWarnings([]);
    setIntegrityResult(null);

    try {
      const response = await api.post(
        '/interviews/ai-session',
        {
          resumeStructured,
          jdStructured,
          difficulty: setup.difficulty,
          type: setup.type,
          conversation: [],
          currentAnswer: ''
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const assistantMessage = { role: 'assistant', content: response.data.question };
      setConversation([assistantMessage]);
      setCurrentQuestion(response.data.question);
      setQuestionCategory(response.data.category || 'Architecture & Experience');
      setQuestionDifficulty(response.data.difficulty || setup.difficulty);
      setAdaptationReason(response.data.adaptationReason || '');
      setQuestionNumber(1);
      setCurrentPhase('interview');

      speakText(response.data.question);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to launch the AI interview session.');
      setAiState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Answer & Adaptively Progress
  const submitAnswer = async () => {
    if (!currentAnswer.trim() || isLoading) return;

    const maxQuestions = Math.max(1, Math.min(10, Number(setup.maxQuestions || 5)));
    const nextQuestionNumber = questionNumber + 1;
    setError('');
    setIsLoading(true);
    setAiState('evaluating');

    // Stop listening if speech recognition was active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      const nextConversation = [
        ...conversation,
        { role: 'user', content: currentAnswer.trim() }
      ];

      // If finished all questions, finalize the interview
      if (nextQuestionNumber > maxQuestions) {
        await finalizeInterview(nextConversation);
        return;
      }

      setAiState('thinking');
      const response = await api.post(
        '/interviews/ai-session',
        {
          resumeStructured,
          jdStructured,
          difficulty: setup.difficulty,
          type: setup.type,
          conversation: nextConversation,
          currentAnswer: currentAnswer.trim()
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const assistantMessage = { role: 'assistant', content: response.data.question };
      setConversation([...nextConversation, assistantMessage]);
      setCurrentQuestion(response.data.question);
      setQuestionCategory(response.data.category || 'Technical Evaluation');
      setQuestionDifficulty(response.data.difficulty || questionDifficulty);
      setAdaptationReason(response.data.adaptationReason || '');
      setQuestionNumber(nextQuestionNumber);
      setCurrentAnswer('');

      speakText(response.data.question);
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing your answer. Please try submitting again.');
      setAiState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Finalize Session & Generate Intelligence Report
  const finalizeInterview = async (fullConversation) => {
    setAiState('evaluating');
    const questions = [];
    for (let i = 0; i < fullConversation.length; i += 2) {
      const q = fullConversation[i];
      const a = fullConversation[i + 1];
      if (q?.role === 'assistant' && a?.role === 'user') {
        questions.push({ question: q.content, answer: a.content });
      }
    }

    try {
      const response = await api.post(
        '/interviews/submit',
        {
          role: setup.role,
          difficulty: setup.difficulty,
          type: setup.type,
          questions,
          resumeStructured,
          jdStructured,
          resumeQuality,
          matchScore,
          integrityWarnings: sessionWarnings
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      setHistory((prev) => [response.data.interview, ...prev]);
      setFinalAssessment(response.data.finalAssessment);
      setSkillGap(response.data.skillGap);
      setDetailedFeedback(response.data.interview?.questions || []);
      setIntegrityResult(response.data.integrity || response.data.interview);
      setCurrentPhase('results');
      setAiState('idle');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save and finalize the session.');
      setAiState('idle');
    }
  };

  // Voice Input via Browser Web Speech API
  const handleStartVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setAiState('idle');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or type your answer.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setAiState('listening');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setCurrentAnswer((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setAiState('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      setAiState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Download PDF Report
  const handleDownloadPdf = async () => {
    try {
      const response = await api.post(
        '/interviews/generate-pdf',
        {
          candidateProfile: resumeStructured,
          matchAnalysis: { ...matchScore, role: setup.role },
          finalAssessment,
          skillGap,
          evaluations: detailedFeedback,
          integrity: integrityResult
        },
        {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Interview_Assessment_${user?.name?.replace(/\s+/g, '_') || 'Candidate'}.pdf`;
      link.click();
    } catch (err) {
      setError('Failed to generate executive PDF report.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Navigation & User Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
              AI
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">AI Resume & Adaptive Interview Intelligence</h2>
              <p className="text-xs text-slate-400">
                Welcome back, <span className="text-cyan-400 font-medium">{user?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              <span>Performance Analytics</span>
            </button>

            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 font-bold">✕</button>
          </div>
        )}

        {/* Main Content Router based on State Phase */}
        {currentPhase === 'setup' && (
          <ResumeJdSetup
            onFileUpload={handleResumeUpload}
            onAnalyzeJd={handleAnalyzeJd}
            onStartInterview={startInterview}
            resumeStructured={resumeStructured}
            resumeQuality={resumeQuality}
            jdStructured={jdStructured}
            matchScore={matchScore}
            setup={setup}
            setSetup={setSetup}
            isLoading={isLoading}
            error={error}
          />
        )}

        {currentPhase === 'interview' && (
          <VideoInterviewStage
            questionNumber={questionNumber}
            totalQuestions={Number(setup.maxQuestions || 5)}
            currentQuestion={currentQuestion}
            questionCategory={questionCategory}
            questionDifficulty={questionDifficulty}
            adaptationReason={adaptationReason}
            currentAnswer={currentAnswer}
            onAnswerChange={setCurrentAnswer}
            onSubmitAnswer={submitAnswer}
            onStartVoice={handleStartVoice}
            isListening={isListening}
            isLoading={isLoading}
            cameraOn={cameraOn}
            onToggleCamera={() => setCameraOn(!cameraOn)}
            aiState={aiState}
            onReplayQuestion={() => speakText(currentQuestion)}
            isCompleted={false}
            onWarningsChange={setSessionWarnings}
          />
        )}

        {currentPhase === 'results' && (
          <InterviewDashboard
            finalAssessment={finalAssessment}
            skillGap={skillGap}
            detailedFeedback={detailedFeedback}
            onDownloadPdf={handleDownloadPdf}
            onRestart={() => {
              setCurrentPhase('setup');
              setCurrentQuestion('');
              setCurrentAnswer('');
              setConversation([]);
              setSessionWarnings([]);
              setIntegrityResult(null);
            }}
            resumeQuality={resumeQuality}
            matchScore={matchScore}
            integrity={integrityResult}
            sessionWarnings={sessionWarnings}
          />
        )}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const handleAuth = (currentUser) => setUser(currentUser);
  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <AuthPage onAuth={handleAuth} />}
      />
      <Route
        path="/history"
        element={user ? <HistoryPage user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
