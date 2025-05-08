export default function FilterTabs({ options, activeOption, onChange }) {
    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${
                  activeOption === option.value
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {option.icon && <span className="mr-2">{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }