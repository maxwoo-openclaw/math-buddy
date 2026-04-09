import { useState, useEffect } from 'react';
import { parentApi } from '../services/parentApi';
import type { LinkedStudent, StudentAnalysis, TrendPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ParentDashboard() {
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [tab, setTab] = useState<'overview' | 'analysis' | 'trends'>('overview');
  const [trendDays, setTrendDays] = useState(7);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadAnalysis(selectedStudent);
      loadTrends(selectedStudent, trendDays);
    }
  }, [selectedStudent, trendDays]);

  const loadDashboard = async () => {
    try {
      const data = await parentApi.getDashboard();
      setStudents(data.students);
      if (data.students.length > 0 && !selectedStudent) {
        setSelectedStudent(data.students[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (studentId: number) => {
    try {
      const data = await parentApi.getAnalysis(studentId);
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to load analysis', err);
    }
  };

  const loadTrends = async (studentId: number, days: number) => {
    try {
      const data = await parentApi.getTrends(studentId, days);
      setTrends(data);
    } catch (err) {
      console.error('Failed to load trends', err);
    }
  };

  const generateCode = async () => {
    try {
      const result = await parentApi.generateInviteCode();
      setInviteCode(result.invite_code);
    } catch (err) {
      console.error('Failed to generate code', err);
    }
  };

  const linkByCode = async () => {
    try {
      await parentApi.linkByCode(linkCode);
      setLinkCode('');
      loadDashboard();
    } catch (err) {
      console.error('Failed to link', err);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const currentStudent = students.find(s => s.id === selectedStudent);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Parent Dashboard</h1>

        {/* Student Selector */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <select
              value={selectedStudent || ''}
              onChange={e => setSelectedStudent(Number(e.target.value))}
              className="border rounded-lg px-4 py-2 flex-1"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.username}</option>
              ))}
            </select>
            <button onClick={generateCode} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Generate Invite Code
            </button>
            {inviteCode && (
              <div className="bg-green-100 px-4 py-2 rounded-lg">
                Code: <strong>{inviteCode}</strong> (72hr valid)
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-4">
            <input
              type="text"
              placeholder="Enter student invite code"
              value={linkCode}
              onChange={e => setLinkCode(e.target.value)}
              className="border rounded-lg px-4 py-2 flex-1"
            />
            <button onClick={linkByCode} className="bg-green-600 text-white px-4 py-2 rounded-lg">
              Link Student
            </button>
          </div>
        </div>

        {currentStudent && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              {(['overview', 'analysis', 'trends'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 rounded-lg font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Total Sessions</h3>
                  <p className="text-4xl font-bold text-blue-600">{currentStudent.total_sessions}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Problems Solved</h3>
                  <p className="text-4xl font-bold text-green-600">{currentStudent.total_problems}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Overall Accuracy</h3>
                  <p className="text-4xl font-bold text-purple-600">{currentStudent.overall_accuracy}%</p>
                </div>
              </div>
            )}

            {/* Analysis Tab */}
            {tab === 'analysis' && analysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">By Operation</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.operation_breakdown).map(([op, data]) => (
                      <div key={op}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{op}</span>
                          <span>{data.accuracy}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${data.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">By Difficulty</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.difficulty_breakdown).map(([diff, data]) => (
                      <div key={diff}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{diff}</span>
                          <span>{data.accuracy}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: `${data.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {analysis.weakest_operation && (
                    <p className="mt-4 text-sm text-gray-600">
                      Weakest: <strong>{analysis.weakest_operation}</strong> | 
                      Strongest: <strong>{analysis.strongest_operation}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {tab === 'trends' && (
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Accuracy Trend</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTrendDays(7)}
                      className={`px-4 py-1 rounded ${trendDays === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >7 Days</button>
                    <button
                      onClick={() => setTrendDays(30)}
                      className={`px-4 py-1 rounded ${trendDays === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >30 Days</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#4A90D9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
