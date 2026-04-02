import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';

const ITEM_HEIGHT = 44;

/**
 * DrumPicker — a scrollable number picker component (iOS style).
 * Props:
 *   value   — current selected value (number)
 *   min     — minimum value (default 1)
 *   max     — maximum value (default 999)
 *   onChange — callback(newValue: number)
 */
const DrumPicker = ({ value, min = 1, max = 999, allowNoQuantity = false, noQuantityLabel = "-", onChange }) => {
    const listRef = useRef(null);
    const isDragging = useRef(false);
    const isSnapping = useRef(false);
    const startY = useRef(0);
    const startScrollTop = useRef(0);

    // Local value for visual updates (opacity/scale) during scroll
    // to avoid triggering expensive parent re-renders too often
    const [localValue, setLocalValue] = useState(value);

    const items = useMemo(() => {
        const res = [];
        if (allowNoQuantity) res.push(null);
        for (let i = min; i <= max; i++) res.push(i);
        return res;
    }, [min, max, allowNoQuantity]);

    const scrollToValue = useCallback((val, smooth = false) => {
        if (!listRef.current) return;
        const index = val === null ? 0 : (allowNoQuantity ? val - min + 1 : val - min);
        const targetY = index * ITEM_HEIGHT;
        if (smooth) {
            isSnapping.current = true;
            listRef.current.scrollTo({ top: targetY, behavior: 'smooth' });
        } else {
            listRef.current.scrollTop = targetY;
        }
    }, [min, allowNoQuantity]);

    // Update local value when prop value changes (e.g. modal opens)
    useEffect(() => {
        setLocalValue(value);
        scrollToValue(value, false);
    }, [value, scrollToValue]);

    const snapToNearest = useCallback(() => {
        if (!listRef.current) return;
        const scrollTop = listRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        const newValue = items[clampedIndex];

        isSnapping.current = true;
        scrollToValue(newValue, true);

        // Final sync with parent
        if (newValue !== value) {
            onChange(newValue);
        }
        setLocalValue(newValue);
    }, [items, value, onChange, scrollToValue]);

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;

        // During snapping, we let the ScrollTo animation finish
        if (isSnapping.current) {
            const scrollTop = listRef.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
            const newValue = items[clampedIndex];
            setLocalValue(newValue);
            return;
        }

        const scrollTop = listRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        const newValue = items[clampedIndex];

        if (newValue !== localValue) {
            setLocalValue(newValue);
        }
    }, [items, localValue]);

    // Mouse drag support for desktop
    const onMouseDown = (e) => {
        isDragging.current = true;
        isSnapping.current = false;
        startY.current = e.clientY;
        startScrollTop.current = listRef.current.scrollTop;
        e.preventDefault();
    };

    const onMouseMove = useCallback((e) => {
        if (!isDragging.current || !listRef.current) return;
        const delta = startY.current - e.clientY;
        listRef.current.scrollTop = startScrollTop.current + delta;
    }, []);

    const onMouseUp = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        snapToNearest();
    }, [snapToNearest]);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    const scrollEndTimer = useRef(null);
    const handleScrollEvent = () => {
        handleScroll();
        clearTimeout(scrollEndTimer.current);
        scrollEndTimer.current = setTimeout(() => {
            isSnapping.current = false; // Reset snapping flag after completion
            snapToNearest();
        }, 150);
    };

    return (
        <div className="drum-picker-wrapper">
            <div className="drum-picker-container">
                {/* Маска: верхняя тень */}
                <div className="drum-picker-mask drum-picker-mask-top" />

                {/* Линия выбора */}
                <div className="drum-picker-selection" />

                {/* Список элементов */}
                <div
                    className="drum-picker-list"
                    ref={listRef}
                    onScroll={handleScrollEvent}
                    onMouseDown={onMouseDown}
                    style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
                >
                    {/* Отступ сверху для центрирования первого элемента */}
                    <div style={{ height: ITEM_HEIGHT * 2 }} />
                    {items.map((item, idx) => {
                        const isSelected = item === localValue;
                        let offset = 0;

                        // Optimize offset calculation
                        if (localValue === null) {
                            offset = idx;
                        } else if (item === null) {
                            const valueIndex = allowNoQuantity ? localValue - min + 1 : localValue - min;
                            offset = valueIndex;
                        } else {
                            const valueIndex = allowNoQuantity ? localValue - min + 1 : localValue - min;
                            offset = Math.abs(idx - valueIndex);
                        }

                        const opacity = offset === 0 ? 1 : offset === 1 ? 0.6 : offset === 2 ? 0.35 : 0.15;
                        const scale = offset === 0 ? 1 : offset === 1 ? 0.92 : 0.82;

                        return (
                            <div
                                key={item === null ? 'null-item' : item}
                                className={`drum-picker-item ${isSelected ? 'drum-picker-item-selected' : ''}`}
                                style={{
                                    height: ITEM_HEIGHT,
                                    opacity,
                                    transform: `scale(${scale})`,
                                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                                    fontWeight: isSelected ? 700 : 400,
                                    fontSize: isSelected ? (item === null ? '18px' : '28px') : (item === null ? '14px' : '20px'),
                                }}
                                onClick={() => {
                                    isSnapping.current = true;
                                    setLocalValue(item);
                                    scrollToValue(item, true);
                                    onChange(item);
                                }}
                            >
                                {item === null ? noQuantityLabel : item}
                            </div>
                        );
                    })}
                    {/* Отступ снизу */}
                    <div style={{ height: ITEM_HEIGHT * 2 }} />
                </div>

                {/* Маска: нижняя тень */}
                <div className="drum-picker-mask drum-picker-mask-bottom" />
            </div>
        </div>
    );
};

export default DrumPicker;
