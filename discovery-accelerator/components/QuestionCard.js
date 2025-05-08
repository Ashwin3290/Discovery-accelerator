import React from 'react';

export default function QuestionCard({ question, isSelected, onClick }) {
  // Format status with appropriate styling
  const formatStatusDisplay = (status) => {
    if (status === 'unanswered') {
      return <span className="status-unanswered">⚠️ Unanswered</span>;
    } else if (status === 'partially_answered') {
      return <span className="status-partially">⚠️ Partially Answered</span>;
    } else if (status === 'answered') {
      return <span className="status-answered">✅ Answered</span>;
    }
    return status;
  };

  return (
    <div 
      className={`border rounded-lg p-4 mb-4 transition-all cursor-pointer ${
        isSelected 
          ? 'border-green-500 bg-green-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium">Question #{question.id}</h3>
        <div className="text-sm">{formatStatusDisplay(question.status)}</div>
      </div>
      
      <p className="text-gray-800 mb-3">{question.question}</p>
      
      <div className="flex flex-wrap text-sm text-gray-500 gap-x-4">
        <div className="mb-1">
          <span className="font-medium">Priority:</span> {question.priority || 'N/A'}
        </div>
        <div className="mb-1">
          <span className="font-medium">Source:</span> {question.source || 'Unknown'}
        </div>
      </div>
      
      {question.answer && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-500 mb-1">Answer:</div>
          <p className="text-gray-700 truncate">{question.answer.answer_text}</p>
        </div>
      )}
    </div>
  );
}