// lib/progressUtils.js - Reusable Progress Calculation Utilities

/**
 * Configuration for progress calculation
 */
export const PROGRESS_CONFIG = {
  // Weightage for different answer types (0.0 to 1.0)
  WEIGHTS: {
    ANSWERED: 1.0,        // Fully answered questions: 100% weight
    PARTIAL: 0.6,         // Partially answered: 60% weight
    UNANSWERED: 0.0       // Unanswered questions: 0% weight
  },
  
  // Status thresholds (percentages)
  STATUS_THRESHOLDS: {
    COMPLETED: 95,        // >= 95% completion
    ACTIVE_HIGH: 70,      // >= 70% completion  
    ACTIVE_LOW: 10,       // >= 10% completion
    PENDING: 0            // < 10% completion
  },

  // Progress bar colors
  COLORS: {
    EXCELLENT: 'bg-green-600',    // >= 90%
    GOOD: 'bg-blue-600',          // >= 70%
    MODERATE: 'bg-yellow-600',    // >= 40%
    POOR: 'bg-red-600'            // < 40%
  }
};

/**
 * Calculate project completion with sophisticated weightage system
 * @param {Object} progressData - Project progress data from API
 * @param {Object} options - Optional configuration overrides
 * @returns {Object} Comprehensive completion information
 */
export function calculateProjectCompletion(progressData, options = {}) {
  // Merge custom options with defaults
  const config = {
    ...PROGRESS_CONFIG,
    ...options
  };

  // Default response for invalid/missing data
  const defaultResponse = {
    percentage: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    partiallyAnswered: 0,
    unanswered: 0,
    status: 'unknown',
    weightedScore: 0,
    statusColor: 'gray',
    progressColor: config.COLORS.POOR,
    completionDetails: {
      answeredWeight: 0,
      partialWeight: 0,
      totalWeight: 0
    }
  };

  if (!progressData || !progressData.questions) {
    return defaultResponse;
  }

  const total = progressData.questions.total || 0;
  const byStatus = progressData.questions.by_status || {};
  
  const answered = byStatus.answered || 0;
  const partiallyAnswered = byStatus.partially_answered || 0;
  const unanswered = byStatus.unanswered || 0;

  // Handle edge case: no questions
  if (total === 0) {
    return {
      ...defaultResponse,
      status: 'no-questions',
      statusColor: 'gray'
    };
  }

  // Calculate weighted scores
  const answeredWeight = answered * config.WEIGHTS.ANSWERED;
  const partialWeight = partiallyAnswered * config.WEIGHTS.PARTIAL;
  const totalWeight = answeredWeight + partialWeight;
  
  // Calculate percentage (capped at 100%)
  const percentage = Math.min(Math.round((totalWeight / total) * 100), 100);

  // Determine project status based on completion percentage
  let status, statusColor;
  if (percentage >= config.STATUS_THRESHOLDS.COMPLETED) {
    status = 'completed';
    statusColor = 'green';
  } else if (percentage >= config.STATUS_THRESHOLDS.ACTIVE_HIGH) {
    status = 'active';
    statusColor = 'blue';
  } else if (percentage >= config.STATUS_THRESHOLDS.ACTIVE_LOW) {
    status = 'active';
    statusColor = 'yellow';
  } else {
    status = 'pending';
    statusColor = 'red';
  }

  // Determine progress bar color
  let progressColor;
  if (percentage >= 90) {
    progressColor = config.COLORS.EXCELLENT;
  } else if (percentage >= 70) {
    progressColor = config.COLORS.GOOD;
  } else if (percentage >= 40) {
    progressColor = config.COLORS.MODERATE;
  } else {
    progressColor = config.COLORS.POOR;
  }

  return {
    percentage,
    totalQuestions: total,
    answeredQuestions: answered,
    partiallyAnswered: partiallyAnswered,
    unanswered: unanswered,
    status,
    statusColor,
    progressColor,
    weightedScore: totalWeight.toFixed(1),
    completionDetails: {
      answeredWeight: answeredWeight.toFixed(1),
      partialWeight: partialWeight.toFixed(1),
      totalWeight: totalWeight.toFixed(1)
    }
  };
}

/**
 * Get human-readable progress description
 * @param {Object} completion - Result from calculateProjectCompletion
 * @returns {string} Human-readable description
 */
