import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Rectangle } from 'recharts';
import './Charts.css';

const generatePeriodLabel = (period, referenceDate, t) => {
    const today = new Date(referenceDate);
    const months = ['janFull', 'febFull', 'marFull', 'aprFull', 'mayFull', 'junFull', 'julFull', 'augFull', 'sepFull', 'octFull', 'novFull', 'decFull'];

    if (period === 'week') {
        const day = today.getDay();
        const diff = today.getDate() - (day === 0 ? 6 : day - 1);
        const start_date = new Date(today.getFullYear(), today.getMonth(), diff);
        const end_date = new Date(start_date);
        end_date.setDate(start_date.getDate() + 6);

        const monthName = t(months[start_date.getMonth()]);
        return `${t('week')} ${start_date.getDate()} - ${end_date.getDate()} ${monthName}`;
    } else if (period === 'month') {
        return `${t(months[today.getMonth()])} ${today.getFullYear()}`;
    } else if (period === 'year') {
        return `${today.getFullYear()}`;
    }
    return '';
};

const getNumericDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
};

const CustomXAxisTick = ({ x, y, payload, period }) => {
    if (!payload || !payload.value) return null;

    const displayValue = payload.value;
    const fontSize = period === 'year' ? 9 : 10;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={fontSize} fontWeight={period === 'week' ? 600 : 500}>
                {displayValue}
            </text>
        </g>
    );
};

