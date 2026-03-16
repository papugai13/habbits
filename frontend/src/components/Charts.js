import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Rectangle } from 'recharts';
import './Charts.css';

const formatDate = (dateStr, periodType) => {
    const date = new Date(dateStr);
    if (periodType === 'week') {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[date.getDay()];
    } else if (periodType === 'month') {
        return date.getDate();
    } else {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return months[date.getMonth()];
    }
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

    // Define the order of stacking
    const keys = ['countCapped', 'countRestored', 'countRemaining'];
    const currentIndex = keys.indexOf(dataKey);

    let isTop = true;
    if (currentIndex !== -1) {
        // A segment is "top" if all segments defined after it in the 'keys' array are zero
        for (let i = currentIndex + 1; i < keys.length; i++) {
            if (payload[keys[i]] > 0) {
                isTop = false;
                break;
            }
        }
    }
    // For single bars (like countExtra), currentIndex will be -1, and isTop remains true

    const finalRadius = isTop ? radius : [0, 0, 0, 0];

    return <Rectangle {...props} radius={finalRadius} />;
};

const CustomTooltip = ({ active, payload, viewType }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip">
                <p className="tooltip-date">{data.fullDate}</p>
                {viewType === 'habits' ? (
                    <div className="tooltip-details">
                        <p className="tooltip-row">
                            <span className="dot" style={{ backgroundColor: '#00FF7F' }}></span>
                            Выполнено: <strong>{data.countCapped}</strong>
                        </p>
                        <p className="tooltip-row">
                            <span className="dot" style={{ backgroundColor: '#94fcd0' }}></span>
                            Восполнено: <strong>{data.countRestored}</strong>
                        </p>
                        <p className="tooltip-row">
                            <span className="dot" style={{ backgroundColor: '#D0D0D0' }}></span>
                            Пропущено: <strong>{data.countRemaining}</strong>
                        </p>
                    </div>
                ) : (
                    <p className="tooltip-overflow">Количество: {data.countExtra}</p>
                )}
            </div>
        );
    }
    return null;
};

