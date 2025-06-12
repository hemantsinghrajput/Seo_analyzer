// app/page.tsx
'use client';

import { useState } from 'react';

interface AnalysisResults {
  keywords: string[];
  score: number;
  scoreCategory: string;
  topic: string;
  topicScore?: number;
  totalKeywords?: number;
  textLength?: number;
  message?: string;
  error?: string;
}

export default function HomePage() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeText = async () => {
    setError(null);
    setResults(null);

    if (!text.trim()) {
      setError('Please enter some text before analyzing.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to analyze text. Please try again.');
        return;
      }

      setResults(data);
    } catch (error) {
      setError('Something went wrong. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const insertKeyword = async (keyword: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, insertKeyword: keyword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to insert keyword.');
        return;
      }

      const data = await res.json();
      setText(data.updatedText);
      setResults(null);
      setError(null);
    } catch {
      setError('Failed to insert keyword. Please try again.');
    }
  };

  const getScoreColor = (score: number, category: string) => {
    if (score >= 70 || category === 'high') return 'text-green-600';
    if (score >= 40 || category === 'medium') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number, category: string) => {
    if (score >= 70 || category === 'high') return 'bg-green-100 text-green-800';
    if (score >= 40 || category === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <main className="min-h-screen bg-gradient-to-r from-purple-100 via-white to-blue-100 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">
          ✨ SEO Analyzer
        </h1>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder="Paste your blog, newsletter, tweet, or caption..."
          className="w-full h-40 p-4 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition mb-4 text-black"
        />

        <div className="flex justify-center mb-4">
          <button
            onClick={analyzeText}
            disabled={loading || !text.trim()}
            className="bg-purple-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Analyzing...' : 'Analyze SEO'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-center">⚠️ {error}</p>
          </div>
        )}

        {results && (
          <div className="mt-10">
            {results.message && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 text-center">💡 {results.message}</p>
              </div>
            )}

            <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-700 font-medium">📊 SEO Score:</span>
                  <span className={`text-2xl font-bold ${getScoreColor(results.score, results.scoreCategory)}`}>
                    {results.score}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadge(results.score, results.scoreCategory)}`}>
                    {results.scoreCategory}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <p><strong>🧠 Primary Topic:</strong> {results.topic}</p>
                <p><strong>🔤 Keywords Found:</strong> {results.totalKeywords || results.keywords.length}</p>
                <p><strong>📝 Text Length:</strong> {results.textLength} characters</p>
              </div>
            </div>

            {results.keywords.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">📌 Recommended Keywords</h2>
                <p className="text-sm text-gray-600 mb-4">Click on any keyword to insert it into your content:</p>
                <div className="flex flex-wrap gap-3">
                  {results.keywords.map((kw, i) => (
                    <button
                      key={i}
                      onClick={() => insertKeyword(kw)}
                      className="bg-green-100 text-green-800 px-4 py-2 rounded-full hover:bg-green-200 transition text-sm shadow-sm border border-green-200 hover:border-green-300"
                      title={`Click to insert \"${kw}\" into your content`}
                    >
                      ➕ {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.score < 70 && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-2">💡 Tips to improve your SEO score:</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  {results.score < 30 && <li>• Add more relevant keywords to your content</li>}
                  {results.keywords.length < 3 && <li>• Include more topic-specific terms</li>}
                  {results.textLength && results.textLength < 100 && <li>• Consider expanding your content for better SEO</li>}
                  <li>• Use the suggested keywords above to enhance your content</li>
                  <li>• Ensure your content matches your intended topic</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
