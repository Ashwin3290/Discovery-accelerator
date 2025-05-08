export default function QuestionDetail({ question }) {
    if (!question) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">Select a question to view details</p>
        </div>
      );
    }
  
    const getStatusInfo = (status) => {
      if (status === 'unanswered') {
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '⚠️',
          label: 'Unanswered'
        };
      } else if (status === 'partially_answered') {
        return {
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: '⚠️',
          label: 'Partially Answered'
        };
      } else {
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✅',
          label: 'Answered'
        };
      }
    };
  
    const statusInfo = getStatusInfo(question.status);
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-4">
            Question Information
          </h3>
          <p className="text-gray-700 mb-6">{question.question}</p>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Context:</h4>
              <p className="mt-1">{question.context || 'No context provided'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Source:</h4>
              <p className="mt-1">{question.source || 'Unknown source'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Priority:</h4>
              <p className="mt-1">{question.priority || 'N/A'} (1 highest, 3 lowest)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
            <h3 className="text-lg font-semibold">Answer Status</h3>
            <span className={`font-medium ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.label}
            </span>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Answer:</h4>
            {question.answer ? (
              <div className={`${statusInfo.bgColor} p-4 rounded-md border ${statusInfo.borderColor}`}>
                <p className="mb-4">{question.answer.answer_text || 'No answer text'}</p>
                <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-500">
                  <p><span className="font-medium">Confidence:</span> {question.answer.confidence || 'N/A'}</p>
                  <p><span className="font-medium">Date:</span> {question.answer.meeting_date || 'Unknown'}</p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-700">
                No answer available
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }