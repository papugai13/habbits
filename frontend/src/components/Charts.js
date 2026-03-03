import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Charts.css';

const Charts = ({ getCookie, habitsData, handleGenerateReport, isReportLoading }) => {
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
                // Форматируем данные для графика
                const formattedData = data.map(item => ({
                    date: formatDate(item.date, period),
                    fullDate: item.date,
                    dayMonth: getNumericDate(item.date),
                    count: item.completed_count
                }));
                setChartData(formattedData);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr, periodType) => {
        const date = new Date(dateStr);

        if (periodType === 'week') {
            // Для недели показываем день недели
            const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            return days[date.getDay()];
        } else if (periodType === 'month') {
            // Для месяца показываем день месяца
            return date.getDate();
        } else {
            // Для года показываем месяц
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

    const CustomXAxisTick = ({ x, y, payload, index }) => {
        const item = chartData[index];
        if (!item) return null;

        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12} fontWeight={period === 'week' ? 600 : 500}>
                    {item.date}
                </text>
                {period === 'week' && (
                    <text x={0} y={15} dy={16} textAnchor="middle" fill="#999" fontSize={10}>
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
                    <p className="tooltip-count">Выполнено: {data.count}</p>
                </div>
            );
        }
        return null;
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
                                tick={<CustomXAxisTick />}
                                height={period === 'week' ? 50 : 30}
                            />
                            <YAxis
                                stroke="#666"
                                tick={{ fill: '#666', fontSize: 12 }}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                            <Bar
                                dataKey="count"
                                fill="#CCFF00"
                                radius={[8, 8, 0, 0]}
                                animationDuration={500}
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
            <div className="reports-section">
                <h3>Подробные отчеты (PDF)</h3>
                <div className="reports-grid">
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
