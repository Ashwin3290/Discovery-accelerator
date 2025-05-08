// ProgressChart.js
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ProgressChart({ projectStatus }) {
  // Extract data from project status
  const statusCounts = projectStatus?.question_status || {};
  
  // Prepare data for chart
  const data = [
    { name: 'Answered', value: statusCounts.answered || 0 },
    { name: 'Partially Answered', value: statusCounts.partially_answered || 0 },
    { name: 'Unanswered', value: statusCounts.unanswered || 0 }
  ].filter(item => item.value > 0);
  
  // If no data, show placeholder
  if (data.length === 0) {
    data.push({ name: 'No Questions', value: 1 });
  }
  
  // Colors for the chart
  const COLORS = ['#2ecc71', '#f39c12', '#e74c3c', '#cccccc'];
  
  return (
    <div className="h-80 w-full bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-center mb-4">Question Status Distribution</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} Questions`, 'Count']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}