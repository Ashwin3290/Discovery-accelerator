export default function StylableContainer({ children, className = '' }) {
  return (
    <div className={`border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 ${className}`}>
      {children}
    </div>
  );
}