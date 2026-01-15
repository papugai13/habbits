import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Личное');
  const [activeTab, setActiveTab] = useState('Журналы');
  const [habitsData, setHabitsData] = useState([]);
  const [weekDays, setWeekDays] = useState([]);

  const categories = ['Душа', 'Личное', 'Работа'];

  const bottomTabs = [
    { name: 'Журналы', icon: '✓', disabled: false },
    { name: 'Графики', icon: '📊', disabled: false },
    { name: 'Смелки', icon: '🎯', disabled: true },
    { name: 'Напоминания', icon: '🔔', disabled: true },
    { name: 'Настройка', icon: '⚙️', disabled: false },
  ];

  const fetchHabits = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/habits/weekly_status/?user_id=1');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHabitsData(data);

      // Extract days from the first habit's statuses for the header
      if (data.length > 0 && data[0].statuses) {
        const days = data[0].statuses.map(status => {
          const date = new Date(status.date);
          return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date);
        });
        setWeekDays(days);
        // Set current day (last one) as selected by default if not set
        if (!selectedDay) {
          setSelectedDay(days[days.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const toggleHabitCheck = async (habitId, dayDate, currentStatus, dateId) => {
    // Optimistic update
    const updatedHabits = habitsData.map(habit => {
      if (habit.id === habitId) {
        return {
          ...habit,
          statuses: habit.statuses.map(status =>
            status.date === dayDate ? { ...status, is_done: !status.is_done } : status
          )
        };
      }
      return habit;
    });
    setHabitsData(updatedHabits);

    try {
      let response;
      if (dateId) {
        // Toggle existing date entry
        response = await fetch(`http://127.0.0.1:8000/api/v1/date/${dateId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_done: !currentStatus })
        });
      } else {
        // Create new date entry
        response = await fetch(`http://127.0.0.1:8000/api/v1/dates/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: 1, // Hardcoded user for now as per plan
            habit: habitId,
            habit_date: dayDate,
            is_done: true
          })
        });
      }

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Refetch to get correct IDs and sync state
      await fetchHabits();

    } catch (error) {
      console.error('Error toggling habit:', error);
      // Revert optimistic update on error would be ideal here, 
      // but for now we just log.
      fetchHabits(); // Sync back to server state
    }
  };

  const getHabitCount = (habit) => {
    // Just counting visible checks for now as backend doesn't return total count
    return habit.statuses.filter(s => s.is_done).length;
  };

  // Calculate stats
  const completedToday = habitsData.reduce((acc, habit) => {
    const todayStatus = habit.statuses[habit.statuses.length - 1]; // Assuming last one is today
    return acc + (todayStatus && todayStatus.is_done ? 1 : 0);
  }, 0);

  const completedYesterday = habitsData.reduce((acc, habit) => {
    const yesterdayStatus = habit.statuses[habit.statuses.length - 2];
    return acc + (yesterdayStatus && yesterdayStatus.is_done ? 1 : 0);
  }, 0);


  return (
    <div className="app">
      {/* Верхняя панель */}
      <div className="top-bar">
        <button className="menu-btn">☰</button>
        <div className="date-section">
          <div className="date-text">Статистика</div>
          <div className="progress-bar">
            {/* Simple progress bar based on today's completion rate */}
            <div className="progress-fill" style={{ width: habitsData.length > 0 ? `${(completedToday / habitsData.length) * 100}%` : '0%' }}></div>
          </div>
        </div>
        <button className="add-btn">+</button>
      </div>

      {/* Навигация по дням */}
      <div className="days-nav">
        {weekDays.map((day, index) => (
          <button
            key={index}
            className={`day-btn ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Фильтры категорий */}
      <div className="categories-section">
        <div className="categories-buttons">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="stats">
          <div className="stat-item">{completedYesterday}<br />Вчера</div>
          <div className="stat-item">{completedToday}<br />Сегодня</div>
        </div>
      </div>

      {/* Список привычек */}
      <div className="habits-container">
        {habitsData.filter(h => {
          // Map backend choices to UI categories
          // Backend: 'Soul', 'Personal', 'Work'
          // UI: 'Душа', 'Личное', 'Работа'
          const catMap = { 'Soul': 'Душа', 'Personal': 'Личное', 'Work': 'Работа' };
          return catMap[h.category] === selectedCategory || selectedCategory === h.category;
        }).map((habit) => (
          <div key={habit.id} className="habit-row">
            <div className="habit-name">{habit.name}</div>
            <div className="habit-checks">
              {habit.statuses.map((status, index) => (
                <button
                  key={status.date}
                  className={`check-box ${status.is_done ? 'checked' : ''}`}
                  onClick={() => toggleHabitCheck(habit.id, status.date, status.is_done, status.id)}
                >
                </button>
              ))}
            </div>
            <div className="habit-count">{getHabitCount(habit)}</div>
          </div>
        ))}
      </div>

      {/* Нижняя навигация */}
      <div className="bottom-nav">
        {bottomTabs.map((tab, index) => (
          <button
            key={index}
            className={`nav-item ${activeTab === tab.name ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.name)}
          >
            <div className="nav-icon">{tab.icon}</div>
            <div className="nav-label">{tab.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;