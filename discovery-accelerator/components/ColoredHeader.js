export default function ColoredHeader({ label, description, colorName = "green-70" }) {
  return (
    <div className={`colored-header colored-header-${colorName}`}>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{label}</h1>
      {description && <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
    </div>
  );
}