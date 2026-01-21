import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';

const App = () => {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [activeTab, setActiveTab] = useState('Журналы');
  const [habitsData, setHabitsData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Authentication state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Form state for creating habit
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Soul');
  const [createError, setCreateError] = useState('');

  const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const categories = ['Все', 'Душа', 'Личное', 'Работа'];

  const bottomTabs = [
    { name: 'Журналы', icon: '✔️', disabled: false },
    { name: 'Графики', icon: '📊', disabled: false },
    { name: 'Настройка', icon: '⚙️', disabled: false },
  ];

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-section')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        // Fetch habits after authentication confirmed
        fetchHabits();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchHabits = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/habits/weekly_status/', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHabitsData(data);
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  };

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
          credentials: 'include',
          body: JSON.stringify({ is_done: !currentStatus })
        });
      } else {
        // Create new date entry
        response = await fetch(`http://127.0.0.1:8000/api/v1/dates/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
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

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
  };

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/auth/logout/', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setIsAuthenticated(false);
      setHabitsData([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newHabitName.trim()) {
      setCreateError('Введите название привычки');
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/habits/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newHabitName.trim(),
          category: newHabitCategory
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось создать привычку');
      }

      // Reset form and close modal
      setNewHabitName('');
      setNewHabitCategory('Soul');
      setShowCreateModal(false);

      // Refresh habits list
      await fetchHabits();
    } catch (error) {
      console.error('Error creating habit:', error);
      setCreateError(error.message || 'Произошла ошибка при создании привычки');
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return showRegister ? (
      <Register
        onRegister={handleRegister}
        onSwitchToLogin={() => setShowRegister(false)}
      />
    ) : (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="app">
      {/* Верхняя панель */}
      <div className="top-bar">
        <div className="profile-section">
          <button
            className="profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="profile-name">{user?.username || 'Пользователь'}</span>
          </button>

          {showProfileMenu && (
            <div className="profile-menu">
              <div className="profile-menu-item profile-info">
                <strong>{user?.username}</strong>
                <span>{user?.email}</span>
              </div>
              <div className="profile-menu-divider"></div>
              <button
                className="profile-menu-item profile-menu-action"
                onClick={() => {
                  setShowProfileMenu(false);
                  // TODO: Открыть настройки
                }}
              >
                ⚙️ Настройки
              </button>
              <button
                className="profile-menu-item profile-menu-action logout-action"
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
              >
                🚪 Выход
              </button>
            </div>
          )}
        </div>

        <div className="date-section">
          <div className="progress-bar">
            {/* Simple progress bar based on today's completion rate */}
            <div className="progress-fill" style={{ width: habitsData.length > 0 ? `${(completedToday / habitsData.length) * 100}%` : '0%' }}></div>
          </div>
          <div className="date-text">
            {completedToday} из {habitsData.length} сегодня
          </div>
        </div>

        <button
          className="add-btn"
          title="Создать привычку"
          onClick={() => setShowCreateModal(true)}
        >
          +
        </button>
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

      {/* Модальное окно создания привычки */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать привычку</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="habit-form">
              <div className="form-group">
                <label htmlFor="habit-name">Название привычки</label>
                <input
                  id="habit-name"
                  type="text"
                  className="form-input"
                  placeholder="Например: Зарядка"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="habit-category">Категория</label>
                <select
                  id="habit-category"
                  className="form-select"
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                >
                  <option value="Soul">Душа</option>
                  <option value="Personal">Личное</option>
                  <option value="Work">Работа</option>
                </select>
              </div>

              {createError && (
                <div className="error-message">
                  {createError}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;