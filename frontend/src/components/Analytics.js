import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Analytics.css';
import storageService from '../storageService';

const MONTH_KEYS = ['janFull', 'febFull', 'marFull', 'aprFull', 'mayFull', 'junFull', 'julFull', 'augFull', 'sepFull', 'octFull', 'novFull', 'decFull'];

const Analytics = ({ getCookie, theme, t, language, storageMode, categories = [] }) => {
    const [data, setData] = useState({ weeks: [], months: {} });
    const [habits, setHabits] = useState([]);
    const [selectedHabitId, setSelectedHabitId] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);
    const chartWrapperRef = useRef(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const categoryDropdownRef = useRef(null);

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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch all active habits for the selector
    useEffect(() => {
        const fetchHabits = async () => {
            try {
                const result = await storageService.getHabits(storageMode, {
                    credentials: 'include',
                });
                setHabits(result);
            } catch (error) {
                console.error("Error fetching habits:", error);
            }
        };
        fetchHabits();
    }, [storageMode]);

    useEffect(() => {
        if (!selectedHabitId) return;
        
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const result = await storageService.getAnalyticsChart(storageMode, selectedHabitId, selectedCategory, {
                    credentials: 'include',
                });
                setData(result);
                
                // Scroll to the end (current week) after rendering
                setTimeout(() => {
                    if (chartWrapperRef.current) {
                        chartWrapperRef.current.scrollLeft = chartWrapperRef.current.scrollWidth;
                    }
                }, 100);
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedHabitId, selectedCategory, storageMode]);

    const weekWidth = 50;
    const paddingLeft = 40;
    const paddingRight = 20;

    const selectedCategoryName = useMemo(() => {
        if (selectedCategory === 'all' || selectedCategory === 'Все') return t('allCategories') || 'Все категории';
        return selectedCategory;
    }, [selectedCategory, t]);

    const selectedHabitName = useMemo(() => {
        if (selectedHabitId === 'all') {
            if (selectedCategory !== 'all' && selectedCategory !== 'Все') {
                return `${t('allHabits') || 'Все привычки'} (${selectedCategoryName})`;
            }
            return t('allHabits') || 'Все привычки';
        }
        const habit = habits.find(h => h.id.toString() === selectedHabitId.toString());
        return habit ? habit.name : (selectedCategory !== 'all' && selectedCategory !== 'Все' ? `${t('allHabits') || 'Все привычки'} (${selectedCategoryName})` : t('allHabits') || 'Все привычки');
    }, [selectedHabitId, habits, selectedCategory, selectedCategoryName, t]);

    const filteredHabitsForSelector = useMemo(() => {
        if (selectedCategory === 'all' || selectedCategory === 'Все') {
            return habits;
        }
        if (selectedCategory === 'Без категории' || selectedCategory === 'none') {
            return habits.filter(h => !h.category_name);
        }
        return habits.filter(h => h.category_name === selectedCategory);
    }, [habits, selectedCategory]);

    const handleCategoryChange = (categoryName) => {
        setSelectedCategory(categoryName);
        setSelectedHabitId('all');
        setIsCategoryDropdownOpen(false);
    };

    const greenChartKey = useMemo(() => {
        return selectedHabitId === 'all' ? 'days_done' : 'value';
    }, [selectedHabitId]);

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

    const yAxisMaxLeft = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return 1;
        const maxValue = Math.max(...data.weeks.map(w => Number(w[greenChartKey]) || 0));
        return Math.max(1, Math.ceil(maxValue));
    }, [data.weeks, greenChartKey]);

    const yAxisMaxRight = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return 1;
        const maxValue = Math.max(...data.weeks.map(w => Number(w.quantity) || 0));
        return Math.max(1, Math.ceil(maxValue));
    }, [data.weeks]);

    // Process data for tables
    // Process data for tables
    const tableData = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return [];
        
        const months = [];
        let currentMonthBlock = null;
        let prevRowVal = null;
        
        const addWeekPartToMonth = (part, year, month, monthName) => {
            const monthKey = `${year}-${month}`;
            if (!currentMonthBlock || currentMonthBlock.month_key !== monthKey) {
                if (currentMonthBlock) {
                    months.push(currentMonthBlock);
                }
                currentMonthBlock = {
                    month_key: monthKey,
                    month: month,
                    year: year,
                    month_name: monthName,
                    weeks: [],
                    totals: {
                        days_done: 0,
                        total_days: 0,
                        percentage: 0,
                        quantity: 0,
                        trend: null
                    }
                };
            }
            
            currentMonthBlock.weeks.push(part);
            currentMonthBlock.totals.days_done += part.days_done;
            currentMonthBlock.totals.total_days += part.total_days;
            currentMonthBlock.totals.quantity += part.quantity;
        };

        data.weeks.forEach((week) => {
            const [sy, sm, sd] = week.week_start.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            
            const [ey, em, ed] = week.week_end.split('-').map(Number);
            const endDate = new Date(ey, em - 1, ed);
            
            const totalDays = week.total_days || 7;
            const daysDone = Math.min(week.days_done || 0, totalDays);
            const quantity = week.quantity || 0;
            
            const label = week.week_label.replace('н', language === 'ru' ? 'неделя ' : 'week ');
            
            if (startDate.getMonth() !== endDate.getMonth()) {
                // Crosses month boundary!
                const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
                const lastDayOfFirstMonth = getDaysInMonth(startDate.getFullYear(), startDate.getMonth() + 1);
                const daysInFirstMonth = lastDayOfFirstMonth - startDate.getDate() + 1;
                
                // 1. Part 1 (First Month)
                const part1TotalDays = Math.round(totalDays * (daysInFirstMonth / 7));
                const part1DaysDone = Math.round(daysDone * (daysInFirstMonth / 7));
                const part1Quantity = Math.round(quantity * (daysInFirstMonth / 7));
                const part1Percentage = part1TotalDays > 0 ? Math.min(Math.round((part1DaysDone / part1TotalDays) * 100), 100) : 0;
                
                let part1Trend = null;
                if (prevRowVal !== null) {
                    part1Trend = part1Percentage - prevRowVal;
                }
                prevRowVal = part1Percentage;
                
                const part1 = {
                    week_label: label,
                    date_range: `${startDate.getDate()}-${lastDayOfFirstMonth}`,
                    days_done: part1DaysDone,
                    total_days: part1TotalDays,
                    percentage: part1Percentage,
                    quantity: part1Quantity,
                    trend: part1Trend
                };
                
                // 2. Part 2 (Second Month)
                const part2TotalDays = totalDays - part1TotalDays;
                const part2DaysDone = daysDone - part1DaysDone;
                const part2Quantity = quantity - part1Quantity;
                const part2Percentage = part2TotalDays > 0 ? Math.min(Math.round((part2DaysDone / part2TotalDays) * 100), 100) : 0;
                
                let part2Trend = null;
                if (prevRowVal !== null) {
                    part2Trend = part2Percentage - prevRowVal;
                }
                prevRowVal = part2Percentage;
                
                const part2 = {
                    week_label: label,
                    date_range: `1-${endDate.getDate()}`,
                    days_done: part2DaysDone,
                    total_days: part2TotalDays,
                    percentage: part2Percentage,
                    quantity: part2Quantity,
                    trend: part2Trend
                };
                
                addWeekPartToMonth(part1, startDate.getFullYear(), startDate.getMonth() + 1, week.month_name);
                addWeekPartToMonth(part2, endDate.getFullYear(), endDate.getMonth() + 1, week.month_name);
            } else {
                // Non-crossing week
                const percentage = totalDays > 0 ? Math.min(Math.round((daysDone / totalDays) * 100), 100) : 0;
                let trend = null;
                if (prevRowVal !== null) {
                    trend = percentage - prevRowVal;
                }
                prevRowVal = percentage;
                
                const dateRange = startDate.getDate() === endDate.getDate()
                    ? `${startDate.getDate()}`
                    : `${startDate.getDate()}-${endDate.getDate()}`;
                
                const part = {
                    week_label: label,
                    date_range: dateRange,
                    days_done: daysDone,
                    total_days: totalDays,
                    percentage: percentage,
                    quantity: quantity,
                    trend: trend
                };
                
                addWeekPartToMonth(part, startDate.getFullYear(), startDate.getMonth() + 1, week.month_name);
            }
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
    }, [data.weeks, language]);


    const getMonthTrend = (mKey, currentTableData) => {
        const idx = currentTableData.findIndex(m => m.month_key === mKey);
        if (idx > 0) {
            return currentTableData[idx].totals.percentage - currentTableData[idx-1].totals.percentage;
        }
        return null;
    };

    // Calculate month blocks for the row below the chart
    const monthBlocks = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0 || tableData.length === 0) return [];
        const blocks = [];

        // Group the week indices by monthKey (using Thursday of each week to match the chart's reference lines)
        const groups = {};
        data.weeks.forEach((week, index) => {
            const [sy, sm, sd] = week.week_start.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            const thursday = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            const monthKey = `${thursday.getFullYear()}-${thursday.getMonth() + 1}`;
            
            if (!groups[monthKey]) {
                groups[monthKey] = {
                    month: thursday.getMonth() + 1,
                    year: thursday.getFullYear(),
                    indices: []
                };
            }
            groups[monthKey].indices.push(index);
        });

        // Now calculate positions based on the grouped indices
        Object.keys(groups).forEach((monthKey) => {
            const group = groups[monthKey];
            const indices = group.indices;
            const firstIdx = indices[0];
            const lastIdx = indices[indices.length - 1];
            const centerIdx = firstIdx + (lastIdx - firstIdx) / 2;

            // Real width available for weeks is chartWidth - paddingLeft - paddingRight
            const actualWeekWidth = (chartWidth - paddingLeft - paddingRight) / data.weeks.length;
            const leftPos = paddingLeft + (centerIdx * actualWeekWidth) + actualWeekWidth / 2;

            const mBlock = tableData.find(m => m.month_key === monthKey);
            const percentage = mBlock ? mBlock.totals.percentage : 0;
            const quantity = mBlock ? mBlock.totals.quantity : 0;
            const trend = getMonthTrend(monthKey, tableData);

            blocks.push({
                month: group.month,
                left: leftPos,
                value: percentage,
                quantity: quantity,
                trend: trend
            });
        });

        return blocks;
    }, [data.weeks, tableData, chartWidth]);

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

    const renderTrend = (trend, showPercent = true) => {
        if (trend === null || trend === undefined) return null;
        const suffix = showPercent ? '%' : '';
        if (trend > 0) {
            return <span className="trend-positive">+{trend}{suffix}↑</span>;
        } else if (trend < 0) {
            return <span className="trend-negative">{trend}{suffix}↓</span>;
        } else {
            return <span className="trend-neutral">0{suffix}</span>;
        }
    };

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2 className="analytics-title">{t('analytics') || 'Аналитика'}</h2>
                <div className="analytics-header-controls">
                    <div className="analytics-habit-selector analytics-category-selector" ref={categoryDropdownRef} style={{ zIndex: isCategoryDropdownOpen ? 1010 : 1000 }}>
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
                                {categories.map(cat => (
                                    <div 
                                        key={cat.id} 
                                        className={`dropdown-item ${selectedCategory === cat.name ? 'active' : ''}`}
                                        onClick={() => handleCategoryChange(cat.name)}
                                    >
                                        {cat.name === 'Все' ? (t('allCategories') || 'Все категории') : cat.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="analytics-habit-selector" ref={dropdownRef} style={{ zIndex: isDropdownOpen ? 1010 : 1000 }}>
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
                                <div
                                    key="all"
                                    className={`dropdown-item ${selectedHabitId === 'all' ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedHabitId('all');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    {selectedCategory !== 'all' && selectedCategory !== 'Все' ? `${t('allHabits') || 'Все привычки'} (${selectedCategoryName})` : (t('allHabits') || 'Все привычки')}
                                </div>
                                {filteredHabitsForSelector.map(habit => (
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
            </div>

            <div className="analytics-tables-container">
                {tableData.map((monthBlock, idx) => {
                    const trend = getMonthTrend(monthBlock.month_key, tableData);
                    return (
                        <div key={monthBlock.month_key} className="analytics-table-wrapper">
                            <div className="analytics-table-header-select">
                                <span className="habit-label">{t(MONTH_KEYS[monthBlock.month - 1])} {monthBlock.year}</span>
                                {trend !== null && renderTrend(trend, true)}
                            </div>
                            <table className="analytics-table">
                                <tbody>
                                    {monthBlock.weeks.map((w, wIdx) => (
                                        <tr key={wIdx}>
                                            <td className="col-week">{w.week_label}</td>
                                            <td className="col-date">{w.date_range}</td>
                                            <td className="col-fraction">
                                                {`${w.days_done}/${w.total_days}`}
                                            </td>
                                            <td className="col-percentage">
                                                {`${w.percentage}%`}
                                            </td>
                                            <td className="col-trend">{renderTrend(w.trend, true)}</td>
                                            <td className="col-quantity-val">
                                                {w.quantity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="footer-label">{t('total') || 'итого:'}</td>
                                        <td className="col-fraction">
                                            {`${monthBlock.totals.days_done}/${monthBlock.totals.total_days}`}
                                        </td>
                                        <td className="col-percentage">
                                            {`${monthBlock.totals.percentage}%`}
                                        </td>
                                        <td className="col-trend">{renderTrend(trend, true)}</td>
                                        <td className="col-quantity-val">
                                            {monthBlock.totals.quantity}
                                        </td>
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
                        <AreaChart data={data.weeks} margin={{ top: 20, right: paddingRight + 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#404040" : "#f0f0f0"} />
                            <XAxis 
                                dataKey="week_start" 
                                tickFormatter={(val) => {
                                    const week = data.weeks.find(w => w.week_start === val);
                                    return week ? week.week_label.replace('н', language === 'ru' ? 'н' : 'w') : '';
                                }}
                                tick={{ fill: isDark ? '#999' : '#666', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis 
                                yAxisId="left"
                                domain={[0, yAxisMaxLeft]} 
                                tickCount={Math.min(8, yAxisMaxLeft + 1)}
                                tick={{ fill: isDark ? '#999' : '#666', fontSize: 12, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                domain={[0, yAxisMaxRight]} 
                                tickCount={Math.min(8, yAxisMaxRight + 1)}
                                tick={{ fill: isDark ? '#a855f7' : '#8b5cf6', fontSize: 12, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dx={10}
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
                                yAxisId="left"
                                type="monotone" 
                                dataKey={greenChartKey} 
                                stroke="#22c55e" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorGreen)"
                                dot={{ fill: '#22c55e', r: 3.5, strokeWidth: 1.5, stroke: isDark ? '#2a2a2a' : '#fff' }}
                                activeDot={{ r: 5.5, stroke: '#22c55e', strokeWidth: 1.5, fill: isDark ? '#2a2a2a' : '#fff' }}
                                isAnimationActive={true}
                            />
                            <Area 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="quantity" 
                                stroke="#a855f7" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorPurple)"
                                dot={{ fill: '#a855f7', r: 3.5, strokeWidth: 1.5, stroke: isDark ? '#2a2a2a' : '#fff' }}
                                activeDot={{ r: 5.5, stroke: '#a855f7', strokeWidth: 1.5, fill: isDark ? '#2a2a2a' : '#fff' }}
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
                            <div className="analytics-month-name">{t(MONTH_KEYS[block.month - 1])}</div>
                            <div className="analytics-month-stats">
                                <span className="percent" style={{ color: '#22c55e' }}>
                                    {block.value}%
                                </span>
                                <span className="quantity-val" style={{ color: '#a855f7', marginLeft: '6px', fontWeight: 600 }}>
                                    {block.quantity}
                                </span>
                                {block.trend !== null && block.trend !== 0 && (
                                    <span className={`trend ${block.trend > 0 ? 'positive' : 'negative'}`} style={{ marginLeft: '6px' }}>
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
