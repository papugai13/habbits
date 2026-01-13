import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [selectedDay, setSelectedDay] = useState('Вт'); // Вторник по умолчанию
  const [activeTab, setActiveTab] = useState('Журналы');
  
  // Состояние для чекбоксов привычек (habit index -> day index -> checked)
  const [habitChecks, setHabitChecks] = useState({
    0: [false, false, false, false, false, false, false], // Пост
    1: [false, false, false, false, false, false, false], // Техеджут
    2: [false, false, false, false, false, false, false], // КК
    3: [false, false, false, false, false, false, false], // Джевшен
    4: [false, false, false, false, false, false, false], // Тафсир
    5: [false, false, false, false, false, false, false], // Гимнастика
    6: [false, false, false, false, false, false, false], // Настрой
  });

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const categories = ['Душа', 'Личное', 'Работа'];
  
  const habits = [
    { name: 'Пост', count: 13 },
    { name: 'Техеджут', count: 7 },
    { name: 'КК', count: 4 },
    { name: 'Джевшен', count: 0 },
    { name: 'Тафсир', count: 10 },
    { name: 'Гимнастика/холодный душ/прогулка', count: 15 },
    { name: 'Настрой на благополучный день', count: 9 },
  ];

  const bottomTabs = [
    { name: 'Журналы', icon: '✔️', disabled: false },
    { name: 'Графики', icon: '📊', disabled: false },
    { name: 'Ачивки', icon: '🏆', disabled: false },
    { name: 'Профиль', icon: '👤', disabled: false },
    //{ name: 'Настройка', icon: '⚙️', disabled: false },
  ];

  const toggleHabitCheck = (habitIndex, dayIndex) => {
    setHabitChecks(prev => ({
      ...prev,
      [habitIndex]: prev[habitIndex].map((checked, i) => 
        i === dayIndex ? !checked : checked
      )
    }));
  };

  const getHabitCount = (habitIndex) => {
    return habitChecks[habitIndex]?.filter(Boolean).length || 0;
  };

  return (
    <div className="app">
      {/* Верхняя панель */}
      <div className="top-bar">
        <button className="menu-btn">☰</button>
        <div className="date-section">
          <div className="date-text">30 июня-июля 2025г.</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '60%' }}></div>
          </div>
        </div>
        <button className="add-btn">+</button>
      </div>

      {/* Навигация по дням */}
      <div className="days-nav">
        {days.map(day => (
          <button
            key={day}
            className={`day-btn ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Фильтры категорий */}
      <div className="categories-section">
        
      
        <div className="stats">
          <div className="stat-item">50<br/>Вчера</div>
          <div className="stat-item">35<br/>Сегодня</div>
        </div>
      </div>

      {/* Список привычек */}
      <div className="habits-container">
        {habits.map((habit, habitIndex) => (
          <div key={habitIndex} className="habit-row">
            <div className="habit-name">{habit.name}</div>
            
            <div className="habit-checks">
              {days.map((day, dayIndex) => (
                <button
                  key={dayIndex}
                  className={`check-box ${habitChecks[habitIndex]?.[dayIndex] ? 'checked' : ''}`}
                  onClick={() => toggleHabitCheck(habitIndex, dayIndex)}
                >
                </button>
              ))}
            </div>
            <div className="habit-count">{getHabitCount(habitIndex)}</div>
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