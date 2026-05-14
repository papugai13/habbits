/**
 * Storage Service to handle both Cloud (API) and Local (localStorage) storage modes.
 */

const LOCAL_STORAGE_KEYS = {
  HABITS: 'habbits_local_habits',
  CATEGORIES: 'habbits_local_categories',
  STATUSES: 'habbits_local_statuses',
  STORAGE_MODE: 'habbits_storage_mode'
};

// Helper to generate unique IDs for local items
const generateId = () => Math.random().toString(36).substr(2, 9);

const storageService = {
  getStorageMode: () => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.STORAGE_MODE) || 'cloud';
  },

  setStorageMode: (mode) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STORAGE_MODE, mode);
  },

  // --- HABITS ---

  getHabits: async (mode, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/habits/', options);
      if (!response.ok) throw new Error('Failed to fetch habits');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      const statuses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES) || '[]');
      
      // Basic simulation of the backend response structure
      return habits.filter(h => !h.is_archived).map(h => ({
        ...h,
        statuses: statuses.filter(s => s.habit === h.id)
      }));
    }
  },

  getArchivedHabits: async (mode, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/habits/archived/', options);
      if (!response.ok) throw new Error('Failed to fetch archived habits');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      return habits.filter(h => h.is_archived);
    }
  },

  saveHabit: async (mode, habitData, options = {}) => {
    if (mode === 'cloud') {
      const url = habitData.id ? `/api/v1/habits/${habitData.id}/` : '/api/v1/habits/';
      const method = habitData.id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        ...options,
        method,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(habitData)
      });
      if (!response.ok) throw new Error('Failed to save habit');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      let habit;
      if (habitData.id) {
        const index = habits.findIndex(h => h.id === habitData.id);
        if (index === -1) throw new Error('Habit not found');
        habits[index] = { ...habits[index], ...habitData };
        habit = habits[index];
      } else {
        habit = {
          ...habitData,
          id: generateId(),
          is_archived: false,
          order: habits.length,
          start_date: habitData.start_date || new Date().toISOString().split('T')[0]
        };
        habits.push(habit);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
      return habit;
    }
  },

  deleteHabit: async (mode, id, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/habits/${id}/`, {
        ...options,
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete habit');
      return true;
    } else {
      let habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      habits = habits.filter(h => h.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
      
      let statuses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES) || '[]');
      statuses = statuses.filter(s => s.habit !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.STATUSES, JSON.stringify(statuses));
      return true;
    }
  },

  reorderHabits: async (mode, orderedIds, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/habits/reorder/', {
        ...options,
        method: 'POST',
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ordered_ids: orderedIds })
      });
      if (!response.ok) throw new Error('Failed to reorder habits');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      orderedIds.forEach((id, index) => {
        const habit = habits.find(h => h.id === id);
        if (habit) habit.order = index;
      });
      habits.sort((a, b) => a.order - b.order);
      localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
      return true;
    }
  },

  // --- CATEGORIES ---

  getCategories: async (mode, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/categories/', options);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    } else {
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      return categories.filter(c => !c.is_archived);
    }
  },

  getArchivedCategories: async (mode, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/categories/archived/', options);
      if (!response.ok) throw new Error('Failed to fetch archived categories');
      return response.json();
    } else {
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      return categories.filter(c => c.is_archived);
    }
  },

  saveCategory: async (mode, categoryData, options = {}) => {
    if (mode === 'cloud') {
      const url = categoryData.id ? `/api/v1/categories/${categoryData.id}/` : '/api/v1/categories/';
      const method = categoryData.id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        ...options,
        method,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to save category');
      return response.json();
    } else {
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      let category;
      if (categoryData.id) {
        const index = categories.findIndex(c => c.id === categoryData.id);
        if (index === -1) throw new Error('Category not found');
        categories[index] = { ...categories[index], ...categoryData };
        category = categories[index];
      } else {
        category = {
          ...categoryData,
          id: generateId(),
          is_archived: false,
          order: categories.length
        };
        categories.push(category);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return category;
    }
  },

  deleteCategory: async (mode, id, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/categories/${id}/`, {
        ...options,
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return true;
    } else {
      let categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      categories = categories.filter(c => c.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      
      // Update habits in this category
      let habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      habits.forEach(h => {
        if (h.category === id) h.category = null;
      });
      localStorage.setItem(LOCAL_STORAGE_KEYS.HABITS, JSON.stringify(habits));
      return true;
    }
  },

  archiveCategory: async (mode, id, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/categories/${id}/archive/`, {
        ...options,
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to archive category');
      return response.json();
    } else {
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      const category = categories.find(c => c.id === id);
      if (category) category.is_archived = !category.is_archived;
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return category;
    }
  },

  reorderCategories: async (mode, orderedIds, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/categories/reorder/', {
        ...options,
        method: 'POST',
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ordered_ids: orderedIds })
      });
      if (!response.ok) throw new Error('Failed to reorder categories');
      return response.json();
    } else {
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      orderedIds.forEach((id, index) => {
        const category = categories.find(c => c.id === id);
        if (category) category.order = index;
      });
      categories.sort((a, b) => a.order - b.order);
      localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return true;
    }
  },

  // --- STATUSES ---

  getWeeklyStatus: async (mode, date, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/habits/weekly_status/?date=${date}`, options);
      if (!response.ok) throw new Error('Failed to fetch weekly status');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      const statuses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES) || '[]');
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');
      
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      // Simulation of weekly status endpoint
      return habits.filter(h => !h.is_archived).map(h => {
        const catObj = categories.find(c => c.id === h.category);
        return {
          ...h,
          category_name: catObj ? catObj.name : null,
          statuses: statuses.filter(s => s.habit === h.id && s.date >= startStr && s.date <= endStr)
        };
      });
    }
  },

  saveStatus: async (mode, statusData, options = {}) => {
    if (mode === 'cloud') {
      const response = await fetch('/api/v1/habits/update_status/', {
        ...options,
        method: 'POST',
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusData)
      });
      if (!response.ok) throw new Error('Failed to save status');
      return response.json();
    } else {
      const statuses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES) || '[]');
      const { habit_id, date, is_done, is_restored, quantity, comment } = statusData;
      
      let statusIndex = statuses.findIndex(s => s.habit === habit_id && s.date === date);
      let status;
      
      if (statusIndex !== -1) {
        statuses[statusIndex] = { ...statuses[statusIndex], is_done, is_restored, quantity, comment };
        status = statuses[statusIndex];
      } else {
        status = {
          id: generateId(),
          habit: habit_id,
          date,
          is_done,
          is_restored,
          quantity,
          comment
        };
        statuses.push(status);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.STATUSES, JSON.stringify(statuses));
      return status;
    }
  },

  // --- COMPARISON / CHARTS ---

  getComparison: async (mode, params, options = {}) => {
    const { period, date, category } = params;
    if (mode === 'cloud') {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`/api/v1/habits/habit_comparison/?${query}`, options);
      if (!response.ok) throw new Error('Failed to fetch comparison data');
      return response.json();
    } else {
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      const statuses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.STATUSES) || '[]');
      const categories = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES) || '[]');

      // Filter habits by category if needed
      let filteredHabits = habits.filter(h => !h.is_archived);
      if (category && category !== 'Все') {
        const catObj = categories.find(c => c.name === category);
        if (catObj) {
          filteredHabits = filteredHabits.filter(h => h.category === catObj.id);
        }
      }

      // Simulation of comparison statistics
      const stats = filteredHabits.map(h => {
        let habitStatuses = statuses.filter(s => s.habit === h.id);
        
        // Filter by date/period
        if (period === 'day') {
          habitStatuses = habitStatuses.filter(s => s.date === date);
        } else if (period === 'week') {
          // Simplified: assume date is the Monday of the week
          const start = new Date(date);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          habitStatuses = habitStatuses.filter(s => s.date >= startStr && s.date <= endStr);
        } else if (period === 'month') {
          const month = date.substring(0, 7); // YYYY-MM
          habitStatuses = habitStatuses.filter(s => s.date.startsWith(month));
        } else if (period === 'year') {
          const year = date.substring(0, 4); // YYYY
          habitStatuses = habitStatuses.filter(s => s.date.startsWith(year));
        }

        const completed_days = habitStatuses.filter(s => s.is_done && !s.is_restored).length;
        const restored_days = habitStatuses.filter(s => s.is_restored).length;
        const extra_quantity = habitStatuses.reduce((acc, s) => acc + (s.quantity || 0), 0);
        
        const catObj = categories.find(c => c.id === h.category);
        
        return {
          id: h.id,
          name: h.name,
          category_name: catObj ? catObj.name : 'Без категории',
          completed_days,
          restored_days,
          extra_quantity,
          start_date: h.start_date
        };
      });

      return { habits: stats };
    }
  },

  getReport: async (mode, habitId, params, options = {}) => {
    const { period, date } = params;
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/habits/${habitId}/report/?period=${period}&date=${date}`, options);
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    } else {
      // Local report simulation (simplified)
      const habits = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HABITS) || '[]');
      const habit = habits.find(h => h.id === habitId);
      return {
        habit: habit || { id: habitId, name: 'Habit' },
        period,
        date,
        data: [] // Simple stub for now
      };
    }
  },

  getSummaryReport: async (mode, params, options = {}) => {
    const { period, date } = params;
    if (mode === 'cloud') {
      const response = await fetch(`/api/v1/habits/summary_report/?period=${period}&date=${date}`, options);
      if (!response.ok) throw new Error('Failed to fetch summary report');
      return response.json();
    } else {
      // Local summary report simulation
      return {
        is_general: true,
        period,
        date,
        habits: [] // Simple stub for now
      };
    }
  }
};

export default storageService;
