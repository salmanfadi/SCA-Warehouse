// This script will clear the service worker cache
caches.keys().then(cacheNames => {
  return Promise.all(
    cacheNames.map(cacheName => {
      console.log('Deleting cache:', cacheName);
      return caches.delete(cacheName);
    })
  );
}).then(() => {
  console.log('All caches cleared');
  // Force reload the page to apply changes
  window.location.reload(true);
});
