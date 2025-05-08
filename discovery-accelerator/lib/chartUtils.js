// chartUtils.js
/**
 * Prepares data for status pie chart
 * @param {Object} projectStatus - Project status object
 * @returns {Array} Data for pie chart
 */
export function prepareStatusChartData(projectStatus) {
    const statusCounts = projectStatus?.question_status || {};
    
    // Prepare data for chart
    const data = [
      { name: 'Answered', value: statusCounts.answered || 0, color: '#2ecc71' },
      { name: 'Partially Answered', value: statusCounts.partially_answered || 0, color: '#f39c12' },
      { name: 'Unanswered', value: statusCounts.unanswered || 0, color: '#e74c3c' }
    ].filter(item => item.value > 0);
    
    // If no data, show placeholder
    if (data.length === 0) {
      data.push({ name: 'No Questions', value: 1, color: '#cccccc' });
    }
    
    return data;
  }
  
  /**
   * Creates data for progress over time chart
   * @param {Array} transcripts - Array of transcript processing dates
   * @returns {Array} Data for line chart
   */
  export function prepareProgressTimelineData(transcripts) {
    if (!transcripts || !transcripts.length) {
      return [];
    }
    
    // Sort transcripts by date
    const sortedTranscripts = [...transcripts].sort((a, b) => 
      new Date(a.processed_date) - new Date(b.processed_date)
    );
    
    // Create cumulative data points
    let answeredCount = 0;
    
    return sortedTranscripts.map(transcript => {
      answeredCount += transcript.answers_found || 0;
      
      return {
        date: new Date(transcript.processed_date).toLocaleDateString(),
        answered: answeredCount
      };
    });
  }
  
  /**
   * Creates configuration for bar chart
   * @param {Array} data - Data for the chart
   * @param {string} xKey - Key for X axis
   * @param {string} yKey - Key for Y axis
   * @returns {Object} Chart configuration
   */
  export function createBarChartConfig(data, xKey, yKey) {
    return {
      data,
      xAxis: {
        dataKey: xKey,
        type: 'category'
      },
      yAxis: {
        type: 'number'
      },
      series: [
        {
          dataKey: yKey,
          type: 'bar',
          fill: '#4CAF50'
        }
      ]
    };
  }
  
  /**
   * Calculates completion percentage
   * @param {Object} status - Discovery status object
   * @returns {number} Completion percentage
   */
  export function calculateCompletionPercentage(status) {
    if (!status) return 0;
    
    const total = status.total_questions || 0;
    const unanswered = status.question_status?.unanswered || 0;
    const partiallyAnswered = status.question_status?.partially_answered || 0;
    
    if (total === 0) return 0;
    
    // Each partially answered question counts as half answered
    return 100 - ((unanswered + partiallyAnswered / 2) / total * 100);
  }