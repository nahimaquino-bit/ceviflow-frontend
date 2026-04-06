import { API_URL } from './helpers';

const OFFLINE_QUEUE_KEY = 'ceviflow_pending_sales';

const syncManager = {
  // Add a sale to the local queue
  enqueueSale: (saleData) => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const newEntry = {
      ...saleData,
      id_temp: Date.now(),
      created_at: new Date().toISOString()
    };
    queue.push(newEntry);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return newEntry;
  },

  // Get pending count
  getPendingCount: () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    return queue.length;
  },

  // Try to sync all pending sales
  sync: async () => {
    if (!navigator.onLine) return { success: false, synced: 0 };
    
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return { success: true, synced: 0 };

    let syncedCount = 0;
    const remainingQueue = [];

    for (const sale of queue) {
      try {
        const res = await fetch(`${API_URL}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });

        if (res.ok) {
          syncedCount++;
        } else {
          remainingQueue.push(sale);
        }
      } catch (err) {
        remainingQueue.push(sale);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    return { success: remainingQueue.length === 0, synced: syncedCount };
  }
};

export default syncManager;