export function getProgressDescription(completion) {
  const { percentage, answeredQuestions, partiallyAnswered, totalQuestions } = completion;
  
  if (totalQuestions === 0) {
    return "No questions available yet";
  }
  
  if (percentage >= 95) {
    return `Discovery complete! ${answeredQuestions}/${totalQuestions} questions answered`;
  }
  
  if (percentage >= 70) {
    return `Great progress! ${answeredQuestions} answered${partiallyAnswered > 0 ? `, ${partiallyAnswered} partial` : ''}`;
  }
  
  if (percentage >= 40) {
    return `Making progress: ${answeredQuestions}/${totalQuestions} questions completed`;
  }
  
  if (percentage >= 10) {
    return `Getting started: ${answeredQuestions} questions answered so far`;
  }
  
  return `Just beginning: ${totalQuestions} questions ready for discovery`;
}

/**
 * Get detailed progress breakdown for tooltips/detailed views
 * @param {Object} completion - Result from calculateProjectCompletion
 * @returns {string} Detailed breakdown text
 */
export function getDetailedProgressBreakdown(completion) {
  const { 
    answeredQuestions, 
    partiallyAnswered, 
    unanswered, 
    totalQuestions,
    completionDetails 
  } = completion;
  
  const lines = [
    `Total Questions: ${totalQuestions}`,
    `✅ Fully Answered: ${answeredQuestions} (weight: ${completionDetails.answeredWeight})`,
    `⏳ Partially Answered: ${partiallyAnswered} (weight: ${completionDetails.partialWeight})`,
    `❓ Unanswered: ${unanswered}`,
    `📊 Weighted Score: ${completionDetails.totalWeight}/${totalQuestions}`
  ];
  
  return lines.join('\n');
}

/**
 * Calculate team/organization-wide progress statistics
 * @param {Array} projects - Array of project data
 * @returns {Object} Aggregated statistics
 */
export function calculateOrganizationProgress(projects) {
  if (!projects || projects.length === 0) {
    return {
      totalProjects: 0,
      averageCompletion: 0,
      completedProjects: 0,
      activeProjects: 0,
      pendingProjects: 0,
      totalQuestions: 0,
      totalAnswered: 0
    };
  }

  let totalCompletion = 0;
  let completedCount = 0;
  let activeCount = 0;
  let pendingCount = 0;
  let totalQuestions = 0;
  let totalAnswered = 0;

  projects.forEach(project => {
    if (project.progressLoaded) {
      totalCompletion += project.progress || 0;
      totalQuestions += project.totalQuestions || 0;
      totalAnswered += project.answeredQuestions || 0;
      
      switch (project.status) {
        case 'completed':
          completedCount++;
          break;
        case 'active':
          activeCount++;
          break;
        case 'pending':
          pendingCount++;
          break;
      }
    }
  });

  return {
    totalProjects: projects.length,
    averageCompletion: Math.round(totalCompletion / projects.length),
    completedProjects: completedCount,
    activeProjects: activeCount,
    pendingProjects: pendingCount,
    totalQuestions,
    totalAnswered,
    organizationEfficiency: totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0
  };
}

/**
 * Generate progress trend data for charts
 * @param {Array} progressHistory - Historical progress data
 * @returns {Array} Chart-ready data points
 */
export function generateProgressTrend(progressHistory) {
  if (!progressHistory || progressHistory.length === 0) {
    return [];
  }

  return progressHistory.map((entry, index) => ({
    date: entry.date,
    percentage: entry.completion?.percentage || 0,
    answered: entry.completion?.answeredQuestions || 0,
    partial: entry.completion?.partiallyAnswered || 0,
    total: entry.completion?.totalQuestions || 0,
    period: index + 1
  }));
}

/**
 * Validate progress data structure
 * @param {Object} progressData - Raw progress data from API
 * @returns {Object} Validation result
 */
export function validateProgressData(progressData) {
  const errors = [];
  const warnings = [];

  if (!progressData) {
    errors.push('Progress data is null or undefined');
    return { valid: false, errors, warnings };
  }

  if (!progressData.questions) {
    errors.push('Missing questions data');
  } else {
    const { total, by_status } = progressData.questions;
    
    if (typeof total !== 'number' || total < 0) {
      errors.push('Invalid total questions count');
    }
    
    if (!by_status || typeof by_status !== 'object') {
      errors.push('Missing or invalid question status breakdown');
    } else {
      const { answered = 0, partially_answered = 0, unanswered = 0 } = by_status;
      const statusTotal = answered + partially_answered + unanswered;
      
      if (Math.abs(statusTotal - total) > 0) {
        warnings.push(`Status breakdown total (${statusTotal}) doesn't match total questions (${total})`);
      }
      
      if (answered < 0 || partially_answered < 0 || unanswered < 0) {
        errors.push('Negative values in question status counts');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Export configuration for external customization
export { PROGRESS_CONFIG as defaultProgressConfig };