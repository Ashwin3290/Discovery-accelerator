'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Mic, 
  Eye, 
  Calendar, 
  Search,
  Filter,
  Download,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Loader2
} from 'lucide-react';
import { fetchAnswersBySource } from '../lib/api';

export default function AnswersBySource({ projectId, onClose }) {
  const [answers, setAnswers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'documents', 'transcripts'
  const [confidenceFilter, setConfidenceFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [expandedAnswers, setExpandedAnswers] = useState(new Set());

  useEffect(() => {
    loadAnswers();
  }, [projectId]);

  const loadAnswers = async () => {
    try {
      setLoading(true);
      const response = await fetchAnswersBySource(projectId);
      
      if (response.status === 'success') {
        setAnswers(response);
      } else {
        setError(response.message || 'Failed to load answers');
      }
    } catch (err) {
      console.error('Error loading answers:', err);
      setError('Failed to load answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get confidence level
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence) => {
    const level = getConfidenceLevel(confidence);
    const percentage = Math.round(confidence * 100);
    
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle size={12} className="mr-1" />
            {percentage}%
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <AlertCircle size={12} className="mr-1" />
            {percentage}%
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <Info size={12} className="mr-1" />
            {percentage}%
          </span>
        );
      default:
        return null;
    }
  };

  // Filter answers
  const getFilteredAnswers = () => {
    if (!answers) return { document_answers: [], transcript_answers: [] };
    
    let documentAnswers = [...answers.document_answers];
    let transcriptAnswers = [...answers.transcript_answers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      documentAnswers = documentAnswers.filter(answer => 
        answer.question.toLowerCase().includes(query) ||
        answer.answer.toLowerCase().includes(query)
      );
      transcriptAnswers = transcriptAnswers.filter(answer => 
        answer.question.toLowerCase().includes(query) ||
        answer.answer.toLowerCase().includes(query)
      );
    }
    
    // Apply confidence filter
    if (confidenceFilter !== 'all') {
      const filterAnswers = (answers) => answers.filter(answer => {
        const level = getConfidenceLevel(answer.confidence);
        return level === confidenceFilter;
      });
      
      documentAnswers = filterAnswers(documentAnswers);
      transcriptAnswers = filterAnswers(transcriptAnswers);
    }
    
    return { document_answers: documentAnswers, transcript_answers: transcriptAnswers };
  };

  // Toggle answer expansion
  const toggleAnswer = (answerId) => {
    const newExpanded = new Set(expandedAnswers);
    if (newExpanded.has(answerId)) {
      newExpanded.delete(answerId);
    } else {
      newExpanded.add(answerId);
    }
    setExpandedAnswers(newExpanded);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render answer card
  const renderAnswerCard = (answer, index, type) => {
    const answerId = `${type}-${index}`;
    const isExpanded = expandedAnswers.has(answerId);
    const isDocument = type === 'document';
    
    return (
      <div key={answerId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isDocument ? (
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Mic size={16} className="text-green-600 dark:text-green-400" />
            )}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {isDocument ? 'Document' : 'Transcript'}
            </span>
            {getConfidenceBadge(answer.confidence)}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={12} />
            <span>{formatDate(answer.date)}</span>
          </div>
        </div>

        {/* Question */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Question:
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {answer.question}
          </p>
        </div>

        {/* Answer */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            Answer:
          </h4>
          <div className={`text-sm text-gray-700 dark:text-gray-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {answer.answer}
          </div>
          {answer.answer.length > 150 && (
            <button
              onClick={() => toggleAnswer(answerId)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1 flex items-center"
            >
              {isExpanded ? 'Show less' : 'Show more'}
              <ChevronDown size={12} className={`ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Source */}
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
          <strong>Source:</strong> {answer.source}
          {answer.context && (
            <>
              <br />
              <strong>Context:</strong> {answer.context}
            </>
          )}
        </div>
      </div>
    );
  };

  const filteredAnswers = getFilteredAnswers();
  const totalFilteredAnswers = filteredAnswers.document_answers.length + filteredAnswers.transcript_answers.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Answers by Source
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View all answers grouped by their sources
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions and answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="documents">Documents Only</option>
              <option value="transcripts">Transcripts Only</option>
            </select>

            {/* Confidence Filter */}
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Confidence</option>
              <option value="high">High (80%+)</option>
              <option value="medium">Medium (50-79%)</option>
              <option value="low">Low (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 size={48} className="mx-auto animate-spin text-blue-500" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading answers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-red-500" />
              <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={loadAnswers}
              >
                Try Again
              </button>
            </div>
          ) : !answers || answers.summary.total_answers === 0 ? (
            <div className="text-center py-12">
              <Eye size={48} className="mx-auto text-gray-400" />
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                No answers found for this project yet.
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Eye size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Total Answers
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {answers.summary.total_answers}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FileText size={20} className="text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        From Documents
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {answers.summary.document_answers}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Mic size={20} className="text-purple-600 dark:text-purple-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        From Transcripts
                      </p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {answers.summary.transcript_answers}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {totalFilteredAnswers === 0 ? (
                <div className="text-center py-8">
                  <Filter size={48} className="mx-auto text-gray-400" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    No answers match your current filters.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSourceFilter('all');
                      setConfidenceFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Document Answers */}
                  {(sourceFilter === 'all' || sourceFilter === 'documents') && filteredAnswers.document_answers.length > 0 && (
                    <div>
                      <div className="flex items-center mb-4">
                        <FileText size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          Document Answers ({filteredAnswers.document_answers.length})
                        </h3>
                      </div>
                      <div className="grid gap-4">
                        {filteredAnswers.document_answers.map((answer, index) => 
                          renderAnswerCard(answer, index, 'document')
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transcript Answers */}
                  {(sourceFilter === 'all' || sourceFilter === 'transcripts') && filteredAnswers.transcript_answers.length > 0 && (
                    <div>
                      <div className="flex items-center mb-4">
                        <Mic size={20} className="text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          Transcript Answers ({filteredAnswers.transcript_answers.length})
                        </h3>
                      </div>
                      <div className="grid gap-4">
                        {filteredAnswers.transcript_answers.map((answer, index) => 
                          renderAnswerCard(answer, index, 'transcript')
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {totalFilteredAnswers > 0 ? (
              `Showing ${totalFilteredAnswers} of ${answers?.summary.total_answers || 0} answers`
            ) : (
              'No answers to display'
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}