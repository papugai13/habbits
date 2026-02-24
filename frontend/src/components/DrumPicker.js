import React, { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 44;

/**
 * DrumPicker — компонент выбора числа прокруткой как в будильнике iPhone.
 * Props:
 *   value   — текущее выбранное число (число)
 *   min     — минимум (по умолчанию 1)
 *   max     — максимум (по умолчанию 999)
 *   onChange — callback(newValue: number)
 */
const DrumPicker = ({ value, min = 1, max = 999, onChange }) => {
    const listRef = useRef(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startScrollTop = useRef(0);
    const animating = useRef(false);

    const items = [];
    for (let i = min; i <= max; i++) items.push(i);

    const scrollToValue = useCallback((val, smooth = false) => {
        if (!listRef.current) return;
        const index = val - min;
        const targetY = index * ITEM_HEIGHT;
        if (smooth) {
            listRef.current.scrollTo({ top: targetY, behavior: 'smooth' });
        } else {
            listRef.current.scrollTop = targetY;
        }
    }, [min]);

    // Init scroll position
    useEffect(() => {
        scrollToValue(value, false);
    }, [scrollToValue, value]);

    const snapToNearest = useCallback(() => {
        if (!listRef.current || animating.current) return;
        const scrollTop = listRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        const newValue = clampedIndex + min;
        scrollToValue(newValue, true);
        if (newValue !== value) {
            onChange(newValue);
        }
    }, [items.length, min, value, onChange, scrollToValue]);

    const handleScroll = useCallback(() => {
        if (animating.current) return;
        if (listRef.current) {
            const scrollTop = listRef.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
            const newValue = clampedIndex + min;
            if (newValue !== value) {
                onChange(newValue);
            }
        }
    }, [items.length, min, value, onChange]);

    // Mouse drag support for desktop
    const onMouseDown = (e) => {
        isDragging.current = true;
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

    // Scroll end snap
    let scrollEndTimer = useRef(null);
    const handleScrollEvent = () => {
        handleScroll();
        clearTimeout(scrollEndTimer.current);
        scrollEndTimer.current = setTimeout(() => {
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
                    {items.map((item) => {
                        const offset = Math.abs(item - value);
                        const opacity = offset === 0 ? 1 : offset === 1 ? 0.6 : offset === 2 ? 0.35 : 0.15;
                        const scale = offset === 0 ? 1 : offset === 1 ? 0.92 : 0.82;
                        const isSelected = item === value;
                        return (
                            <div
                                key={item}
                                className={`drum-picker-item ${isSelected ? 'drum-picker-item-selected' : ''}`}
                                style={{
                                    height: ITEM_HEIGHT,
                                    opacity,
                                    transform: `scale(${scale})`,
                                    transition: 'opacity 0.1s, transform 0.1s',
                                    fontWeight: isSelected ? 700 : 400,
                                    fontSize: isSelected ? '28px' : '20px',
                                }}
                                onClick={() => {
                                    onChange(item);
                                    scrollToValue(item, true);
                                }}
                            >
                                {item}
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
