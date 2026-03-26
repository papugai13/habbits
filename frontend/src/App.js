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
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [settingsSelectedCategory, setSettingsSelectedCategory] = useState('Все');
  const [chartsSelectedCategory, setChartsSelectedCategory] = useState('Все');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Quantity modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [quantityValue, setQuantityValue] = useState(null);
  const [commentValue, setCommentValue] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [deletePhoto, setDeletePhoto] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ username: '', email: '', age: '' });
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const lightboxTouchStartY = React.useRef(null);
  const [lightboxTranslateY, setLightboxTranslateY] = useState(0);
  const reorderLongPressTimer = React.useRef(null);
  const touchStartPos = React.useRef({ x: 0, y: 0 });
  const isTouchDraggingInProgress = React.useRef(false);

  // Swipe navigation refs
  const swipeStartPos = React.useRef({ x: 0, y: 0 });
  const isSwiping = React.useRef(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const habitsContainerRef = React.useRef(null);

  // Modal swipe navigation refs
  const modalSwipeStartPos = React.useRef({ x: 0, y: 0 });
  const isModalSwiping = React.useRef(false);
  const [modalSwipeDirection, setModalSwipeDirection] = useState(null);
  const modalContentRef = React.useRef(null);

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

  // Swipe handlers for week navigation
  const handleSwipeStart = (e) => {
    if (e.touches.length > 1) return;
    const touch = e.touches[0];
    swipeStartPos.current = { x: touch.clientX, y: touch.clientY };
    isSwiping.current = false;
  };

  const handleSwipeMove = (e) => {
    if (!swipeStartPos.current.x) return;
    const touch = e.touches[0];
    const distX = Math.abs(touch.clientX - swipeStartPos.current.x);
    const distY = Math.abs(touch.clientY - swipeStartPos.current.y);
    if (distX > 30 && distX > distY) {
      isSwiping.current = true;
      if (e.cancelable) e.preventDefault();
    }
  };

  // Non-passive touchmove listener for swipe (allows preventDefault)
  useEffect(() => {
    const el = habitsContainerRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleSwipeMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleSwipeMove);
  });

  const handleSwipeEnd = (e) => {
    if (!isSwiping.current) {
      swipeStartPos.current = { x: 0, y: 0 };
      return;
    }
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - swipeStartPos.current.x;
    if (Math.abs(diffX) >= 50) {
      if (diffX > 0) {
        setSwipeDirection('right');
        handlePrevWeek();
      } else {
        setSwipeDirection('left');
        handleNextWeek();
      }
      setTimeout(() => setSwipeDirection(null), 300);
    }
    swipeStartPos.current = { x: 0, y: 0 };
    isSwiping.current = false;
  };

  // Modal swipe handlers
  const handleModalSwipeStart = (e) => {
    if (e.touches.length > 1) return;
    const touch = e.touches[0];
    modalSwipeStartPos.current = { x: touch.clientX, y: touch.clientY };
    isModalSwiping.current = false;
  };

  const handleModalSwipeMove = (e) => {
    if (!modalSwipeStartPos.current.x) return;
    const touch = e.touches[0];
    const distX = Math.abs(touch.clientX - modalSwipeStartPos.current.x);
    const distY = Math.abs(touch.clientY - modalSwipeStartPos.current.y);
    if (distX > 30 && distX > distY) {
      isModalSwiping.current = true;
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleModalSwipeEnd = (e) => {
    if (!isModalSwiping.current) {
      modalSwipeStartPos.current = { x: 0, y: 0 };
      return;
    }
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - modalSwipeStartPos.current.x;
    if (Math.abs(diffX) >= 50) {
      const direction = diffX > 0 ? 'right' : 'left';
      changeModalDate(direction);
    }
    modalSwipeStartPos.current = { x: 0, y: 0 };
    isModalSwiping.current = false;
  };

  const changeModalDate = (direction) => {
    if (!quantityModalData) return;
    const currentDate = new Date(quantityModalData.dayDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'right' ? -1 : 1));
    const newDateStr = newDate.toLocaleDateString('en-CA');
    const todayStr = new Date().toLocaleDateString('en-CA');

    if (direction === 'left' && newDateStr > todayStr) {
      return;
    }

    // Find the habit and its status for the new date
    const habit = habitsData.find(h => h.id === quantityModalData.habitId);
    if (!habit) return;

    const status = habit.statuses.find(s => s.date === newDateStr);
    const isDone = status ? status.is_done : false;
    const statusId = status ? status.id : null;
    const quantity = status ? status.quantity : null;
    const comment = status ? status.comment : '';
    const photo = status ? status.photo : null;

    setModalSwipeDirection(direction);
    setQuantityModalData({
      ...quantityModalData,
      dayDate: newDateStr,
      currentStatus: isDone,
      dateId: statusId,
      currentPhoto: photo
    });
    setQuantityValue(quantity !== null && quantity !== undefined ? quantity : 1);
    setCommentValue(comment || '');
    setPhotoFile(null);
    setDeletePhoto(false);

    // Clear animation class after it finishes
    setTimeout(() => {
      setModalSwipeDirection(null);
    }, 300);
  };

  // Non-passive touchmove for modal content
  useEffect(() => {
    const el = modalContentRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleModalSwipeMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleModalSwipeMove);
  }, [showQuantityModal]);

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

  // Блокировка прокрутки body при открытом lightbox
  useEffect(() => {
    if (lightboxUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxUrl]);

  const closeLightbox = () => {
    setLightboxUrl(null);
    setLightboxTranslateY(0);
    lightboxTouchStartY.current = null;
  };

  // Блокировка прокрутки при мобильном перетаскивании (необходимы non-passive слушатели)
  useEffect(() => {
    const listElement = document.querySelector('.manage-habits-list');
    const modalContent = document.querySelector('.modal-content');

    if (!listElement || !draggedHabitId) {
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (modalContent) {
        modalContent.style.overflow = '';
        modalContent.style.height = '';
      }
      return;
    }

    const preventDefault = (e) => {
      if (isTouchDraggingInProgress.current && e.cancelable) {
        e.preventDefault();
      }
    };

    // Блокируем прокрутку всего экрана и модалки
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    if (modalContent) {
      modalContent.style.overflow = 'hidden';
      modalContent.style.height = '100%';
    }

    // { passive: false } позволяет вызывать preventDefault() в Firefox/Safari
    listElement.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (modalContent) {
        modalContent.style.overflow = '';
        modalContent.style.height = '';
      }
      listElement.removeEventListener('touchmove', preventDefault);
    };
  }, [draggedHabitId]);

  const handleLightboxTouchStart = (e) => {
    lightboxTouchStartY.current = e.touches[0].clientY;
    setLightboxTranslateY(0);
  };

  const handleLightboxTouchMove = (e) => {
    if (lightboxTouchStartY.current === null) return;
    const delta = e.touches[0].clientY - lightboxTouchStartY.current;
    if (delta > 0) setLightboxTranslateY(delta);
  };

  const handleLightboxTouchEnd = () => {
    if (lightboxTranslateY > 80) {
      if (navigator.vibrate) navigator.vibrate(30);
      closeLightbox();
    } else {
      setLightboxTranslateY(0);
    }
    lightboxTouchStartY.current = null;
  };


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
        if (showEditModal && editingHabit) {
          setEditingHabit({ ...editingHabit, category: newCat.id.toString() });
        } else {
          setNewHabitCategory(newCat.id.toString());
        }
      } else {
        const err = await response.json();
        const errorMessage = err.name ? err.name[0] : (err.detail || 'Ошибка при создании категории');
        setCreateError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdateCategory = async (id, newName) => {
    if (!newName.trim()) return;
    try {
      const response = await fetch(`/api/v1/categories/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        setEditingCategoryId(null);
        await fetchCategories();
        await fetchHabits(); // Refresh habits to pick up name changes if cached
      } else {
        const err = await response.json();
        alert(err.name ? err.name[0] : 'Ошибка при обновлении категории');
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту категорию? Привычки в этой категории останутся без категории.')) {
      return;
    }
    try {
      const response = await fetch(`/api/v1/categories/${id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      if (response.ok) {
        await fetchCategories();
        await fetchHabits(); // Habits category will be updated to null
      } else {
        alert('Ошибка при удалении категории');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const toggleHabitCheck = async (habitId, dayDate, currentStatus, dateId, quantity = null) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isPastDate = dayDate < todayStr;
    const isMarkingDone = !currentStatus;

    // Optimistic update
    const updatedHabits = habitsData.map(habit => {
      if (habit.id === habitId) {
        return {
          ...habit,
          statuses: habit.statuses.map(status =>
            status.date === dayDate ? {
              ...status,
              is_done: isMarkingDone,
              is_restored: isPastDate && isMarkingDone,
              quantity: quantity !== null ? quantity : (isMarkingDone ? status.quantity : null)
            } : status
          )
        };
      }
      return habit;
    });
    setHabitsData(updatedHabits);

    try {
      let response;
      const payload = quantity !== null
        ? { is_done: isMarkingDone, quantity, is_restored: isPastDate && isMarkingDone }
        : { is_done: isMarkingDone, is_restored: isPastDate && isMarkingDone };

      const csrf = getCookie('csrftoken');
      console.log('ToggleHabit: habitId:', habitId, 'dateId:', dateId, 'payload:', payload, 'csrf:', csrf);

      if (dateId) {
        // Toggle existing date entry
        response = await fetch(`/api/v1/date/${dateId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf
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
            'X-CSRFToken': csrf
          },
          credentials: 'include',
          body: JSON.stringify({
            habit: habitId,
            habit_date: dayDate,
            is_done: true,
            is_restored: isPastDate,
            ...(quantity !== null && { quantity })
          })
        });
      }

      if (!response.ok) {
        console.error('ToggleHabit response error:', response.status, response.statusText);
        throw new Error(`API error ${response.status}`);
      }

      // Refetch to get correct IDs and sync state
      await fetchHabits();

    } catch (error) {
      console.error('Error toggling habit:', error);
      fetchHabits(); // Sync back to server state
    }
  };

  const openEntryModal = (habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow) => {
    setQuantityModalData({ habitId, habitName, dayDate, currentStatus, dateId, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow });
    // If quantity is explicitly null/undefined, set to null, otherwise use currentQuantity
    setQuantityValue(currentQuantity !== null && currentQuantity !== undefined ? currentQuantity : 1);
    setCommentValue(currentComment || '');
    setPhotoFile(null);
    setDeletePhoto(false);
    setShowQuantityModal(true);
  };

  const handleLongPressStart = (habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow) => {
    const timer = setTimeout(() => {
      openEntryModal(habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow);
    }, 200); // 200ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleEntryRestored = async () => {
    if (!quantityModalData) return;
    await handleEntrySubmitInternal(true);
  };

  const handleEntrySubmit = async () => {
    await handleEntrySubmitInternal(false);
  };

  const handleEntrySubmitInternal = async (isRestored = false) => {
    if (!quantityModalData) return;

    const qty = typeof quantityValue === 'number' && quantityValue >= 1 ? quantityValue : null;
    const { habitId, dayDate, dateId } = quantityModalData;

    try {
      let response;
      const csrf = getCookie('csrftoken');
      console.log('EntrySubmit: data:', { habitId, dayDate, dateId, qty, commentValue }, 'csrf:', csrf);

      if (photoFile) {
        const formData = new FormData();
        formData.append('is_done', 'true');
        formData.append('is_restored', isRestored ? 'true' : 'false');
        if (qty !== null) formData.append('quantity', qty);
        formData.append('comment', commentValue);
        formData.append('photo', photoFile);

        if (dateId) {
          response = await fetch(`/api/v1/date/${dateId}/`, {
            method: 'PATCH',
            headers: { 'X-CSRFToken': csrf },
            credentials: 'include',
            body: formData
          });
        } else {
          formData.append('habit', habitId);
          formData.append('habit_date', dayDate);
          response = await fetch(`/api/v1/dates/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrf },
            credentials: 'include',
            body: formData
          });
        }
      } else {
        const payload = {
          is_done: true,
          is_restored: isRestored,
          quantity: qty,
          comment: commentValue,
          ...(deletePhoto && { photo: null })
        };

        if (dateId) {
          response = await fetch(`/api/v1/date/${dateId}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrf
            },
            credentials: 'include',
            body: JSON.stringify(payload)
          });
        } else {
          payload.habit = habitId;
          payload.habit_date = dayDate;
          response = await fetch(`/api/v1/dates/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrf
            },
            credentials: 'include',
            body: JSON.stringify(payload)
          });
        }
      }

      if (!response.ok) {
        console.error('EntrySubmit response error:', response.status, response.statusText);
        const errData = await response.json().catch(() => ({}));
        console.error('Error detail:', errData);
        throw new Error(`API error ${response.status}`);
      }
      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(null);
      setCommentValue('');
      setPhotoFile(null);
      await fetchHabits();
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Ошибка при сохранении данных: ${error.message}`);
    } finally {
      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(null);
      setCommentValue('');
      setPhotoFile(null);
      setDeletePhoto(false);
    }
  };

  // Кол-во дней выполнения (по 1 за день, не зависимо от quantity), исключая восполненные
  const getHabitCount = (habit) => {
    return habit.statuses.reduce((acc, s) => {
      if (s.is_done && !s.is_restored) {
        return acc + 1;
      }
      return acc;
    }, 0);
  };

  // Сумма выполнений с явным указанием количества (quantity)
  const getHabitOverflow = (habit) => {
    return habit.statuses.reduce((acc, s) => {
      if (s.is_done && s.quantity !== null && s.quantity !== undefined) {
        return acc + s.quantity;
      }
      return acc;
    }, 0);
  };

  // Эмоджи-награда в зависимости от количества выполнений за неделю
  const getWeeklyAward = (count) => {
    if (count >= 7) return '🌟🌟🌟';
    if (count === 6) return '⭐⭐';
    if (count === 5) return '⭐';
    if (count === 4) return '⚡⚡';
    if (count === 3) return '⚡';
    return null;
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

    const hasUncategorized = habitsData.some(h => !h.category_name);
    const result = [{ id: 'all', name: 'Все' }];
    if (hasUncategorized) {
      result.push({ id: 'none', name: 'Без категории' });
    }

    return [...result, ...sorted];
  }, [categories, habitsData]);



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
      const csrf = getCookie('csrftoken');
      console.log('CreateHabit: data:', { name: newHabitName.trim(), category: newHabitCategory }, 'csrf:', csrf);

      const response = await fetch('/api/v1/habits/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newHabitName.trim(),
          category: newHabitCategory === "" ? null : newHabitCategory
        })
      });

      if (!response.ok) {
        console.error('CreateHabit response error:', response.status, response.statusText);
        const errData = await response.json().catch(() => ({}));
        console.error('Error detail:', errData);
        throw new Error(errData.detail || 'Не удалось создать привычку');
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
      const csrf = getCookie('csrftoken');
      console.log('DeleteHabit: id:', habitId, 'csrf:', csrf);

      const response = await fetch(`/api/v1/habits/${habitId}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrf
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

    // Create a transparent drag image to focus on our CSS styles
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const liveSwapHabits = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;

    setHabitsData(prevList => {
      const draggedIndex = prevList.findIndex(h => h.id === draggedId);
      const targetIndex = prevList.findIndex(h => h.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prevList;
      if (draggedIndex === targetIndex) return prevList;

      const newList = [...prevList];
      const [removed] = newList.splice(draggedIndex, 1);
      newList.splice(targetIndex, 0, removed);
      return newList;
    });
  };

  const handleDragOver = (e, habitId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedHabitId && draggedHabitId !== habitId) {
      liveSwapHabits(draggedHabitId, habitId);
    }
  };

  const handleDrop = async (e, targetHabitId) => {
    if (e) e.preventDefault();

    // We just need to sync with backend now
    setHabitsData(currentList => {
      const reorderPayload = currentList.map((h, index) => ({ id: h.id, order: index }));
      const csrf = getCookie('csrftoken');
      console.log('ReorderHabits: payload:', reorderPayload, 'csrf:', csrf);

      fetch('/api/v1/habits/reorder/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
        },
        credentials: 'include',
        body: JSON.stringify(reorderPayload)
      }).catch(error => {
        console.error('Error saving order:', error);
        fetchHabits(); // revert on error
      });

      return currentList;
    });

    setDraggedHabitId(null);
    setDragOverHabitId(null);
  };

  const handleTouchStart = (e, habitId) => {
    // Only handle single touch
    if (e.touches.length > 1) return;

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isTouchDraggingInProgress.current = false;

    reorderLongPressTimer.current = setTimeout(() => {
      setDraggedHabitId(habitId);
      isTouchDraggingInProgress.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
    }, 200);
  };

  const handleTouchMove = (e) => {
    if (!reorderLongPressTimer.current && !isTouchDraggingInProgress.current) return;

    const touch = e.touches[0];
    const distX = Math.abs(touch.clientX - touchStartPos.current.x);
    const distY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If moved more than 10px before long press, cancel it
    if (!isTouchDraggingInProgress.current && (distX > 10 || distY > 10)) {
      if (reorderLongPressTimer.current) {
        clearTimeout(reorderLongPressTimer.current);
        reorderLongPressTimer.current = null;
      }
      return;
    }

    if (isTouchDraggingInProgress.current) {
      // Find element under touch
      // We manually toggle pointer-events on the dragged element to "see through" it
      const draggedEl = document.querySelector(`.manage-habit-item[data-habit-id="${draggedHabitId}"]`);
      if (draggedEl) draggedEl.style.pointerEvents = 'none';

      const element = document.elementFromPoint(touch.clientX, touch.clientY);

      if (draggedEl) draggedEl.style.pointerEvents = '';

      const habitItem = element?.closest('.manage-habit-item');

      if (habitItem) {
        const targetId = parseInt(habitItem.getAttribute('data-habit-id'));
        if (targetId && targetId !== draggedHabitId) {
          liveSwapHabits(draggedHabitId, targetId);
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    clearTimeout(reorderLongPressTimer.current);
    reorderLongPressTimer.current = null;

    if (isTouchDraggingInProgress.current) {
      handleDrop(null, null); // Just sync with backend
      setDraggedHabitId(null);
      isTouchDraggingInProgress.current = false;
    }
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
      const csrf = getCookie('csrftoken');
      console.log('MoveHabit: payload:', reorderPayload, 'csrf:', csrf);

      await fetch('/api/v1/habits/reorder/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
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
      const csrf = getCookie('csrftoken');
      console.log('UpdateHabit: data:', { name: editingHabit.name, category: editingHabit.category }, 'csrf:', csrf);

      const response = await fetch(`/api/v1/habits/${editingHabit.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editingHabit.name,
          category: editingHabit.category === "" ? null : editingHabit.category
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
      const csrf = getCookie('csrftoken');
      console.log('UpdateProfile: data:', editProfileData, 'csrf:', csrf);

      const response = await fetch('/api/auth/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf
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

  const handleGenerateSummaryReport = async () => {
    setIsReportLoading(true);
    try {
      const response = await fetch(`/api/v1/habits/summary_report/`, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        alert('Ошибка при загрузке общего отчета');
      }
    } catch (error) {
      console.error('Error fetching summary report:', error);
      alert('Ошибка при загрузке общего отчета');
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
                  setActiveTab('Настройки');
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
          onClick={() => {
            setCreateError('');
            setShowAddCategory(false);
            setNewCategoryName('');
            setShowCreateModal(true);
          }}
        >
          +
        </button>
      </div>


      {/* Фильтры категорий - только для вкладки Журналы */}
      {activeTab === 'Журналы' && (
        <div className="categories-section unified">
          {sortedCategories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </button>
          ))}
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
        <div className={`habits-container ${swipeDirection ? 'swipe-' + swipeDirection : ''}`}
          ref={habitsContainerRef}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          {habitsData.filter(habit => {
            if (selectedCategory === 'Все') return true;
            return habit.category_name === selectedCategory;
          }).map((habit) => {
            const weeklyCount = getHabitCount(habit);
            const weeklyAward = getWeeklyAward(weeklyCount);
            // Безопасное получение статусов
            const statuses = habit.statuses || [];
            // Show dots based on weekly completions (user request: "при двух отмеченых... точки... на все неделю")
            // Проверяем, является ли последняя отметка частью серии 2+
            const getStreakInfo = (stats, habit) => {
              let lastMark = -1;
              if (!stats || !Array.isArray(stats)) return { lastMark: -1, isLastMarkInStreak: false };
              
              for (let i = stats.length - 1; i >= 0; i--) {
                if (stats[i] && stats[i].is_done) {
                  lastMark = i;
                  break;
                }
              }
              
              let isLastMarkInStreak = false;
              if (lastMark >= 1) {
                // Серия внутри текущей недели
                isLastMarkInStreak = (stats[lastMark].is_done && !stats[lastMark].is_restored) && 
                                     (stats[lastMark - 1].is_done && !stats[lastMark - 1].is_restored);
              } else if (lastMark === 0) {
                // Только понедельник отмечен, проверяем воскресенье прошлой недели
                isLastMarkInStreak = (stats[0].is_done && !stats[0].is_restored) && habit.prev_week_sun_done;
              } else if (lastMark === -1) {
                // Нет отметок на этой неделе, проверяем субботу и воскресенье прошлой недели
                isLastMarkInStreak = habit.prev_week_sun_done && habit.prev_week_sat_done;
              }
              
              // Проверка на пропадание точек при пропуске более 2 дней
              const today = new Date();
              const todayStr = today.toLocaleDateString('en-CA');
              const baseDate = new Date(currentWeekDate);
              const dayOfWeek = baseDate.getDay();
              const currentWeekMondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              
              // Находим "текущий" индекс для сравнения (сегодня или конец недели, если неделя прошлая)
              const displayedWeekStarts = baseDate;
              const nextWeekStarts = new Date(baseDate);
              nextWeekStarts.setDate(baseDate.getDate() + 7);
              
              let comparisonIndex = -1;
              if (today >= displayedWeekStarts && today < nextWeekStarts) {
                // Отображаемая неделя — текущая
                const day = today.getDay();
                comparisonIndex = day === 0 ? 6 : day - 1;
              } else if (today >= nextWeekStarts) {
                // Отображаемая неделя в прошлом
                comparisonIndex = 6;
              }
              
              if (comparisonIndex !== -1 && (comparisonIndex - lastMark) > 2) {
                isLastMarkInStreak = false;
              }

              return { lastMark, isLastMarkInStreak };
            };
            const { lastMark, isLastMarkInStreak } = getStreakInfo(statuses, habit);
            return (
              <div key={habit.id} className="habit-row">
                <div className="habit-name">
                  <span className="habit-text">{habit.name}</span>
                  {(habit.latest_comment || habit.latest_photo) && (
                    <div className="habit-meta-row">
                      {habit.latest_comment && (
                        <div
                          className="habit-latest-comment"
                          title={habit.latest_comment}
                          onClick={() => {
                            const d = habit.latest_comment_details;
                            if (d) {
                              const weeklyTotalVal = habit.statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                              openEntryModal(habit.id, habit.name, d.date, d.is_done, d.id, d.quantity, d.comment, d.photo, weeklyTotalVal, habit.monthly_overflow, habit.weekly_overflow);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="comment-indicator-circle"></span>
                          <span className="comment-text">{habit.latest_comment}</span>
                        </div>
                      )}
                      {habit.latest_photo && (
                        <img
                          src={habit.latest_photo}
                          alt=""
                          className="habit-thumbnail"
                          onClick={() => setLightboxUrl(habit.latest_photo)}
                        />
                      )}
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
                      const status = statuses.find(s => s && s.date === slotDateStr);
                      const isDone = status ? status.is_done : false;
                      const isRestored = status ? status.is_restored : false;
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
                      const hasComment = status && status.comment;
                      const hasPhoto = status && status.photo;

                      // Disable only IF it's in the future
                      const isDisabled = isFuture;

                      // Show 1 dot in ONLY UNMARKED squares if exactly 2 are marked this week
                      // Показываем точку только если последняя отметка — часть серии 2+ дня, и только СПРАВА от нее
                      const showDotClass = (!isDone && isLastMarkInStreak && index > lastMark) ? 'has-dot-1' : '';

                      return (
                        <button
                          key={slotDateStr}
                          className={`check-box ${isDone ? 'checked' : ''} ${isRestored ? 'restored' : ''} ${isMissed ? 'missed' : ''} ${isToday ? 'today' : ''} ${isDone && (quantity !== null && quantity !== undefined) ? 'with-quantity' : ''} ${hasComment ? 'has-comment' : ''} ${hasPhoto ? 'has-photo' : ''} ${showDotClass}`}
                          onClick={() => {
                            if (!isDisabled && !longPressTimer) {
                              toggleHabitCheck(habit.id, slotDateStr, isDone, statusId);
                            }
                          }}
                          onMouseDown={() => {
                            const weeklyTotalVal = statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                            !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo, weeklyTotalVal, habit.monthly_overflow, habit.weekly_overflow);
                          }}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onTouchStart={() => {
                            const weeklyTotalVal = statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                            !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo, weeklyTotalVal, habit.monthly_overflow, habit.weekly_overflow);
                          }}
                          onTouchEnd={handleLongPressEnd}
                          disabled={isDisabled}
                        >
                          {isDone && (quantity !== null && quantity !== undefined) && <span className="quantity-display">{quantity}</span>}
                          {hasComment && <span className="attachment-indicator"></span>}
                          {hasPhoto && <span className="photo-indicator"></span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="habit-counts-wrapper">
                    {/* Третья звезда над квадратиком для серии из 7 дней */}
                    {weeklyCount >= 7 && (
                      <span className="third-star-top">⭐</span>
                    )}
                    <div className={`habit-count ${weeklyCount >= 3 ? 'active' : ''}`}>
                      {/* Lightning icons at the top */}
                      {weeklyAward && weeklyAward.includes('⚡') && (
                        <div className="lightning-behind">
                          <span className="lightning-item first-lightning">⚡</span>
                          {weeklyCount >= 4 && (
                            <span className="lightning-item second-lightning">⚡</span>
                          )}
                        </div>
                      )}

                      {/* Star icons */}
                      {weeklyAward && (weeklyAward.includes('⭐') || weeklyAward.includes('🌟')) && (
                        <>
                          {weeklyCount >= 7 ? (
                            <div className="stars-three-layout">
                              <span className="star-item top-row-star">⭐</span>
                              <span className="star-item top-row-star">⭐</span>
                            </div>
                          ) : (
                            <div className="stars-inside">
                              <span className="star-item first-star">⭐</span>
                              {weeklyCount >= 6 && (
                                <span className="star-item second-star">⭐</span>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      <span className={`habit-count-number ${weeklyAward ? 'with-awards' : ''} ${weeklyCount >= 7 ? 'shifted-down' : ''}`}>{weeklyCount}</span>
                    </div>
                    <div className="habit-overflow-container">
                      {(habit.weekly_overflow > 0) && (
                        <div className="habit-count-overflow weekly">+{habit.weekly_overflow}</div>
                      )}
                      {(habit.monthly_overflow > 0) && (
                        <div className="habit-count-overflow monthly">{habit.monthly_overflow}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Компонент графиков - для вкладки Графики */}
      {activeTab === 'Графики' && (
        <Charts
          getCookie={getCookie}
          habitsData={habitsData.filter(h => 
            chartsSelectedCategory === 'Все' || 
            (chartsSelectedCategory === 'Без категории' && !h.category_name) ||
            (h.category_name === chartsSelectedCategory)
          )}
          handleGenerateReport={handleGenerateReport}
          handleGenerateSummaryReport={handleGenerateSummaryReport}
          isReportLoading={isReportLoading}
          currentWeekDate={currentWeekDate}
          sortedCategories={sortedCategories}
          selectedCategory={chartsSelectedCategory}
          onSelectCategory={setChartsSelectedCategory}
        />
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

          <div className="settings-section categories-settings">
            <h3 className="section-title">Управление категориями</h3>
            <div className="manage-categories-list">
              {categories.filter(c => c.id !== 'all').length === 0 ? (
                <p className="no-habits-msg">У вас пока нет категорий.</p>
              ) : (
                categories.filter(c => c.id !== 'all').map(cat => (
                  <div key={cat.id} className="manage-category-item">
                    {editingCategoryId === cat.id ? (
                      <div className="category-edit-row">
                        <input
                          type="text"
                          className="category-edit-input"
                          value={editingCategoryValue}
                          onChange={(e) => setEditingCategoryValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(cat.id, editingCategoryValue);
                            if (e.key === 'Escape') setEditingCategoryId(null);
                          }}
                        />
                        <div className="category-edit-actions">
                          <button 
                            className="manage-btn save-btn" 
                            onClick={() => handleUpdateCategory(cat.id, editingCategoryValue)}
                            title="Сохранить"
                          >
                            💾
                          </button>
                          <button 
                            className="manage-btn cancel-btn" 
                            onClick={() => setEditingCategoryId(null)}
                            title="Отмена"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="manage-category-info">
                          <div className="manage-category-name">{cat.name}</div>
                        </div>
                        <div className="manage-category-actions">
                          <button
                            className="manage-btn edit-btn"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryValue(cat.name);
                            }}
                            title="Переименовать"
                          >
                            ✏️
                          </button>
                          <button
                            className="manage-btn delete-btn"
                            onClick={() => handleDeleteCategory(cat.id)}
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3 className="section-title">Управление привычками</h3>
            
            <div className="settings-category-filter">
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`settings-cat-btn ${settingsSelectedCategory === cat.name ? 'active' : ''}`}
                  onClick={() => setSettingsSelectedCategory(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="manage-habits-list">
              {habitsData
                .filter(h => !h.is_archived && (
                  settingsSelectedCategory === 'Все' || 
                  (settingsSelectedCategory === 'Без категории' && !h.category_name) ||
                  (h.category_name === settingsSelectedCategory)
                ))
                .length === 0 ? (
                <p className="no-habits-msg">Нет привычек в этой категории.</p>
              ) : (
                habitsData
                  .filter(h => !h.is_archived && (
                    settingsSelectedCategory === 'Все' || 
                    (settingsSelectedCategory === 'Без категории' && !h.category_name) ||
                    (h.category_name === settingsSelectedCategory)
                  ))
                  .map(habit => (
                    <div
                    key={habit.id}
                    className={`manage-habit-item ${draggedHabitId === habit.id ? 'dragging' : ''} ${dragOverHabitId === habit.id && draggedHabitId !== habit.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, habit.id)}
                    onDragOver={(e) => handleDragOver(e, habit.id)}
                    onDrop={(e) => handleDrop(e, habit.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, habit.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    data-habit-id={habit.id}
                  >
                    <div className="drag-handle" title="Перетащить">⠿</div>
                    <div className="manage-habit-info">
                      <div className="manage-habit-name">{habit.name}</div>
                      <div className="manage-habit-category">{habit.category_name}</div>
                    </div>
                    <div className="manage-habit-actions">
                      <button
                        className="manage-btn edit-btn"
                        onClick={() => {
                          setEditingHabit({ ...habit });
                          setCreateError('');
                          setShowAddCategory(false);
                          setNewCategoryName('');
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
                onClick={() => {
                  setCreateError('');
                  setShowAddCategory(false);
                  setNewCategoryName('');
                  setShowCreateModal(false);
                }}
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
                    <option value="">Без категории</option>
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
                <div className="category-input-wrapper">
                  <select
                    id="edit-habit-category"
                    className="form-select"
                    value={editingHabit.category || ''}
                    onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })}
                  >
                    <option value="">Без категории</option>
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
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
          setQuantityValue(null);
          setCommentValue('');
          setPhotoFile(null);
          setDeletePhoto(false);
        }}>
          <div className="modal-content quantity-modal"
            ref={modalContentRef}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleModalSwipeStart}
            onTouchEnd={handleModalSwipeEnd}
            style={{ overflowX: 'hidden' }}
          >
            <div className={`modal-swipe-container ${modalSwipeDirection ? 'swipe-' + modalSwipeDirection : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <h2>Детали выполнения {quantityModalData.dayDate && ` — ${new Date(quantityModalData.dayDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}</h2>
                <button
                  className="modal-close"
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityModalData(null);
                    setQuantityValue(null);
                    setCommentValue('');
                    setPhotoFile(null);
                    setDeletePhoto(false);
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
                  <div className="quantity-selector-container">
                    <div className="preset-column presets-left">
                      <div className="preset-btn theme-green">
                        <div className="preset-badge">{quantityModalData.weeklyTotal || 0}</div>
                        <div className="preset-label">Неделя</div>
                      </div>
                      <div className="preset-btn theme-green">
                        <div className="preset-badge">
                          {quantityModalData.dayDate ? new Date(quantityModalData.dayDate).getMonth() + 1 : (new Date().getMonth() + 1)}
                        </div>
                        <div className="preset-label">Месяц</div>
                      </div>
                    </div>

                    <DrumPicker
                      value={quantityValue}
                      min={1}
                      max={999}
                      allowNoQuantity={true}
                      noQuantityLabel="≤1"
                      onChange={(val) => setQuantityValue(val)}
                    />

                    <div className="preset-column presets-right">
                      <div className="preset-btn theme-purple">
                        <div className="preset-badge">+{quantityModalData.weeklyOverflow || 0}</div>
                        <div className="preset-label">Неделя</div>
                      </div>
                      <div className="preset-btn theme-purple">
                        <div className="preset-badge">{quantityModalData.monthlyTotal || 0}</div>
                        <div className="preset-label">Месяц</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group form-group-flex">
                    <label htmlFor="comment-input">Комментарий</label>
                    <textarea
                      id="comment-input"
                      className="form-input"
                      placeholder="Добавьте заметку..."
                      value={commentValue}
                      onChange={(e) => setCommentValue(e.target.value)}
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="form-group form-group-flex">
                    <label htmlFor="photo-input">Фото</label>
                    {quantityModalData.currentPhoto && !photoFile && !deletePhoto && (
                      <div className="current-photo-preview">
                        <img
                          src={quantityModalData.currentPhoto}
                          alt="Текущее фото"
                          className="photo-thumbnail"
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginBottom: '10px', borderRadius: '8px', cursor: 'zoom-in' }}
                          onClick={() => setLightboxUrl(quantityModalData.currentPhoto)}
                        />
                        <button
                          className="delete-photo-btn"
                          type="button"
                          onClick={() => setDeletePhoto(true)}
                        >
                          🗑️ Удалить фото
                        </button>
                      </div>
                    )}
                    {deletePhoto && !photoFile && (
                      <div className="photo-deletion-notice">
                        Фото будет удалено при сохранении
                        <button
                          className="btn-link"
                          type="button"
                          onClick={() => setDeletePhoto(false)}
                          style={{ marginLeft: '10px', fontSize: '12px' }}
                        >
                          Отмена
                        </button>
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

              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityModalData(null);
                    setQuantityValue(null);
                    setCommentValue('');
                    setPhotoFile(null);
                    setDeletePhoto(false);
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleEntrySubmit}
                >
                  Выполнен
                </button>
                {quantityModalData.dayDate < new Date().toLocaleDateString('en-CA') && (
                  <button
                    type="button"
                    className="btn-primary btn-restored"
                    onClick={handleEntryRestored}
                  >
                    Восполнен
                  </button>
                )}
              </div>
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

              {reportData.is_general ? (
                <div className="summary-report-content">
                  <div className="report-stats" style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong>Всего выполнений:</strong>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reportData.total_completions}</div>
                    </div>
                    <div>
                      <strong>Общая сумма действий:</strong>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reportData.total_quantity}</div>
                    </div>
                  </div>

                  <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '10px' }}>Привычка</th>
                        <th style={{ padding: '10px' }}>Категория</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Выполнено</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.habits.map((h, i) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px' }}>{h.name}</td>
                          <td style={{ padding: '10px', color: '#666', fontSize: '12px' }}>{h.category || '-'}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{h.completions}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{h.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
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
                              <img
                                src={entry.photo}
                                alt="Прогресс"
                                className="report-entry-photo"
                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'contain', cursor: 'zoom-in' }}
                                onClick={() => setLightboxUrl(entry.photo)}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox — просмотр фото на весь экран */}
      {lightboxUrl && (
        <div
          className="lightbox-overlay"
          onClick={closeLightbox}
          onTouchStart={handleLightboxTouchStart}
          onTouchMove={handleLightboxTouchMove}
          onTouchEnd={handleLightboxTouchEnd}
        >
          {/* Индикатор свайпа */}
          <div className="lightbox-swipe-hint" />
          <button className="lightbox-close" onClick={closeLightbox}>×</button>
          <img
            src={lightboxUrl}
            alt="Просмотр фото"
            className="lightbox-img"
            style={{
              transform: `translateY(${lightboxTranslateY}px)`,
              opacity: lightboxTranslateY > 0 ? Math.max(0.4, 1 - lightboxTranslateY / 200) : 1,
              transition: lightboxTranslateY === 0 ? 'transform 0.25s ease, opacity 0.25s ease' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lightbox-hint-text">Проведите вниз, чтобы закрыть</div>
        </div>
      )}

    </div>
  );
};

export default App;