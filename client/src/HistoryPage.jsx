import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const api = axios.create({ baseURL: '/api' });

const HistoryPage = ({ user, onLogout }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/interviews/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const fetched = response.data.interviews || [];
        setHistory(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Format data for the chart: chronological order (0-100 scale)
  const chartData = [...history].reverse().map((interview, index) => ({
    name: `Session ${index + 1}`,
    score: interview.totalScore > 10 ? interview.totalScore : interview.totalScore * 10,
    role: interview.role,
    date: new Date(interview.createdAt).toLocaleDateString()
  }));

  const averageScore = history.length
    ? Math.round(
        history.reduce(
          (sum, item) => sum + (item.totalScore > 10 ? item.totalScore : item.totalScore * 10),
          0
        ) / history.length
      )
    : 0;

  const downloadSessionPdf = async (interview) => {
    try {
      const response = await api.post(
        '/interviews/generate-pdf',
        {
          candidateProfile: interview.candidateProfile || { candidate_name: user?.name },
          matchAnalysis: interview.matchScore || { role: interview.role },
          finalAssessment: interview.finalAssessment || { OverallScore: interview.totalScore },
          skillGap: interview.skillGap || {},
          evaluations: interview.questions || []
        },
        { responseType: 'blob', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Interview_Report_${new Date(interview.createdAt).toISOString().slice(0, 10)}.pdf`;
      link.click();
    } catch (err) {
      alert('Failed to generate PDF for this session.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Intelligence & Progress</span>
            <h2 className="text-2xl font-bold text-slate-100 mt-1">{user?.name || 'Candidate'}'s Performance Journey</h2>
            <p className="text-xs text-slate-400">Track benchmark score progression and review question-level AI evaluations.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              Back to Interview Studio
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-slate-400 animate-pulse text-sm">Loading historical analytics...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-12 text-center shadow-xl">
            <h3 className="text-xl font-bold text-slate-200">No Past Interview Sessions Recorded</h3>
            <p className="mt-2 text-sm text-slate-400">Launch your first AI mock interview to build your performance profile.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all"
            >
              Launch First Interview
            </button>
          </div>
        ) : (
          <>
            {/* Top Row: Score Growth Chart & Metrics */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center justify-between">
                  <span>Performance Benchmark Trend</span>
                  <span className="text-xs font-normal text-slate-400">0 - 100 Scale</span>
                </h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#06b6d4' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 8, fill: '#06b6d4' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Interviews</p>
                  <p className="mt-2 text-4xl font-extrabold text-slate-100">{history.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-lg flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Benchmark</p>
                  <p className="mt-2 text-4xl font-extrabold text-emerald-400">{averageScore}/100</p>
                </div>
              </div>
            </div>

            {/* Detailed Sessions Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 mb-4">Completed Interview Sessions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">Date</th>
                      <th className="pb-3 pr-4 font-semibold">Role / Target Position</th>
                      <th className="pb-3 pr-4 font-semibold">Difficulty</th>
                      <th className="pb-3 pr-4 font-semibold">Questions</th>
                      <th className="pb-3 pr-4 font-semibold text-center">Score</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((item) => {
                      const displayScore = item.totalScore > 10 ? item.totalScore : item.totalScore * 10;
                      return (
                        <tr key={item._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 pr-4 text-slate-300 text-xs">
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-4 pr-4 font-semibold text-slate-100">
                            {item.role}
                          </td>
                          <td className="py-4 pr-4 text-slate-400 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">{item.difficulty}</span>
                          </td>
                          <td className="py-4 pr-4 text-slate-400 text-xs">
                            {item.questions?.length || 0} Questions
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-bold text-xs ${
                              displayScore >= 75 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : displayScore >= 55 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {displayScore}/100
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedSession(selectedSession?._id === item._id ? null : item)}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                            >
                              {selectedSession?._id === item._id ? 'Close' : 'View Q&A'}
                            </button>
                            <button
                              onClick={() => downloadSessionPdf(item)}
                              className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
                            >
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Session Expanded View */}
              {selectedSession && (
                <div className="mt-6 p-6 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-5 shadow-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="font-bold text-cyan-300 text-base">
                        Detailed Question-by-Question Review: {selectedSession.role}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Conducted on {new Date(selectedSession.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • Difficulty: {selectedSession.difficulty}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300">Overall Benchmark:</span>
                      <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold">
                        {selectedSession.totalScore > 10 ? selectedSession.totalScore : selectedSession.totalScore * 10}/100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(selectedSession.questions || []).map((q, idx) => {
                      const ev = q.evaluation || {};
                      const qScore = q.score ? q.score * 10 : (ev.overall_answer_score || 60);

                      return (
                        <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/30">
                                Q{idx + 1}
                              </span>
                              {q.question}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              qScore >= 75 ? 'bg-emerald-500/20 text-emerald-300' : qScore >= 55 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {qScore}/100
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Recorded Answer:</span>
                            <p className="text-slate-300 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                              "{q.answer || '(No answer recorded)'}"
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">AI Evaluation Feedback:</span>
                            <p className="text-slate-200 bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/20 leading-relaxed">
                              {q.feedback || ev.feedback || 'Evaluated for accuracy and depth.'}
                            </p>
                          </div>

                          {((ev.mistakes_identified && ev.mistakes_identified.length > 0) || (ev.weaknesses && ev.weaknesses.length > 0)) && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Identified Gaps & Mistakes:</span>
                              <ul className="text-slate-300 list-disc list-inside bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/20 space-y-1">
                                {(ev.mistakes_identified || ev.weaknesses).map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(ev.ideal_answer || q.ideal_answer) && (
                            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30 border border-cyan-500/30 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cyan-300 flex items-center gap-1">
                                  <span className="text-yellow-400">★</span> Ideal Model Answer:
                                </span>
                                <span className="text-[10px] text-cyan-400 uppercase font-semibold">Senior Benchmark</span>
                              </div>
                              <p className="text-slate-200 whitespace-pre-line leading-relaxed">
                                {ev.ideal_answer || q.ideal_answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
