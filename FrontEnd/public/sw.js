self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('Push event with no data');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Study Reminder! ⏱️', body: event.data.text() };
  }

  const title = data.title || 'Study Time! ⏱️';
  const options = {
    body: data.body || "Time to conquer your next task!",
    icon: '/icon-light-32x32.png', 
    badge: '/icon-light-32x32.png',
    data: {
      url: '/features/task-quest'
    },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Focus if tab already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
