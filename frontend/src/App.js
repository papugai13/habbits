import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [activeTab, setActiveTab] = useState('Журналы');
  const [habitsData, setHabitsData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const categories = ['Все', 'Душа', 'Личное', 'Работа'];

  const bottomTabs = [
    { name: 'Журналы', icon: '✔️', disabled: false },
    { name: 'Графики', icon: '📊', disabled: false },
    { name: 'Настройка', icon: '⚙️', disabled: false },
  ];

  const fetchHabits = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/habits/weekly_status/?user_id=1');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHabitsData(data);
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

      {/* Фильтры категорий */}
      <div className="categories-section">
        {/* Desktop / Standard View */}
        <div className="categories-buttons desktop-only">
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

        {/* Mobile / Hamburger View */}
        <div className="categories-mobile mobile-only">
          <button className="category-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {selectedCategory} <span className="arrow">▼</span>
          </button>
          {isMenuOpen && (
            <div className="category-dropdown">
              {categories.map(category => (
                <div
                  key={category}
                  className={`dropdown-item ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsMenuOpen(false);
                  }}
                >
                  {category}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stats">
          <div className="stat-item">{completedYesterday}<br />Вчера</div>
          <div className="stat-item">{completedToday}<br />Сегодня</div>
        </div>
      </div>

      {/* Заголовки дней недели */}
      <div className="days-header">
        <div className="days-cols">
          {WEEK_DAYS.map((day, index) => {
            // Calculate date for this column (Monday + index)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
            // Adjust so 0 is Mon, 6 is Sun for calculation
            const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const diff = index - currentDayIndex;

            const columnDate = new Date(today);
            columnDate.setDate(today.getDate() + diff);
            const columnDateStr = columnDate.toLocaleDateString('en-CA');
            const todayStr = today.toLocaleDateString('en-CA');

            const isTodayCol = columnDateStr === todayStr;

            return (
              <div key={day} className={`day-col ${isTodayCol ? 'today' : ''}`}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="days-placeholder-end"></div>
      </div>

      {/* Список привычек */}
      <div className="habits-container">
        {habitsData.filter(h => {
          if (selectedCategory === 'Все') return true;
          // Map backend choices to UI categories
          // Backend: 'Soul', 'Personal', 'Work'
          // UI: 'Душа', 'Личное', 'Работа'
          const catMap = { 'Soul': 'Душа', 'Personal': 'Личное', 'Work': 'Работа' };
          return catMap[h.category] === selectedCategory || selectedCategory === h.category;
        }).map((habit) => (
          <div key={habit.id} className="habit-row">
            <div className="habit-name">{habit.name}</div>
            <div className="habit-row-content">
              <div className="habit-checks">
                {WEEK_DAYS.map((_, index) => {
                  // Calculate date for this slot
                  const today = new Date();
                  const dayOfWeek = today.getDay();
                  const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const diff = index - currentDayIndex;

                  const slotDate = new Date(today);
                  slotDate.setDate(today.getDate() + diff);
                  const slotDateStr = slotDate.toLocaleDateString('en-CA');

                  // Find status for this date
                  const status = habit.statuses.find(s => s.date === slotDateStr);
                  const isDone = status ? status.is_done : false;
                  const statusId = status ? status.id : null;

                  // Calculate yesterday date string
                  const yesterday = new Date(today);
                  yesterday.setDate(today.getDate() - 1);
                  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

                  const todayStr = today.toLocaleDateString('en-CA');
                  const isToday = slotDateStr === todayStr;
                  const isPast = slotDateStr < todayStr;
                  const isYesterday = slotDateStr === yesterdayStr;
                  const isMissed = isPast && !isDone;

                  // Disable if missed and NOT yesterday. 
                  // (i.e. strictly past days beyond yesterday are locked if missed)
                  const isDisabled = isMissed && !isYesterday;

                  return (
                    <button
                      key={slotDateStr}
                      className={`check-box ${isDone ? 'checked' : ''} ${isMissed ? 'missed' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => !isDisabled && toggleHabitCheck(habit.id, slotDateStr, isDone, statusId)}
                      disabled={isDisabled}
                    >
                    </button>
                  );
                })}
              </div>
              <div className="habit-count">{getHabitCount(habit)}</div>
            </div>
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