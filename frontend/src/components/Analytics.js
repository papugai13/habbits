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
    const [viewType, setViewType] = useState('habits');
    const [loading, setLoading] = useState(true);
    const chartWrapperRef = useRef(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
    const metricDropdownRef = useRef(null);
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
            if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
                setIsMetricDropdownOpen(false);
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
        if (selectedHabitId === 'all') return t('allHabits') || 'Все привычки';
        const habit = habits.find(h => h.id.toString() === selectedHabitId.toString());
        return habit ? habit.name : t('allHabits') || 'Все привычки';
    }, [selectedHabitId, habits, t]);

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

    const chartDataKey = useMemo(() => {
        if (viewType === 'quantity') return 'quantity';
        return selectedHabitId === 'all' ? 'days_done' : 'value';
    }, [selectedHabitId, viewType]);

    const chartColor = useMemo(() => {
        return viewType === 'quantity' ? '#a855f7' : '#22c55e';
    }, [viewType]);

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

    const yAxisMax = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return 1;
        const maxValue = Math.max(...data.weeks.map(w => Number(w[chartDataKey]) || 0));
        return Math.max(1, Math.ceil(maxValue));
    }, [data.weeks, chartDataKey]);

    // Process data for tables
    const tableData = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0) return [];
        
        const months = [];
        let currentMonthBlock = null;
        let prevWeekVal = null;
        
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
                        quantity: 0,
                        trend: null
                    }
                };
            }
            
            const endDate = new Date(week.week_end);
            const dateRange = `${startDate.getDate()}-${endDate.getDate()}`;
            
            const totalDays = week.total_days || 7;
            const daysDone = Math.min(week.days_done || 0, totalDays);
            const percentage = totalDays > 0 ? Math.min(Math.round((daysDone / totalDays) * 100), 100) : 0;
            const quantity = week.quantity || 0;
            
            const currentVal = viewType === 'quantity' ? quantity : percentage;
            let trend = null;
            if (prevWeekVal !== null) {
                trend = currentVal - prevWeekVal;
            }
            prevWeekVal = currentVal;
            
            currentMonthBlock.weeks.push({
                week_label: week.week_label.replace('н', language === 'ru' ? 'неделя ' : 'week '),
                date_range: dateRange,
                days_done: daysDone,
                total_days: totalDays,
                percentage: percentage,
                quantity: quantity,
                trend: trend
            });
            
            currentMonthBlock.totals.days_done += daysDone;
            currentMonthBlock.totals.total_days += totalDays;
            currentMonthBlock.totals.quantity += quantity;
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
    }, [data.weeks, language, viewType]);


    const getMonthTrend = (mKey, currentTableData) => {
        const idx = currentTableData.findIndex(m => m.month_key === mKey);
        if (idx > 0) {
            if (viewType === 'quantity') {
                return currentTableData[idx].totals.quantity - currentTableData[idx-1].totals.quantity;
            }
            return currentTableData[idx].totals.percentage - currentTableData[idx-1].totals.percentage;
        }
        return null;
    };

    // Calculate month blocks for the row below the chart
    const monthBlocks = useMemo(() => {
        if (!data.weeks || data.weeks.length === 0 || tableData.length === 0) return [];
        const blocks = [];

        // Helper to get index range of weeks for a month
        let weekStartIndex = 0;
        tableData.forEach((mBlock) => {
            const numWeeks = mBlock.weeks.length;
            const weekEndIndex = weekStartIndex + numWeeks - 1;
            const centerIdx = weekStartIndex + (weekEndIndex - weekStartIndex) / 2;

            // Real width available for weeks is chartWidth - paddingLeft - paddingRight
            const actualWeekWidth = (chartWidth - paddingLeft - paddingRight) / data.weeks.length;
            const leftPos = paddingLeft + (centerIdx * actualWeekWidth) + actualWeekWidth / 2;

            const trend = getMonthTrend(mBlock.month_key, tableData);

            blocks.push({
                month: mBlock.month,
                name: mBlock.month_name,
                left: leftPos,
                value: viewType === 'quantity' ? mBlock.totals.quantity : mBlock.totals.percentage,
                trend: trend
            });

            weekStartIndex += numWeeks;
        });

        return blocks;
    }, [data.weeks, tableData, chartWidth, viewType]);

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
                    <div className="analytics-view-selector">
                        <button
                            className={`view-btn habits ${viewType === 'habits' ? 'active' : ''}`}
                            onClick={() => setViewType('habits')}
                        >
                            {t('completed') || 'Выполнено'}
                        </button>
                        <button
                            className={`view-btn quantity ${viewType === 'quantity' ? 'active' : ''}`}
                            onClick={() => setViewType('quantity')}
                        >
                            {t('quantity') || 'Количество'}
                        </button>
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
                                    {t('allHabits') || 'Все привычки'}
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
                </div>
            </div>

            <div className="analytics-tables-container">
                {tableData.map((monthBlock, idx) => {
                    const trend = getMonthTrend(monthBlock.month_key, tableData);
                    return (
                        <div key={monthBlock.month_key} className="analytics-table-wrapper">
                            <div className="analytics-table-header-select">
                                <span className="habit-label">{t(MONTH_KEYS[monthBlock.month - 1])} {monthBlock.year}</span>
                                {trend !== null && renderTrend(trend, viewType !== 'quantity')}
                            </div>
                            <table className="analytics-table">
                                <tbody>
                                    {monthBlock.weeks.map((w, wIdx) => (
                                        <tr key={wIdx}>
                                            <td className="col-week">{w.week_label}</td>
                                            <td className="col-date">{w.date_range}</td>
                                            <td className="col-fraction">
                                                {viewType === 'quantity' ? w.quantity : `${w.days_done}/${w.total_days}`}
                                            </td>
                                            <td className="col-percentage">
                                                {viewType === 'quantity' ? '' : `${w.percentage}%`}
                                            </td>
                                            <td className="col-trend">{renderTrend(w.trend, viewType !== 'quantity')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="footer-label">{t('total') || 'итого:'}</td>
                                        <td className="col-fraction">
                                            {viewType === 'quantity' ? monthBlock.totals.quantity : `${monthBlock.totals.days_done}/${monthBlock.totals.total_days}`}
                                        </td>
                                        <td className="col-percentage">
                                            {viewType === 'quantity' ? '' : `${monthBlock.totals.percentage}%`}
                                        </td>
                                        <td className="col-trend">{renderTrend(trend, viewType !== 'quantity')}</td>
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
                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
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
                                domain={[0, yAxisMax]} 
                                tickCount={Math.min(8, yAxisMax + 1)}
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
                                dataKey={chartDataKey} 
                                stroke={chartColor} 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorValue)"
                                dot={{ fill: chartColor, r: 4, strokeWidth: 2, stroke: isDark ? '#2a2a2a' : '#fff' }}
                                activeDot={{ r: 6, stroke: chartColor, strokeWidth: 2, fill: isDark ? '#2a2a2a' : '#fff' }}
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
                                <span className="percent">
                                    {block.value}{viewType === 'quantity' ? '' : '%'}
                                </span>
                                {block.trend !== null && block.trend !== 0 && (
                                    <span className={`trend ${block.trend > 0 ? 'positive' : 'negative'}`}>
                                        {block.trend > 0 ? '+' : ''}{block.trend}{viewType === 'quantity' ? '' : '%'}{block.trend > 0 ? '↑' : '↓'}
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
