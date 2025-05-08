export default function StatusBadge({ status }) {
    let bgColor, textColor, icon, label;
    
    switch (status) {
      case 'unanswered':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        icon = '⚠️';
        label = 'Unanswered';
        break;
      case 'partially_answered':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        icon = '⚠️';
        label = 'Partially Answered';
        break;
      case 'answered':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = '✅';
        label = 'Answered';
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = '❓';
        label = status || 'Unknown';
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        <span className="mr-1">{icon}</span>
        {label}
      </span>
    );
  }