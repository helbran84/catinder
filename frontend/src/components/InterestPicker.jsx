import { useState } from 'react';
import { INTERESTS } from '../data/interests';

function InterestPicker({ selected = [], onChange, max = 5 }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleInterest = (interest) => {
    if (selected.find(s => s.id === interest.id)) {
      onChange(selected.filter(s => s.id !== interest.id));
    } else if (selected.length < max) {
      onChange([...selected, interest]);
    }
  };

  const removeInterest = (id) => {
    onChange(selected.filter(s => s.id !== id));
  };

  return (
    <div className="interest-picker">
      <div className="interest-counter">
        <span className={selected.length >= max ? 'limit' : ''}>{selected.length}</span>/{max} seleccionados
      </div>

      {selected.length > 0 && (
        <div className="selected-tags">
          {selected.map(interest => (
            <span key={interest.id} className="selected-tag" onClick={() => removeInterest(interest.id)}>
              {interest.name} ×
            </span>
          ))}
        </div>
      )}

      <div className="interest-categories">
        {INTERESTS.map(category => (
          <div key={category.category} className="interest-category">
            <button
              className={`category-header ${expandedCategory === category.category ? 'expanded' : ''}`}
              onClick={() => setExpandedCategory(expandedCategory === category.category ? null : category.category)}
              type="button"
            >
              <span>{category.icon} {category.category}</span>
              <span className="category-arrow">▼</span>
            </button>

            {expandedCategory === category.category && (
              <div className="category-items">
                {category.items.map(interest => {
                  const isSelected = selected.find(s => s.id === interest.id);
                  const isDisabled = !isSelected && selected.length >= max;
                  return (
                    <button
                      key={interest.id}
                      className={`interest-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => !isDisabled && toggleInterest(interest)}
                      type="button"
                      disabled={isDisabled}
                    >
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InterestPicker;
