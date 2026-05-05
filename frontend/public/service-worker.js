// Service Worker for habit reminder notifications
const REMINDER_CHECK_INTERVAL = 60000; // Check every minute

let reminderSettings = null;
let lastNotificationDate = null;

// Settings are stored in memory only - localStorage not available in Service Worker
function logSettings() {
  console.log('[Service Worker] Current settings:', reminderSettings);
}

// Check if it's time to send a reminder
function checkReminders() {
  console.log('[Service Worker] checkReminders called', reminderSettings);
  
  if (!reminderSettings || !reminderSettings.enabled) {
    return;
  }

  const now = new Date();
  const today = now.toDateString();
  
  // Reset last notification date if it's a new day
  if (lastNotificationDate !== today) {
    console.log('[Service Worker] New day, resetting counters');
    lastNotificationDate = today;
    reminderSettings.notificationsSentToday = 0;
    reminderSettings.sentReminders = [];
    saveReminderSettings();
  }

  // Get reminder times from settings (new format with array)
  const reminderTimes = reminderSettings.reminderTimes || [];
  console.log('[Service Worker] Reminder times:', reminderTimes);
  
  if (reminderTimes.length === 0) {
    console.log('[Service Worker] No reminder times configured');
    return;
  }

  // Check if we've already sent all scheduled notifications for today
  if (reminderSettings.notificationsSentToday >= reminderTimes.length) {
    console.log('[Service Worker] All notifications sent for today');
    return;
  }
  
  for (const time of reminderTimes) {
    const [hours, minutes] = time.split(':').map(Number);
    const reminderDate = new Date(now);
    reminderDate.setHours(hours, minutes, 0, 0);
    
    // Check if current time matches reminder time (within 1 minute window)
    const timeDiff = Math.abs(now - reminderDate);
    console.log('[Service Worker] Checking time:', time, 'diff:', timeDiff, 'ms');
    
    if (timeDiff < REMINDER_CHECK_INTERVAL && reminderSettings.notificationsSentToday < reminderTimes.length) {
      // Check if we already sent this reminder today
      const reminderKey = `${today}-${time}`;
      console.log('[Service Worker] Reminder key:', reminderKey, 'already sent:', reminderSettings.sentReminders?.includes(reminderKey));
      
      if (!reminderSettings.sentReminders?.includes(reminderKey)) {
        console.log('[Service Worker] Sending notification for:', time);
        sendNotification(time);
        
        // Mark this reminder as sent
        if (!reminderSettings.sentReminders) {
          reminderSettings.sentReminders = [];
        }
        reminderSettings.sentReminders.push(reminderKey);
        reminderSettings.notificationsSentToday++;
        break; // Only send one notification per check
      }
    }
  }
}

// Calculate reminder times based on start time and frequency
function calculateReminderTimes(startTime, timesPerDay) {
  const times = [];
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  
  if (timesPerDay === 1) {
    times.push(startTime);
  } else {
    // Distribute reminders evenly throughout the day
    const totalMinutes = 24 * 60;
    const interval = Math.floor(totalMinutes / timesPerDay);
    
    for (let i = 0; i < timesPerDay; i++) {
      const minutesFromStart = i * interval;
      const totalMinutesFromMidnight = startHours * 60 + startMinutes + minutesFromStart;
      const wrappedMinutes = totalMinutesFromMidnight % totalMinutes;
      const hours = Math.floor(wrappedMinutes / 60);
      const minutes = wrappedMinutes % 60;
      times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    }
  }
  
  return times;
}

// Send notification
function sendNotification(time) {
  const uniqueTag = `habit-reminder-${time}-${Date.now()}`;
  console.log('[Service Worker] Sending notification with tag:', uniqueTag);
  
  self.registration.showNotification('Habbits', {
    body: 'Не забудьте отметить привычки!',
    icon: '/favicon.ico',
    badge: '/favicon-96x96.png',
    tag: uniqueTag,
    requireInteraction: false,
    silent: false
  });
}

// Request settings from clients when SW wakes up
async function requestSettingsFromClients() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    if (clients.length > 0) {
      console.log('[Service Worker] Requesting settings from clients');
      clients.forEach(client => {
        client.postMessage({ type: 'REQUEST_SETTINGS' });
      });
    }
  } catch (e) {
    console.error('[Service Worker] Failed to request settings:', e);
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_REMINDER_SETTINGS') {
    reminderSettings = event.data.settings;
    lastNotificationDate = new Date().toDateString();
  } else if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    sendNotification('test');
  } else if (event.data && event.data.type === 'SETTINGS_RESPONSE') {
    reminderSettings = event.data.settings;
    lastNotificationDate = new Date().toDateString();
    console.log('[Service Worker] Received settings from client:', reminderSettings);
  }
});

// Start checking for reminders
setInterval(checkReminders, REMINDER_CHECK_INTERVAL);

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
  
  // Request settings from clients when activated
  requestSettingsFromClients();
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus or open the app
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle incoming push notifications from server
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Habbits', body: event.data.text() };
    }
  }

  const title = data.title || 'Habbits';
  const options = {
    body: data.body || 'Пора отметить привычки!',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon-96x96.png',
    tag: data.tag || 'habit-reminder',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

