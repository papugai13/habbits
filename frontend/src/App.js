import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Charts from './components/Charts';
import DrumPicker from './components/DrumPicker';

const App = () => {
  // Helper to get CSRF token
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

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
  const [newHabitCategory, setNewHabitCategory] = useState('');
  const [createError, setCreateError] = useState('');
  // Categories state
  const [categories, setCategories] = useState([{ id: 'all', name: 'Все' }]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Quantity modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [commentValue, setCommentValue] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ username: '', email: '', age: '' });
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Archive state
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [showArchive, setShowArchive] = useState(false);

  // Drag-and-drop state
  const [draggedHabitId, setDraggedHabitId] = useState(null);
  const [dragOverHabitId, setDragOverHabitId] = useState(null);

  const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const bottomTabs = [
    { name: 'Журналы', icon: '✔️', disabled: false },
    { name: 'Графики', icon: '📊', disabled: false },
    { name: 'Настройки', icon: '⚙️', disabled: false },
  ];

  // Fetch categories from API
  const fetchCategories = React.useCallback(async () => {
    try {
      const response = await fetch('/api/v1/categories/');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);

        // Set default category for form if not set
        if (data.length > 0 && !newHabitCategory) {
          setNewHabitCategory(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [newHabitCategory]);

  // Fetch habits from API
  const fetchHabits = React.useCallback(async (targetDate) => {
    try {
      const dateToFetch = targetDate || currentWeekDate;
      const response = await fetch(`/api/v1/habits/weekly_status/?date=${dateToFetch}`);
      if (response.ok) {
        const data = await response.json();
        setHabitsData(data);
      }
    } catch (error) {
      console.error('Error fetching habits:', error);
    }
  }, [currentWeekDate]);

  // Fetch archived habits
  const fetchArchivedHabits = React.useCallback(async () => {
    try {
      const response = await fetch('/api/v1/habits/archived/');
      if (response.ok) {
        const data = await response.json();
        setArchivedHabits(data);
      }
    } catch (error) {
      console.error('Error fetching archived habits:', error);
    }
  }, []);

  // Check authentication status
  const checkAuth = React.useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me/');

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        // Fetch data after authentication confirmed
        fetchHabits();
        fetchArchivedHabits();
        fetchCategories();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchHabits, fetchArchivedHabits, fetchCategories]);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch habits when currentWeekDate changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchHabits();
    }
  }, [currentWeekDate, isAuthenticated, fetchHabits]);

  const handlePrevWeek = () => {
    const prevDate = new Date(currentWeekDate);
    prevDate.setDate(prevDate.getDate() - 7);
    setCurrentWeekDate(prevDate.toLocaleDateString('en-CA'));
  };

  const handleNextWeek = () => {
    const nextDate = new Date(currentWeekDate);
    nextDate.setDate(nextDate.getDate() + 7);
    setCurrentWeekDate(nextDate.toLocaleDateString('en-CA'));
  };

  const currentWeekRange = () => {
    const curr = new Date(currentWeekDate);
    const day = curr.getDay();
    const diff = curr.getDate() - (day === 0 ? 6 : day - 1);
    const firstDay = new Date(curr.setDate(diff));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    return `${firstDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${lastDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  };

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


  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    if (name.length < 2) {
      setCreateError('Название категории должно содержать минимум 2 символа');
      return;
    }
    if (name.length > 20) {
      setCreateError('Название категории не должно превышать 20 символов');
      return;
    }

    try {
      const response = await fetch('/api/v1/categories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (response.ok) {
        const newCat = await response.json();
        setNewCategoryName('');
        setShowAddCategory(false);
        await fetchCategories();
        setNewHabitCategory(newCat.id.toString());
      } else {
        const err = await response.json();
        const errorMessage = err.name ? err.name[0] : (err.detail || 'Ошибка при создании категории');
        setCreateError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const toggleHabitCheck = async (habitId, dayDate, currentStatus, dateId, quantity = null) => {
    // Optimistic update
    const updatedHabits = habitsData.map(habit => {
      if (habit.id === habitId) {
        return {
          ...habit,
          statuses: habit.statuses.map(status =>
            status.date === dayDate ? { ...status, is_done: !status.is_done, quantity: quantity || status.quantity } : status
          )
        };
      }
      return habit;
    });
    setHabitsData(updatedHabits);

    try {
      let response;
      const payload = quantity !== null ? { is_done: !currentStatus, quantity } : { is_done: !currentStatus };

      if (dateId) {
        // Toggle existing date entry
        response = await fetch(`/api/v1/date/${dateId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
      } else {
        // Create new date entry
        response = await fetch(`/api/v1/dates/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
          },
          credentials: 'include',
          body: JSON.stringify({
            habit: habitId,
            habit_date: dayDate,
            is_done: true,
            ...(quantity !== null && { quantity })
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

  const handleLongPressStart = (habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto) => {
    const timer = setTimeout(() => {
      // Open quantity modal
      setQuantityModalData({ habitId, habitName, dayDate, currentStatus, dateId, currentPhoto });
      setQuantityValue(currentQuantity && currentQuantity > 0 ? currentQuantity : 1);
      setCommentValue(currentComment || '');
      setPhotoFile(null);
      setShowQuantityModal(true);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleEntrySubmit = async () => {
    if (!quantityModalData) return;

    const qty = typeof quantityValue === 'number' && quantityValue >= 1 ? quantityValue : null;

    const { habitId, dayDate, dateId } = quantityModalData;

    try {
      let response;
      const formData = new FormData();
      formData.append('is_done', 'true');
      if (qty !== null) formData.append('quantity', qty);
      if (commentValue) formData.append('comment', commentValue);
      if (photoFile) formData.append('photo', photoFile);

      if (dateId) {
        // Update existing entry
        response = await fetch(`/api/v1/date/${dateId}/`, {
          method: 'PATCH',
          headers: {
            'X-CSRFToken': getCookie('csrftoken')
          },
          credentials: 'include',
          body: formData
        });
      } else {
        // Create new entry
        formData.append('habit', habitId);
        formData.append('habit_date', dayDate);
        response = await fetch(`/api/v1/dates/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCookie('csrftoken')
          },
          credentials: 'include',
          body: formData
        });
      }

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Close modal and refresh
      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(1);
      setCommentValue('');
      setPhotoFile(null);
      await fetchHabits();

    } catch (error) {
      console.error('Error saving data:', error);
      alert('Ошибка при сохранении данных');
    } finally {
      // Always close modal and reset state
      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(1);
      setCommentValue('');
      setPhotoFile(null);
    }
  };

  const getHabitCount = (habit) => {
    return habit.statuses.reduce((acc, s) => {
      if (s.is_done) {
        return acc + (s.quantity || 1);
      }
      return acc;
    }, 0);
  };

  // Calculate weekly stats
  const completedThisWeek = habitsData.reduce((acc, habit) => {
    return acc + habit.statuses.reduce((sum, status) => {
      if (status.is_done) {
        return sum + (status.quantity || 1);
      }
      return sum;
    }, 0);
  }, 0);

  const totalPossibleThisWeek = habitsData.length * 7;

  // Sort and filter categories
  const sortedCategories = React.useMemo(() => {
    const counts = habitsData.reduce((acc, habit) => {
      acc[habit.category_name] = (acc[habit.category_name] || 0) + 1;
      return acc;
    }, {});

    const sorted = [...categories].filter(c => c.id !== 'all' && c.name !== 'Все').sort((a, b) => {
      const countA = counts[a.name] || 0;
      const countB = counts[b.name] || 0;
      return countB - countA;
    });

    return [{ id: 'all', name: 'Все' }, ...sorted];
  }, [categories, habitsData]);

  const MAX_VISIBLE_CATEGORIES = 4;
  const visibleCategories = sortedCategories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hiddenCategories = sortedCategories.slice(MAX_VISIBLE_CATEGORIES);

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
    fetchArchivedHabits();
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
    fetchArchivedHabits();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
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
      const response = await fetch('/api/v1/habits/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
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
      setShowCreateModal(false);

      // Refresh habits list
      await fetchHabits();
    } catch (error) {
      console.error('Error creating habit:', error);
      setCreateError(error.message || 'Произошла ошибка при создании привычки');
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту привычку? Все данные о выполнении будут удалены.')) return;

    try {
      const response = await fetch(`/api/v1/habits/${habitId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      if (response.ok) {
        await fetchHabits();
        await fetchArchivedHabits();
      } else {
        alert('Ошибка при удалении привычки');
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const handleArchiveHabit = async (habitId) => {
    try {
      const response = await fetch(`/api/v1/habits/${habitId}/archive/`, {
        method: 'PATCH',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        credentials: 'include'
      });
      if (response.ok) {
        await fetchHabits();
        await fetchArchivedHabits();
      }
    } catch (error) {
      console.error('Error archiving habit:', error);
    }
  };

  const handleUnarchiveHabit = async (habitId) => {
    try {
      const response = await fetch(`/api/v1/habits/${habitId}/archive/`, {
        method: 'PATCH',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        credentials: 'include'
      });
      if (response.ok) {
        await fetchHabits();
        await fetchArchivedHabits();
      }
    } catch (error) {
      console.error('Error unarchiving habit:', error);
    }
  };

  const handleDragStart = (e, habitId) => {
    setDraggedHabitId(habitId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, habitId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverHabitId(habitId);
  };

  const handleDrop = async (e, targetHabitId) => {
    e.preventDefault();
    if (draggedHabitId === targetHabitId) {
      setDraggedHabitId(null);
      setDragOverHabitId(null);
      return;
    }

    // Reorder locally
    const currentList = [...habitsData];
    const draggedIndex = currentList.findIndex(h => h.id === draggedHabitId);
    const targetIndex = currentList.findIndex(h => h.id === targetHabitId);
    const [removed] = currentList.splice(draggedIndex, 1);
    currentList.splice(targetIndex, 0, removed);
    setHabitsData(currentList);

    // Send new order to backend
    const reorderPayload = currentList.map((h, index) => ({ id: h.id, order: index }));
    try {
      await fetch('/api/v1/habits/reorder/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify(reorderPayload)
      });
    } catch (error) {
      console.error('Error saving order:', error);
      fetchHabits(); // revert on error
    }

    setDraggedHabitId(null);
    setDragOverHabitId(null);
  };

  const handleDragEnd = () => {
    setDraggedHabitId(null);
    setDragOverHabitId(null);
  };

  const handleMoveHabit = async (habitId, direction) => {
    const currentList = [...habitsData];
    const index = currentList.findIndex(h => h.id === habitId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const [removed] = currentList.splice(index, 1);
      currentList.splice(index - 1, 0, removed);
    } else if (direction === 'down' && index < currentList.length - 1) {
      const [removed] = currentList.splice(index, 1);
      currentList.splice(index + 1, 0, removed);
    } else {
      return;
    }

    // Update locally
    setHabitsData(currentList);

    // Send to backend
    const reorderPayload = currentList.map((h, index) => ({ id: h.id, order: index }));
    try {
      await fetch('/api/v1/habits/reorder/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify(reorderPayload)
      });
    } catch (error) {
      console.error('Error saving order:', error);
      fetchHabits(); // revert on error
    }
  };

  const handleUpdateHabit = async (e) => {
    e.preventDefault();
    if (!editingHabit) return;

    try {
      const response = await fetch(`/api/v1/habits/${editingHabit.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editingHabit.name,
          category: editingHabit.category
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingHabit(null);
        await fetchHabits();
      } else {
        const err = await response.json();
        alert(err.detail || 'Ошибка при обновлении привычки');
      }
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (editProfileData.age) {
      const ageNum = parseInt(editProfileData.age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        alert('Возраст должен быть числом от 0 до 150 лет');
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify(editProfileData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setShowEditProfileModal(false);
        // Sync UserAll name if needed (backend does this now)
        await fetchHabits();
      } else {
        const err = await response.json();
        alert(JSON.stringify(err) || 'Ошибка при обновлении профиля');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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

  const handleGenerateReport = async (habitId) => {
    setIsReportLoading(true);
    try {
      const response = await fetch(`/api/v1/habits/${habitId}/report/`, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        alert('Ошибка при загрузке отчета');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Ошибка при загрузке отчета');
    } finally {
      setIsReportLoading(false);
    }
  };

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
          <div className="week-navigation">
            <button className="week-nav-btn" onClick={handlePrevWeek}>&lt;</button>
            <div className="week-range-text">{currentWeekRange()}</div>
            <button className="week-nav-btn" onClick={handleNextWeek}>&gt;</button>
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


      {/* Фильтры категорий - только для вкладки Журналы */}
      {activeTab === 'Журналы' && (
        <div className="categories-section">
          {/* Desktop / Standard View */}
          <div className="categories-buttons desktop-only">
            {visibleCategories.map(category => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
              </button>
            ))}
            {hiddenCategories.length > 0 && (
              <div className="more-categories-wrapper">
                <button
                  className={`category-btn more-btn ${hiddenCategories.some(c => c.name === selectedCategory) ? 'active' : ''}`}
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                >
                  Ещё {isMoreMenuOpen ? '▲' : '▼'}
                </button>
                {isMoreMenuOpen && (
                  <div className="category-dropdown more-dropdown">
                    {hiddenCategories.map(category => (
                      <div
                        key={category.id}
                        className={`dropdown-item ${selectedCategory === category.name ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(category.name);
                          setIsMoreMenuOpen(false);
                        }}
                      >
                        {category.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile / Hamburger View */}
          <div className="categories-mobile mobile-only">
            <button className="category-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {selectedCategory} <span className="arrow">▼</span>
            </button>
            {isMenuOpen && (
              <div className="category-dropdown">
                {sortedCategories.map(category => (
                  <div
                    key={category.id}
                    className={`dropdown-item ${selectedCategory === category.name ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(category.name);
                      setIsMenuOpen(false);
                    }}
                  >
                    {category.name}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Заголовки дней недели - только для вкладки Журналы */}
      {activeTab === 'Журналы' && (
        <div className="days-header">
          <div className="days-cols">
            {WEEK_DAYS.map((day, index) => {
              // Calculate date for this column based on currentWeekDate
              const baseDate = new Date(currentWeekDate);
              const dayOfWeek = baseDate.getDay();
              const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const diff = index - currentDayIndex;

              const columnDate = new Date(baseDate);
              columnDate.setDate(baseDate.getDate() + diff);
              const columnDateStr = columnDate.toLocaleDateString('en-CA');
              const todayStr = new Date().toLocaleDateString('en-CA');

              const isTodayCol = columnDateStr === todayStr;

              return (
                <div key={day} className={`day-col ${isTodayCol ? 'today' : ''}`}>
                  <div className="day-name">{day}</div>
                  <div className="day-number">{columnDate.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="days-placeholder-end"></div>
        </div>
      )}

      {/* Список привычек - только для вкладки Журналы */}
      {activeTab === 'Журналы' && (
        <div className="habits-container">
          {habitsData.filter(habit => {
            if (selectedCategory === 'Все') return true;
            return habit.category_name === selectedCategory;
          }).map((habit) => (
            <div key={habit.id} className="habit-row">
              <div className="habit-name">
                {habit.name}
                {habit.latest_comment && (
                  <div className="habit-latest-comment" title={habit.latest_comment}>
                    <span className="comment-indicator-circle"></span>
                    <span className="comment-text">{habit.latest_comment}</span>
                  </div>
                )}
              </div>
              <div className="habit-row-content">
                <div className="habit-checks">
                  {WEEK_DAYS.map((_, index) => {
                    // Calculate date for this slot based on currentWeekDate
                    const baseDate = new Date(currentWeekDate);
                    const dayOfWeek = baseDate.getDay();
                    const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const diff = index - currentDayIndex;

                    const slotDate = new Date(baseDate);
                    slotDate.setDate(baseDate.getDate() + diff);
                    const slotDateStr = slotDate.toLocaleDateString('en-CA');

                    const today = new Date();
                    const todayStr = today.toLocaleDateString('en-CA');

                    // Find status for this date
                    const status = habit.statuses.find(s => s.date === slotDateStr);
                    const isDone = status ? status.is_done : false;
                    const statusId = status ? status.id : null;
                    const quantity = status ? status.quantity : null;

                    // Calculate yesterday date string
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

                    const isToday = slotDateStr === todayStr;
                    const isPast = slotDateStr < todayStr;
                    const isFuture = slotDateStr > todayStr;
                    const isYesterday = slotDateStr === yesterdayStr;
                    const isMissed = isPast && !isDone;
                    const hasAttachment = status && (status.comment || status.photo);

                    // Disable only IF it's in the future
                    const isDisabled = isFuture;

                    return (
                      <button
                        key={slotDateStr}
                        className={`check-box ${isDone ? 'checked' : ''} ${isMissed ? 'missed' : ''} ${isToday ? 'today' : ''} ${isDone && quantity > 1 ? 'with-quantity' : ''} ${hasAttachment ? 'has-attachment' : ''}`}
                        onClick={() => {
                          if (!isDisabled && !longPressTimer) {
                            toggleHabitCheck(habit.id, slotDateStr, isDone, statusId);
                          }
                        }}
                        onMouseDown={() => !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo)}
                        onTouchEnd={handleLongPressEnd}
                        disabled={isDisabled}
                      >
                        {isDone && quantity > 1 && <span className="quantity-display">{quantity}</span>}
                        {hasAttachment && <span className="attachment-indicator"></span>}
                      </button>
                    );
                  })}
                </div>
                <div className="habit-count">{getHabitCount(habit)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Компонент графиков - для вкладки Графики */}
      {activeTab === 'Графики' && (
        <Charts getCookie={getCookie} />
      )}

      {/* Вкладка Настройка */}
      {activeTab === 'Настройки' && (
        <div className="settings-container">
          <div className="settings-header">
            <h2>⚙️ Настройки</h2>
          </div>

          <div className="settings-section profile-settings">
            <h3 className="section-title">Профиль</h3>
            <div className="manage-profile-info">
              <div className="profile-info-row">
                <span className="info-label">Имя:</span>
                <span className="info-value">{user?.username}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">Возраст:</span>
                <span className="info-value">{user?.age || 'не указан'}</span>
              </div>
              <button
                className="btn-secondary btn-small edit-profile-btn"
                onClick={() => {
                  setEditProfileData({
                    username: user?.username || '',
                    email: user?.email || '',
                    age: user?.age || ''
                  });
                  setShowEditProfileModal(true);
                }}
              >
                ✏️ Изменить профиль
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title">Управление привычками</h3>
            <div className="manage-habits-list">
              {habitsData.length === 0 ? (
                <p className="no-habits-msg">У вас пока нет привычек.</p>
              ) : (
                habitsData.map(habit => (
                  <div
                    key={habit.id}
                    className={`manage-habit-item ${draggedHabitId === habit.id ? 'dragging' : ''} ${dragOverHabitId === habit.id && draggedHabitId !== habit.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, habit.id)}
                    onDragOver={(e) => handleDragOver(e, habit.id)}
                    onDrop={(e) => handleDrop(e, habit.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="drag-handle" title="Перетащить">⠿</div>
                    <div className="reorder-arrows">
                      <button
                        className="reorder-btn up"
                        onClick={() => handleMoveHabit(habit.id, 'up')}
                        disabled={habitsData.indexOf(habit) === 0}
                        title="Вверх"
                      >
                        ▲
                      </button>
                      <button
                        className="reorder-btn down"
                        onClick={() => handleMoveHabit(habit.id, 'down')}
                        disabled={habitsData.indexOf(habit) === habitsData.length - 1}
                        title="Вниз"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="manage-habit-info">
                      <div className="manage-habit-name">{habit.name}</div>
                      <div className="manage-habit-category">{habit.category_name}</div>
                    </div>
                    <div className="manage-habit-actions">
                      <button
                        className="manage-btn report-btn"
                        onClick={() => handleGenerateReport(habit.id)}
                        title="Отчет и PDF"
                        disabled={isReportLoading}
                      >
                        📊
                      </button>
                      <button
                        className="manage-btn edit-btn"
                        onClick={() => {
                          setEditingHabit({ ...habit });
                          setShowEditModal(true);
                        }}
                        title="Изменить"
                      >
                        ✏️
                      </button>
                      <button
                        className="manage-btn archive-btn"
                        onClick={() => handleArchiveHabit(habit.id)}
                        title="В архив"
                      >
                        📦
                      </button>
                      <button
                        className="manage-btn delete-btn"
                        onClick={() => handleDeleteHabit(habit.id)}
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Archive section */}
            <div className="archive-section">
              <button
                className="archive-toggle-btn"
                onClick={() => setShowArchive(!showArchive)}
              >
                <span className="archive-toggle-icon">{showArchive ? '▲' : '▼'}</span>
                📁 Архив ({archivedHabits.length})
              </button>
              {showArchive && (
                <div className="archived-habits-list">
                  {archivedHabits.length === 0 ? (
                    <p className="no-habits-msg">Архив пуст.</p>
                  ) : (
                    archivedHabits.map(habit => (
                      <div key={habit.id} className="archived-habit-item">
                        <div className="manage-habit-info">
                          <div className="manage-habit-name">{habit.name}</div>
                          <div className="manage-habit-category">{habit.category_name}</div>
                        </div>
                        <div className="manage-habit-actions">
                          <button
                            className="manage-btn unarchive-btn"
                            onClick={() => handleUnarchiveHabit(habit.id)}
                            title="Восстановить"
                          >
                            📤
                          </button>
                          <button
                            className="manage-btn delete-btn"
                            onClick={() => handleDeleteHabit(habit.id)}
                            title="Удалить навсегда"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <div className="category-input-wrapper">
                  <select
                    id="habit-category"
                    className="form-select"
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => {
                      return <option key={cat.id} value={cat.id}>{cat.name}</option>;
                    })}
                  </select>
                  <button
                    type="button"
                    className="add-category-inline-btn"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                  >
                    {showAddCategory ? '−' : '+'}
                  </button>
                </div>
              </div>

              {showAddCategory && (
                <div className="form-group add-category-field">
                  <div className="inline-add-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Новая категория"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      minLength="2"
                      maxLength="20"
                    />
                    <button
                      type="button"
                      className="btn-primary btn-small"
                      onClick={handleCreateCategory}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}

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

      {/* Модальное окно редактирования привычки */}
      {showEditModal && editingHabit && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изменить привычку</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateHabit} className="habit-form">
              <div className="form-group">
                <label htmlFor="edit-habit-name">Название привычки</label>
                <input
                  id="edit-habit-name"
                  type="text"
                  className="form-input"
                  value={editingHabit.name}
                  onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-habit-category">Категория</label>
                <select
                  id="edit-habit-category"
                  className="form-select"
                  value={editingHabit.category || ''}
                  onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })}
                >
                  {categories.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования профиля */}
      {showEditProfileModal && (
        <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изменить профиль</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditProfileModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="habit-form">
              <div className="form-group">
                <label htmlFor="profile-username">Имя пользователя</label>
                <input
                  id="profile-username"
                  type="text"
                  className="form-input"
                  value={editProfileData.username}
                  onChange={(e) => setEditProfileData({ ...editProfileData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={editProfileData.email}
                  onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-age">Возраст</label>
                <input
                  id="profile-age"
                  type="text"
                  className="form-input"
                  placeholder="Например: 25"
                  value={editProfileData.age}
                  onChange={(e) => setEditProfileData({ ...editProfileData, age: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для ввода количества, комментария и фото */}
      {showQuantityModal && quantityModalData && (
        <div className="modal-overlay" onClick={() => {
          setShowQuantityModal(false);
          setQuantityModalData(null);
          setQuantityValue(1);
          setCommentValue('');
          setPhotoFile(null);
        }}>
          <div className="modal-content quantity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Детали выполнения</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowQuantityModal(false);
                  setQuantityModalData(null);
                  setQuantityValue(1);
                  setCommentValue('');
                  setPhotoFile(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="quantity-modal-body">
              <p className="habit-info">
                <strong>{quantityModalData.habitName}</strong>
              </p>
              <div className="form-group">
                <label>Количество</label>
                <DrumPicker
                  value={quantityValue}
                  min={1}
                  max={999}
                  onChange={(val) => setQuantityValue(val)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="comment-input">Комментарий</label>
                <textarea
                  id="comment-input"
                  className="form-input"
                  placeholder="Добавьте заметку..."
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  rows="3"
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="photo-input">Фото</label>
                {quantityModalData.currentPhoto && !photoFile && (
                  <div className="current-photo-preview">
                    <img src={quantityModalData.currentPhoto} alt="Текущее фото" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginBottom: '10px', borderRadius: '8px' }} />
                  </div>
                )}
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setPhotoFile(files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowQuantityModal(false);
                  setQuantityModalData(null);
                  setQuantityValue(1);
                  setCommentValue('');
                  setPhotoFile(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleEntrySubmit}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Модальное окно отчета */}
      {reportData && (
        <div className="modal-overlay report-modal-overlay" onClick={() => setReportData(null)}>
          <div className="modal-content report-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h2>Отчет: {reportData.habit.name}</h2>
              <div>
                <button className="btn-primary" onClick={() => window.print()} style={{ marginRight: '10px' }}>
                  🖨️ Сохранить PDF
                </button>
                <button className="modal-close" onClick={() => setReportData(null)} style={{ position: 'relative', top: '0', right: '0' }}>×</button>
              </div>
            </div>

            <div className="printable-report">
              <div className="report-header print-only" style={{ display: 'none' }}>
                <h2>{reportData.habit.name} - Отчет о прогрессе</h2>
              </div>
              <div className="report-stats" style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' }}>
                <p><strong>Всего записей:</strong> {reportData.entries.length}</p>
                <p><strong>Общая сумма действий:</strong> {reportData.entries.reduce((sum, e) => sum + (e.quantity || 1), 0)}</p>
              </div>

              <div className="report-entries" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {reportData.entries.length === 0 ? (
                  <p>Нет данных для отчета.</p>
                ) : (
                  reportData.entries.map((entry, idx) => (
                    <div key={idx} className="report-entry" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                      <div className="report-entry-header" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                        <strong>{new Date(entry.date).toLocaleDateString('ru-RU')}</strong>
                        {(entry.quantity !== null && entry.quantity > 1) && <span style={{ marginLeft: '10px', color: '#666' }}>(Кол-во: {entry.quantity})</span>}
                      </div>
                      {entry.comment && <p className="report-entry-comment" style={{ fontStyle: 'italic', marginBottom: '10px' }}>{entry.comment}</p>}
                      {entry.photo && (
                        <div style={{ marginTop: '10px' }}>
                          <img src={entry.photo} alt="Прогресс" className="report-entry-photo" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;