import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Rectangle } from 'recharts';
import './Charts.css';

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

    if (period === 'day') {
        // Today's date
        const dayName = today.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
        const dayNum = today.getDate();
        const monthName = t(months[today.getMonth()]);
        
        return { title: `${dayName}, ${dayNum} ${monthName}`, subtitle: `${today.getFullYear()}` };
    } else if (period === 'week') {
        // Week number and date range
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const monday = new Date(today);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const formatDate = (date) => {
            const day = date.getDate();
            const monthName = t(months[date.getMonth()]);
            return `${day} ${monthName}`;
        };

        const weekNum = getWeekNumber(today);
        return { title: `${language === 'ru' ? 'Неделя' : t('week')} №${weekNum}`, subtitle: `${formatDate(monday)} - ${formatDate(sunday)}` };
    } else if (period === 'month') {
        return { title: `${t(months[today.getMonth()])} ${today.getFullYear()}`, subtitle: '' };
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

    // Calculate highlight rect to fit around the text
    // Text is at y+16 with textAnchor="middle", fontSize
    const padding = 4;
    const rectWidth = Math.max(displayValue.length * fontSize * 0.65 + padding * 2, 28);
    const rectHeight = fontSize + padding * 2;
    const textVisualCenterY = 16 - fontSize * 0.35;

    return (
        <g transform={`translate(${x},${y})`}>
            {isHighlighted && (
                <rect
                    x={-rectWidth / 2}
                    y={textVisualCenterY - rectHeight / 2}
                    width={rectWidth}
                    height={rectHeight}
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

const CustomBarLabel = ({ x, y, width, height, value, color, baseSize = 14 }) => {
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
            {value}
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

const PercentageBadge = ({ x, y, width, height, value, badgeW, badgeH, fSize }) => {
    if (!value || value === '0%') return null;
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

const HabitsComparisonChart = ({ period, viewType, currentWeekDate, selectedCategory, theme, t, language }) => {
    const [data, setData] = useState([]);
    const [periodLabel, setPeriodLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 480;
    const isTablet = windowWidth < 768;
    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));

    const shortenName = (name) => {
        if (name.length > 5) {
            return name.substring(0, 5) + '..';
        }
        return name;
    };

    useEffect(() => {
        const fetchComparisonData = async () => {
            setLoading(true);
            
            // For week period, fetch 7 days of data and aggregate on frontend
            if (period === 'week') {
                const habitMap = new Map();
                const endDate = new Date(currentWeekDate);
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 6);
                
                // Fetch each day's data
                const promises = [];
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dayStr = d.toISOString().split('T')[0];
                    promises.push(
                        fetch(`/api/v1/habits/habit_comparison/?period=day&date=${dayStr}&category=${selectedCategory || 'Все'}`, {
                            credentials: 'include'
                        }).then(res => res.json())
                    );
                }
                
                try {
                    const results = await Promise.all(promises);
                    
                    // Aggregate all 7 days
                    results.forEach(result => {
                        if (result.habits) {
                            result.habits.forEach(item => {
                                if (!habitMap.has(item.id)) {
                                    habitMap.set(item.id, {
                                        id: item.id,
                                        name: item.name,
                                        shortName: shortenName(item.name),
                                        start_date: item.start_date,
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
                    
                    const totalDaysInPeriod = 7;
                    const formatted = Array.from(habitMap.values()).map((item, index) => {
                        let habitDaysInPeriod = 7;
                        if (item.start_date) {
                            const habitStart = new Date(item.start_date);
                            const periodEnd = new Date(currentWeekDate);
                            const periodStart = new Date(periodEnd);
                            periodStart.setDate(periodStart.getDate() - 6);
                            
                            if (habitStart > periodStart) {
                                const diffTime = Math.abs(periodEnd - habitStart);
                                habitDaysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                habitDaysInPeriod = Math.min(Math.max(habitDaysInPeriod, 1), 7);
                            }
                        }

                        const rawPercent = habitDaysInPeriod > 0 
                            ? (item.countCapped / habitDaysInPeriod) * 100 
                            : 0;
                        const roundedPercent = Math.round(rawPercent);
                        const finalPercent = (item.countCapped > 0 && roundedPercent === 0) ? 1 : roundedPercent;
                        const percentageStr = `${finalPercent}%`;

                        return {
                            index: index,
                            id: item.id,
                            name: item.name,
                            shortName: item.shortName,
                            countCapped: item.countCapped,
                            countRestored: item.countRestored,
                            countExtra: item.countExtra,
                            percentage: percentageStr
                        };
                    });
                    
                    setPeriodLabel(generatePeriodLabel(period, currentWeekDate, t, language));
                    setData(formatted);
                } catch (error) {
                    console.error(`Error fetching comparison data:`, error);
                } finally {
                    setLoading(false);
                }
                return;
            }
            
            // For other periods (day, month, year), use normal API call
            const apiDate = new Date(currentWeekDate);
            if (period === 'month') {
                apiDate.setDate(1);
                apiDate.setHours(0, 0, 0, 0);
            } else if (period === 'year') {
                apiDate.setMonth(0, 1);
                apiDate.setHours(0, 0, 0, 0);
            } else {
                apiDate.setHours(0, 0, 0, 0);
            }
            const dateStr = apiDate.toISOString().split('T')[0];
            
            try {
                const response = await fetch(`/api/v1/habits/habit_comparison/?period=${period}&date=${dateStr}&category=${selectedCategory || 'Все'}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const json = await response.json();
                    setPeriodLabel(generatePeriodLabel(period, currentWeekDate, t, language));
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const periodStartDate = new Date(dateStr);
                    if (period === 'month') {
                        periodStartDate.setDate(1);
                        periodStartDate.setHours(0, 0, 0, 0);
                    } else if (period === 'year') {
                        periodStartDate.setMonth(0, 1);
                        periodStartDate.setHours(0, 0, 0, 0);
                    } else if (period === 'day') {
                        periodStartDate.setHours(0, 0, 0, 0);
                    }

                    const totalDaysInPeriod = period === 'day'
                        ? 1
                        : period === 'month' 
                            ? new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, 0).getDate() 
                            : (periodStartDate.getFullYear() % 4 === 0 ? 366 : 365);

                    const formatted = json.habits.map((item, index) => {
                        let habitDaysInPeriod = totalDaysInPeriod;
                        if (item.start_date) {
                            const habitStart = new Date(item.start_date);
                            const periodStart = new Date(dateStr);
                            const periodEnd = new Date(periodStart);
                            if (period === 'month') {
                                periodEnd.setMonth(periodEnd.getMonth() + 1);
                                periodEnd.setDate(0);
                            } else if (period === 'year') {
                                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                                periodEnd.setDate(0);
                            } else if (period === 'day') {
                                // already 1
                            }

                            if (habitStart > periodStart && habitStart <= periodEnd) {
                                const diffTime = Math.abs(periodEnd - habitStart);
                                habitDaysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                habitDaysInPeriod = Math.min(Math.max(habitDaysInPeriod, 1), totalDaysInPeriod);
                            } else if (habitStart > periodEnd) {
                                habitDaysInPeriod = 0;
                            }
                        }

                        const countCapped = item.completed_days || 0;
                        const rawPercent = habitDaysInPeriod > 0 
                            ? (countCapped / habitDaysInPeriod) * 100 
                            : 0;
                        const roundedPercent = Math.round(rawPercent);
                        const finalPercent = (countCapped > 0 && roundedPercent === 0) ? 1 : roundedPercent;
                        const percentageStr = `${finalPercent}%`;

                        return {
                            index: index,
                            id: item.id,
                            name: item.name,
                            shortName: shortenName(item.name),
                            countCapped: countCapped,
                            countRestored: item.restored_days || 0,
                            countExtra: item.extra_quantity,
                            percentage: percentageStr
                        };
                    });
                    setData(formatted);
                }
            } catch (error) {
                console.error(`Error fetching comparison data:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchComparisonData();
    }, [period, currentWeekDate, selectedCategory, t]);

    const scrollRef = useRef(null);
    const indicatorRef = useRef(null);

    const handleScroll = (e) => {
        if (!indicatorRef.current) return;
        const { scrollLeft, scrollWidth } = e.target;
        const left = (scrollLeft / scrollWidth) * 100;
        indicatorRef.current.style.left = `${left}%`;
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (viewType === 'quantity') {
                return (item.countExtra || 0) > 0;
            }
            return ((item.countCapped || 0) + (item.countRestored || 0)) > 0;
        });
    }, [data, viewType]);

    // Dynamic height based on data count for horizontal bars
    const chartHeight = useMemo(() => Math.max(200, filteredData.length * 40), [filteredData.length]);

    // Initialize indicator width
    useEffect(() => {
        if (scrollRef.current && indicatorRef.current) {
            const { scrollWidth, clientWidth } = scrollRef.current;
            const width = (clientWidth / scrollWidth) * 100;
            indicatorRef.current.style.width = `${width}%`;
        }
    }, [filteredData.length]);

    if (loading) return (
        <div className="comparison-chart-loading">
            <div className="mini-spinner"></div>
            <p>{t('loadingStats')}</p>
        </div>
    );

    if (filteredData.length === 0) return null;

    const chartMinWidth = filteredData.length > 5 ? `${Math.max(filteredData.length * (isMobile ? 55 : 75), 100)}px` : '100%';
    const showScroll = filteredData.length > 5;

    const activeKey = viewType === 'habits' ? 'countCapped' : 'countExtra';

    // Calculate the maximum value for the X-axis domain (horizontal bars)
    const maxValue = filteredData.reduce((m, d) => {
        const value = viewType === 'habits'
            ? (d.countCapped || 0) + (d.countRestored || 0)
            : (d.countExtra || 0);
        return Math.max(m, value);
    }, 0);

    // Ensure we have some space for the label
    const effectiveMax = Math.max(7, Math.ceil(maxValue / 7) * 7 + (maxValue > 5 ? 7 : 0));

    return (
        <div className="habits-comparison-section">
            <div className="comparison-header">
                <h3>{t('habitProgress')}</h3>
                <span className="comparison-period">
                    <span>{periodLabel.title}</span>
                    {periodLabel.subtitle && <span className="comparison-period-subtitle">{periodLabel.subtitle}</span>}
                </span>
            </div>

            <div className="comparison-chart-layout horizontal">
                {/* Scrollable chart area for horizontal bars */}
                <div className="comparison-scroll-wrapper" onScroll={handleScroll} ref={scrollRef}>
                    <div className="comparison-chart-inner" style={{ minWidth: chartMinWidth }}>
                        <ResponsiveContainer width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
                            <BarChart data={filteredData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }} barSize={isMobile ? 18 : isTablet ? 22 : 26}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#404040" : "#f0f0f0"} />
                                <XAxis
                                    type="number"
                                    domain={[0, effectiveMax]}
                                    tickCount={8}
                                    stroke={isDark ? "#666" : "#999"}
                                    tick={{ fill: isDark ? "#E0E0E0" : "#666", fontSize: 10 }}
                                    allowDecimals={false}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="index"
                                    stroke={isDark ? "#666" : "#999"}
                                    tick={{ fill: isDark ? "#E0E0E0" : "#666", fontSize: 10 }}
                                    interval={0}
                                    width={60}
                                    tickFormatter={(value) => filteredData[value]?.shortName || ''}
                                    domain={[0, Math.max(filteredData.length - 1, 0)]}
                                    padding={{ top: 0, bottom: 0 }}
                                />

                                {viewType === 'habits' ? (
                                    <>
                                        <Bar dataKey="countCapped" stackId="a" fill="#059669" radius={[0, 4, 4, 0]} name={t('completed')} isAnimationActive={false}>
                                            <LabelList
                                                dataKey="countCapped"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                        </Bar>
                                        <Bar dataKey="countRestored" stackId="a" fill="#6EE7B7" radius={[0, 4, 4, 0]} name={t('restored')} isAnimationActive={false}>
                                            <LabelList
                                                dataKey="countRestored"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                            <LabelList
                                                dataKey="percentage"
                                                position="right"
                                                content={(props) => <PercentageBadge {...props} badgeW={40} badgeH={20} fSize={11} />}
                                            />
                                        </Bar>
                                    </>
                                ) : (
                                    <Bar dataKey="countExtra" fill="#8B5CF6" radius={[0, 4, 4, 0]} name={t('quantity')} isAnimationActive={false}>
                                        <LabelList
                                            dataKey="countExtra"
                                            content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                        />
                                    </Bar>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {showScroll && (
                <div className="scroll-indicator-container">
                    <div
                        className="scroll-indicator-bar"
                        ref={indicatorRef}
                    ></div>
                </div>
            )}
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
    language
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
            const response = await fetch(`/api/v1/habits/daily_statistics/?period=${period}&date=${chartDate}&category=${selectedCategory || 'Все'}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const json = await response.json();
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
                
                const formattedData = json.data.map((item, index) => {
                    const isFuture = item.date > todayStr;
                    const isToday = item.date === todayStr;
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
                    const isCurrentWeek = period === 'week' && parsedDate >= currentMonday && parsedDate <= currentSunday;
                    
                    // Check if this is the current month
                    const isCurrentMonth = period === 'month' && 
                        parsedDate.getMonth() === today.getMonth() && 
                        parsedDate.getFullYear() === today.getFullYear();
                    
                    // Check if this is the current year
                    const isCurrentYear = period === 'year' && 
                        parsedDate.getFullYear() === today.getFullYear();

                    return {
                        index: index,
                        label: item.label || item.date,
                        date: item.date,
                        fullDate: item.date,
                        dayMonth: weekDay,
                        dayNumber: dayNumber,
                        countTotal: item.completed_count,
                        countCapped: item.completed_days,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        percentage: percentageStr,
                        isToday: isToday,
                        isCurrentWeek: isCurrentWeek,
                        isCurrentMonth: isCurrentMonth,
                        isCurrentYear: isCurrentYear
                    };
                });
                // Добавим фиктивные точки если данных мало
                let paddedData = formattedData;
                if (formattedData.length === 1) {
                    paddedData = [
                        { ...formattedData[0], index: -1, countCapped: 0, countRestored: 0, countExtra: 0, label: '', dayMonth: '', dayNumber: '' },
                        { ...formattedData[0], index: 0 },
                        { ...formattedData[0], index: 1, countCapped: 0, countRestored: 0, countExtra: 0, label: '', dayMonth: '', dayNumber: '' }
                    ];
                }
                setChartData(paddedData);
            }
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
                                                            // Position at fixed top of chart instead of above each bar
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
                                            animationDuration={500}
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
                                                        // Position at fixed top of chart instead of above each bar
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

            {viewType === 'quantity' && (
                <HabitsComparisonChart
                    period={period}
                    viewType={viewType}
                    currentWeekDate={chartDate}
                    selectedCategory={selectedCategory}
                    theme={theme}
                    t={t}
                    language={language}
                />
            )}
        </div>
    );
};

export default Charts;
