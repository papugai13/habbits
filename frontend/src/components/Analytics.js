import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Analytics.css';

const Analytics = ({ getCookie, theme, t, language }) => {
    const [data, setData] = useState({ weeks: [], months: {} });
    const [habits, setHabits] = useState([]);
    const [selectedHabitId, setSelectedHabitId] = useState('all');
    const [loading, setLoading] = useState(true);
    const chartWrapperRef = useRef(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isDark = theme === 'dark' || (theme === 'auto' && document.body.classList.contains('dark-theme'));

    // Hide scrollbar on parent .app element when in Analytics
    useEffect(() => {
        const appElement = document.querySelector('.app');
        if (appElement) {
            appElement.classList.add('hide-analytics-scrollbar');
        }
        return () => {
            if (appElement) {
                appElement.classList.remove('hide-analytics-scrollbar');
            }
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch all active habits for the selector
    useEffect(() => {
        const fetchHabits = async () => {
            try {
                const response = await fetch('/api/v1/habits/', {
                    credentials: 'include',
                });
                if (response.ok) {
                    const result = await response.json();
                    setHabits(result);
                    if (result.length > 0 && selectedHabitId === 'all') {
                        setSelectedHabitId(result[0].id);
                    }
                }
            } catch (error) {
                console.error("Error fetching habits:", error);
            }
        };
        fetchHabits();
    }, []);

    useEffect(() => {
        if (!selectedHabitId || selectedHabitId === 'all') return;
        
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/v1/habits/analytics_chart/?habit_id=${selectedHabitId}`, {
                    credentials: 'include',
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                    
                    // Scroll to the end (current week) after rendering
                    setTimeout(() => {
                        if (chartWrapperRef.current) {
                            chartWrapperRef.current.scrollLeft = chartWrapperRef.current.scrollWidth;
                        }
                    }, 100);
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedHabitId]);

    const weekWidth = 50;
    const paddingLeft = 40;
    const paddingRight = 20;

    const selectedHabitName = useMemo(() => {
        if (selectedHabitId === 'all') return t('allHabits') || 'Все привычки';
        const habit = habits.find(h => h.id.toString() === selectedHabitId.toString());
        return habit ? habit.name : t('allHabits') || 'Все привычки';
    }, [selectedHabitId, habits, t]);

    const chartWidth = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return 0;
        return data.weeks.length * weekWidth + paddingLeft + paddingRight;
    }, [data.weeks]);

    // Calculate month transition indices for dashed lines
    const monthTransitions = useMemo(() => {
        if (!data.weeks) return [];
        const transitions = [];
        for (let i = 1; i < data.weeks.length; i++) {
            if (data.weeks[i].month !== data.weeks[i - 1].month) {
                transitions.push(data.weeks[i].week_start);
            }
        }
        return transitions;
    }, [data.weeks]);

    const [selectedMonth1, setSelectedMonth1] = useState(null);
    const [selectedMonth2, setSelectedMonth2] = useState(null);

    // Process data for tables
    const tableData = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return [];
        
        const months = [];
        let currentMonthBlock = null;
        let prevWeekPercentage = null;
        
        data.weeks.forEach((week) => {
            const startDate = new Date(week.week_start);
            const thursday = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            const monthKey = `${thursday.getFullYear()}-${thursday.getMonth() + 1}`;

            if (!currentMonthBlock || currentMonthBlock.month_key !== monthKey) {
                if (currentMonthBlock) {
                    months.push(currentMonthBlock);
                }
                currentMonthBlock = {
                    month_key: monthKey,
                    month: thursday.getMonth() + 1,
                    year: thursday.getFullYear(),
                    month_name: week.month_name,
                    weeks: [],
                    totals: {
                        days_done: 0,
                        total_days: 0,
                        percentage: 0,
                        trend: null
                    }
                };
            }
            
            const endDate = new Date(week.week_end);
            const dateRange = `${startDate.getDate()}-${endDate.getDate()}`;
            
            const daysDone = week.days_done || 0;
            const totalDays = week.total_days || 7;
            const percentage = totalDays > 0 ? Math.round((daysDone / totalDays) * 100) : 0;
            
            let trend = null;
            if (prevWeekPercentage !== null) {
                trend = percentage - prevWeekPercentage;
            }
            prevWeekPercentage = percentage;
            
            currentMonthBlock.weeks.push({
                week_label: week.week_label.replace('н', 'неделя '),
                date_range: dateRange,
                days_done: daysDone,
                total_days: totalDays,
                percentage: percentage,
                trend: trend
            });
            
            currentMonthBlock.totals.days_done += daysDone;
            currentMonthBlock.totals.total_days += totalDays;
        });
        
        if (currentMonthBlock) {
            months.push(currentMonthBlock);
        }
        
        // Calculate month totals
        months.forEach((month) => {
            month.totals.percentage = month.totals.total_days > 0 
                ? Math.round((month.totals.days_done / month.totals.total_days) * 100) 
                : 0;
        });

        return months;
    }, [data.weeks]);

    // Update selected months when data changes
    useEffect(() => {
        if (tableData.length > 0) {
            if (!selectedMonth1 || !tableData.find(m => m.month_key === selectedMonth1)) {
                setSelectedMonth1(tableData[tableData.length - 1].month_key);
            }
            if (!selectedMonth2 || !tableData.find(m => m.month_key === selectedMonth2)) {
                setSelectedMonth2(tableData.length > 1 
                    ? tableData[tableData.length - 2].month_key 
                    : tableData[tableData.length - 1].month_key
                );
            }
        }
    }, [tableData]);

    const getMonthTrend = (mKey, currentTableData) => {
        const idx = currentTableData.findIndex(m => m.month_key === mKey);
        if (idx > 0) {
            return currentTableData[idx].totals.percentage - currentTableData[idx-1].totals.percentage;
        }
        return null;
    };

    // Calculate month blocks for the row below the chart
    const monthBlocks = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return [];
        const blocks = [];
        let currentMonth = data.weeks[0].month;
        let startIndex = 0;

        for (let i = 1; i <= data.weeks.length; i++) {
            const isLast = i === data.weeks.length;
            const weekMonth = !isLast ? data.weeks[i].month : null;

            if (isLast || weekMonth !== currentMonth) {
                const endIndex = i - 1;
                // calculate center in pixels
                const centerIdx = startIndex + (endIndex - startIndex) / 2;
                
                // Real width available for weeks is chartWidth - paddingLeft - paddingRight
                const actualWeekWidth = (chartWidth - paddingLeft - paddingRight) / data.weeks.length;
                const leftPos = paddingLeft + (centerIdx * actualWeekWidth) + actualWeekWidth / 2;

                const monthData = data.months[currentMonth] || { percentage: 0, trend: null };
                const monthName = data.weeks[startIndex].month_name;

                blocks.push({
                    month: currentMonth,
                    name: monthName,
                    left: leftPos,
                    percentage: monthData.percentage,
                    trend: monthData.trend
                });

                if (!isLast) {
                    currentMonth = weekMonth;
                    startIndex = i;
                }
            }
        }
        return blocks;
    }, [data.weeks, data.months, chartWidth]);

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="mini-spinner"></div>
                <p>{t('loadingData') || 'Загрузка...'}</p>
            </div>
        );
    }

    if (!data.weeks || data.weeks.length === 0) {
        return (
            <div className="analytics-container">
                <div className="analytics-header">
                    <h2>{t('analytics') || 'Аналитика'}</h2>
                </div>
                <div className="analytics-loading">
                    <p>{t('noDataHint')}</p>
                </div>
            </div>
        );
    }

    const renderTrend = (trend) => {
        if (trend === null || trend === undefined) return null;
        if (trend > 0) {
            return <span className="trend-positive">+{trend}%↑</span>;
        } else if (trend < 0) {
            return <span className="trend-negative">{trend}%↓</span>;
        } else {
            return <span className="trend-neutral">0%</span>;
        }
    };

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div className="analytics-habit-selector" ref={dropdownRef}>
                    <div 
                        className={`custom-dropdown-header ${isDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span>{selectedHabitName}</span>
                        <div className="dropdown-arrow-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>
                    {isDropdownOpen && (
                        <div className="custom-dropdown-list">
                            {habits.map(habit => (
                                <div 
                                    key={habit.id} 
                                    className={`dropdown-item ${selectedHabitId.toString() === habit.id.toString() ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedHabitId(habit.id);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    {habit.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="analytics-tables-container compare-view">
                {[selectedMonth2, selectedMonth1].map((mKey, idx) => {
                    const monthBlock = tableData.find(m => m.month_key === mKey);
                    if (!monthBlock) return null;
                    const trend = getMonthTrend(mKey, tableData);
                    
                    return (
                        <div key={idx} className="analytics-table-wrapper">
                            <div className="analytics-table-header-select">
                                <span className="habit-label">{selectedHabitName}</span>
                                <select 
                                    className="month-mini-select"
                                    value={mKey}
                                    onChange={(e) => idx === 1 ? setSelectedMonth1(e.target.value) : setSelectedMonth2(e.target.value)}
                                >
                                    {tableData.map(m => (
                                        <option key={m.month_key} value={m.month_key}>
                                            {m.month_name} {m.year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <table className="analytics-table">
                                <tbody>
                                    {monthBlock.weeks.map((w, wIdx) => (
                                        <tr key={wIdx}>
                                            <td className="col-week">{w.week_label}</td>
                                            <td className="col-date">{w.date_range}</td>
                                            <td className="col-fraction">{w.days_done}/{w.total_days}</td>
                                            <td className="col-percentage">{w.percentage}%</td>
                                            <td className="col-trend">{renderTrend(w.trend)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="footer-label">итого:</td>
                                        <td className="col-fraction">{monthBlock.totals.days_done}/{monthBlock.totals.total_days}</td>
                                        <td className="col-percentage">{monthBlock.totals.percentage}%</td>
                                        <td className="col-trend">{renderTrend(trend)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    );
                })}
            </div>
            
            <div className="analytics-chart-wrapper" ref={chartWrapperRef}>
                <div className="analytics-chart-inner" style={{ width: chartWidth, height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.weeks} margin={{ top: 20, right: paddingRight, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#404040" : "#f0f0f0"} />
                            <XAxis 
                                dataKey="week_start" 
                                tickFormatter={(val) => {
                                    const week = data.weeks.find(w => w.week_start === val);
                                    return week ? week.week_label : '';
                                }}
                                tick={{ fill: isDark ? '#999' : '#666', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis 
                                domain={[0, 7]} 
                                tickCount={8}
                                tick={{ fill: isDark ? '#999' : '#666', fontSize: 12, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            
                            {monthTransitions.map((weekLabel, index) => (
                                <ReferenceLine 
                                    key={index} 
                                    x={weekLabel} 
                                    stroke={isDark ? '#555' : '#e5e7eb'} 
                                    strokeWidth={2}
                                />
                            ))}

                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#22c55e" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorValue)"
                                dot={{ fill: '#22c55e', r: 4, strokeWidth: 2, stroke: isDark ? '#2a2a2a' : '#fff' }}
                                activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2, fill: isDark ? '#2a2a2a' : '#fff' }}
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="analytics-months-row" style={{ width: chartWidth }}>
                    {monthBlocks.map((block, i) => (
                        <div 
                            key={i} 
                            className="analytics-month-block"
                            style={{ left: `${block.left}px`, transform: 'translateX(-50%)' }}
                        >
                            <div className="analytics-month-name">{block.name}</div>
                            <div className="analytics-month-stats">
                                <span className="percent">{block.percentage}%</span>
                                {block.trend !== null && block.trend !== 0 && (
                                    <span className={`trend ${block.trend > 0 ? 'positive' : 'negative'}`}>
                                        {block.trend > 0 ? '+' : ''}{block.trend}%{block.trend > 0 ? '↑' : '↓'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
