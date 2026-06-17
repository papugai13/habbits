import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Rectangle } from 'recharts';
import './Charts.css';
import './Analytics.css';
import storageService from '../storageService';

const getWeekNumber = (dateInput) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const generatePeriodLabel = (period, referenceDate, t, language) => {
    const today = new Date(referenceDate);
    const months = ['janFull', 'febFull', 'marFull', 'aprFull', 'mayFull', 'junFull', 'julFull', 'augFull', 'sepFull', 'octFull', 'novFull', 'decFull'];
    const daysFull = {
        ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };

    if (period === 'day') {
        const dayNum = today.getDate();
        const monthKey = months[today.getMonth()];
        const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const shortDay = t(dayKeys[today.getDay()]).toLowerCase();
        const monthName = t(monthKey);
        return { title: `${shortDay}, ${dayNum} ${monthName}`, subtitle: `${today.getFullYear()}` };
    } else if (period === 'week') {
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const monday = new Date(today);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}.${month}`;
        };

        const weekNum = getWeekNumber(today);
        const monthKey = months[today.getMonth()];
        const monthName = t(monthKey);
        const year = today.getFullYear();
        return { 
            title: (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                    <span>{language === 'ru' ? 'Неделя' : t('week')} №{weekNum}</span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.9em', fontWeight: 'normal' }}>{formatDate(monday)} - {formatDate(sunday)}</span>
                        <span style={{ fontSize: '0.8em', opacity: 0.7, fontWeight: 'normal' }}>{monthName} {year}</span>
                    </span>
                </span>
            ), 
            subtitle: null 
        };
    } else if (period === 'month') {
        const monthKey = months[today.getMonth()];
        const monthName = t(monthKey);
        return { title: `${monthName} ${today.getFullYear()}`, subtitle: '' };
    } else if (period === 'year') {
        return { title: `${today.getFullYear()}`, subtitle: '' };
    }
    return { title: '', subtitle: '' };
};

const getNumericDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

const CustomXAxisTick = ({ x, y, payload, period, isMobile, isDark, chartData, t, language }) => {
    if (!payload || payload.value === undefined || payload.value === null) return null;

    // Use payload.index if available (represents the actual 0-based array index in Recharts)
    const dataIndex = payload.index !== undefined ? payload.index : payload.value;
    const dataItem = chartData[dataIndex];
    
    if (!dataItem) return null;

    let displayValue = '';
    if (period === 'day') {
        displayValue = dataItem.dayNumber;
    } else {
        displayValue = dataItem.label;
    }
    
    if (isMobile && displayValue.length > 6) {
        displayValue = `${displayValue.slice(0, 6)}..`;
    }

    const fontSize = period === 'year' ? (isMobile ? 8 : 9) : (isMobile ? 8 : 10);
    const weekNumFontSize = isMobile ? 7 : 9;
    
    const isToday = dataItem?.isToday;
    const isCurrentWeek = dataItem?.isCurrentWeek;
    const isCurrentMonth = dataItem?.isCurrentMonth;
    const isCurrentYear = dataItem?.isCurrentYear;
    const isHighlighted = isToday || isCurrentWeek || isCurrentMonth || isCurrentYear;
    const fontWeight = isHighlighted ? 700 : (period === 'week' ? 600 : 500);
    const fill = isHighlighted ? '#22c55e' : (isDark ? "#E0E0E0" : "#666");

    const weekNumber = dataItem?.weekNumber;
    const showWeekNum = period === 'week' && weekNumber != null;
    const weekFill = isHighlighted ? '#22c55e' : (isDark ? '#aaa' : '#999');

    // Получаем месяц для отображения третьей строки
    let monthName = '';
    if (period === 'week' && dataItem.date) {
        const parsedDate = new Date(dataItem.date);
        const months = ['janFull', 'febFull', 'marFull', 'aprFull', 'mayFull', 'junFull', 'julFull', 'augFull', 'sepFull', 'octFull', 'novFull', 'decFull'];
        const monthKey = months[parsedDate.getMonth()];
        monthName = t ? t(monthKey) : '';
        if (language === 'ru' && monthName) {
            monthName = monthName.toLowerCase();
        }
    }
    const showMonthName = period === 'week' && monthName;

    // Геометрия подложки
    // Первая строка: dy=16, вторая: dy=30, третья: dy=42
    const padding = 5;
    const line1CenterY = 16;
    const line2CenterY = 30;
    const line3CenterY = 42;

    const rectTop = line1CenterY - fontSize - padding;
    const rectBottom = showMonthName
        ? line3CenterY + weekNumFontSize * 0.6 + padding
        : (showWeekNum
            ? line2CenterY + weekNumFontSize * 0.6 + padding
            : line1CenterY + fontSize * 0.6 + padding);
    const rectHeight = rectBottom - rectTop;

    // Ширина — по самой широкой строке
    const line1Width = displayValue.length * fontSize * 0.65 + padding * 2;
    const weekNumText = language === 'ru' ? `нед ${weekNumber}` : `wk ${weekNumber}`;
    const line2Width = showWeekNum ? weekNumText.length * weekNumFontSize * 0.65 + padding * 2 : 0;
    const line3Width = showMonthName ? monthName.length * weekNumFontSize * 0.65 + padding * 2 : 0;
    const rectWidth = Math.max(line1Width, line2Width, line3Width, 28);

    return (
        <g transform={`translate(${x},${y})`}>
            {isHighlighted && (
                <rect
                    x={-rectWidth / 2}
                    y={rectTop}
                    width={rectWidth}
                    height={rectHeight}
                    fill="#22c55e"
                    rx={5}
                    opacity={0.2}
                />
            )}
            <text x={0} y={0} dy={16} textAnchor="middle" fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
                {displayValue}
            </text>
            {showWeekNum && (
                <text x={0} y={0} dy={30} textAnchor="middle" fill={weekFill} fontSize={weekNumFontSize} fontWeight={isHighlighted ? 700 : 500}>
                    {language === 'ru' ? `нед ${weekNumber}` : `wk ${weekNumber}`}
                </text>
            )}
            {showMonthName && (
                <text x={0} y={0} dy={42} textAnchor="middle" fill={weekFill} fontSize={weekNumFontSize} fontWeight={isHighlighted ? 700 : 500}>
                    {monthName}
                </text>
            )}
        </g>
    );
};


const CustomBarLabel = ({ x, y, width, height, value, color, baseSize = 14, suffix = '' }) => {
    if (!value || value <= 0) return null;

    // For horizontal bars, width is the bar length, height is the bar thickness
    const fontSize = width < 25 ? Math.max(8, baseSize - 4) : baseSize;

    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={800}
            style={{ pointerEvents: 'none' }}
        >
            {value}{suffix}
        </text>
    );
};

const CustomBarShape = (props) => {
    const { payload, dataKey, radius } = props;

    const keys = ['countCapped', 'countRestored'];
    const currentIndex = keys.indexOf(dataKey);

    let isTop = true;
    if (currentIndex !== -1) {
        for (let i = currentIndex + 1; i < keys.length; i++) {
            if (payload[keys[i]] > 0) {
                isTop = false;
                break;
            }
        }
    }

    const finalRadius = isTop ? radius : [0, 0, 0, 0];
    return <Rectangle {...props} radius={finalRadius} />;
};

const PercentageBadge = ({ x, y, width, height, value, badgeW, badgeH, fSize, period }) => {
    if (!value || (value === '0%' && period !== 'day')) return null;
    const fs = fSize || 16;
    // For horizontal bars, place to the right of the bar
    const cx = x + width + 15;
    const cy = y + height / 2;
    return (
        <text
            x={cx}
            y={cy}
            fill="#22c55e"
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={fs}
            fontWeight={800}
            style={{ pointerEvents: 'none' }}
        >
            {value}
        </text>
    );
};

const PercentageBadgeVertical = ({ x, y, width, height, value, badgeW, badgeH, fSize, period }) => {
    if (!value || value === '0%') return null;
    const fs = fSize || 16;
    const cx = x + width / 2;
    // place percentage label slightly above bar top
    const cy = y - 12;
    return (
        <text
            x={cx}
            y={cy}
            fill="#22c55e"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fs}
            fontWeight={800}
            style={{ pointerEvents: 'none' }}
        >
            {value}
        </text>
    );
};

const HabitsComparisonChart = ({ period, viewType, currentWeekDate, selectedCategory, theme, t, language, chartData: mainChartData, storageMode }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    const indicatorRef = useRef(null);
    const isMobile = window.innerWidth <= 480;
    const isDark = theme === 'dark';

    const periodLabel = useMemo(() => {
        if (!currentWeekDate) return { title: '', subtitle: '' };
        const date = new Date(currentWeekDate);
        return generatePeriodLabel(period, date, t, language);
    }, [currentWeekDate, period, language, t]);

    useEffect(() => {
        const fetchHabitComparison = async () => {
            if (!currentWeekDate) return;
            setLoading(true);
            try {
                const apiDate = new Date(currentWeekDate);
                const dateStr = apiDate.toISOString().split('T')[0];
                
                const result = await storageService.getComparison(storageMode, {
                    period,
                    date: dateStr,
                    category: selectedCategory || 'Все'
                }, {
                    headers: { 'Accept-Language': language },
                    credentials: 'include'
                });
                
                const mappedData = (result.habits || result.data || []).map(item => ({
                    ...item,
                    streakDays: item.streak_days || 0,
                    streakPercentage: item.streak_percentage || 0,
                    countExtra: item.extra_quantity || item.count_extra || 0,
                    count_capped: item.completed_days || 0,
                    shortName: item.name.length > 12 ? item.name.substring(0, 10) + '..' : item.name
                }));
                setData(mappedData);
            } catch (error) {
                console.error('Error fetching comparison data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHabitComparison();
    }, [period, currentWeekDate, selectedCategory, language, storageMode]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            // For quantity mode: only show habits with quantity data
            if (viewType === 'quantity') return (item.countExtra || 0) > 0;
            // For habits mode: show ALL habits (even with 0 streak days)
            return true;
        });
    }, [data, viewType]);

    const chartHeight = useMemo(() => Math.max(200, filteredData.length * 45), [filteredData.length]);

    const handleScroll = (e) => {
        if (indicatorRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = e.target;
            const scrollPercent = (scrollLeft / (scrollWidth - clientWidth)) * 100;
            indicatorRef.current.style.left = `${scrollPercent}%`;
        }
    };

    const maxValue = filteredData.reduce((m, d) => {
        const value = viewType === 'habits' ? (d.count_capped || 0) : (d.countExtra || 0);
        return Math.max(m, value);
    }, 0);

    const effectiveMax = useMemo(() => {
        return Math.max(1, maxValue);
    }, [maxValue]);

    const CustomStreakLabel = (props) => {
        const { x, y, width, value, index } = props;
        const item = filteredData[index];
        if (!item || !value || value <= 0) return null;

        // Show count and percentage of dark-green days out of total possible
        const labelText = value > 0 ? `${value} ${t('daysShort') || 'д.'}` : '';

        if (!labelText) return null;

        return (
            <text x={x + width + 5} y={y + 16} fill={isDark ? "#E0E0E0" : "#666"} fontSize={11} fontWeight="600">
                {labelText}
            </text>
        );
    };

    if (loading) return (
        <div className="comparison-chart-loading">
            <div className="mini-spinner"></div>
            <p>{t('loadingStats')}</p>
        </div>
    );

    if (data.length === 0) return (
        <div className="habits-comparison-section">
            <div className="comparison-header"><h3>{t('habitProgress')}</h3></div>
            <div className="comparison-footer"><div className="comparison-footer-label">{periodLabel.title}</div></div>
            <div className="comparison-no-data"><p>📊 {t('noData')}</p></div>
        </div>
    );

    const chartMinWidth = filteredData.length > 5 ? `${Math.max(filteredData.length * (isMobile ? 55 : 75), 100)}px` : '100%';
    const showScroll = filteredData.length > 5;

    return (
        <div className="habits-comparison-section">
            <div className="comparison-header"><h3>{t('habitProgress')}</h3></div>
            <div className="comparison-footer"><div className="comparison-footer-label">{periodLabel.title}</div></div>
            <div className="comparison-chart-layout horizontal">
                <div className="comparison-scroll-wrapper" onScroll={handleScroll} ref={scrollRef}>
                    <div className="comparison-chart-inner">
                        <ResponsiveContainer width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                            <BarChart
                                layout="vertical"
                                data={filteredData}
                                margin={{ top: 5, right: 100, left: 10, bottom: 5 }}
                                barSize={isMobile ? 22 : 26}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                <XAxis type="number" hide domain={[0, effectiveMax]} />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={isMobile ? 90 : 130} 
                                    tick={{ fill: isDark ? "#E0E0E0" : "#666", fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Bar 
                                    dataKey={viewType === 'habits' ? 'count_capped' : 'countExtra'} 
                                    fill={viewType === 'habits' ? "#059669" : "#8B5CF6"} 
                                    radius={[0, 4, 4, 0]}
                                    isAnimationActive={false}
                                >
                                    <LabelList dataKey={viewType === 'habits' ? 'count_capped' : 'countExtra'} content={(props) => <CustomStreakLabel {...props} />} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            {showScroll && (
                <div className="scroll-indicator-container">
                    <div className="scroll-indicator-bar" ref={indicatorRef}></div>
                </div>
            )}
        </div>
    );
};

const CategoryComparisonTable = ({ period, currentWeekDate, theme, t, language, storageMode, sortedCategories }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));

    const fetchAllData = useCallback(async () => {
        if (period === 'week') {
            const habitMap = new Map();
            // currentWeekDate — это понедельник; endDate = воскресенье (Monday + 6)
            const startDate = new Date(currentWeekDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            const promises = [];
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                // Используем локальную дату, чтобы избежать UTC-сдвига
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dayStr = `${y}-${m}-${day}`;
                promises.push(
                    storageService.getComparison(storageMode, {
                        period: 'day',
                        date: dayStr,
                        category: 'Все'
                    }, { credentials: 'include' })
                );
            }

            try {
                const results = await Promise.all(promises);
                results.forEach(result => {
                    if (result.habits) {
                        result.habits.forEach(item => {
                            if (!habitMap.has(item.id)) {
                                habitMap.set(item.id, {
                                    ...item,
                                    countCapped: 0,
                                    countRestored: 0,
                                    countExtra: 0
                                });
                            }
                            const habit = habitMap.get(item.id);
                            habit.countCapped += (item.completed_days || 0);
                            habit.countRestored += (item.restored_days || 0);
                            habit.countExtra += (item.extra_quantity || 0);
                        });
                    }
                });
                setData(Array.from(habitMap.values()));
            } catch (error) {
                console.error('Error fetching category comparison data:', error);
            } finally {
                setLoading(false);
            }
            return;
        }

        const apiDate = new Date(currentWeekDate);
        if (period === 'month') apiDate.setDate(1);
        else if (period === 'year') apiDate.setMonth(0, 1);
        // Используем локальную дату, чтобы избежать смещения UTC (timezone bug)
        const year = apiDate.getFullYear();
        const month = String(apiDate.getMonth() + 1).padStart(2, '0');
        const day = String(apiDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        try {
            const result = await storageService.getComparison(storageMode, {
                period,
                date: dateStr,
                category: 'Все'
            }, { credentials: 'include' });
            setData(result.habits.map(h => ({
                ...h,
                countCapped: h.completed_days,
                countRestored: h.restored_days,
                countExtra: h.extra_quantity
            })));
        } catch (error) {
            console.error('Error fetching category comparison data:', error);
        } finally {
            setLoading(false);
        }
    }, [period, currentWeekDate, storageMode]);

    // Initial load + real-time polling every 30 seconds
    useEffect(() => {
        setLoading(true);
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    const categoryStats = useMemo(() => {
        const stats = {};
        data.forEach(item => {
            const cat = item.category_name || t('noCategory');
            if (!stats[cat]) {
                stats[cat] = { name: cat, total: 0, extra: 0, habits: 0 };
            }
            stats[cat].total += (item.countCapped || 0); // только тёмно-зелёные (streak)
            stats[cat].extra += (item.countExtra || 0);
            stats[cat].habits += 1;
        });

        const allStats = Object.values(stats);

        // Если есть sortedCategories — используем их порядок как на странице треков
        if (sortedCategories && sortedCategories.length > 0) {
            const orderMap = {};
            sortedCategories.forEach((cat, idx) => {
                const name = cat.name === 'Все' ? null : cat.name;
                if (name) orderMap[name] = idx;
            });
            allStats.sort((a, b) => {
                const ia = orderMap[a.name] ?? 9999;
                const ib = orderMap[b.name] ?? 9999;
                return ia - ib;
            });
        } else {
            allStats.sort((a, b) => b.total - a.total);
        }

        return allStats;
    }, [data, t, sortedCategories]);

    // Привычки сгруппированные по категории
    const habitsByCategory = useMemo(() => {
        const map = {};
        data.forEach(item => {
            const cat = item.category_name || t('noCategory');
            if (!map[cat]) map[cat] = [];
            map[cat].push(item);
        });
        return map;
    }, [data, t]);

    const [expandedCategories, setExpandedCategories] = useState(new Set());

    const toggleCategory = (catName) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catName)) next.delete(catName);
            else next.add(catName);
            return next;
        });
    };

    if (loading || categoryStats.length === 0) return null;

    return (
        <div className="category-comparison-section">
            <div className="comparison-header">
                <h3>{t('categoryComparison')}</h3>
            </div>
            <div className="category-table-container">
                <table className="category-comparison-table">
                    <thead>
                        <tr>
                            <th>{t('category')}</th>
                            <th>{t('totalDone')}</th>
                            <th>{t('quantity')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryStats.map((stat, idx) => {
                            const maxTotal = Math.max(...categoryStats.map(s => s.total)) || 1;
                            const maxExtra = Math.max(...categoryStats.map(s => s.extra)) || 1;
                            const progressWidth = (stat.total / maxTotal) * 100;
                            const extraWidth = (stat.extra / maxExtra) * 100;
                            const isExpanded = expandedCategories.has(stat.name);
                            const habits = habitsByCategory[stat.name] || [];
                            const maxHabitTotal = Math.max(...habits.map(h => h.countCapped || 0)) || 1;
                            const maxHabitExtra = Math.max(...habits.map(h => h.countExtra || 0)) || 1;
                            return (
                                <React.Fragment key={idx}>
                                    <tr className="cat-row">
                                        <td className="cat-name-cell">
                                            <button
                                                className={`cat-toggle-btn ${isExpanded ? 'expanded' : ''}`}
                                                onClick={() => toggleCategory(stat.name)}
                                                aria-expanded={isExpanded}
                                                aria-label={isExpanded 
                                                    ? (language === 'ru' ? `Свернуть категорию ${stat.name}` : `Collapse category ${stat.name}`) 
                                                    : (language === 'ru' ? `Развернуть категорию ${stat.name}` : `Expand category ${stat.name}`)
                                                }
                                            >
                                                <svg
                                                    className="cat-toggle-icon"
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 12 12"
                                                    fill="none"
                                                    aria-hidden="true"
                                                    focusable="false"
                                                >
                                                    <path
                                                        d="M4 2.5L7.5 6L4 9.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.75"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                            {stat.name}
                                        </td>
                                        <td className="cat-value-cell">
                                            <div className="cat-progress-container">
                                                <span className="cat-progress-number">{stat.total}</span>
                                                <div className="cat-progress-bar-bg">
                                                    <div className="cat-progress-bar-fill" style={{ width: `${progressWidth}%` }}></div>
                                                </div>
                                                <span className="cat-progress-percent">{Math.round(progressWidth)}%</span>
                                            </div>
                                        </td>
                                        <td className="cat-value-cell cat-value-quantity">
                                            {stat.extra > 0 ? (
                                                <div className="cat-progress-container">
                                                    <span className="cat-progress-number cat-quantity-number">{stat.extra}</span>
                                                    <div className="cat-progress-bar-bg cat-progress-bar-bg--purple">
                                                        <div className="cat-progress-bar-fill cat-progress-bar-fill--purple" style={{ width: `${extraWidth}%` }}></div>
                                                    </div>
                                                    <span className="cat-progress-percent">{Math.round(extraWidth)}%</span>
                                                </div>
                                            ) : (
                                                <span className="cat-quantity-zero">—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && habits.map((habit, hIdx) => {
                                        const hProgressWidth = ((habit.countCapped || 0) / maxHabitTotal) * 100;
                                        const hExtraWidth = ((habit.countExtra || 0) / maxHabitExtra) * 100;
                                        return (
                                            <tr key={`h-${hIdx}`} className="cat-habit-row">
                                                <td className="cat-habit-name-cell">↳ {habit.name}</td>
                                                <td className="cat-value-cell">
                                                    <div className="cat-progress-container">
                                                        <span className="cat-progress-number">{habit.countCapped || 0}</span>
                                                        <div className="cat-progress-bar-bg">
                                                            <div className="cat-progress-bar-fill" style={{ width: `${hProgressWidth}%` }}></div>
                                                        </div>
                                                        <span className="cat-progress-percent">{Math.round(hProgressWidth)}%</span>
                                                    </div>
                                                </td>
                                                <td className="cat-value-cell cat-value-quantity">
                                                    {(habit.countExtra || 0) > 0 ? (
                                                        <div className="cat-progress-container">
                                                            <span className="cat-progress-number cat-quantity-number">{habit.countExtra}</span>
                                                            <div className="cat-progress-bar-bg cat-progress-bar-bg--purple">
                                                                <div className="cat-progress-bar-fill cat-progress-bar-fill--purple" style={{ width: `${hExtraWidth}%` }}></div>
                                                            </div>
                                                            <span className="cat-progress-percent">{Math.round(hExtraWidth)}%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="cat-quantity-zero">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── CalendarReport ────────────────────────────────────────────────────────────

const MONTH_NAMES = {
    ru: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    en: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
};
const QUARTER_NAMES = {
    ru: ['I КВАРТАЛ', 'II КВАРТАЛ', 'III КВАРТАЛ', 'IV КВАРТАЛ'],
    en: ['I QUARTER', 'II QUARTER', 'III QUARTER', 'IV QUARTER']
};
const QUARTERS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]];
const DAY_HEADERS = {
    ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

const CalendarReport = ({ theme, t, language, storageMode, selectedCategory }) => {
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [dayData, setDayData] = useState({});
    const [loading, setLoading] = useState(true);

    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));
    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    const monthNames = MONTH_NAMES[language] || MONTH_NAMES.ru;
    const quarterNames = QUARTER_NAMES[language] || QUARTER_NAMES.ru;
    const dayHeaders = DAY_HEADERS[language] || DAY_HEADERS.ru;

    useEffect(() => {
        const fetchCalendarData = async () => {
            setLoading(true);
            try {
                const result = await storageService.getDailyStatistics(
                    storageMode,
                    {
                        start_date: `${calYear}-01-01`,
                        end_date: `${calYear}-12-31`,
                        category: selectedCategory || 'Все'
                    },
                    { credentials: 'include' }
                );
                const map = {};
                (result.data || []).forEach(item => {
                    map[item.date] = {
                        completed: item.completed_days || 0,
                        quantity: item.extra_quantity || 0,
                        habitCount: item.habit_count || 0
                    };
                });
                setDayData(map);
            } catch (e) {
                console.error('Ошибка загрузки данных календаря:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchCalendarData();
    }, [calYear, selectedCategory, storageMode]);

    const renderMonth = useCallback((monthIdx) => {
        const firstDay = new Date(calYear, monthIdx, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(calYear, monthIdx + 1, 0).getDate();

        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const mm = String(monthIdx + 1).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            cells.push({ day: d, dateStr: `${calYear}-${mm}-${dd}` });
        }

        return (
            <div className="cal-month" key={monthIdx}>
                <div className="cal-month-title">{monthNames[monthIdx]}</div>
                <div className="cal-grid">
                    {dayHeaders.map(h => (
                        <div key={h} className="cal-day-header">{h}</div>
                    ))}
                    {cells.map((cell, idx) => {
                        if (!cell) {
                            return <div key={`e-${monthIdx}-${idx}`} className="cal-day cal-day-empty" />;
                        }
                        const { day, dateStr } = cell;
                        const data = dayData[dateStr];
                        const completed = data?.completed || 0;
                        const quantity = data?.quantity || 0;
                        const habitCount = data?.habitCount || 0;
                        const isFuture = dateStr > todayStr;
                        const isToday = dateStr === todayStr;
                        const isDone = completed > 0 && !isFuture;

                        const ratio = habitCount > 0 ? completed / habitCount : 0;

                        const cellStyle = {};
                        if (isDone) {
                            cellStyle.backgroundColor = isDark
                                ? '#059669'
                                : '#22c55e';
                        }

                        const showNumber = isDone && completed > 0;
                        const displayNumber = quantity > 0 ? quantity : completed;

                        return (
                            <div
                                key={dateStr}
                                className={[
                                    'cal-day',
                                    isDone ? 'done' : '',
                                    isFuture ? 'future' : '',
                                    isToday ? 'today' : ''
                                ].filter(Boolean).join(' ')}
                                style={cellStyle}
                                title={
                                    isDone
                                        ? language === 'ru'
                                            ? `${dateStr}: выполнено ${completed} из ${habitCount}${quantity > 0 ? `, кол-во: ${quantity}` : ''}`
                                            : `${dateStr}: completed ${completed} of ${habitCount}${quantity > 0 ? `, qty: ${quantity}` : ''}`
                                        : dateStr
                                }
                            >
                                <span className="cal-day-num">{day}</span>
                                {showNumber && (
                                    <span className="cal-day-count">{displayNumber}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }, [calYear, dayData, todayStr, isDark, language, monthNames, dayHeaders]);

    return (
        <div className="cal-report-container">
            <div className="cal-year-nav">
                <button
                    className="cal-nav-btn"
                    onClick={() => setCalYear(y => y - 1)}
                    aria-label={language === 'ru' ? 'Предыдущий год' : 'Previous year'}
                >←</button>
                <span className="cal-year-label">{calYear}</span>
                <button
                    className="cal-nav-btn"
                    onClick={() => setCalYear(y => y + 1)}
                    aria-label={language === 'ru' ? 'Следующий год' : 'Next year'}
                >→</button>
            </div>

            {loading ? (
                <div className="charts-loading">
                    <div className="loading-spinner" />
                    <p>{t('loading') || 'Загрузка...'}</p>
                </div>
            ) : (
                <div className="cal-quarters">
                    {QUARTERS.map((monthIdxs, qIdx) => (
                        <div key={qIdx} className="cal-quarter">
                            <div className="cal-quarter-title">{quarterNames[qIdx]}</div>
                            <div className="cal-quarter-months">
                                {monthIdxs.map(mIdx => renderMonth(mIdx))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Charts ────────────────────────────────────────────────────────────────────

const Charts = ({ 
    getCookie, 
    habitsData, 
    handleGenerateReport, 
    handleGenerateSummaryReport, 
    isReportLoading, 
    currentWeekDate,
    sortedCategories,
    selectedCategory,
    onSelectCategory,
    theme,
    t,
    language,
    storageMode
}) => {
    const [reportView, setReportView] = useState('charts'); // 'charts' | 'calendar'
    const [period, setPeriod] = useState('day');
    const [viewType, setViewType] = useState('habits'); // 'habits' or 'quantity'
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartDate, setChartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    });
    
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef(null);

    const selectedCategoryName = useMemo(() => {
        if (selectedCategory === 'all' || selectedCategory === 'Все') return t('allCategories') || 'Все категории';
        return selectedCategory === 'Без категории' ? t('noCategory') : selectedCategory;
    }, [selectedCategory, t]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 480;
    const isTablet = windowWidth < 768;
    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));
    const CHART_HEIGHT = isMobile ? 400 : isTablet ? 500 : 650;
    const xAxisDataKey = 'index';
    const xAxisHeight = isMobile ? (period === 'week' ? 65 : 50) : (period === 'week' ? 72 : 40);
    const barLabelSize = isMobile ? 10 : isTablet ? 12 : 18;
    const barCategoryGap = '0%';
    const barGap = 0;
    const [periodLabel, setPeriodLabel] = useState({ title: '', subtitle: '' });

    const mainScrollRef = useRef(null);
    const mainIndicatorRef = useRef(null);

    // Set initial period label
    useEffect(() => {
        setPeriodLabel(generatePeriodLabel(period, currentWeekDate, t, language));
    }, []);

    const handleMainScroll = (e) => {
        if (!mainIndicatorRef.current) return;
        const { scrollLeft, scrollWidth } = e.target;
        const left = (scrollLeft / scrollWidth) * 100;
        mainIndicatorRef.current.style.left = `${left}%`;
    };

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        if (newPeriod === 'day') {
            const now = new Date();
            setChartDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
        } else {
            setChartDate(currentWeekDate);
        }
    };

    useEffect(() => {
        if (mainScrollRef.current && mainIndicatorRef.current) {
            const { scrollWidth, clientWidth } = mainScrollRef.current;
            const width = (clientWidth / scrollWidth) * 100;
            mainIndicatorRef.current.style.width = `${width}%`;
            // Reset scroll on period change
            mainScrollRef.current.scrollLeft = 0;
            mainIndicatorRef.current.style.left = '0%';
        }
    }, [chartData.length, period]);

    const fetchStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const json = await storageService.getDailyStatistics(storageMode, {
                period,
                date: chartDate,
                category: selectedCategory || 'Все'
            }, {
                credentials: 'include'
            });

            setPeriodLabel(generatePeriodLabel(period, chartDate, t, language));
                const todayStr = new Date().toISOString().split('T')[0];
                const weekDayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                
                // Calculate current week range for highlighting
                const today = new Date();
                const dayOfWeek = today.getDay();
                const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                const currentMonday = new Date(today);
                currentMonday.setDate(diff);
                currentMonday.setHours(0, 0, 0, 0);
                const currentSunday = new Date(currentMonday);
                currentSunday.setDate(currentMonday.getDate() + 6);
                currentSunday.setHours(23, 59, 59, 999);
                const currentMondayStr = currentMonday.toLocaleDateString('en-CA');
                
                const formattedData = json.data.map((item, index) => {
                    const isFuture = item.date > todayStr;
                    const habitCount = item.habit_count || 0;
                    const maxPossible = habitCount * item.days_in_period;
                    const completed = item.completed_days || 0;

                    let percentageStr = '';
                    if (!isFuture && maxPossible > 0) {
                        const rawPercent = (completed / maxPossible) * 100;
                        const roundedPercent = Math.round(rawPercent);
                        const finalPercent = (completed > 0 && roundedPercent === 0) ? 1 : roundedPercent;
                        percentageStr = `${finalPercent}%`;
                    } else if (!isFuture && maxPossible === 0) {
                        percentageStr = '0%';
                    }

                    const parsedDate = new Date(item.date);
                    const weekDay = t(weekDayKeys[parsedDate.getDay()]);
                    const dayNumber = String(parsedDate.getDate());
                    
                    // Check if this is the current week
                    const isCurrentWeek = period === 'week' && item.date === currentMondayStr;
                    
                    // Check if this is the current month
                    const isCurrentMonth = period === 'month' && 
                        parsedDate.getMonth() === today.getMonth() && 
                        parsedDate.getFullYear() === today.getFullYear();
                    
                    // Check if this is the current year
                    const isCurrentYear = period === 'year' && 
                        parsedDate.getFullYear() === today.getFullYear();

                    const commonData = {
                        index: index,
                        label: item.label || item.date,
                        weekNumber: item.week_number || null,
                        date: item.date,
                        fullDate: item.date,
                        isToday: item.date === todayStr,
                        isCurrentWeek: isCurrentWeek,
                        isCurrentMonth: isCurrentMonth,
                        isCurrentYear: isCurrentYear,
                        habit_count: habitCount
                    };

                    const countCapped = item.completed_days || 0;
                    const streakCount = item.streak_count || 0;
                    const nonStreakCapped = Math.max(0, countCapped - streakCount);
                    return {
                        ...commonData,
                        dayMonth: weekDay,
                        dayNumber: dayNumber,
                        countTotal: item.completed_count,
                        countCapped: countCapped,
                        nonStreakCapped: nonStreakCapped,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        streakCount: streakCount,
                        percentage: percentageStr
                    };
                });
                // Filter out columns for periods before any habits were created (where habit_count is 0)
                const filteredData = formattedData
                    .filter(item => (item.habit_count || 0) > 0)
                    .map((item, idx) => ({ ...item, index: idx }));

                // Добавим фиктивные точки если данных мало
                let paddedData = filteredData;
                if (filteredData.length === 1) {
                    paddedData = [
                        { ...filteredData[0], index: 0 },
                        { 
                            ...filteredData[0], 
                            index: 1, 
                            countCapped: 0, 
                            countRestored: 0, 
                            countExtra: 0, 
                            streakCount: 0, 
                            label: '', 
                            dayMonth: '', 
                            dayNumber: '',
                            percentage: '',
                            isToday: false,
                            isCurrentWeek: false,
                            isCurrentMonth: false,
                            isCurrentYear: false
                        },
                        { 
                            ...filteredData[0], 
                            index: 2, 
                            countCapped: 0, 
                            countRestored: 0, 
                            countExtra: 0, 
                            streakCount: 0, 
                            label: '', 
                            dayMonth: '', 
                            dayNumber: '',
                            percentage: '',
                            isToday: false,
                            isCurrentWeek: false,
                            isCurrentMonth: false,
                            isCurrentYear: false
                        }
                    ];
                }
                setChartData(paddedData);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    }, [period, chartDate, selectedCategory, t, language, storageMode]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    useEffect(() => {
        // Only sync date from parent when NOT in day mode (day mode manages its own date)
        if (period !== 'day') {
            setChartDate(currentWeekDate);
        }
    }, [currentWeekDate, period]);

    const handlePrevPeriod = () => {
        setChartDate(prevDate => {
            const date = new Date(prevDate);
            if (period === 'day' || period === 'week') {
                date.setDate(date.getDate() - 7);
            } else if (period === 'month') {
                date.setMonth(date.getMonth() - 1);
            } else if (period === 'year') {
                date.setFullYear(date.getFullYear() - 1);
            }
            return date.toISOString().split('T')[0];
        });
    };

    const handleNextPeriod = () => {
        setChartDate(prevDate => {
            const date = new Date(prevDate);
            if (period === 'day' || period === 'week') {
                date.setDate(date.getDate() + 7);
            } else if (period === 'month') {
                date.setMonth(date.getMonth() + 1);
            } else if (period === 'year') {
                date.setFullYear(date.getFullYear() + 1);
            }
            return date.toISOString().split('T')[0];
        });
    };

    return (
        <div className="charts-container">
            <div className="charts-header">
                <div className="charts-title-row">
                    <h2>{t('statistics')}</h2>
                    {/* Переключатель вкладок */}
                    <div className="report-tab-switcher">
                        <button
                            id="report-tab-charts"
                            className={`report-tab-btn${reportView === 'charts' ? ' active' : ''}`}
                            onClick={() => setReportView('charts')}
                            title={language === 'ru' ? 'Графики' : 'Charts'}
                            aria-label={language === 'ru' ? 'Графики' : 'Charts'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="12" width="4" height="9" rx="1"/>
                                <rect x="10" y="7" width="4" height="14" rx="1"/>
                                <rect x="17" y="3" width="4" height="18" rx="1"/>
                            </svg>
                        </button>
                        <button
                            id="report-tab-calendar"
                            className={`report-tab-btn${reportView === 'calendar' ? ' active' : ''}`}
                            onClick={() => setReportView('calendar')}
                            title={language === 'ru' ? 'Календарный отчёт' : 'Calendar report'}
                            aria-label={language === 'ru' ? 'Календарный отчёт' : 'Calendar report'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                                <rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
                                <rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {reportView === 'charts' && (
                <>

                <div className="chart-navigation-controls">
                    <button className="nav-arrow-btn" onClick={handlePrevPeriod}>←</button>
                    <div className="navigation-labels">
                        <span className="current-period-label">
                            <span>{periodLabel.title}</span>
                            {periodLabel.subtitle && <span className="current-period-subtitle">{periodLabel.subtitle}</span>}
                        </span>
                    </div>
                    <button className="nav-arrow-btn" onClick={handleNextPeriod}>→</button>
                </div>

                <div className="selectors-container">
                    <div className="view-selector">
                        <button
                            className={`view-btn habits ${viewType === 'habits' ? 'active' : ''}`}
                            onClick={() => setViewType('habits')}
                        >
                            {t('completed')}
                        </button>
                        <button
                            className={`view-btn quantity ${viewType === 'quantity' ? 'active' : ''}`}
                            onClick={() => setViewType('quantity')}
                        >
                            {t('quantity')}
                        </button>
                    </div>
                </div>

                <div className="charts-category-row">
                    <div className="period-selector">
                        <button
                            className={`period-btn ${period === 'day' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('day')}
                        >
                            {t('days')}
                        </button>
                        <button
                            className={`period-btn ${period === 'week' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('week')}
                        >
                            {t('weeks')}
                        </button>
                        <button
                            className={`period-btn ${period === 'month' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('month')}
                        >
                            {t('months')}
                        </button>
                        <button
                            className={`period-btn ${period === 'year' ? 'active' : ''}`}
                            onClick={() => handlePeriodChange('year')}
                        >
                            {t('years')}
                        </button>
                    </div>

                    {sortedCategories && onSelectCategory && (
                        <div className="analytics-habit-selector analytics-category-selector" ref={categoryDropdownRef} style={{ zIndex: isCategoryDropdownOpen ? 1010 : 1000, margin: 0 }}>
                            <div 
                                className={`custom-dropdown-header ${isCategoryDropdownOpen ? 'open' : ''}`}
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            >
                                <span>{selectedCategoryName}</span>
                                <div className="dropdown-arrow-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                            {isCategoryDropdownOpen && (
                                <div className="custom-dropdown-list">
                                    {sortedCategories.map(cat => (
                                        <div 
                                            key={cat.id} 
                                            className={`dropdown-item ${selectedCategory === cat.name ? 'active' : ''}`}
                                            onClick={() => {
                                                onSelectCategory(cat.name);
                                                setIsCategoryDropdownOpen(false);
                                            }}
                                        >
                                            {cat.name === 'Все' ? (t('allCategories') || 'Все категории') : 
                                             (cat.name === 'Без категории' ? t('noCategory') : cat.name)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                </>
                )}
            </div>

            {reportView === 'calendar' ? (
                <CalendarReport
                    theme={theme}
                    t={t}
                    language={language}
                    storageMode={storageMode}
                    selectedCategory={selectedCategory}
                />
            ) : (
            <>
            {loading ? (
                <div className="charts-loading">
                    <div className="loading-spinner"></div>
                    <p>{t('loading')}</p>
                </div>
            ) : (
                <div className="chart-wrapper">
                    <div className="main-chart-scroll-wrapper" onScroll={handleMainScroll} ref={mainScrollRef}>
                        <div className="main-chart-inner" style={{ 
                            width: `${Math.max(chartData.length * (isMobile ? 50 : 70), 400)}px`,
                            transition: 'width 0.3s ease'
                        }}>
                            <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 8, right: 30, left: 0, bottom: 10 }}
                                    barCategoryGap={chartData.length === 1 ? "2%" : "10%"}
                                    barGap={chartData.length === 1 ? 0 : 2}
                                    barSize={isMobile ? 18 : isTablet ? 22 : 28}
                                    maxBarSize={100}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#404040" : "#e0e0e0"} />
                                    <XAxis
                                        dataKey={xAxisDataKey}
                                        stroke={isDark ? "#666" : "#666"}
                                        tick={<CustomXAxisTick period={period} isMobile={isMobile} isDark={isDark} chartData={chartData} t={t} language={language} />}
                                        height={xAxisHeight}
                                        interval={0}
                                        tickLine={false}
                                        axisLine={false}
                                        type="category"
                                    />
                                    <YAxis
                                        stroke={isDark ? "#666" : "#666"}
                                        tick={{ fill: isDark ? "#E0E0E0" : "#666", fontSize: 12 }}
                                        allowDecimals={false}
                                        domain={[0, (dataMax) => {
                                            if (!dataMax || isNaN(dataMax) || dataMax === 0) return 1;
                                            if (dataMax <= 2) return dataMax + 1;
                                            return Math.ceil(dataMax * 1.15);
                                        }]}
                                        nice={true}
                                    />
                                    {viewType === 'habits' ? (
                                        <>
                                            <Bar
                                                dataKey="countCapped"
                                                stackId="a"
                                                fill="#059669"
                                                radius={[8, 8, 0, 0]}
                                                isAnimationActive={false}
                                                name={t('completed')}
                                                shape={<CustomBarShape />}
                                            >
                                                <LabelList
                                                    dataKey="countCapped"
                                                    content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={barLabelSize} />}
                                                />
                                            </Bar>
                                            <Bar
                                                dataKey="countRestored"
                                                stackId="a"
                                                fill="#6EE7B7"
                                                radius={[8, 8, 0, 0]}
                                                isAnimationActive={false}
                                                name={t('restored')}
                                                shape={<CustomBarShape />}
                                            >
                                                <LabelList
                                                    dataKey="countRestored"
                                                    content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={barLabelSize} />}
                                                />
                                                {period === 'day' && (
                                                    <LabelList
                                                        dataKey="dayMonth"
                                                        position="top"
                                                        content={(props) => {
                                                            const { x, y, value, index, width } = props;
                                                            if (!value || x == null || y == null) return null;
                                                            const chartTop = 8;
                                                            const cx = x + width / 2;
                                                            return (
                                                                <text x={cx} y={chartTop} textAnchor="middle" fill={isDark ? "#E0E0E0" : "#666"} fontSize={isMobile ? 10 : 11} fontWeight={500}>
                                                                    {value}
                                                                </text>
                                                            );
                                                        }}
                                                    />
                                                )}
                                                <LabelList
                                                    dataKey="percentage"
                                                    position="top"
                                                    content={(props) => <PercentageBadgeVertical {...props} fSize={isMobile ? 10 : 12} period={period} />}
                                                />
                                            </Bar>
                                        </>
                                    ) : (
                                        <Bar
                                            dataKey="countExtra"
                                            fill="#8B5CF6"
                                            radius={[8, 8, 0, 0]}
                                            isAnimationActive={false}
                                            name={t('quantity')}
                                            shape={<CustomBarShape />}
                                        >
                                            <LabelList
                                                dataKey="countExtra"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={barLabelSize} />}
                                            />
                                            {period === 'day' && (
                                                <LabelList
                                                    dataKey="dayMonth"
                                                    position="top"
                                                    content={(props) => {
                                                        const { x, y, value, index, width } = props;
                                                        if (!value || x == null || y == null) return null;
                                                        const chartTop = 8;
                                                        const cx = x + width / 2;
                                                        return (
                                                            <text x={cx} y={chartTop} textAnchor="middle" fill={isDark ? "#E0E0E0" : "#666"} fontSize={isMobile ? 10 : 11} fontWeight={500}>
                                                                {value}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            )}
                                        </Bar>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {period === 'year' && chartData.length > 0 && (
                        <div className="main-scroll-indicator-container">
                            <div className="main-scroll-indicator-bar" ref={mainIndicatorRef}></div>
                        </div>
                    )}

                    {chartData.length === 0 && (
                        <div className="no-data-message">
                            <p>📊 {t('noData')}</p>
                            <p className="no-data-hint">{t('noDataHint')}</p>
                        </div>
                    )}
                </div>
            )}

            <CategoryComparisonTable
                period={period}
                currentWeekDate={chartDate}
                theme={theme}
                t={t}
                language={language}
                storageMode={storageMode}
                sortedCategories={sortedCategories}
            />

            {(viewType === 'habits' || viewType === 'quantity') && (
                <HabitsComparisonChart
                    period={period}
                    viewType={viewType}
                    currentWeekDate={chartDate}
                    selectedCategory={selectedCategory}
                    theme={theme}
                    t={t}
                    language={language}
                    chartData={chartData}
                    storageMode={storageMode}
                />
            )}
            </>
            )}
        </div>
    );
};

export default Charts;
