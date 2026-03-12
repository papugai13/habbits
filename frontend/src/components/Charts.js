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

const CustomXAxisTick = ({ x, y, payload, index, data, period }) => {
    const item = data[index];
    if (!item) return null;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={10} fontWeight={period === 'week' ? 600 : 500}>
                {item.date}
            </text>
            {period === 'week' && (
                <text x={0} y={12} dy={16} textAnchor="middle" fill="#999" fontSize={8}>
                    {item.dayMonth}
                </text>
            )}
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
                            <span className="dot" style={{ backgroundColor: '#2ecc71' }}></span>
                            Выполнено: <strong>{data.countCapped}</strong>
                        </p>
                        <p className="tooltip-row">
                            <span className="dot" style={{ backgroundColor: '#00FF7F' }}></span>
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

                    const totalDaysInPeriod = period === 'week' ? 7 : period === 'month' ? 30 : 365;

                    // Calculate how many days have passed in the viewed period
                    const periodStartDate = new Date(currentWeekDate);
                    periodStartDate.setHours(0, 0, 0, 0);

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

    const chartMinWidth = data.length > 7 ? data.length * 80 : '100%';
    const showScroll = data.length > 7;

    const activeKey = viewType === 'habits' ? 'countCapped' : 'countExtra';
    const maxVal = data.reduce((m, d) => Math.max(m, d[activeKey] || 0), 0);
    // Build a minimal dummy dataset with the same max value for the Y-axis ghost chart
    const yAxisData = [{ [activeKey]: maxVal }];

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
                                domain={[0, maxVal || 'auto']}
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
                                <YAxis hide domain={[0, maxVal || 'auto']} />
                                <Tooltip
                                    content={<CustomTooltip viewType={viewType} />}
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                                />
                                {viewType === 'habits' ? (
                                    <>
                                        <Bar dataKey="countCapped" stackId="a" fill="#2ecc71" radius={[4, 4, 0, 0]} name="Выполнено" isAnimationActive={false} shape={<CustomBarShape />}>
                                            <LabelList
                                                dataKey="countCapped"
                                                content={(props) => <CustomBarLabel {...props} color="#FFF" baseSize={12} />}
                                            />
                                        </Bar>
                                        <Bar dataKey="countRestored" stackId="a" fill="#00FF7F" radius={[4, 4, 0, 0]} name="Восполнено" isAnimationActive={false} shape={<CustomBarShape />}>
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

    useEffect(() => {
        fetchStatistics();
    }, [period, currentWeekDate]);

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/habits/daily_statistics/?period=${period}&date=${currentWeekDate}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const totalHabits = habitsData.length;
                const todayStr = new Date().toISOString().split('T')[0];
                const formattedData = data.map(item => {
                    const isFuture = item.date > todayStr;
                    return {
                        date: formatDate(item.date, period),
                        fullDate: item.date,
                        dayMonth: getNumericDate(item.date),
                        countTotal: item.completed_count,
                        countCapped: item.completed_days,
                        countRestored: item.restored_days || 0,
                        countExtra: item.extra_quantity,
                        countRemaining: isFuture ? 0 : Math.max(0, totalHabits - item.completed_days - (item.restored_days || 0))
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
                    <ResponsiveContainer width="100%" height={window.innerWidth < 480 ? 300 : window.innerWidth < 768 ? 400 : 600}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: period === 'week' ? 20 : 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="date"
                                stroke="#666"
                                tick={<CustomXAxisTick data={chartData} period={period} />}
                                height={period === 'week' ? 50 : 30}
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
                                        fill="#2ecc71"
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
                                        fill="#00FF7F"
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
                currentWeekDate={currentWeekDate}
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