const CustomBarLabel = ({ x, y, width, height, value, color, baseSize = 14 }) => {
    if (!value || value <= 0) return null;

    // Adjust font size if bar is too small
    const fontSize = height < 20 ? Math.max(8, baseSize - 4) : baseSize;

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
    const cx = x + width / 2;
    // place percentage label slightly above bar top without background
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

const HabitsComparisonChart = ({ period, viewType, currentWeekDate, selectedCategory, t, language }) => {
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
    const CHART_HEIGHT = isMobile ? 280 : isTablet ? 320 : 350;

    const shortenName = (name) => {
        if (name.length > 5) {
            return name.substring(0, 5) + '..';
        }
        return name;
    };

    useEffect(() => {
        const fetchComparisonData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/v1/habits/habit_comparison/?period=${period}&date=${currentWeekDate}&category=${selectedCategory || 'Все'}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const json = await response.json();
                    setPeriodLabel(generatePeriodLabel(period, currentWeekDate, t));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const periodStartDate = new Date(currentWeekDate);
                    if (period === 'week') {
                        const day = periodStartDate.getDay();
                        const diff = periodStartDate.getDate() - (day === 0 ? 6 : day - 1);
                        periodStartDate.setDate(diff);
                    } else if (period === 'month') {
                        periodStartDate.setDate(1);
                    } else if (period === 'year') {
                        periodStartDate.setMonth(0, 1);
                    }
                    periodStartDate.setHours(0, 0, 0, 0);

                    const totalDaysInPeriod = period === 'week' 
                        ? 7 
                        : period === 'month' 
                            ? new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, 0).getDate() 
                            : (periodStartDate.getFullYear() % 4 === 0 ? 366 : 365);

                    const formatted = json.habits.map(item => {
                        const countCapped = item.completed_days || 0;
                        const rawPercent = totalDaysInPeriod > 0 
                            ? (countCapped / totalDaysInPeriod) * 100 
                            : 0;
                        const roundedPercent = Math.round(rawPercent);
                        const finalPercent = (countCapped > 0 && roundedPercent === 0) ? 1 : roundedPercent;
                        const percentageStr = `${finalPercent}%`;

                        return {
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
    const Y_AXIS_WIDTH = isMobile ? 30 : 35;

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

    const chartMinWidth = filteredData.length > 5 ? `${filteredData.length * 80}px` : '100%';
    const showScroll = filteredData.length > 5;

    const activeKey = viewType === 'habits' ? 'countCapped' : 'countExtra';
    
    // Calculate the maximum height of the bars
    const maxHeight = filteredData.reduce((m, d) => {
        const height = viewType === 'habits' 
            ? (d.countCapped || 0) + (d.countRestored || 0) + 1 // + 1 to account for the percentage label space roughly
            : (d.countExtra || 0);
        return Math.max(m, height);
    }, 0);

    // Ensure we have some space above for the label
    const effectiveMax = viewType === 'habits' 
        ? Math.max(7, Math.ceil(maxHeight / 7) * 7 + (maxHeight > 5 ? 7 : 0))
        : Math.max(7, Math.ceil(maxHeight / 7) * 7);

    // Build a minimal dummy dataset with the same max value for the Y-axis ghost chart
    const yAxisData = [{ [activeKey]: effectiveMax }];

    return (
        <div className="habits-comparison-section">
            <div className="comparison-header">
                <h3>{t('habitProgress')}</h3>
                <span className="comparison-period">{periodLabel}</span>
            </div>

            <div className="comparison-chart-layout">
                {/* Fixed Y-axis */}
                <div className="comparison-yaxis-fixed" style={{ width: Y_AXIS_WIDTH, minWidth: Y_AXIS_WIDTH }}>
                    <ResponsiveContainer width={Y_AXIS_WIDTH} height={CHART_HEIGHT}>
                        <BarChart data={yAxisData} margin={{ top: 20, right: 0, left: 0, bottom: 40 }}>
                            <YAxis
                                stroke="#eee"
                                tick={{ fill: '#999', fontSize: 10 }}
                                allowDecimals={false}
                                width={Y_AXIS_WIDTH}
                                domain={[0, effectiveMax]}
                                tickCount={8}
                            />
                            <Bar dataKey={activeKey} fill="transparent" isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Scrollable chart area (no Y-axis) */}
                <div className="comparison-scroll-wrapper" onScroll={handleScroll} ref={scrollRef}>
                    <div className="comparison-chart-inner" style={{ minWidth: chartMinWidth }}>
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT} style={{ overflow: 'visible' }}>
                            <BarChart data={filteredData} margin={{ top: 40, right: 30, left: 15, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="shortName"
                                    stroke="#999"
                                    tick={{ fill: '#666', fontSize: 10 }}
                                    interval={0}
                                    angle={0}
                                    textAnchor="middle"
                                />
                                <YAxis hide domain={[0, effectiveMax]} tickCount={8} />

                                {viewType === 'habits' ? (
                                    <>
                                        <Bar dataKey="countCapped" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} name={t('completed')} isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countCapped"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                        </Bar>
                                        <Bar dataKey="countRestored" stackId="a" fill="#6EE7B7" radius={[4, 4, 0, 0]} name={t('restored')} isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countRestored"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                            <LabelList
                                                dataKey="percentage"
                                                position="top"
                                                content={(props) => <PercentageBadge {...props} badgeW={40} badgeH={20} fSize={11} />}
                                            />
                                        </Bar>
                                    </>
                                ) : (
                                    <Bar dataKey="countExtra" fill="#8B5CF6" radius={[4, 4, 0, 0]} name={t('quantity')} isAnimationActive={false} shape={<CustomBarShape />}>
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
    t,
    language
}) => {
    const [period, setPeriod] = useState('week');
    const [viewType, setViewType] = useState('habits'); // 'habits' or 'quantity'
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartDate, setChartDate] = useState(currentWeekDate);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 480;
    const isTablet = windowWidth < 768;
    const CHART_HEIGHT = isMobile ? 300 : isTablet ? 400 : 500;
    const [periodLabel, setPeriodLabel] = useState('');

    const mainScrollRef = useRef(null);
    const mainIndicatorRef = useRef(null);

    const handleMainScroll = (e) => {
        if (!mainIndicatorRef.current) return;
        const { scrollLeft, scrollWidth } = e.target;
        const left = (scrollLeft / scrollWidth) * 100;
        mainIndicatorRef.current.style.left = `${left}%`;
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
                setPeriodLabel(generatePeriodLabel(period, chartDate, t));
                const todayStr = new Date().toISOString().split('T')[0];
                const formattedData = json.data.map(item => {
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

                    return {
                        date: item.label,
                        fullDate: item.date,
                        dayMonth: getNumericDate(item.date),
                        countTotal: item.completed_count,
                        countCapped: item.completed_days,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        percentage: percentageStr
                    };
                });
                setChartData(formattedData);
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

    const handlePrevPeriod = () => {
        const date = new Date(chartDate);
        if (period === 'week') {
            date.setDate(date.getDate() - 7);
        } else if (period === 'month') {
            date.setMonth(date.getMonth() - 1);
        } else if (period === 'year') {
            date.setFullYear(date.getFullYear() - 1);
        }
        setChartDate(date.toISOString().split('T')[0]);
    };

    const handleNextPeriod = () => {
        const date = new Date(chartDate);
        if (period === 'week') {
            date.setDate(date.getDate() + 7);
        } else if (period === 'month') {
            date.setMonth(date.getMonth() + 1);
        } else if (period === 'year') {
            date.setFullYear(date.getFullYear() + 1);
        }
        setChartDate(date.toISOString().split('T')[0]);
    };

    return (
        <div className="charts-container">
            <div className="charts-header">
                <h2>{t('statistics')}</h2>
                
                <div className="chart-navigation-controls">
                    <button className="nav-arrow-btn" onClick={handlePrevPeriod}>←</button>
                    <div className="navigation-labels">
                        <span className="current-period-label">
                            {periodLabel}
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
                            onClick={() => setPeriod('day')}
                        >
                            {t('days')}
                        </button>
                        <button
                            className={`period-btn ${period === 'week' ? 'active' : ''}`}
                            onClick={() => setPeriod('week')}
                        >
                            {t('weeks')}
                        </button>
                        <button
                            className={`period-btn ${period === 'month' ? 'active' : ''}`}
                            onClick={() => setPeriod('month')}
                        >
                            {t('months')}
                        </button>
                        <button
                            className={`period-btn ${period === 'year' ? 'active' : ''}`}
                            onClick={() => setPeriod('year')}
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
                            minWidth: period === 'year' ? '700px' : (chartData.length > 7 ? `${chartData.length * (isMobile ? 50 : 70)}px` : '100%'),
                            transition: 'min-width 0.3s ease'
                        }}>
                            <ResponsiveContainer width="100%" height={CHART_HEIGHT} style={{ overflow: 'visible' }}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 15, right: 30, left: 0, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#666"
                                        tick={<CustomXAxisTick period={period} />}
                                        height={period === 'week' ? 50 : 30}
                                        interval={0}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        tick={{ fill: '#666', fontSize: 12 }}
                                        allowDecimals={false}
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
                                                    content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={18} />}
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
                                                    content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={18} />}
                                                />
                                                <LabelList
                                                    dataKey="percentage"
                                                    position="top"
                                                    content={(props) => <PercentageBadge {...props} />}
                                                />
                                            </Bar>
                                        </>
                                    ) : (
                                        <Bar
                                            dataKey="countExtra"
                                            stackId="a"
                                            fill="#8B5CF6"
                                            radius={[8, 8, 0, 0]}
                                            animationDuration={500}
                                            isAnimationActive={false}
                                            name={t('quantity')}
                                            shape={<CustomBarShape />}
                                        >
                                            <LabelList
                                                dataKey="countExtra"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={18} />}
                                            />
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

            <HabitsComparisonChart
                period={period}
                viewType={viewType}
                currentWeekDate={chartDate}
                selectedCategory={selectedCategory}
                t={t}
                language={language}
            />

            <div className="reports-section">
                <h3>{t('reportsTitle')}</h3>
                <div className="reports-grid">
                    <div className="report-card general-report-card">
                        <div className="report-card-info">
                            <div className="report-card-name">📊 {t('generalSummary')}</div>
                            <div className="report-card-category">{t('allHabits')}</div>
                        </div>
                        <button
                            className="gen-report-btn general-report-btn"
                            onClick={() => handleGenerateSummaryReport()}
                            disabled={isReportLoading}
                            title={t('generateGeneralReport')}
                        >
                            {isReportLoading ? '⌛' : `📄 ${t('reportButton')}`}
                        </button>
                    </div>
                    {habitsData && habitsData.length > 0 ? (
                        habitsData.map(habit => (
                            <div key={habit.id} className="report-card">
                                <div className="report-card-info">
                                    <div className="report-card-name">{habit.name}</div>
                                    <div className="report-card-category">{habit.category_name}</div>
                                </div>
                                <button
                                    className="gen-report-btn"
                                    onClick={() => handleGenerateReport(habit.id)}
                                    disabled={isReportLoading}
                                    title={t('generateReport')}
                                >
                                    {isReportLoading ? '⌛' : `📄 ${t('reportButton')}`}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="no-habits-text">{t('noHabitsForReport')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Charts;
