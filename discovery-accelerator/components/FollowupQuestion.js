export default function FollowUpQuestions({ questions }) {
    if (!questions || questions.length === 0) {
      return null;
    }
  
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Follow-up Questions Generated</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Context
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {question.question}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {question.context || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {question.priority || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }