// App.js
import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeButtons, setActiveButtons] = useState({});

  
  // Данные календаря
  const calendarData = {
    month: "30 июня-июля 2025г.",
    days: [
      { day: "Пн", value: "Душа" },
      { day: "Вт", value: "Личное" },
      { day: "Ср", value: "Работа" },
      { day: "Чт", value: "" },
      { day: "Пт", value: "50 Вчера" },
      { day: "Сб", value: "" },
      { day: "Вс", value: "35 Сегодня" }
    ]
  };

  // Список привычек/задач
  const habits = [
    "Пост",
    "Техеджут",
    "КК",
    "Джевшен",
    "Тарсир",
    "Гимнастика/холодный душ/прогулка",
    "Настрой на благополучный день",
  ];

  // Дополнительные задачи
  const additionalTasks = [
    "Журналы",
    "Графики", 
    "Смелки",
    "Испоминания",
    "Настройка"
  ];

  // Функция для переключения состояния кнопки
  const toggleButton = (habitIndex, buttonIndex) => {
    const key = `${habitIndex}-${buttonIndex}`;
    setActiveButtons(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="app">
      <div className="container">
        {/* Заголовок месяца */}
        <div className="month-header">
          <h2>{calendarData.month}</h2>
        </div>
        {/* Календарь */}
        <div className="calendar">
          <table className="calendar-table">
            <thead>
              <tr>
                {calendarData.days.map((day, index) => (
                  <th key={index}>{day.day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {calendarData.days.map((day, index) => (
                  <td 
                    key={index}
                    className={`calendar-cell ${day.value ? 'has-content' : ''}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day.value && (
                      <div className="day-content">
                        {day.value}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Основные привычки */}
        <div className="habits-section">
          <h3>Ежедневные привычки</h3>
          <div className="habits-list">
            {habits.map((habit, habitIndex) => (
              <div key={habitIndex} className="habit-item">
                <p>
                  <label>{habit}</label><br />
                  {[0, 1, 2, 3, 4, 5, 6].map((buttonIndex) => (
                    <button
                      key={buttonIndex}
                      className={activeButtons[`${habitIndex}-${buttonIndex}`] ? 'active' : ''}
                      onClick={() => toggleButton(habitIndex, buttonIndex)}
                    >
                      ⠀⠀⠀⠀
                    </button>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Дополнительные задачи */}
        <div className="additional-tasks">
          <h3>Дополнительные задачи</h3>
          <div className="tasks-grid">
            {additionalTasks.map((task, index) => (
              <div key={index} className="task-item">
                {task}
              </div>
            ))}
          </div>
        </div>

        {/* Модальное окно для выбранной даты */}
        {selectedDate && selectedDate.value && (
          <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Детали дня</h3>
              <p><strong>{selectedDate.day}:</strong> {selectedDate.value}</p>
              <button onClick={() => setSelectedDate(null)}>Закрыть</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;