const HabitsComparisonChart = ({ period, viewType, currentWeekDate }) => {
    const [data, setData] = useState([]);
    const [periodLabel, setPeriodLabel] = useState('');
    const [loading, setLoading] = useState(true);

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
                const response = await fetch(`/api/v1/habits/habit_comparison/?period=${period}&date=${currentWeekDate}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const json = await response.json();
                    setPeriodLabel(json.period_label);
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

                    let passedDays;
                    if (periodStartDate > today) {
                        passedDays = 0;
                    } else {
                        const diffTime = Math.abs(today - periodStartDate);
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
                        passedDays = Math.min(totalDaysInPeriod, diffDays);
                    }

                    const formatted = json.habits.map(item => ({
                        id: item.id,
                        name: item.name,
                        shortName: shortenName(item.name),
                        countCapped: item.completed_days,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        countRemaining: Math.max(0, passedDays - item.completed_days - (item.restored_days || 0))
                    }));
                    setData(formatted);
                }
            } catch (error) {
                console.error(`Error fetching comparison data:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchComparisonData();
    }, [period, currentWeekDate]);

    const scrollRef = useRef(null);
    const indicatorRef = useRef(null);
    const CHART_HEIGHT = 300;
    const Y_AXIS_WIDTH = 35;

    const handleScroll = (e) => {
        if (!indicatorRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = e.target;
        const left = (scrollLeft / scrollWidth) * 100;
        indicatorRef.current.style.left = `${left}%`;
    };

    // Initialize indicator width
    useEffect(() => {
        if (scrollRef.current && indicatorRef.current) {
            const { scrollWidth, clientWidth } = scrollRef.current;
            const width = (clientWidth / scrollWidth) * 100;
            indicatorRef.current.style.width = `${width}%`;
        }
    }, [data.length]);

    if (loading) return (
        <div className="comparison-chart-loading">
            <div className="mini-spinner"></div>
            <p>Загрузка статистики по привычкам...</p>
        </div>
    );

    if (data.length === 0) return null;

    const chartMinWidth = data.length > 5 ? `${data.length * 80}px` : '100%';
    const showScroll = data.length > 5;

    const activeKey = viewType === 'habits' ? 'countCapped' : 'countExtra';
    
    // Calculate the maximum height of the bars
    const maxHeight = data.reduce((m, d) => {
        const height = viewType === 'habits' 
            ? (d.countCapped || 0) + (d.countRestored || 0) + (d.countRemaining || 0)
            : (d.countExtra || 0);
        return Math.max(m, height);
    }, 0);

    // To have exactly 7 integer divisions, the max value must be a multiple of 7 and at least 7.
    const effectiveMax = Math.max(7, Math.ceil(maxHeight / 7) * 7);

    // Build a minimal dummy dataset with the same max value for the Y-axis ghost chart
    const yAxisData = [{ [activeKey]: effectiveMax }];

    return (
        <div className="habits-comparison-section">
            <div className="comparison-header">
                <h3>Прогресс по привычкам</h3>
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
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 15, bottom: 40 }}>
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
                                <Tooltip
                                    content={<CustomTooltip viewType={viewType} />}
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                                />
                                {viewType === 'habits' ? (
                                    <>
                                        <Bar dataKey="countCapped" stackId="a" fill="#00FF7F" radius={[4, 4, 0, 0]} name="Выполнено" isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countCapped"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                        </Bar>
                                        <Bar dataKey="countRestored" stackId="a" fill="#94fcd0" radius={[4, 4, 0, 0]} name="Восполнено" isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countRestored"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                        </Bar>
                                        <Bar dataKey="countRemaining" stackId="a" fill="#D0D0D0" radius={[4, 4, 0, 0]} name="Пропущено" isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countRemaining"
                                                content={(props) => <CustomBarLabel {...props} color="#666" baseSize={12} />}
                                            />
                                        </Bar>
                                    </>
                                ) : (
                                    <Bar dataKey="countExtra" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Количество" isAnimationActive={false} shape={<CustomBarShape />}>
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

const Charts = ({ getCookie, habitsData, handleGenerateReport, handleGenerateSummaryReport, isReportLoading, currentWeekDate }) => {
    const [period, setPeriod] = useState('week');
    const [viewType, setViewType] = useState('habits'); // 'habits' or 'quantity'
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartDate, setChartDate] = useState(currentWeekDate);
    const [periodLabel, setPeriodLabel] = useState('');

    const mainScrollRef = useRef(null);
    const mainIndicatorRef = useRef(null);

    const handleMainScroll = (e) => {
        if (!mainIndicatorRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = e.target;
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

    useEffect(() => {
        fetchStatistics();
    }, [period, chartDate]);

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

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/habits/daily_statistics/?period=${period}&date=${chartDate}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const json = await response.json();
                setPeriodLabel(json.period_label);
                const totalHabits = habitsData.length;
                const todayStr = new Date().toISOString().split('T')[0];
                const formattedData = json.data.map(item => {
                    const isFuture = item.date > todayStr;
                    return {
                        date: item.label, // Use the pre-formatted label from backend
                        fullDate: item.date,
                        dayMonth: getNumericDate(item.date),
                        countTotal: item.completed_count,
                        countCapped: item.completed_days,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        countRemaining: isFuture ? 0 : Math.max(0, (totalHabits * item.days_in_period) - item.completed_days - (item.restored_days || 0))
                    };
                });
                setChartData(formattedData);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="charts-container">
            <div className="charts-header">
                <h2>Статистика выполнения</h2>
                
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
                                Выполнено
                            </button>
                        <button
                            className={`view-btn quantity ${viewType === 'quantity' ? 'active' : ''}`}
                            onClick={() => setViewType('quantity')}
                        >
                            Количество
                        </button>
                    </div>
                    <div className="period-selector">
                        <button
                            className={`period-btn ${period === 'week' ? 'active' : ''}`}
                            onClick={() => setPeriod('week')}
                        >
                            Неделя
                        </button>
                        <button
                            className={`period-btn ${period === 'month' ? 'active' : ''}`}
                            onClick={() => setPeriod('month')}
                        >
                            Месяц
                        </button>
                        <button
                            className={`period-btn ${period === 'year' ? 'active' : ''}`}
                            onClick={() => setPeriod('year')}
                        >
                            Год
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="charts-loading">
                    <div className="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </div>
            ) : (
                <div className="chart-wrapper">
                    <div className="main-chart-scroll-wrapper" onScroll={handleMainScroll} ref={mainScrollRef}>
                        <div className="main-chart-inner" style={{ 
                            minWidth: period === 'year' ? '600px' : '100%',
                            transition: 'min-width 0.3s ease'
                        }}>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 480 ? 300 : window.innerWidth < 768 ? 400 : 500}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
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
                            <Tooltip content={<CustomTooltip viewType={viewType} />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                            {viewType === 'habits' ? (
                                <>
                                    <Bar
                                        dataKey="countCapped"
                                        stackId="a"
                                        fill="#00FF7F"
                                        radius={[8, 8, 0, 0]}
                                        isAnimationActive={false}
                                        name="Выполнено"
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
                                        fill="#94fcd0"
                                        radius={[8, 8, 0, 0]}
                                        isAnimationActive={false}
                                        name="Восполнено"
                                        shape={<CustomBarShape />}
                                    >
                                        <LabelList
                                            dataKey="countRestored"
                                            content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={18} />}
                                        />
                                    </Bar>
                                    <Bar
                                        dataKey="countRemaining"
                                        stackId="a"
                                        fill="#D0D0D0"
                                        radius={[8, 8, 0, 0]}
                                        isAnimationActive={false}
                                        name="Пропущено"
                                        shape={<CustomBarShape />}
                                    >
                                        <LabelList
                                            dataKey="countRemaining"
                                            content={(props) => <CustomBarLabel {...props} color="#666" baseSize={18} />}
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
                                    name="Количество"
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
                            <p>📊 Нет данных за выбранный период</p>
                            <p className="no-data-hint">Начните отмечать выполненные привычки!</p>
                        </div>
                    )}
                </div>
            )}

            <HabitsComparisonChart
                period={period}
                viewType={viewType}
                currentWeekDate={chartDate}
            />

            <div className="reports-section">
                <h3>Подробные отчеты (PDF)</h3>
                <div className="reports-grid">
                    <div className="report-card general-report-card">
                        <div className="report-card-info">
                            <div className="report-card-name">📊 Общий итог</div>
                            <div className="report-card-category">Все привычки</div>
                        </div>
                        <button
                            className="gen-report-btn general-report-btn"
                            onClick={() => handleGenerateSummaryReport()}
                            disabled={isReportLoading}
                            title="Сгенерировать общий отчет"
                        >
                            {isReportLoading ? '⌛' : '📄 Отчет'}
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
                                    title="Сгенерировать отчет"
                                >
                                    {isReportLoading ? '⌛' : '📄 Отчет'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="no-habits-text">У вас пока нет привычек для отчета</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Charts;
