import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Rectangle } from 'recharts';
import './Charts.css';
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
        return { 
            title: (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                    <span>{language === 'ru' ? 'Неделя' : t('week')} №{weekNum}</span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.9em', fontWeight: 'normal' }}>{formatDate(monday)} - {formatDate(sunday)}</span>
                        <span style={{ fontSize: '0.8em', opacity: 0.7, fontWeight: 'normal' }}>{today.getFullYear()}</span>
                    </span>
                </span>
            ), 
            subtitle: null 
        };
    } else if (period === 'month') {
        return { title: t(months[today.getMonth()]), subtitle: '' };
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

const CustomXAxisTick = ({ x, y, payload, period, isMobile, isDark, chartData }) => {
    if (!payload || payload.value === undefined || payload.value === null) return null;

    const dataIndex = payload.value;
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
    
    const isToday = dataItem?.isToday;
    const isCurrentWeek = dataItem?.isCurrentWeek;
    const isCurrentMonth = dataItem?.isCurrentMonth;
    const isCurrentYear = dataItem?.isCurrentYear;
    const isHighlighted = isToday || isCurrentWeek || isCurrentMonth || isCurrentYear;
    const fontWeight = isHighlighted ? 700 : (period === 'week' ? 600 : 500);
    const fill = isHighlighted ? '#22c55e' : (isDark ? "#E0E0E0" : "#666");

    // Calculate highlight square backdrop to fit around the text
    // Text is at y+16 with textAnchor="middle", fontSize
    const padding = 4;
    const rectWidth = Math.max(displayValue.length * fontSize * 0.65 + padding * 2, 28);
    const rectHeight = fontSize + padding * 2;
    const squareSize = Math.max(rectWidth, rectHeight);
    const textVisualCenterY = 16 - fontSize * 0.35;

    return (
        <g transform={`translate(${x},${y})`}>
            {isHighlighted && (
                <rect
                    x={-squareSize / 2}
                    y={textVisualCenterY - squareSize / 2}
                    width={squareSize}
                    height={squareSize}
                    fill="#22c55e"
                    rx={4}
                    opacity={0.2}
                />
            )}
            <text x={0} y={0} dy={16} textAnchor="middle" fill={fill} fontSize={fontSize} fontWeight={fontWeight}>
                {displayValue}
            </text>
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
            <div className="comparison-no-data"><p>📊 {t('noData')}</p></div>
            <div className="comparison-footer"><div className="comparison-footer-label">{periodLabel.title}</div></div>
        </div>
    );

    const chartMinWidth = filteredData.length > 5 ? `${Math.max(filteredData.length * (isMobile ? 55 : 75), 100)}px` : '100%';
    const showScroll = filteredData.length > 5;

    return (
        <div className="habits-comparison-section">
            <div className="comparison-header"><h3>{t('habitProgress')}</h3></div>
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
            <div className="comparison-footer"><div className="comparison-footer-label">{periodLabel.title}</div></div>
            {showScroll && (
                <div className="scroll-indicator-container">
                    <div className="scroll-indicator-bar" ref={indicatorRef}></div>
                </div>
            )}
        </div>
    );
};

const CategoryComparisonTable = ({ period, currentWeekDate, theme, t, language, storageMode }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            
            if (period === 'week') {
                const habitMap = new Map();
                const endDate = new Date(currentWeekDate);
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 6);
                
                const promises = [];
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dayStr = d.toISOString().split('T')[0];
                    promises.push(
                        storageService.getComparison(storageMode, {
                            period: 'day',
                            date: dayStr,
                            category: 'Все'
                        }, {
                            credentials: 'include'
                        })
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
                    console.error(`Error fetching category comparison data:`, error);
                } finally {
                    setLoading(false);
                }
                return;
            }
            
            const apiDate = new Date(currentWeekDate);
            if (period === 'month') apiDate.setDate(1);
            else if (period === 'year') apiDate.setMonth(0, 1);
            apiDate.setHours(0, 0, 0, 0);
            const dateStr = apiDate.toISOString().split('T')[0];
            
            try {
                const result = await storageService.getComparison(storageMode, {
                    period,
                    date: dateStr,
                    category: 'Все'
                }, {
                    credentials: 'include'
                });
                setData(result.habits.map(h => ({
                    ...h,
                    countCapped: h.completed_days,
                    countRestored: h.restored_days,
                    countExtra: h.extra_quantity
                })));
            } catch (error) {
                console.error(`Error fetching category comparison data:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [period, currentWeekDate, storageMode]);

    const categoryStats = useMemo(() => {
        const stats = {};
        data.forEach(item => {
            const cat = item.category_name || t('noCategory');
            if (!stats[cat]) {
                stats[cat] = { name: cat, total: 0, extra: 0, habits: 0 };
            }
            stats[cat].total += (item.countCapped || 0) + (item.countRestored || 0);
            stats[cat].extra += (item.countExtra || 0);
            stats[cat].habits += 1;
        });
        return Object.values(stats).sort((a, b) => b.total - a.total);
    }, [data, t]);

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
                            <th>{t('progress')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryStats.map((stat, idx) => {
                            const maxTotal = Math.max(...categoryStats.map(s => s.total)) || 1;
                            const progressWidth = (stat.total / maxTotal) * 100;
                            return (
                                <tr key={idx}>
                                    <td className="cat-name-cell">{stat.name}</td>
                                    <td className="cat-value-cell">{stat.total}</td>
                                    <td className="cat-value-cell">{stat.extra}</td>
                                    <td className="cat-progress-cell">
                                        <div className="cat-progress-bar-bg">
                                            <div 
                                                className="cat-progress-bar-fill" 
                                                style={{ width: `${progressWidth}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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
    const [period, setPeriod] = useState('day');
    const [viewType, setViewType] = useState('habits'); // 'habits' or 'quantity'
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartDate, setChartDate] = useState(() => new Date().toISOString().split('T')[0]);
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
    const xAxisHeight = isMobile ? (period === 'week' ? 60 : 50) : (period === 'week' ? 60 : 40);
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
            setChartDate(new Date().toISOString().split('T')[0]);
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
                        date: item.date,
                        fullDate: item.date,
                        isToday: item.date === todayStr,
                        isCurrentWeek: isCurrentWeek,
                        isCurrentMonth: isCurrentMonth,
                        isCurrentYear: isCurrentYear
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
                // Добавим фиктивные точки если данных мало
                let paddedData = formattedData;
                if (formattedData.length === 1) {
                    paddedData = [
                        { ...formattedData[0], index: -1, countCapped: 0, countRestored: 0, countExtra: 0, streakCount: 0, label: '', dayMonth: '', dayNumber: '' },
                        { ...formattedData[0], index: 0 },
                        { ...formattedData[0], index: 1, countCapped: 0, countRestored: 0, countExtra: 0, streakCount: 0, label: '', dayMonth: '', dayNumber: '' }
                    ];
                }
                setChartData(paddedData);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    }, [period, chartDate, selectedCategory, t]);

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
                <h2>{t('statistics')}</h2>
                
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
                </div>

                {sortedCategories && onSelectCategory && (
                    <div className="categories-section unified charts-category-filter">
                        {sortedCategories.map(category => {
                            const displayName = category.name === 'Все' ? t('allCategories') : 
                                             (category.name === 'Без категории' ? t('noCategory') : category.name);
                            return (
                                <button
                                    key={category.id}
                                    className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                                    onClick={() => onSelectCategory(category.name)}
                                >
                                    {displayName}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

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
                                    margin={{ top: 15, right: 30, left: 0, bottom: 10 }}
                                    barCategoryGap={chartData.length === 1 ? "2%" : "10%"}
                                    barGap={chartData.length === 1 ? 0 : 2}
                                    barSize={isMobile ? 18 : isTablet ? 22 : 28}
                                    maxBarSize={100}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#404040" : "#e0e0e0"} />
                                    <XAxis
                                        dataKey={xAxisDataKey}
                                        stroke={isDark ? "#666" : "#666"}
                                        tick={<CustomXAxisTick period={period} isMobile={isMobile} isDark={isDark} chartData={chartData} />}
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
                                        domain={[0, 'dataMax']}
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

            <CategoryComparisonTable
                period={period}
                currentWeekDate={chartDate}
                theme={theme}
                t={t}
                language={language}
                storageMode={storageMode}
            />
        </div>
    );
};

export default Charts;
