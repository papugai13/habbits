import React, { useState, useEffect, useRef } from 'react';
import './MonthDropdown.css';

const MonthDropdown = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);

    const activeOption = options.find(o => o.month_key === value) || options[0];
    const selectedLabel = activeOption ? (activeOption.label || `${activeOption.month_name} ${activeOption.year}`) : '';

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keep highlight in sync when opening
    useEffect(() => {
        if (isOpen) {
            const activeIdx = options.findIndex(o => o.month_key === value);
            setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);
        }
    }, [isOpen, options, value]);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % options.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                    onChange(options[highlightedIndex].month_key);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div 
            className="month-dropdown-container" 
            ref={containerRef}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                className={`month-dropdown-trigger ${isOpen ? 'open' : ''}`}
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls="month-dropdown-list"
                aria-label="Выбор месяца"
            >
                <span className="month-dropdown-value">{selectedLabel}</span>
                <span className="month-dropdown-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div 
                    className="month-dropdown-list" 
                    id="month-dropdown-list"
                    role="listbox"
                    aria-label="Список месяцев"
                >
                    {options.map((option, idx) => {
                        const isSelected = option.month_key === value;
                        const isHighlighted = idx === highlightedIndex;
                        
                        return (
                            <div
                                key={option.month_key}
                                className={`month-dropdown-item ${isSelected ? 'active' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                onClick={() => {
                                    onChange(option.month_key);
                                    setIsOpen(false);
                                    triggerRef.current?.focus();
                                }}
                                role="option"
                                aria-selected={isSelected}
                                id={`month-opt-${option.month_key}`}
                            >
                                <span className="item-label">{option.label || `${option.month_name} ${option.year}`}</span>
                                {isSelected && (
                                    <span className="item-checkmark">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MonthDropdown;
