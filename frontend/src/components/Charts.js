import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip">
                <p className="tooltip-date">{data.fullDate}</p>
                <p className="tooltip-count">Привычки: {data.countCapped}</p>
                {data.countExtra > 0 && (
                    <p className="tooltip-overflow">Всего: {data.countTotal}</p>
                )}
            </div>
        );
    }
    return null;
};

const SingleHabitChart = ({ habit, period }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHabitStats = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/v1/habits/daily_statistics/?period=${period}&habit_id=${habit.id}`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const json = await response.json();
                    const formatted = json.map(item => ({
                        date: formatDate(item.date, period),
                        fullDate: item.date,
                        dayMonth: getNumericDate(item.date),
                        countTotal: item.completed_count,
                        countCapped: item.completed_days,
                        countExtra: item.extra_quantity
                    }));
                    setData(formatted);
                }
            } catch (error) {
                console.error(`Error fetching stats for habit ${habit.id}:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchHabitStats();
    }, [habit.id, period]);

    if (loading) return <div className="mini-chart-loading">...</div>;

    return (
        <div className="single-habit-chart">
            <h4>{habit.name}</h4>
            <div className="mini-chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: period === 'week' ? 20 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={<CustomXAxisTick data={data} period={period} />}
                            height={period === 'week' ? 40 : 25}
                            stroke="#eee"
                        />
                        <YAxis
                            stroke="#eee"
                            tick={{ fill: '#999', fontSize: 10 }}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                        <Bar dataKey="countCapped" stackId="a" fill="#CCFF00" radius={[0, 0, 0, 0]} name="Дней" />
                        <Bar dataKey="countExtra" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Повторений сверх" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const Charts = ({ getCookie, habitsData, handleGenerateReport, handleGenerateSummaryReport, isReportLoading }) => {
    const [period, setPeriod] = useState('week');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatistics();
    }, [period]);

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/habits/daily_statistics/?period=${period}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const formattedData = data.map(item => ({
                    date: formatDate(item.date, period),
                    fullDate: item.date,
                    dayMonth: getNumericDate(item.date),
                    countTotal: item.completed_count,
                    countCapped: item.completed_days,
                    countExtra: item.extra_quantity
                }));
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
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                            <Bar
                                dataKey="countCapped"
                                stackId="a"
                                fill="#CCFF00"
                                radius={[0, 0, 0, 0]}
                                animationDuration={500}
                                name="Привычек"
                            />
                            <Bar
                                dataKey="countExtra"
                                stackId="a"
                                fill="#8B5CF6"
                                radius={[8, 8, 0, 0]}
                                animationDuration={500}
                                name="Повторений сверх"
                            />
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

            <div className="individual-charts-section">
                <h3>Прогресс по привычкам</h3>
                <div className="individual-charts-grid">
                    {habitsData && habitsData.length > 0 ? (
                        habitsData.map(habit => (
                            <SingleHabitChart
                                key={habit.id}
                                habit={habit}
                                period={period}
                            />
                        ))
                    ) : (
                        <p className="no-habits-text">Добавьте привычки, чтобы увидеть прогресс</p>
                    )}
                </div>
            </div>

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
