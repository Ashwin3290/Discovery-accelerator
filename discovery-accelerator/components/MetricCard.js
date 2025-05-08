// MetricCard.js
export default function MetricCard({ label, value, delta = null, className = '' }) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {delta !== null && (
          <div className={`mt-2 ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <span className="text-sm font-medium">
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
            </span>
          </div>
        )}
      </div>
    );
  }