import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Charts from './components/Charts';
import DrumPicker from './components/DrumPicker';
import translations from './translations';
import storageService from './storageService';


const getMondayString = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  const day = d.getDay();
  // Adjust logic to find Monday: Sunday(0) -> -6, Monday(1) -> 0, Tuesday(2) -> -1, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toLocaleDateString('en-CA');
};

const getDaysInCurrentMonth = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};


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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'Habits';
    return localStorage.getItem('habbits_activeTab') || 'Habits';
  });
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'ru';
    return localStorage.getItem('language') || 'ru';
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'auto';
    return localStorage.getItem('theme') || 'auto';
  });
  const [storageMode, setStorageMode] = useState(() => {
    return storageService.getStorageMode();
  });

  const [habitsData, setHabitsData] = useState([]);

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
  const [newHabitTargetType, setNewHabitTargetType] = useState('at_least');
  const [newHabitStartDate, setNewHabitStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHabitUseTarget, setNewHabitUseTarget] = useState(false);
  const [newHabitCompletionTarget, setNewHabitCompletionTarget] = useState('');
  const [newHabitQuantityTarget, setNewHabitQuantityTarget] = useState('');
  const [editHabitStartDate, setEditHabitStartDate] = useState('');
  const [editHabitTargetType, setEditHabitTargetType] = useState('at_least');
  const [createError, setCreateError] = useState('');
  // Categories state
  const [categories, setCategories] = useState([{ id: 'all', name: 'Все' }]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showCategoryArchive, setShowCategoryArchive] = useState(false);
  const [settingsSelectedCategory, setSettingsSelectedCategory] = useState('Все');
  const [showSelectHabitsModal, setShowSelectHabitsModal] = useState(false);
  const [selectingForCategoryId, setSelectingForCategoryId] = useState(null);
  const [chartsSelectedCategory, setChartsSelectedCategory] = useState('Все');
  
  // Settings section collapse state
  const [collapsedSettingsSections, setCollapsedSettingsSections] = useState({
    profile: false,
    categories: false,
    habits: false,
    theme: false,
    reminders: false,
    storage: false
  });

  // Reminder settings state
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const settings = localStorage.getItem('reminderSettings');
    return settings ? JSON.parse(settings).enabled : false;
  });
  const [reminderTimesPerDay, setReminderTimesPerDay] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const settings = localStorage.getItem('reminderSettings');
    return settings ? JSON.parse(settings).timesPerDay : 1;
  });
  const [customTimesPerDay, setCustomTimesPerDay] = useState(() => {
    if (typeof window === 'undefined') return 4;
    const settings = localStorage.getItem('reminderSettings');
    return settings ? JSON.parse(settings).customTimesPerDay || 4 : 4;
  });
  const [reminderTimes, setReminderTimes] = useState(() => {
    if (typeof window === 'undefined') return ['09:00'];
    const settings = localStorage.getItem('reminderSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.reminderTimes && Array.isArray(parsed.reminderTimes)) {
        return parsed.reminderTimes;
      }
      // Migrate old single startTime to array
      if (parsed.startTime) {
        return [parsed.startTime];
      }
    }
    return ['09:00'];
  });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === 'undefined') return 'default';
    return Notification.permission;
  });
  const [reminderText, setReminderText] = useState(() => {
    if (typeof window === 'undefined') return 'Не забудьте отметить привычки!';
    const settings = localStorage.getItem('reminderSettings');
    return settings ? JSON.parse(settings).text || 'Не забудьте отметить привычки!' : 'Не забудьте отметить привычки!';
  });

  // Quantity modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [quantityValue, setQuantityValue] = useState(null);
  const [commentValue, setCommentValue] = useState('');
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ username: '', email: '', age: '', date_of_birth: '', profile_photo: null });
  const [reportData, setReportData] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('day');
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [currentWeekDate, setCurrentWeekDate] = useState(getMondayString());
  const weekDataCacheRef = React.useRef({});
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const lightboxTouchStartY = React.useRef(null);
  const [lightboxTranslateY, setLightboxTranslateY] = useState(0);
  const reorderLongPressTimer = React.useRef(null);
  const touchStartPos = React.useRef({ x: 0, y: 0 });
  const isHabitTouchDragging = React.useRef(false);
  const isCategoryTouchDragging = React.useRef(false);

  // Swipe navigation refs
  const swipeStartPos = React.useRef({ x: 0, y: 0 });
  const isSwiping = React.useRef(false);
  const swipeOffsetRef = React.useRef(0);
  const pendingRafRef = React.useRef(null);
  const habitsContainerRef = React.useRef(null);
  const weekPagesRef = React.useRef(null);

  const getSwipeWidth = () => habitsContainerRef.current?.clientWidth || window.innerWidth;

  const applySwipeOffset = (offset) => {
    if (!weekPagesRef.current) return;
    const width = getSwipeWidth();
    weekPagesRef.current.style.transform = `translate3d(${ -width + offset }px, 0, 0)`;
  };

  const setSwipeTransitionStyle = (value) => {
    if (!weekPagesRef.current) return;
    weekPagesRef.current.style.transition = value;
  };

  // Modal swipe navigation refs
  const modalSwipeStartPos = React.useRef({ x: 0, y: 0 });
  const isModalSwiping = React.useRef(false);
  const [modalSwipeDirection, setModalSwipeDirection] = useState(null);
  const modalContentRef = React.useRef(null);

  // Archive state
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('habbits_collapsedCategories') || '{}');
    } catch {
      return {};
    }
  });

  // Drag-and-drop state
  const [draggedHabitId, setDraggedHabitId] = useState(null);
  const [dragOverHabitId, setDragOverHabitId] = useState(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);

  // Today highlight state
  const [highlightToday, setHighlightToday] = useState(false);

  // Transition animation state

  const t = (key) => {
    return translations[language][key] || key;
  };

  const WEEK_DAYS = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  const bottomTabs = [
    { id: 'Habits', label: t('journals'), icon: '✔️', disabled: false },
    { id: 'Charts', label: t('charts'), icon: '📊', disabled: false },
    { id: 'Settings', label: t('settings'), icon: '⚙️', disabled: false },
  ];



  // Fetch categories from storage
  const fetchCategories = React.useCallback(async () => {
    try {
      setApiError('');
      const data = await storageService.getCategories(storageMode, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      setCategories(data);

      const hasSelectedCategory = data.some(category => category.id.toString() === newHabitCategory);
      if (data.length > 0) {
        if (newHabitCategory !== "" && (!newHabitCategory || !hasSelectedCategory)) {
          setNewHabitCategory(data[0].id.toString());
        }
      } else if (newHabitCategory) {
        setNewHabitCategory('');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [storageMode, newHabitCategory]);

  const fetchArchivedCategories = React.useCallback(async () => {
    try {
      setApiError('');
      const data = await storageService.getArchivedCategories(storageMode, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      setArchivedCategories(data);
    } catch (error) {
      console.error('Error fetching archived categories:', error);
      setApiError('Error fetching archived categories');
    }
  }, [storageMode]);

  const fetchWeekHabits = async (targetDate) => {
    const dateToFetch = targetDate;
    if (!dateToFetch) return null;

    try {
      setApiError('');
      const data = await storageService.getWeeklyStatus(storageMode, dateToFetch, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      const cacheKey = `${storageMode}_${dateToFetch}`;
      weekDataCacheRef.current[cacheKey] = data;
      return data;
    } catch (error) {
      console.error('Error fetching habits for week', dateToFetch, error);
      setApiError('Error fetching weekly habits');
    }
    return null;
  };

  const loadWeekData = React.useCallback(async (targetDate) => {
    if (!targetDate) return;
    const cacheKey = `${storageMode}_${targetDate}`;
    const cached = weekDataCacheRef.current[cacheKey];
    if (cached) {
      setHabitsData(cached);
      return;
    }

    setWeekLoading(true);
    console.log(`[App] Loading week data for ${targetDate} (${storageMode})`);
    const data = await fetchWeekHabits(targetDate);
    setWeekLoading(false);
    if (data) {
      console.log(`[App] Loaded ${data.length} habits for ${targetDate}`);
      setHabitsData(data);
      // Cache the result
      const cacheKey = `${storageMode}_${targetDate}`;
      weekDataCacheRef.current[cacheKey] = data;
    } else {
      console.warn(`[App] Failed to load habits for ${targetDate}`);
      setHabitsData([]);
    }
  }, [storageMode]); // Added storageMode dependency

  const prefetchWeekIfNeeded = async (weekDate) => {
    if (!weekDate) return;
    const cacheKey = `${storageMode}_${weekDate}`;
    if (weekDataCacheRef.current[cacheKey]) return;
    await fetchWeekHabits(weekDate);
  };

  const prefetchAdjacentWeeks = React.useCallback(async (anchorDate) => {
    if (!anchorDate) return;

    const date = new Date(anchorDate);
    const prev = new Date(date);
    prev.setDate(date.getDate() - 7);
    const next = new Date(date);
    next.setDate(date.getDate() + 7);

    const prevStr = prev.toLocaleDateString('en-CA');
    const nextStr = next.toLocaleDateString('en-CA');

    if (!weekDataCacheRef.current[prevStr]) {
      fetchWeekHabits(prevStr);
    }
    if (!weekDataCacheRef.current[nextStr]) {
      fetchWeekHabits(nextStr);
    }
  }, []);

  const fetchHabits = React.useCallback(async (targetDate) => {
    const dateKey = targetDate || currentWeekDate;
    const cacheKey = `${storageMode}_${dateKey}`;
    delete weekDataCacheRef.current[cacheKey];
    return loadWeekData(dateKey);
  }, [currentWeekDate, loadWeekData, storageMode]); // Added storageMode dependency

  // Fetch archived habits
  const fetchArchivedHabits = React.useCallback(async () => {
    try {
      const data = await storageService.getArchivedHabits(storageMode, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      setArchivedHabits(data);
    } catch (error) {
      console.error('Error fetching archived habits:', error);
    }
  }, [storageMode]);

  // Check authentication status
  const checkAuth = React.useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me/', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      
      // Always fetch data from the current storage mode
      fetchHabits();
      fetchArchivedHabits();
      fetchCategories();
      fetchArchivedCategories();
    } catch (error) {
      console.error('Auth check error:', error);
      // Still load data even if auth fails (especially for local mode)
      fetchHabits();
      fetchArchivedHabits();
      fetchCategories();
      fetchArchivedCategories();
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchHabits, fetchArchivedHabits, fetchCategories, fetchArchivedCategories, storageMode]); // Added storageMode dependency

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch habits when currentWeekDate changes
  useEffect(() => {
    if (isAuthenticated || storageMode === 'local') {
      loadWeekData(currentWeekDate);
      prefetchAdjacentWeeks(currentWeekDate);
    }
  }, [currentWeekDate, isAuthenticated, loadWeekData, prefetchAdjacentWeeks, storageMode]);

  // Apply theme
  useEffect(() => {
    const applyTheme = () => {
      let currentTheme = theme;
      if (theme === 'auto') {
        const hour = new Date().getHours();
        currentTheme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
      }
      document.body.className = currentTheme === 'dark' ? 'dark-theme' : '';
    };
    applyTheme();
    if (theme === 'auto') {
      const interval = setInterval(applyTheme, 60000);
      return () => clearInterval(interval);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('habbits_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('habbits_collapsedCategories', JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  // Handle storage mode changes
  useEffect(() => {
    // Clear cache when mode changes
    weekDataCacheRef.current = {};
    // Trigger re-fetch
    checkAuth();
  }, [storageMode]); // Re-fetch everything when storage mode changes

  // Register Service Worker and handle notifications
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);

        // Send current settings to Service Worker
        if (registration.active) {
          const settings = {
            enabled: reminderEnabled,
            reminderTimes: reminderTimes,
            timesPerDay: reminderTimesPerDay === 'custom' ? customTimesPerDay : reminderTimesPerDay,
            customTimesPerDay: customTimesPerDay,
            notificationsSentToday: 0,
            sentReminders: []
          };
          registration.active.postMessage({ type: 'UPDATE_REMINDER_SETTINGS', settings });
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Listen for messages from Service Worker (e.g., REQUEST_SETTINGS)
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'REQUEST_SETTINGS') {
        console.log('[App] Received REQUEST_SETTINGS from Service Worker');
        const settings = {
          enabled: reminderEnabled,
          reminderTimes: reminderTimes,
          timesPerDay: reminderTimesPerDay === 'custom' ? customTimesPerDay : reminderTimesPerDay,
          customTimesPerDay: customTimesPerDay,
          notificationsSentToday: 0,
          sentReminders: []
        };
        
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({ type: 'SETTINGS_RESPONSE', settings });
            console.log('[App] Sent SETTINGS_RESPONSE to Service Worker');
          }
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [reminderEnabled, reminderTimes, reminderTimesPerDay, customTimesPerDay]);

  // Update reminder settings in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const settings = {
      enabled: reminderEnabled,
      reminderTimes: reminderTimes,
      timesPerDay: reminderTimesPerDay,
      customTimesPerDay: customTimesPerDay
    };
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
  }, [reminderEnabled, reminderTimes, reminderTimesPerDay, customTimesPerDay]);

  // Helper to convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to Push Notifications
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const keyResponse = await fetch('/api/v1/reminders/vapid-key/', { credentials: 'include' });
      const { publicKey } = await keyResponse.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      const subJSON = subscription.toJSON();
      await fetch('/api/v1/reminders/subscribe/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        })
      });
      console.log('Push subscription successful');
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  // Save reminder settings to server
  const saveReminderSettingsToServer = async (updates) => {
    try {
      await fetch('/api/v1/reminders/settings/', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to save reminder settings:', error);
    }
  };

  // Request notification permission and subscribe
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
    
    if (permission === 'granted') {
      await subscribeToPush();
    }
    
    return permission;
  };

  // Handle reminder enable toggle
  const handleReminderToggle = async (enabled) => {
    setReminderEnabled(enabled);
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        alert('Необходимо разрешить уведомления для работы напоминаний');
        setReminderEnabled(false);
        return;
      }
    }
    
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    const newSettings = { ...settings, enabled };
    localStorage.setItem('reminderSettings', JSON.stringify(newSettings));
    saveReminderSettingsToServer({ enabled, text: reminderText, times: reminderTimes });
    
    // Update SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({ type: 'UPDATE_REMINDER_SETTINGS', settings: newSettings });
        }
      });
    }
  };

  // Update reminder times when timesPerDay changes
  const handleTimesPerDayChange = (value) => {
    setReminderTimesPerDay(value);
    const newCount = value === 'custom' ? customTimesPerDay : value;
    const currentCount = reminderTimes.length;
    
    if (newCount > currentCount) {
      // Add new times (default to 1 hour after the last time)
      const newTimes = [...reminderTimes];
      const lastTime = reminderTimes[currentCount - 1] || '09:00';
      const [hours, minutes] = lastTime.split(':').map(Number);
      const lastDate = new Date();
      lastDate.setHours(hours, minutes, 0, 0);
      
      for (let i = currentCount; i < newCount; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setHours(nextDate.getHours() + 1);
        const nextTime = nextDate.toTimeString().slice(0, 5);
        newTimes.push(nextTime);
        lastDate.setHours(lastDate.getHours() + 1);
      }
      setReminderTimes(newTimes);
    } else if (newCount < currentCount) {
      // Remove excess times
      setReminderTimes(reminderTimes.slice(0, newCount));
    }
  };

  // Update reminder times when customTimesPerDay changes
  useEffect(() => {
    if (reminderTimesPerDay === 'custom') {
      const newCount = customTimesPerDay;
      const currentCount = reminderTimes.length;
      
      if (newCount > currentCount) {
        const newTimes = [...reminderTimes];
        const lastTime = reminderTimes[currentCount - 1] || '09:00';
        const [hours, minutes] = lastTime.split(':').map(Number);
        const lastDate = new Date();
        lastDate.setHours(hours, minutes, 0, 0);
        
        for (let i = currentCount; i < newCount; i++) {
          const nextDate = new Date(lastDate);
          nextDate.setHours(nextDate.getHours() + 1);
          const nextTime = nextDate.toTimeString().slice(0, 5);
          newTimes.push(nextTime);
          lastDate.setHours(lastDate.getHours() + 1);
        }
        setReminderTimes(newTimes);
      } else if (newCount < currentCount) {
        setReminderTimes(reminderTimes.slice(0, newCount));
      }
    }
  }, [customTimesPerDay, reminderTimesPerDay]);

  const handleReminderTextChange = (text) => {
    setReminderText(text);
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    const newSettings = { ...settings, text };
    localStorage.setItem('reminderSettings', JSON.stringify(newSettings));
    saveReminderSettingsToServer({ text });
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({ type: 'UPDATE_REMINDER_SETTINGS', settings: newSettings });
        }
      });
    }
  };

  // Update a specific reminder time
  const handleReminderTimeChange = (index, value) => {
    const newTimes = [...reminderTimes];
    newTimes[index] = value;
    setReminderTimes(newTimes);
    
    // Save to server
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    const newSettings = { ...settings, reminderTimes: newTimes };
    localStorage.setItem('reminderSettings', JSON.stringify(newSettings));
    saveReminderSettingsToServer({ times: newTimes });
    
    // Update SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({ type: 'UPDATE_REMINDER_SETTINGS', settings: newSettings });
        }
      });
    }
  };

  // Test notification
  const testNotification = async () => {
    if (typeof window === 'undefined') return;
    
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.active) {
            registration.active.postMessage({ type: 'TEST_NOTIFICATION' });
            return;
          }
        }
        // Fallback: show notification directly
        new Notification('Habbits', {
          body: 'Не забудьте отметить привычки!',
          icon: '/favicon.ico'
        });
      } catch (error) {
        console.error('Test notification error:', error);
        // Fallback: show notification directly
        new Notification('Habbits', {
          body: 'Не забудьте отметить привычки!',
          icon: '/favicon.ico'
        });
      }
    } else {
      alert('Необходимо разрешить уведомления для работы напоминаний');
    }
  };

  const goToWeek = (weekDate, direction) => {
    const date = new Date(weekDate);
    const weekString = date.toLocaleDateString('en-CA');

    // Apply page slide direction class first

    // If cached, show immediately, иначе загрузится параллельно
    if (weekDataCacheRef.current[weekString]) {
      setHabitsData(weekDataCacheRef.current[weekString]);
    }

    setCurrentWeekDate(weekString);
  };

  const handlePrevWeek = () => {
    const prevDate = new Date(currentWeekDate);
    prevDate.setDate(prevDate.getDate() - 7);
    goToWeek(prevDate, 'right');
  };

  const handleNextWeek = () => {
    const nextDate = new Date(currentWeekDate);
    nextDate.setDate(nextDate.getDate() + 7);
    goToWeek(nextDate, 'left');
  };

  const handleToday = () => {
    const targetWeek = getMondayString();

    if (currentWeekDate === targetWeek) {
      // Already on the current week, just highlight today
      setHighlightToday(true);
      setTimeout(() => setHighlightToday(false), 1000);
    } else {
      // Transition to the current week with animation
      setTimeout(() => {
        setCurrentWeekDate(targetWeek);
        setHighlightToday(true);
        setTimeout(() => {
          setHighlightToday(false);
        }, 1000);
      }, 250);
    }
  };

  // Swipe handlers for week navigation
  const handleSwipeStart = (e) => {
    if (e.touches.length > 1) return;
    const touch = e.touches[0];
    swipeStartPos.current = { x: touch.clientX, y: touch.clientY };
    isSwiping.current = false;
    swipeOffsetRef.current = 0;
    setSwipeTransitionStyle('none');
    applySwipeOffset(0);
    if (pendingRafRef.current) {
      cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = null;
    }

    const date = new Date(currentWeekDate);
    const prev = new Date(date);
    prev.setDate(date.getDate() - 7);
    const next = new Date(date);
    next.setDate(date.getDate() + 7);
    const prevStr = prev.toLocaleDateString('en-CA');
    const nextStr = next.toLocaleDateString('en-CA');

    prefetchWeekIfNeeded(prevStr);
    prefetchWeekIfNeeded(nextStr);
  };

  const handleSwipeMove = (e) => {
    if (!swipeStartPos.current.x) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - swipeStartPos.current.x;
    const distX = Math.abs(diffX);
    const distY = Math.abs(touch.clientY - swipeStartPos.current.y);

    if (distX > 15 && distX > distY) {
      if (!isSwiping.current) {
        isSwiping.current = true;
      }
      if (e.cancelable) e.preventDefault();
      swipeOffsetRef.current = diffX;
      if (!pendingRafRef.current) {
        pendingRafRef.current = requestAnimationFrame(() => {
          pendingRafRef.current = null;
          applySwipeOffset(swipeOffsetRef.current);
        });
      }
    }
  };

  const handleSwipeEnd = (e) => {
    if (!isSwiping.current) {
      swipeStartPos.current = { x: 0, y: 0 };
      setSwipeTransitionStyle('none');
      applySwipeOffset(0);
      return;
    }

    if (pendingRafRef.current) {
      cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = null;
    }

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - swipeStartPos.current.x;
    const absDiffX = Math.abs(diffX);
    const width = getSwipeWidth();
    const threshold = Math.max(50, width * 0.15);
    const direction = diffX > 0 ? 'right' : 'left';

    if (absDiffX >= threshold) {
      const targetWeek = new Date(currentWeekDate);
      if (diffX > 0) {
        targetWeek.setDate(targetWeek.getDate() - 7);
      } else {
        targetWeek.setDate(targetWeek.getDate() + 7);
      }
      const targetWeekString = targetWeek.toLocaleDateString('en-CA');
      const finalOffset = diffX > 0 ? width : -width;
      setSwipeTransitionStyle('transform 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)');
      applySwipeOffset(finalOffset);
      if (e.cancelable) e.preventDefault();
      setTimeout(() => {
        goToWeek(targetWeekString, direction);
        setSwipeTransitionStyle('none');
        applySwipeOffset(0);
      }, 170);
    } else {
      setSwipeTransitionStyle('transform 0.15s cubic-bezier(0.22, 0.61, 0.36, 1)');
      applySwipeOffset(0);
      setTimeout(() => {
        setSwipeTransitionStyle('none');
      }, 170);
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
    const isRestored = status ? status.is_restored : false;
    const statusId = status ? status.id : null;
    const quantity = status ? status.quantity : null;
    const comment = status ? status.comment : '';
    const photo = status ? status.photo : null;

    setModalSwipeDirection(direction);
    setQuantityModalData({
      ...quantityModalData,
      dayDate: newDateStr,
      currentStatus: isDone,
      currentQuantity: quantity,
      currentComment: comment,
      currentIsRestored: isRestored,
      dateId: statusId,
      currentPhoto: photo
    });

    const initialQuantity = getDefaultModalQuantity(habit.id);

    setQuantityValue(initialQuantity);
    setCommentValue(comment || '');

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

  const getRussianMonthName = (monthIndex) => {
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return months[monthIndex] || '';
  };

  const formatWeekRange = (dateObj) => {
    const curr = new Date(dateObj);
    const day = curr.getDay();
    const diff = curr.getDate() - (day === 0 ? 6 : day - 1);
    const firstDay = new Date(curr.setDate(diff));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    if (language === 'ru') {
      return `${firstDay.getDate()} ${getRussianMonthName(firstDay.getMonth())} - ${lastDay.getDate()} ${getRussianMonthName(lastDay.getMonth())}`;
    }

    const langSub = 'en-US';
    return `${firstDay.toLocaleDateString(langSub, { day: 'numeric', month: 'short' })} - ${lastDay.toLocaleDateString(langSub, { day: 'numeric', month: 'short' })}`;
  };

  const currentWeekRange = () => formatWeekRange(currentWeekDate);

  const prevWeekDate = (() => {
    const date = new Date(currentWeekDate);
    date.setDate(date.getDate() - 7);
    return date.toLocaleDateString('en-CA');
  })();

  const nextWeekDate = (() => {
    const date = new Date(currentWeekDate);
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('en-CA');
  })();

  const getWeekData = (weekDate) => {
    if (weekDate === currentWeekDate) {
      return habitsData;
    }
    const cacheKey = `${storageMode}_${weekDate}`;
    return weekDataCacheRef.current[cacheKey] || [];
  };

  const renderWeekPage = (weekDate, highlightWeekToday = false) => {
    const currentWeekDate = weekDate;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const pageHabitsData = getWeekData(weekDate);

    const filteredHabits = pageHabitsData.filter(habit => {
      if (selectedCategory === 'Все') return true;
      if (selectedCategory === 'Без категории') return !habit.category_name;
      return habit.category_name === selectedCategory;
    });

    const groupedHabits = filteredHabits.reduce((acc, habit) => {
      const categoryKey = habit.category_name || 'Без категории';
      if (!acc[categoryKey]) acc[categoryKey] = [];
      acc[categoryKey].push(habit);
      return acc;
    }, {});

    const categoryOrder = selectedCategory === 'Все'
      ? sortedCategories.map((cat) => cat.name).filter((name) => name !== 'Все')
      : [selectedCategory];

    const orderedCategories = [
      ...new Set([
        ...categoryOrder,
        ...Object.keys(groupedHabits)
      ])
    ].filter((name) => name !== 'Все');

    // Calculate today's completion for selected category
    const selectedCategoryTodayCompleted = filteredHabits.reduce((count, habit) => {
      const status = habit.statuses?.find(s => s && s.date === todayStr);
      return (status && status.is_done && !status.is_restored) ? count + 1 : count;
    }, 0);
    const selectedCategoryTotal = filteredHabits.length;
    const isSelectedCategoryComplete = selectedCategoryTodayCompleted === selectedCategoryTotal && selectedCategoryTotal > 0;

    return (
      <div className="habits-container">
        {selectedCategory !== 'Все' && selectedCategoryTotal > 0 && (
          <div className="top-right-counter">
            <span className="counter-text">{selectedCategoryTodayCompleted}/{selectedCategoryTotal}</span>
            {isSelectedCategoryComplete && (
              <span className="counter-checkmark">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M15 4.5L6.75 12.75L3 9" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
        )}
        <div className="days-header">
          <div className="days-cols">
            {WEEK_DAYS.map((day, index) => {
              const baseDate = new Date(currentWeekDate);
              const dayOfWeek = baseDate.getDay();
              const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const diff = index - currentDayIndex;

              const columnDate = new Date(baseDate);
              columnDate.setDate(baseDate.getDate() + diff);
              const columnDateStr = columnDate.toLocaleDateString('en-CA');

              const isTodayCol = columnDateStr === todayStr;
              const isMonthStart = index > 0 && columnDate.getDate() === 1;

              // Count completed (non-restored) habits for this day
              const completedCount = filteredHabits.reduce((count, habit) => {
                const status = habit.statuses?.find(s => s && s.date === columnDateStr);
                return (status && status.is_done && !status.is_restored) ? count + 1 : count;
              }, 0);
              const totalHabits = filteredHabits.length;

              return (
                <React.Fragment key={day}>
                  <div className={`grid-col day-col ${isTodayCol ? (highlightWeekToday ? 'today highlight' : 'today') : ''} ${isMonthStart ? 'month-start' : ''}`}>
                    <div className="day-completion-count">{completedCount}/{totalHabits}</div>
                    <div className="day-name">{day}</div>
                    <div className="day-number">{columnDate.getDate()}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="days-placeholder-end header-counts-container">
            <div className={`header-count-badge weekly ${currentWeekDate === getMondayString() ? 'current-week' : ''}`}>{language === 'ru' ? 'НЕД' : t('week').substring(0, 3).toUpperCase()} {getWeekNumber(currentWeekDate)}</div>
            <div className="header-count-badge monthly">{language === 'ru' ? 'МЕС' : t('month').substring(0, 3).toUpperCase()}</div>
            <div className="header-count-badge target">{language === 'ru' ? 'ЦЕЛЬ' : 'TGT'}</div>
          </div>
        </div>

        {orderedCategories.length === 0 && (
          <div className="no-habits-msg">{t('noHabitsInCategory')}</div>
        )}

        {orderedCategories.map((categoryKey) => {
          const habits = groupedHabits[categoryKey] || [];
          if (!habits.length) return null;
          const isCollapsed = !!collapsedCategories[categoryKey];

          // Count habits with at least one completion (not restored) this week
          const completedHabitsCount = habits.reduce((count, habit) => {
            const hasCompletion = habit.statuses?.some(s => s && s.is_done && !s.is_restored);
            return hasCompletion ? count + 1 : count;
          }, 0);

          // Count habits completed today (not restored)
          const todayCompletedCount = habits.reduce((count, habit) => {
            const status = habit.statuses?.find(s => s && s.date === todayStr);
            return (status && status.is_done && !status.is_restored) ? count + 1 : count;
          }, 0);
          const isTodayComplete = todayCompletedCount === habits.length && habits.length > 0;

          return (
            <div key={categoryKey} className={`category-group ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="category-group-header">
                <button
                  type="button"
                  className="category-collapse-btn"
                  onClick={() => toggleCategoryCollapse(categoryKey)}
                  aria-label={isCollapsed ? t('expand') : t('collapse')}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>
                <div className="category-group-title">
                  {getCategoryDisplayName(categoryKey)}
                </div>
                <div className="category-progress-cubes">
                  {habits.map((habit, index) => {
                    const status = habit.statuses?.find(s => s && s.date === todayStr);
                    const isCompleted = status && status.is_done && !status.is_restored;
                    return (
                      <div key={habit.id} className={`progress-cube ${isCompleted ? 'filled' : 'empty'}`}></div>
                    );
                  })}
                  {isTodayComplete && (
                    <span className="category-checkmark">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </div>
                <div className="category-habit-count">{todayCompletedCount}/{habits.length}</div>
              </div>

              {!isCollapsed && habits.map((habit) => {
                const weeklyCount = getHabitCount(habit);
                const weeklyAward = getWeeklyAward(weeklyCount);
                const statuses = habit.statuses || [];

                // Determine incoming streak state from previous week
                let currentStreak = 0;
                let consecutiveMissed = 0;
                let activeStreak = false;
                const dMinus3 = habit.prev_week_fri_done;
                const dMinus2 = habit.prev_week_sat_done;
                const dMinus1 = habit.prev_week_sun_done;

                // Initialize state based on the end of the previous week
                if (dMinus1 && dMinus2) {
                  activeStreak = true;
                  currentStreak = 2;
                  consecutiveMissed = 0;
                } else if (dMinus2 && dMinus3 && !dMinus1) {
                  activeStreak = true;
                  currentStreak = 2; // Was 2+, now 1 miss
                  consecutiveMissed = 1;
                } else if (dMinus1) {
                  currentStreak = 1;
                  consecutiveMissed = 0;
                } else {
                  consecutiveMissed = (dMinus2 ? 1 : 2);
                }

                // Precalculate dots for the current week
                const dots = new Array(7).fill('');
                WEEK_DAYS.forEach((_, index) => {
                  const baseDate = new Date(currentWeekDate);
                  const dayOfWeek = baseDate.getDay();
                  const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const slotDate = new Date(baseDate);
                  slotDate.setDate(baseDate.getDate() + (index - currentDayIndex));
                  const slotDateStr = slotDate.toLocaleDateString('en-CA');
                  
                  const status = statuses.find(s => s && s.date === slotDateStr);
                  const isDone = status ? status.is_done : false;
                  const isFuture = slotDateStr > todayStr;

                  if (isDone) {
                    currentStreak++;
                    consecutiveMissed = 0;
                    if (currentStreak >= 2) activeStreak = true;
                  } else {
                    currentStreak = 0;
                    // Only count misses if the day is not in the future
                    if (!isFuture) {
                      consecutiveMissed++;
                      if (consecutiveMissed >= 2) {
                        activeStreak = false;
                      }
                    }
                  }
                  
                  // If streak is active, show dots on all empty boxes (past, present, or future)
                  if (activeStreak && !isDone) {
                    dots[index] = 'has-dot-1';
                  }
                });

                return (
                  <div key={habit.id} className="habit-row">
                    <div className="habit-name">
                      <span className="habit-text">
                        {habit.name}
                        {weeklyAward && (
                          <span className="name-streak">
                            {' '}{weeklyCount === 3 ? '⚡' : 
                                 weeklyCount === 4 ? '⚡⚡' : 
                                 weeklyCount === 5 ? '⭐' : 
                                 weeklyCount === 6 ? '⭐⭐' : 
                                 weeklyAward}
                            {((weeklyAward === '👑' && habit.crown_streak > 1) || (weeklyAward !== '👑' && habit.weekly_award_streak > 1)) && (
                              ` x${weeklyAward === '👑' ? habit.crown_streak : habit.weekly_award_streak}`
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                    {habit.latest_comment && (
                      <div 
                        className="habit-note-container"
                        onClick={() => {
                          const d = habit.latest_comment_details;
                          if (d) {
                            const weeklyTotalVal = habit.statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                            openEntryModal(habit.id, habit.name, d.date, d.is_done, d.id, d.quantity, d.comment, d.photo, weeklyTotalVal, habit.monthly_total, habit.weekly_overflow, habit.monthly_overflow, d.is_restored);
                          }
                        }}
                      >
                        <div className="habit-note-box">
                          <span className="habit-note-label">{t('comment')}:</span>
                          <span className="habit-note-text">{habit.latest_comment}</span>
                        </div>
                      </div>
                    )}
                    <div className="habit-row-content">
                      <div className="habit-checks">
                        {WEEK_DAYS.map((_, index) => {
                          const baseDate = new Date(currentWeekDate);
                          const dayOfWeek = baseDate.getDay();
                          const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                          const diff = index - currentDayIndex;

                          const slotDate = new Date(baseDate);
                          slotDate.setDate(baseDate.getDate() + diff);
                          const slotDateStr = slotDate.toLocaleDateString('en-CA');

                          const status = statuses.find(s => s && s.date === slotDateStr);
                          const isDone = status ? status.is_done : false;
                          const isRestored = status ? status.is_restored : false;
                          const statusId = status ? status.id : null;
                          const quantity = status ? status.quantity : null;

                          const isToday = slotDateStr === todayStr;
                          const isPast = slotDateStr < todayStr;
                          const isFuture = slotDateStr > todayStr;
                          const isMissed = isPast && !isDone;
                          const hasComment = status && status.comment;
                          const hasPhoto = status && status.photo;
                          const isBeforeCreation = habit.start_date && slotDateStr < habit.start_date;
                          const isDisabled = isFuture;
                          const showDotClass = dots[index];
                          const isMonthStart = index > 0 && slotDate.getDate() === 1;

                          const checkBoxBtn = (
                            <button
                              className={`check-box ${isDone ? 'checked' : ''} ${isRestored ? 'restored' : ''} ${isMissed ? 'missed' : ''} ${isToday ? 'today' : ''} ${isDone && (quantity !== null && quantity !== undefined) ? 'with-quantity' : ''} ${hasComment ? 'has-comment' : ''} ${showDotClass} ${isBeforeCreation ? 'before-creation' : ''}`}
                              onClick={() => {
                                if (!isDisabled && !longPressTimer) {
                                  toggleHabitCheck(habit.id, slotDateStr, isDone, statusId);
                                }
                              }}
                              onMouseDown={() => {
                                const weeklyTotalVal = statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                                !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo, weeklyTotalVal, habit.monthly_total, habit.weekly_overflow, habit.monthly_overflow, isRestored);
                              }}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              onTouchStart={() => {
                                const weeklyTotalVal = statuses.reduce((sum, s) => sum + (s.is_done ? (s.quantity || 1) : 0), 0);
                                !isDisabled && handleLongPressStart(habit.id, habit.name, slotDateStr, isDone, statusId, quantity, status?.comment, status?.photo, weeklyTotalVal, habit.monthly_total, habit.weekly_overflow, habit.monthly_overflow, isRestored);
                              }}
                              onTouchMove={handleLongPressEnd}
                              onTouchEnd={handleLongPressEnd}
                              disabled={isDisabled}
                            >
                              {isDone && (quantity !== null && quantity !== undefined) && <span className="quantity-display">{quantity}</span>}
                              {hasComment && <span className="attachment-indicator"></span>}
                            </button>
                          );

                          return (
                            <div key={slotDateStr} className={`grid-col ${isMonthStart ? 'month-start' : ''}`}>
                              {checkBoxBtn}
                            </div>
                          );
                        })}
                      </div>
                      <div className="habit-counts-wrapper">
                        <div className="habit-count-container">
                          <div className="habit-count-row">
                            <div className={`habit-count weekly ${weeklyCount >= 3 ? 'active' : ''} ${weeklyCount === 3 ? 'has-single-lightning' : ''} ${weeklyCount === 4 ? 'has-double-lightning' : ''} ${weeklyCount === 5 ? 'has-single-star' : ''} ${weeklyCount === 6 ? 'has-double-star' : ''}`}>
                              {((weeklyCount === 4 && weeklyAward.includes('⚡')) || (weeklyCount === 6 && weeklyAward.includes('⭐'))) && (
                                <span className="award-side award-left">{weeklyCount === 4 ? '⚡' : '⭐'}</span>
                              )}

                              <span className={`habit-count-number ${weeklyAward ? 'with-awards' : ''}`}>
                                {weeklyCount}
                              </span>
                              {weeklyAward && weeklyAward !== '👑' && (
                                <span className="award-side award-right">
                                  {weeklyCount === 4 ? '⚡' : weeklyCount === 6 ? '⭐' : weeklyAward}
                                </span>
                              )}
                              {weeklyAward === '👑' && (
                                <span className="crown-right">👑</span>
                              )}
                            </div>
                            <div className="habit-count monthly">{habit.monthly_total || 0}</div>
                            <div className={`habit-count target green-target ${!habit.use_target ? 'invisible' : ''}`}>
                              {habit.use_target ? (habit.completion_target || 0) : ''}
                            </div>
                          </div>
                          <div className="habit-count-row">
                            <div className="habit-count-overflow weekly">{habit.weekly_overflow || 0}</div>
                            <div className="habit-count-overflow monthly">{habit.monthly_overflow || 0}</div>
                            <div className={`habit-count-overflow target purple-target ${!habit.use_target ? 'invisible' : ''}`}>
                              {habit.use_target ? (habit.quantity_target || 0) : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
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
      if (isHabitTouchDragging.current && e.cancelable) {
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
      setCreateError(t('categoryMinLength'));
      return;
    }
    if (name.length > 20) {
      setCreateError(t('categoryMaxLength'));
      return;
    }


    try {
      const newCat = await storageService.saveCategory(storageMode, { name: newCategoryName.trim() }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      setNewCategoryName('');
      setShowAddCategory(false);
      setShowCreateCategoryModal(false);
      await fetchCategories();
      if (showEditModal && editingHabit) {
        setEditingHabit({ ...editingHabit, category: newCat.id.toString() });
      } else {
        setNewHabitCategory(newCat.id.toString());
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setCreateError(t('categoryCreateError'));
    }
  };

  const handleUpdateCategory = async (id, newName) => {
    if (!newName.trim()) return;
    try {
      await storageService.saveCategory(storageMode, { id, name: newName.trim() }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      setEditingCategoryId(null);
      await fetchCategories();
      await fetchHabits(); // Refresh habits to pick up name changes if cached
    } catch (error) {
      console.error('Error updating category:', error);
      alert(t('categoryUpdateError'));
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(t('categoryDeleteConfirm'))) {
      return;
    }
    try {
      await storageService.deleteCategory(storageMode, id, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      await fetchCategories();
      await fetchArchivedCategories();
      await fetchHabits(); // Habits category will be updated to null
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(t('categoryDeleteError'));
    }
  };

  const handleArchiveCategory = async (id) => {
    try {
      await storageService.archiveCategory(storageMode, id, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      await fetchCategories();
      await fetchArchivedCategories();
      await fetchHabits();
      await fetchArchivedHabits();
    } catch (error) {
      console.error('Error archiving category:', error);
      alert(t('categoryArchiveError'));
    }
  };

  const handleUnarchiveCategory = async (id) => {
    try {
      await storageService.archiveCategory(storageMode, id, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      await fetchCategories();
      await fetchArchivedCategories();
      await fetchHabits();
      await fetchArchivedHabits();
    } catch (error) {
      console.error('Error unarchiving category:', error);
      alert(t('categoryArchiveError'));
    }
  };

  const handleCategoryDragStart = (e, catId) => {
    setDraggedCategoryId(catId);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const liveSwapCategories = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;

    setCategories(prevList => {
      const draggedIndex = prevList.findIndex(c => c.id === draggedId);
      const targetIndex = prevList.findIndex(c => c.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prevList;
      if (draggedIndex === targetIndex) return prevList;

      const newList = [...prevList];
      const [removed] = newList.splice(draggedIndex, 1);
      newList.splice(targetIndex, 0, removed);
      
      // Update order field to match new positions
      return newList.map((c, index) => ({ ...c, order: index }));
    });
  };

  const handleCategoryDragOver = (e, catId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCategoryId && draggedCategoryId !== catId) {
      liveSwapCategories(draggedCategoryId, catId);
    }
  };

  const handleCategoryDrop = async (e, targetCatId) => {
    if (e) e.preventDefault();
    
    setCategories(currentList => {
      const orderedIds = currentList
        .filter(c => c.id !== 'all' && c.id !== 'none')
        .map(c => c.id);
        
      storageService.reorderCategories(storageMode, orderedIds, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      }).catch(error => {
        console.error('Error saving category order:', error);
        fetchCategories(); // revert on error
      });

      return currentList;
    });

    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  };

  const handleCategoryTouchStart = (e, catId) => {
    if (e.touches.length > 1) return;
    // e.preventDefault() not needed here since touch-action: none is on drag-handle
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setDraggedCategoryId(catId);
    isCategoryTouchDragging.current = true;
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleCategoryTouchMove = (e) => {
    if (!isCategoryTouchDragging.current) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];

    // Hide dragged element so elementFromPoint can see through it
    const draggedEl = document.querySelector(`.manage-category-item[data-category-id="${draggedCategoryId}"]`);
    if (draggedEl) draggedEl.style.pointerEvents = 'none';

    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (draggedEl) draggedEl.style.pointerEvents = '';

    const categoryItem = element?.closest('.manage-category-item');
    if (categoryItem) {
      const targetId = parseInt(categoryItem.getAttribute('data-category-id'));
      if (targetId && targetId !== draggedCategoryId) {
        liveSwapCategories(draggedCategoryId, targetId);
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
  };

  const handleCategoryTouchEnd = (e) => {
    if (isCategoryTouchDragging.current) {
      handleCategoryDrop(null, null);
      setDraggedCategoryId(null);
      isCategoryTouchDragging.current = false;
    }
  };

  const toggleHabitCheck = async (habitId, dayDate, currentStatus, dateId, quantity = null) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isToday = dayDate === todayStr;
    const isPastDate = dayDate < todayStr;
    const isMarkingDone = !currentStatus;

    // Determining the quantity to use:
    // If we're marking as "done" for today and no quantity is passed, default to null (shows as "≤1" in picker)
    let effectiveQuantity = quantity;
    if (isMarkingDone && effectiveQuantity === null && isToday) {
      effectiveQuantity = null; // Ensure it stays null for "≤1" state
    }

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
              quantity: effectiveQuantity !== null ? effectiveQuantity : (isMarkingDone ? status.quantity : null)
            } : status
          )
        };
      }
      return habit;
    });
    setHabitsData(updatedHabits);

    try {
      const payload = {
        habit_id: habitId,
        date: dayDate,
        is_done: isMarkingDone,
        is_restored: isPastDate && isMarkingDone,
        quantity: effectiveQuantity !== null ? effectiveQuantity : undefined
      };

      await storageService.saveStatus(storageMode, payload, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      // Refetch to sync state
      await fetchHabits();
    } catch (error) {
      console.error('Error toggling habit:', error);
      fetchHabits(); // Sync back
    }
  };

  const getDefaultModalQuantity = (isRestored) => {
    // Темно-зеленая (isRestored=false) -> скролл <=1 (null)
    // Светло-зеленая (isRestored=true) -> скролл 1
    return isRestored ? 1 : null;
  };

  const openEntryModal = (habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow, monthlyOverflow, isRestored) => {
    setQuantityModalData({ habitId, habitName, dayDate, currentStatus, currentQuantity, currentComment, currentPhoto, dateId, weeklyTotal, monthlyTotal, weeklyOverflow, monthlyOverflow, currentIsRestored: isRestored });

    const initialQuantity = getDefaultModalQuantity(isRestored);

    setQuantityValue(initialQuantity);
    setCommentValue(currentComment || '');
    setShowQuantityModal(true);
  };

  const handleLongPressStart = (habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow, monthlyOverflow, isRestored) => {
    const timer = setTimeout(() => {
      openEntryModal(habitId, habitName, dayDate, currentStatus, dateId, currentQuantity, currentComment, currentPhoto, weeklyTotal, monthlyTotal, weeklyOverflow, monthlyOverflow, isRestored);
    }, 200);
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
    const { habitId, dayDate } = quantityModalData;

    try {
      const payload = {
        habit_id: habitId,
        date: dayDate,
        is_done: true,
        is_restored: isRestored,
        quantity: qty,
        comment: commentValue
      };

      await storageService.saveStatus(storageMode, payload, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(null);
      setCommentValue('');
      await fetchHabits();
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`${t('saveDataError')}: ${error.message}`);
    } finally {
      setShowQuantityModal(false);
      setQuantityModalData(null);
      setQuantityValue(null);
      setCommentValue('');
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

  // Эмоджи-награда в зависимости от количества выполнений за неделю
  const getWeeklyAward = (count) => {
    if (count >= 7) return '👑';
    if (count === 6) return '⭐⭐';
    if (count === 5) return '⭐';
    if (count === 4) return '⚡⚡';
    if (count === 3) return '⚡';
    return null;
  };

  const getCategoryDisplayName = (categoryName) => {
    if (categoryName === 'Все') return t('allCategories');
    if (categoryName === 'Без категории') return t('noCategory');
    return categoryName || t('noCategory');
  };

  // Get week number of the year (ISO week date)
  const getWeekNumber = (dateInput) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!(date instanceof Date) || isNaN(date)) return 1;
    
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const toggleCategoryCollapse = (categoryName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Эмоджи в зависимости от дня недели для кнопки "Сегодня"
  const getTodayEmoji = () => {
    const day = new Date().getDay();
    const emojis = ['😌', '😫', '😐', '🐪', '🙂', '🎉', '😎']; // Вс, Пн, Вт, Ср, Чт, Пт, Сб
    return emojis[day];
  };

  // Компонент иконки календаря с текущей датой
  const CalendarIcon = () => {
    const today = new Date();
    const dayNum = today.getDate();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = monthNames[today.getMonth()];

    return (
      <span className="calendar-icon">
        <span className="calendar-month">{month}</span>
        <span className="calendar-day">{dayNum}</span>
      </span>
    );
  };

  // Sort and filter categories by order from database
  const sortedCategories = React.useMemo(() => {
    // Sort by order field (from backend), default to 0 if not set
    const sorted = [...categories]
      .filter(c => c.id !== 'all' && c.id !== 'none')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const hasUncategorized = habitsData.some(h => !h.category_name);
    const result = [{ id: 'all', name: 'Все', order: -2 }];
    if (hasUncategorized) {
      result.push({ id: 'none', name: 'Без категории', order: -1 });
    }

    return [...result, ...sorted];
  }, [categories, habitsData]);

  // Authentication handlers
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
    fetchArchivedHabits();
    fetchCategories();
    fetchArchivedCategories();
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    fetchHabits();
    fetchArchivedHabits();
    fetchCategories();
    fetchArchivedCategories();
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
      setCreateError(t('enterHabitName'));
      return;
    }


    try {
      const payload = {
        name: newHabitName.trim(),
        category: newHabitCategory === "" ? null : newHabitCategory,
        target_type: newHabitTargetType,
        start_date: newHabitStartDate,
        use_target: newHabitUseTarget,
        completion_target: newHabitUseTarget ? (newHabitCompletionTarget !== '' ? parseInt(newHabitCompletionTarget, 10) : getDaysInCurrentMonth()) : null,
        quantity_target: newHabitUseTarget && newHabitQuantityTarget !== '' ? parseInt(newHabitQuantityTarget, 10) : null
      };

      await storageService.saveHabit(storageMode, payload, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      // Reset form and close modal
      setNewHabitName('');
      setShowCreateModal(false);

      // Refresh habits list
      await fetchHabits();
    } catch (error) {
      console.error('Error creating habit:', error);
      setCreateError(error.message || t('habitCreateError'));
    }

  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm(t('habitDeleteConfirm'))) return;


    try {
      await storageService.deleteHabit(storageMode, habitId, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      await fetchHabits();
      await fetchArchivedHabits();
    } catch (error) {
      console.error('Error deleting habit:', error);
      alert(t('habitDeleteError'));
    }
  };

  const handleArchiveHabit = async (habitId) => {
    try {
      await storageService.saveHabit(storageMode, { id: habitId, is_archived: true }, {
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        credentials: 'include'
      });
      await fetchHabits();
      await fetchArchivedHabits();
    } catch (error) {
      console.error('Error archiving habit:', error);
    }
  };

  const handleUnarchiveHabit = async (habitId) => {
    try {
      await storageService.saveHabit(storageMode, { id: habitId, is_archived: false }, {
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        credentials: 'include'
      });
      await fetchHabits();
      await fetchArchivedHabits();
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
      const orderedIds = currentList.map(h => h.id);
      
      storageService.reorderHabits(storageMode, orderedIds, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
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
    if (e.touches.length > 1) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setDraggedHabitId(habitId);
    isHabitTouchDragging.current = true;
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleTouchMove = (e) => {
    if (!isHabitTouchDragging.current) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];

    // Hide dragged element so elementFromPoint can see through it
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
  };

  const handleTouchEnd = (e) => {
    if (isHabitTouchDragging.current) {
      handleDrop(null, null);
      setDraggedHabitId(null);
      isHabitTouchDragging.current = false;
    }
  };

  const handleDragEnd = () => {
    setDraggedHabitId(null);
    setDragOverHabitId(null);
  };

  const handleMoveHabitToCategory = async (habitId, categoryId) => {
    try {
      await storageService.saveHabit(storageMode, { id: habitId, category: categoryId }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      await fetchHabits();
    } catch (error) {
      console.error('Error moving habit:', error);
      alert('Ошибка при перемещении привычки');
    }
  };

  const handleUpdateHabit = async (e) => {
    e.preventDefault();
    if (!editingHabit) return;

    try {
      await storageService.saveHabit(storageMode, {
        id: editingHabit.id,
        name: editingHabit.name,
        category: editingHabit.category === "" ? null : editingHabit.category,
        target_type: editingHabit.target_type,
        start_date: editingHabit.start_date,
        use_target: editingHabit.use_target,
        completion_target: editingHabit.use_target ? (editingHabit.completion_target !== '' && editingHabit.completion_target !== null ? parseInt(editingHabit.completion_target, 10) : getDaysInCurrentMonth()) : null,
        quantity_target: editingHabit.use_target && editingHabit.quantity_target !== '' && editingHabit.quantity_target !== null ? parseInt(editingHabit.quantity_target, 10) : null
      }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });

      setShowEditModal(false);
      setEditingHabit(null);
      await fetchHabits();
    } catch (error) {
      console.error('Error updating habit:', error);
      alert('Ошибка при обновлении привычки');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    // Calculate age from date_of_birth if provided
    const dataToSend = { ...editProfileData };
    if (editProfileData.date_of_birth) {
      dataToSend.age = calculateAge(editProfileData.date_of_birth);
    } else if (editProfileData.age) {
      const ageNum = parseInt(editProfileData.age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
        alert('Возраст должен быть числом от 0 до 150 лет');
        return;
      }
    }

    try {
      const csrf = getCookie('csrftoken');
      console.log('UpdateProfile: data:', dataToSend, 'csrf:', csrf);

      // Use FormData for file upload
      const formData = new FormData();
      for (const [key, value] of Object.entries(dataToSend)) {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      }

      const response = await fetch('/api/auth/me/', {
        method: 'PATCH',
        headers: {
          'X-CSRFToken': csrf
        },
        credentials: 'include',
        body: formData
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
          <p>{t('loading')}</p>
        </div>

      </div>
    );
  }

  // Show auth forms if not authenticated AND in cloud mode
  if (!isAuthenticated && storageMode === 'cloud') {
    return (
      <div className="auth-wrapper">
        <div className="auth-storage-toggle">
          <button 
            className="toggle-btn local-link" 
            onClick={() => {
              setStorageMode('local');
              storageService.setStorageMode('local');
            }}
          >
            {t('useLocalStorage') || 'Use Local Storage'}
          </button>
        </div>
        {showRegister ? (
          <Register
            onRegister={handleRegister}
            onSwitchToLogin={() => setShowRegister(false)}
            t={t}
            language={language}
          />
        ) : (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowRegister(true)}
            t={t}
            language={language}
          />
        )}
      </div>
    );
  }

  const handleGenerateReport = async (habitId, period = 'day') => {
    setIsReportLoading(true);
    setReportPeriod(period);
    try {
      const data = await storageService.getReport(storageMode, habitId, {
        period,
        date: currentWeekDate
      }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert(t('errorLoadingReport'));
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleGenerateSummaryReport = async (period = 'all') => {
    setIsReportLoading(true);
    setReportPeriod(period);
    try {
      const data = await storageService.getSummaryReport(storageMode, {
        period,
        date: currentWeekDate
      }, {
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include'
      });
      setReportData(data);
    } catch (error) {
      console.error('Error fetching summary report:', error);
      alert(t('errorLoadingReport'));
    } finally {
      setIsReportLoading(false);
    }
  };

  const changeReportPeriod = (newPeriod) => {
    if (!reportData) return;
    if (reportData.is_general) {
      handleGenerateSummaryReport(newPeriod);
    } else {
      handleGenerateReport(reportData.habit.id, newPeriod);
    }
  };


  const modalCurrentStatus = quantityModalData?.currentStatus;
  const modalCurrentQuantity = quantityModalData?.currentQuantity;
  const effectiveQuantity = (typeof quantityValue === 'number' && quantityValue >= 1) ? quantityValue : 1;
  const currentQuantity = (modalCurrentQuantity !== null && modalCurrentQuantity !== undefined)
    ? modalCurrentQuantity
    : (modalCurrentStatus ? 1 : 0);
  const diff = modalCurrentStatus ? (effectiveQuantity - currentQuantity) : effectiveQuantity;

  const liveWeeklyTotal = Math.max(0, (quantityModalData?.weeklyTotal || 0) + diff);
  const liveMonthlyTotal = Math.max(0, (quantityModalData?.monthlyTotal || 0) + diff);
  const liveWeeklyOverflow = (quantityModalData?.weeklyOverflow || 0) + diff;
  const liveMonthlyOverflow = (quantityModalData?.monthlyOverflow || 0) + diff;

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
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
              ) : (
                user?.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <span className="profile-name">{user?.username || t('user')}</span>
          </button>

          {activeTab !== 'Settings' && (
            <button
              className="today-btn"
              title={t('today')}
              onClick={handleToday}
            >
              <CalendarIcon /> {t('today')}
            </button>
          )}

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
                  setActiveTab('Settings');
                }}
              >
                ⚙️ {t('settings')}
              </button>
              <button
                className="profile-menu-item profile-menu-action logout-action"
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
              >
                🚪 {t('logout')}
              </button>
            </div>
          )}
        </div>

        {apiError && (
          <div className="api-error-banner">
            <span>{apiError}</span>
            <button className="api-error-dismiss" onClick={() => setApiError('')}>×</button>
          </div>
        )}

        {activeTab !== 'Settings' && (
          <div className="date-section">
            <div className="week-navigation">
              <button className="week-nav-btn" onClick={handlePrevWeek}>&lt;</button>
              <div className="week-range-text" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2'}}>
                <span style={{fontSize: '0.85em', fontWeight: 'bold'}}>{language === 'ru' ? 'НЕД' : t('week').substring(0, 3).toUpperCase()} {getWeekNumber(currentWeekDate)}</span>
                <span style={{fontSize: '0.9em', opacity: 0.8}}>{currentWeekRange()}</span>
              </div>
              <button className="week-nav-btn" onClick={handleNextWeek}>&gt;</button>
            </div>
          </div>
        )}

        <button
          className="add-btn"
          title={t('createHabit')}
          onClick={() => {

            setCreateError('');
            setShowAddCategory(false);
            setNewCategoryName('');
            setNewHabitStartDate(new Date().toISOString().split('T')[0]);
            setShowCreateModal(true);
          }}
        >
          +
        </button>
      </div>


      {/* Фильтры категорий - только для вкладки Журналы */}
      {activeTab === 'Habits' && (
        <div className="categories-section unified">
          {sortedCategories.map(category => {
            const displayName = category.name === 'Все' ? t('allCategories') :
              (category.name === 'Без категории' ? t('noCategory') : category.name);
            return (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.name)}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      )}


      {/* Список привычек и заголовок - только для вкладки Журналы */}
      {activeTab === 'Habits' && (
        <div className="habits-swipe-wrapper"
          ref={habitsContainerRef}
          onTouchStart={handleSwipeStart}
          onTouchMove={handleSwipeMove}
          onTouchEnd={handleSwipeEnd}
          onTouchCancel={handleSwipeEnd}
        >

          <div className="week-pages" ref={weekPagesRef}>
            <div className="week-page prev-week">
              {renderWeekPage(prevWeekDate)}
            </div>
            <div className="week-page current-week">
              {renderWeekPage(currentWeekDate, highlightToday)}
            </div>
            <div className="week-page next-week">
              {renderWeekPage(nextWeekDate)}
            </div>
          </div>
        </div>      )}

      {/* Компонент графиков - для вкладки Графики */}
      {activeTab === 'Charts' && (

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
          theme={theme}
          t={t}
          language={language}
          storageMode={storageMode}
        />

      )}

      {/* Вкладка Настройка */}
      {activeTab === 'Settings' && (
        <div className="settings-container">
          <div className="settings-header">
            <h2>⚙️ {t('settings')}</h2>
            <button
              className="lang-toggle-btn"
              onClick={() => {
                const newLang = language === 'ru' ? 'en' : 'ru';
                setLanguage(newLang);
                localStorage.setItem('language', newLang);
              }}
            >
              <span className={`lang-option ${language === 'ru' ? 'active' : ''}`}>Rus</span>
              <span className="lang-separator">/</span>
              <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>Eng</span>
            </button>



          </div>

          <div className="settings-section profile-settings">
            <h3 className="section-title" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, profile: !collapsedSettingsSections.profile})}>
              <span>{t('profile')}</span>
              <span className={`collapse-icon ${collapsedSettingsSections.profile ? 'collapsed' : ''}`}>▼</span>
            </h3>
            {!collapsedSettingsSections.profile && (
            <div className="manage-profile-info">
              <div className="profile-info-row">
                <span className="info-label">{t('username')}:</span>
                <span className="info-value">{user?.username}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">{t('email')}:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">{t('dateOfBirth')}:</span>
                <span className="info-value">{user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US') : t('notSpecified')}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">{t('age')}:</span>
                <span className="info-value">{user?.age || t('notSpecified')}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">{t('profilePhoto')}:</span>
                <span className="info-value">
                  {user?.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt="Profile"
                      style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'}}
                      onClick={() => setLightboxUrl(user.profile_photo)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        setLightboxUrl(user.profile_photo);
                      }}
                    />
                  ) : (
                    t('notSpecified')
                  )}
                </span>
              </div>
              <button
                className="btn-secondary btn-small edit-profile-btn"
                onClick={() => {
                  setEditProfileData({
                    username: user?.username || '',
                    email: user?.email || '',
                    age: user?.age || '',
                    date_of_birth: user?.date_of_birth || '',
                    profile_photo: null
                  });
                  setShowEditProfileModal(true);
                }}
              >
                ✏️ {t('editProfile')}
              </button>
            </div>
            )}
          </div>

          <div className="settings-section categories-settings">
            <h3 className="section-title" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, categories: !collapsedSettingsSections.categories})}>
              <div className="section-title-left">
                <span>{t('categories')}</span>
                <button
                  className="add-category-btn"
                  onClick={(e) => { e.stopPropagation(); setShowCreateCategoryModal(true); }}
                >
                  +
                </button>
              </div>
              <div className="section-actions">
                <span className={`collapse-icon ${collapsedSettingsSections.categories ? 'collapsed' : ''}`}>▼</span>
              </div>
            </h3>

            {!collapsedSettingsSections.categories && (
              <>
                <div className="manage-categories-list">
                  {categories.filter(c => c.id !== 'all').length === 0 ? (
                    <p className="no-habits-msg">{t('noCategories')}</p>
                  ) : (
                    categories.filter(c => c.id !== 'all').map(cat => (
                      <div 
                        key={cat.id} 
                        className={`manage-category-item ${draggedCategoryId === cat.id ? 'dragging' : ''} ${dragOverCategoryId === cat.id && draggedCategoryId !== cat.id ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => handleCategoryDragStart(e, cat.id)}
                        onDragOver={(e) => handleCategoryDragOver(e, cat.id)}
                        onDrop={(e) => handleCategoryDrop(e, cat.id)}
                        onDragEnd={handleCategoryDragEnd}
                        data-category-id={cat.id}
                      >
                        <div
                          className="drag-handle"
                          title={t('dragToReorder')}
                          onTouchStart={(e) => handleCategoryTouchStart(e, cat.id)}
                          onTouchMove={handleCategoryTouchMove}
                          onTouchEnd={handleCategoryTouchEnd}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="5" r="1"></circle>
                            <circle cx="9" cy="12" r="1"></circle>
                            <circle cx="9" cy="19" r="1"></circle>
                            <circle cx="15" cy="5" r="1"></circle>
                            <circle cx="15" cy="12" r="1"></circle>
                            <circle cx="15" cy="19" r="1"></circle>
                          </svg>
                        </div>
                        {editingCategoryId === cat.id ? (
                          <div className="category-edit-row-container">
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
                                  className="manage-btn add-habit-btn"
                                  onClick={() => {
                                    setSelectingForCategoryId(cat.id);
                                    setShowSelectHabitsModal(true);
                                  }}
                                  title={t('addHabit')}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                  </svg>
                                </button>
                                <button
                                  className="manage-btn save-btn"
                                  onClick={() => handleUpdateCategory(cat.id, editingCategoryValue)}
                                  title={t('save')}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                  </svg>
                                </button>
                                <button
                                  className="manage-btn cancel-btn"
                                  onClick={() => setEditingCategoryId(null)}
                                  title={t('cancel')}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            { (expandedCategoryId === cat.id || editingCategoryId === cat.id) && (
                              <div className="category-habits-inline">
                                {habitsData.filter(h => h.category === cat.id).length === 0 ? (
                                  <span className="no-habits-inline">{t('noHabitsInCategory')}</span>
                                ) : (
                                  habitsData
                                    .filter(h => h.category === cat.id)
                                    .map(habit => (
                                      <span key={habit.id} className="category-habit-tag">
                                        {habit.name}
                                      </span>
                                    ))
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="manage-category-info">
                              <div className="manage-category-name">{cat.name}</div>
                              {expandedCategoryId === cat.id && (
                                <div className="category-habits-inline">
                                  {habitsData.filter(h => h.category === cat.id).length === 0 ? (
                                    <span className="no-habits-inline">{t('noHabitsInCategory')}</span>
                                  ) : (
                                    habitsData
                                      .filter(h => h.category === cat.id)
                                      .map(habit => (
                                        <span key={habit.id} className="category-habit-tag">
                                          {habit.name}
                                        </span>
                                      ))
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="manage-category-actions">
                              <button
                                className="manage-btn expand-btn"
                                onClick={() => setExpandedCategoryId(expandedCategoryId === cat.id ? null : cat.id)}
                                title={t('showHabits')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points={expandedCategoryId === cat.id ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                                </svg>
                              </button>
                              <button
                                className="manage-btn edit-btn"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryValue(cat.name);
                                }}
                                title={t('rename')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="manage-btn archive-btn"
                                onClick={() => handleArchiveCategory(cat.id)}
                                title={t('archiveCategory')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                  <rect x="1" y="3" width="22" height="5"></rect>
                                  <line x1="10" y1="12" x2="14" y2="12"></line>
                                </svg>
                              </button>
                              <button
                                className="manage-btn delete-btn"
                                onClick={() => handleDeleteCategory(cat.id)}
                                title={t('delete')}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="archive-section">
                  <button
                    className="archive-toggle-btn"
                    onClick={() => setShowCategoryArchive(!showCategoryArchive)}
                  >
                    <span className="archive-toggle-icon">{showCategoryArchive ? '▲' : '▼'}</span>
                    📁 {t('archive')} ({archivedCategories.length})
                  </button>

                  {showCategoryArchive && (
                    <div className="archived-habits-list">
                      {archivedCategories.length === 0 ? (
                        <p className="no-habits-msg">{t('categoryArchiveEmpty')}</p>
                      ) : (
                        archivedCategories.map(cat => (
                          <div key={cat.id} className="archived-habit-item">
                            <div className="manage-habit-info">
                              <div className="manage-habit-name">{cat.name}</div>
                            </div>
                            <div className="manage-habit-actions">
                              <button
                                className="manage-btn unarchive-btn"
                                onClick={() => handleUnarchiveCategory(cat.id)}
                                title={t('unarchiveCategory')}
                              >
                                📤
                              </button>
                              <button
                                className="manage-btn delete-btn"
                                onClick={() => handleDeleteCategory(cat.id)}
                                title={t('deleteForever')}
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
              </>
            )}
          </div>

          <div className="settings-section habits-settings">
            <h3 className="section-title" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, habits: !collapsedSettingsSections.habits})}>
              <div className="section-title-left">
                <span>{t('manageHabits')}</span>
                <button
                  className="add-category-btn"
                  onClick={(e) => { e.stopPropagation(); setNewHabitCategory(''); setNewHabitName(''); setCreateError(''); setShowAddCategory(false); setNewCategoryName(''); setShowCreateModal(true); }}
                >
                  +
                </button>
              </div>
              <div className="section-actions">
                <span className={`collapse-icon ${collapsedSettingsSections.habits ? 'collapsed' : ''}`}>▼</span>
              </div>
            </h3>

            {!collapsedSettingsSections.habits && (
              <>
                <div className="settings-category-filter">
                  {sortedCategories.map(cat => {
                    const displayName = cat.name === 'Все' ? t('allCategories') :
                      (cat.name === 'Без категории' ? t('noCategory') : cat.name);
                    return (
                      <button
                        key={cat.id}
                        className={`settings-cat-btn ${settingsSelectedCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setSettingsSelectedCategory(cat.name)}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>

                <div className="manage-habits-list">
                  {habitsData
                    .filter(h => !h.is_archived && (
                      settingsSelectedCategory === 'Все' ||
                      (settingsSelectedCategory === 'Без категории' && !h.category_name) ||
                      (h.category_name === settingsSelectedCategory)
                    ))
                    .length === 0 ? (
                    <p className="no-habits-msg">{t('noHabitsInCategory')}</p>
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
                      data-habit-id={habit.id}
                    >
                      <div
                        className="drag-handle"
                        title={t('dragToReorder')}
                        onTouchStart={(e) => handleTouchStart(e, habit.id)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="5" r="1"></circle>
                          <circle cx="9" cy="12" r="1"></circle>
                          <circle cx="9" cy="19" r="1"></circle>
                          <circle cx="15" cy="5" r="1"></circle>
                          <circle cx="15" cy="12" r="1"></circle>
                          <circle cx="15" cy="19" r="1"></circle>
                        </svg>
                      </div>


                      <div className="manage-habit-info">
                        <div className="manage-habit-name">{habit.name}</div>
                        <div className="manage-habit-category">{habit.category_name || t('noCategory')}</div>
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
                          title={t('edit')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="manage-btn archive-btn"
                          onClick={() => handleArchiveHabit(habit.id)}
                          title={t('archiveHabit')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8"></polyline>
                            <rect x="1" y="3" width="22" height="5"></rect>
                            <line x1="10" y1="12" x2="14" y2="12"></line>
                          </svg>
                        </button>
                        <button
                          className="manage-btn delete-btn"
                          onClick={() => handleDeleteHabit(habit.id)}
                          title={t('delete')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
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
                📁 {t('archive')} ({archivedHabits.length})
              </button>

              {showArchive && (
                <div className="archived-habits-list">
                  {archivedHabits.length === 0 ? (
                    <p className="no-habits-msg">{t('archiveEmpty')}</p>

                  ) : (

                    archivedHabits.map(habit => (
                      <div key={habit.id} className="archived-habit-item">
                        <div className="manage-habit-info">
                          <div className="manage-habit-name">{habit.name}</div>
                          <div className="manage-habit-category">{habit.category_name || t('noCategory')}</div>
                        </div>
                        <div className="manage-habit-actions">
                          <button
                            className="manage-btn unarchive-btn"
                            onClick={() => handleUnarchiveHabit(habit.id)}
                            title={t('unarchiveHabit')}
                          >
                            📤
                          </button>
                          <button
                            className="manage-btn delete-btn"
                            onClick={() => handleDeleteHabit(habit.id)}
                            title={t('deleteForever')}
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
            </>
            )}
          </div>

          <div className="settings-section theme-settings">
            <h3 className="section-title section-title-centered" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, theme: !collapsedSettingsSections.theme})}>
              <span>{t('theme')}</span>
              <span className={`collapse-icon ${collapsedSettingsSections.theme ? 'collapsed' : ''}`}>▼</span>
            </h3>
            {!collapsedSettingsSections.theme && (
              <div className="theme-options">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('light');
                  localStorage.setItem('theme', 'light');
                }}
              >
                ☀️ {t('lightTheme')}
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('dark');
                  localStorage.setItem('theme', 'dark');
                }}
              >
                🌙 {t('darkTheme')}
              </button>
              <button
                className={`theme-btn ${theme === 'auto' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('auto');
                  localStorage.setItem('theme', 'auto');
                }}
              >
                🌓 {t('autoTheme')}
              </button>
            </div>
            )}
          </div>

          <div className="settings-section reminder-settings">
            <h3 className="section-title section-title-centered" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, reminders: !collapsedSettingsSections.reminders})}>
              <span>🔔 {t('reminders')}</span>
              <span className={`collapse-icon ${collapsedSettingsSections.reminders ? 'collapsed' : ''}`}>▼</span>
            </h3>
            {!collapsedSettingsSections.reminders && (
              <>
                <div className="reminder-toggle-row">
                  <span className="reminder-label">{t('enableReminders')}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => handleReminderToggle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {reminderEnabled && (
                  <div className="reminder-options">
                    <div className="reminder-option">
                      <label className="reminder-option-label">{language === 'ru' ? 'Текст напоминания' : 'Reminder Text'}:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={reminderText}
                        onChange={(e) => handleReminderTextChange(e.target.value)}
                        placeholder={language === 'ru' ? 'Что вам напомнить?' : 'What to remind?'}
                      />
                    </div>
                    <div className="reminder-option">
                      <label className="reminder-option-label">{t('timesPerDay')}:</label>
                      <div className="frequency-options">
                      <button
                        className={`freq-btn ${reminderTimesPerDay === 1 ? 'active' : ''}`}
                        onClick={() => handleTimesPerDayChange(1)}
                      >
                        1
                      </button>
                      <button
                        className={`freq-btn ${reminderTimesPerDay === 2 ? 'active' : ''}`}
                        onClick={() => handleTimesPerDayChange(2)}
                      >
                        2
                      </button>
                      <button
                        className={`freq-btn ${reminderTimesPerDay === 3 ? 'active' : ''}`}
                        onClick={() => handleTimesPerDayChange(3)}
                      >
                        3
                      </button>
                      <button
                        className={`freq-btn ${reminderTimesPerDay === 'custom' ? 'active' : ''}`}
                        onClick={() => handleTimesPerDayChange('custom')}
                      >
                        {t('custom')}
                      </button>
                    </div>
                  </div>

                  {reminderTimesPerDay === 'custom' && (
                    <div className="reminder-option">
                      <label className="reminder-option-label">{t('customTimes')}:</label>
                      <input
                        type="number"
                        className="number-input"
                        min="1"
                        max="10"
                        value={customTimesPerDay}
                        onChange={(e) => setCustomTimesPerDay(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      />
                    </div>
                  )}

                  <div className="reminder-option">
                    <label className="reminder-option-label">{t('reminderTimes')}:</label>
                    <div className="reminder-times-list">
                      {reminderTimes.map((time, index) => (
                        <div key={index} className="reminder-time-item">
                          <span className="reminder-time-number">{index + 1}.</span>
                          <input
                            type="time"
                            className="time-input"
                            value={time}
                            onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn-secondary btn-small test-notification-btn"
                    onClick={testNotification}
                  >
                    🧪 {t('testNotification')}
                  </button>
                </div>
                )}
              </>
            )}
          </div>

          <div className="settings-section storage-settings">
            <h3 className="section-title section-title-centered" onClick={() => setCollapsedSettingsSections({...collapsedSettingsSections, storage: !collapsedSettingsSections.storage})}>
              <span>💾 {t('storageSettings')}</span>
              <span className={`collapse-icon ${collapsedSettingsSections.storage ? 'collapsed' : ''}`}>▼</span>
            </h3>
            {!collapsedSettingsSections.storage && (
              <div className="storage-mode-options">
                <div className="storage-mode-notice">
                  {t('storageModeNotice')}
                </div>
                <div className="frequency-options">
                  <button
                    className={`freq-btn ${storageMode === 'cloud' ? 'active' : ''}`}
                    onClick={() => {
                      setStorageMode('cloud');
                      storageService.setStorageMode('cloud');
                      // Trigger refetch
                      checkAuth();
                    }}
                  >
                    {t('cloudStorage')}
                  </button>
                  <button
                    className={`freq-btn ${storageMode === 'local' ? 'active' : ''}`}
                    onClick={() => {
                      setStorageMode('local');
                      storageService.setStorageMode('local');
                      // Trigger refetch
                      checkAuth();
                    }}
                  >
                    {t('localStorage')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
      <div className="bottom-nav">
        {bottomTabs.map((tab, index) => (
          <button
            key={index}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
          >
            <div className="nav-icon">{tab.icon}</div>
            <div className="nav-label">{tab.label}</div>
          </button>
        ))}
      </div>


      {/* Модальное окно создания привычки */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('createHabit')}</h2>
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
                <label htmlFor="habit-name">{t('habitName')}</label>
                <input
                  id="habit-name"
                  type="text"
                  className="form-input"

                  value={newHabitName}

                  onChange={(e) => setNewHabitName(e.target.value)}
                  autoFocus
                />
                <small className="form-hint">{t('habitNamePlaceholder')}</small>
              </div>

              <div className="form-group">
                <label htmlFor="habit-category">{t('category')}</label>

                <div className="category-input-wrapper">
                  <select
                    id="habit-category"
                    className="form-select"
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                  >
                    <option value="">{t('noCategory')}</option>
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
                      placeholder={t('newCategoryPlaceholder')}

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
                      {t('add')}
                    </button>

                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{language === 'ru' ? 'Тип цели' : 'Target Type'}</label>
                <select
                  className="form-input"
                  value={newHabitTargetType}
                  onChange={(e) => setNewHabitTargetType(e.target.value)}
                >
                  <option value="at_least">{language === 'ru' ? 'Не менее (светло-зеленая)' : 'At least (light green)'}</option>
                  <option value="less_or_equal">{language === 'ru' ? 'Не более (зеленая)' : 'Less or equal (green)'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{language === 'ru' ? 'Дата создания' : 'Start Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={newHabitStartDate}
                  onChange={(e) => setNewHabitStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label checkbox-label">
                  <input
                    type="checkbox"
                    checked={newHabitUseTarget}
                    onChange={(e) => setNewHabitUseTarget(e.target.checked)}
                  />
                  {language === 'ru' ? 'Использовать цель' : 'Use target'}
                </label>
              </div>

              {newHabitUseTarget && (
                <>
                  <div className="form-group">
                    <label className="form-label">{language === 'ru' ? 'Зеленая цель (дней в месяц)' : 'Green target (days per month)'}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newHabitCompletionTarget !== '' ? newHabitCompletionTarget : getDaysInCurrentMonth()}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxDays = getDaysInCurrentMonth();
                        if (val === '' || parseInt(val) <= maxDays) {
                          setNewHabitCompletionTarget(val);
                        } else {
                          setNewHabitCompletionTarget(maxDays.toString());
                        }
                      }}
                      min="1"
                      max={getDaysInCurrentMonth()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{language === 'ru' ? 'Фиолетовая цель (количество в месяц)' : 'Purple target (quantity per month)'}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newHabitQuantityTarget}
                      onChange={(e) => setNewHabitQuantityTarget(e.target.value)}
                      placeholder={language === 'ru' ? 'Например: 100 страниц' : 'e.g. 100 pages'}
                      min="1"
                    />
                  </div>
                </>
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {t('create')}
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
              <h2>{t('editHabit')}</h2>
              <button

                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateHabit} className="habit-form">
              <div className="form-group">
                <label htmlFor="edit-habit-name">{t('habitName')}</label>
                <input

                  id="edit-habit-name"
                  type="text"
                  className="form-input"
                  value={editingHabit.name}
                  onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                  autoFocus
                />
                <small className="form-hint">{t('habitNamePlaceholder')}</small>
              </div>

              <div className="form-group">
                <label htmlFor="edit-habit-category">{t('category')}</label>
                <div className="category-input-wrapper">
                  <select

                    id="edit-habit-category"
                    className="form-select"
                    value={editingHabit.category || ''}
                    onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })}
                  >
                    <option value="">{t('noCategory')}</option>
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
                      placeholder={t('newCategoryPlaceholder')}

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
                      {t('add')}
                    </button>

                  </div>
                </div>
              )}

              {createError && (
                <div className="error-message">
                  {createError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{language === 'ru' ? 'Тип цели' : 'Target Type'}</label>
                <select
                  className="form-input"
                  value={editingHabit.target_type || 'at_least'}
                  onChange={(e) => setEditingHabit({ ...editingHabit, target_type: e.target.value })}
                >
                  <option value="at_least">{language === 'ru' ? 'Не менее (светло-зеленая)' : 'At least (light green)'}</option>
                  <option value="less_or_equal">{language === 'ru' ? 'Не более (зеленая)' : 'Less or equal (green)'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{language === 'ru' ? 'Дата создания' : 'Start Date'}</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingHabit.start_date || ''}
                  onChange={(e) => setEditingHabit({ ...editingHabit, start_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingHabit.use_target || false}
                    onChange={(e) => setEditingHabit({ ...editingHabit, use_target: e.target.checked })}
                  />
                  {language === 'ru' ? 'Использовать цель' : 'Use target'}
                </label>
              </div>

              {editingHabit.use_target && (
                <>
                  <div className="form-group">
                    <label className="form-label">{language === 'ru' ? 'Зеленая цель (дней в месяц)' : 'Green target (days per month)'}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingHabit.completion_target !== null && editingHabit.completion_target !== undefined ? editingHabit.completion_target : getDaysInCurrentMonth()}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxDays = getDaysInCurrentMonth();
                        if (val === '' || parseInt(val) <= maxDays) {
                          setEditingHabit({ ...editingHabit, completion_target: val });
                        } else {
                          setEditingHabit({ ...editingHabit, completion_target: maxDays.toString() });
                        }
                      }}
                      min="1"
                      max={getDaysInCurrentMonth()}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{language === 'ru' ? 'Фиолетовая цель (количество в месяц)' : 'Purple target (quantity per month)'}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingHabit.quantity_target || ''}
                      onChange={(e) => setEditingHabit({ ...editingHabit, quantity_target: e.target.value })}
                      placeholder={language === 'ru' ? 'Например: 100 страниц' : 'e.g. 100 pages'}
                      min="1"
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {t('save')}
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
              <h2>{t('editProfile')}</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditProfileModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="habit-form">
              <div className="form-group">
                <label htmlFor="profile-username">{t('username')}</label>
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
                <label htmlFor="profile-photo">{t('profilePhoto')}</label>
                <input
                  id="profile-photo"
                  type="file"
                  className="form-input"
                  accept="image/*"
                  onChange={(e) => setEditProfileData({ ...editProfileData, profile_photo: e.target.files[0] })}
                />
                {user?.profile_photo && (
                  <div className="current-photo">
                    <p>{t('currentPhoto')}:</p>
                    <img src={user.profile_photo} alt="Current profile" style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%'}} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="profile-birthdate">{t('dateOfBirth')}</label>
                <input
                  id="profile-birthdate"
                  type="date"
                  className="form-input"
                  max={new Date().toLocaleDateString('en-CA')}
                  value={editProfileData.date_of_birth}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setEditProfileData({
                      ...editProfileData,
                      date_of_birth: newDate,
                      age: calculateAge(newDate) // Auto-calculate age
                    });
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-age">{t('age')}</label>
                <input
                  id="profile-age"
                  type="text"
                  className="form-input"
                  placeholder={t('agePlaceholder')}
                  value={editProfileData.age}
                  readOnly // Make age read-only since it's calculated
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditProfileModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {t('save')}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно создания категории */}
      {showCreateCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCreateCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('createCategory')}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setCreateError('');
                  setNewCategoryName('');
                  setShowCreateCategoryModal(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="habit-form">
              <div className="form-group">
                <label htmlFor="category-name">{t('categoryName')}</label>
                <input
                  id="category-name"
                  type="text"
                  className="form-input"
                  placeholder={t('newCategoryPlaceholder')}
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  minLength="2"
                  maxLength="20"
                  autoFocus
                />
              </div>

              {createError && <p className="error-message">{createError}</p>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setCreateError('');
                    setNewCategoryName('');
                    setShowCreateCategoryModal(false);
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {t('create')}
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
                <h2>{t('entryDetails')} {quantityModalData.dayDate && ` — ${new Date(quantityModalData.dayDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' })}`}</h2>
                <button

                  className="modal-close"
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityModalData(null);
                    setQuantityValue(null);
                    setCommentValue('');
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
                  <label>{t('quantity')}</label>

                  <div className="quantity-selector-container">
                    <div className="preset-column presets-left">
                      <div className="preset-btn theme-green weekly">
                        <div className="preset-badge">{liveWeeklyTotal}</div>
                        <div className="preset-label">{t('week')}</div>
                      </div>

                      <div className="preset-btn theme-green monthly">
                        <div className="preset-badge">
                          {liveMonthlyTotal}
                        </div>
                        <div className="preset-label">{t('month')}</div>
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

                    {getDefaultModalQuantity(quantityModalData.currentIsRestored) !== null && (
                      <div className="preset-column presets-right">
                        <div className="preset-btn theme-purple weekly">
                          <div className="preset-badge">{liveWeeklyOverflow}</div>
                          <div className="preset-label">{t('week')}</div>
                        </div>

                        <div className="preset-btn theme-purple monthly">
                          <div className="preset-badge">{liveMonthlyOverflow >= 0 ? `+${liveMonthlyOverflow}` : liveMonthlyOverflow}</div>
                          <div className="preset-label">{t('month')}</div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group form-group-flex">
                    <label htmlFor="comment-input">{t('comment')}</label>
                    <textarea
                      id="comment-input"
                      className="form-input"
                      placeholder={t('commentPlaceholder')}
                      value={commentValue}
                      onChange={(e) => setCommentValue(e.target.value)}
                      rows="4"
                      style={{ minHeight: '120px', resize: 'vertical' }}
                    ></textarea>
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
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleEntrySubmit}
                >
                  {t('completed')}
                </button>
                {quantityModalData.dayDate <= new Date().toLocaleDateString('en-CA') && ( // Позволяет помечать сегодня как восполненное через модалку
                  <button
                    type="button"
                    className="btn-primary btn-restored"
                    onClick={handleEntryRestored}
                  >
                    {t('restored')}
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
              <h2 style={{ color: '#059669', borderBottom: '3px solid #059669', paddingBottom: '5px' }}>
                {t('report')}: {reportData.is_general ? t('generalSummary') : reportData.habit.name} [V2]
              </h2>
              <button className="modal-close" onClick={() => setReportData(null)}>×</button>
            </div>

            <div className="report-period-selector-container no-print" style={{ padding: '15px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#166534' }}>{t('period')}:</div>
              <div className="report-period-selector" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {reportData.is_general && (
                  <button 
                    className={`period-btn ${reportPeriod === 'all' ? 'active' : ''}`}
                    onClick={() => changeReportPeriod('all')}
                  >
                    {t('all')}
                  </button>
                )}
                <button 
                  className={`period-btn ${reportPeriod === 'day' ? 'active' : ''}`}
                  onClick={() => changeReportPeriod('day')}
                >
                    {t('days')}
                </button>
                <button 
                  className={`period-btn ${reportPeriod === 'week' ? 'active' : ''}`}
                  onClick={() => changeReportPeriod('week')}
                >
                  {t('weeks')}
                </button>
                <button 
                  className={`period-btn ${reportPeriod === 'month' ? 'active' : ''}`}
                  onClick={() => changeReportPeriod('month')}
                >
                  {t('months')}
                </button>
                <button 
                  className={`period-btn ${reportPeriod === 'year' ? 'active' : ''}`}
                  onClick={() => changeReportPeriod('year')}
                >
                  {t('years')}
                </button>
              </div>
              <div style={{ marginTop: '15px' }}>
                <button className="btn-primary" onClick={() => window.print()}>
                  🖨️ {t('savePdf')}
                </button>
              </div>
            </div>

            <div className="printable-report" style={{ position: 'relative' }}>

              {isReportLoading && (
                <div className="report-loading-overlay" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  zIndex: 20, borderRadius: '8px'
                }}>
                  <div className="loading-spinner"></div>
                </div>
              )}
              <div className="report-header print-only" style={{ display: 'none' }}>
                <h2>{reportData.habit.name} - {t('progressReport')}</h2>
              </div>


              {reportData.period === 'all' ? (
                <div className="summary-report-content">
                  <div className="report-stats" style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <strong>{t('totalCompletions')}</strong>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reportData.total_completions}</div>
                    </div>
                    <div>
                      <strong>{t('totalActions')}</strong>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reportData.total_quantity}</div>
                    </div>
                  </div>


                  <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '10px' }}>{t('habit')}</th>
                        <th style={{ padding: '10px' }}>{t('category')}</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>{t('completed')}</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>{t('summary')}</th>
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
                <div className="summary-report-content">
                  <table className="summary-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '10px' }}>
                          {reportData.period === 'day' ? t('days') :
                           reportData.period === 'week' ? t('weeks') : 
                           reportData.period === 'month' ? t('months') : 
                           reportData.period === 'year' ? t('years') : ''}
                        </th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>{t('completed')}</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>{t('summary')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px' }}>{item.label}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{item.completions}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSelectHabitsModal && (
        <div className="modal-overlay" onClick={() => setShowSelectHabitsModal(false)}>
          <div className="modal-content select-habits-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{language === 'ru' ? 'Выбрать из существующих' : 'Select existing habits'}</h2>
              <button
                className="modal-close"
                onClick={() => setShowSelectHabitsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="select-habits-list">
              {habitsData
                .filter((h, index, self) => 
                  !h.is_archived && 
                  self.findIndex(t => t.id === h.id) === index
                )
                .map(habit => {
                  const isInCurrent = habit.category === selectingForCategoryId;
                  return (
                    <div 
                      key={habit.id} 
                      className={`select-habit-item ${isInCurrent ? 'selected' : ''}`}
                      onClick={() => handleMoveHabitToCategory(habit.id, isInCurrent ? null : selectingForCategoryId)}
                    >
                      <div className="select-habit-info">
                        <div className="select-habit-name">{habit.name}</div>
                        <div className="select-habit-category">
                          {habit.category_name || t('noCategory')}
                        </div>
                      </div>
                      <div className="select-habit-checkbox">
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={() => setShowSelectHabitsModal(false)}
              >
                {t('save')}
              </button>
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
            alt={t('viewPhoto')}
            className="lightbox-img"
            style={{
              transform: `translateY(${lightboxTranslateY}px)`,
              opacity: lightboxTranslateY > 0 ? Math.max(0.4, 1 - lightboxTranslateY / 200) : 1,
              transition: lightboxTranslateY === 0 ? 'transform 0.25s ease, opacity 0.25s ease' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lightbox-hint-text">{t('swipeDownToClose')}</div>        </div>

      )}

    </div>
  );
};

export default App;