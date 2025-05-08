'use client';

import { useState } from 'react';
import StatusBadge from './StatusBadge';

export default function QuestionTable({ questions, onSelectQuestion }) {
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle header click for sorting
  const handleHeaderClick = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort questions based on current sort settings
  const sortedQuestions = [...questions].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle special cases
    if (sortField === 'status') {
      // Sort by status with a specific order: unanswered, partially_answered, answered
      const statusOrder = { 'unanswered': 0, 'partially_answered': 1, 'answered': 2 };
      aValue = statusOrder[a.status] ?? 3;
      bValue = statusOrder[b.status] ?? 3;
    }
    
    // Numeric comparison for ID and priority
    if (sortField === 'id' || sortField === 'priority') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    // String comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    // Number comparison
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleHeaderClick('id')}
            >
              ID {renderSortIndicator('id')}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleHeaderClick('question')}
            >
              Question {renderSortIndicator('question')}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleHeaderClick('status')}
            >
              Status {renderSortIndicator('status')}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleHeaderClick('priority')}
            >
              Priority {renderSortIndicator('priority')}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleHeaderClick('source')}
            >
              Source {renderSortIndicator('source')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedQuestions.length > 0 ? (
            sortedQuestions.map((question) => (
              <tr 
                key={question.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectQuestion(question)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                  {question.question}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StatusBadge status={question.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.priority || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                  {question.source || 'Unknown'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                No questions found matching the current filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {questions.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {sortedQuestions.length} of {questions.length} questions
        </div>
      )}
    </div>
  );
}