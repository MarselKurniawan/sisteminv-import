import { initDatabase, dbAPI } from './localDatabase';

// Initialize the database when this module is loaded
let isInitializing = false;
let initPromise: Promise<void> | null = null;

const ensureInitialized = async () => {
  if (initPromise) {
    return initPromise;
  }
  
  if (!isInitializing) {
    isInitializing = true;
    initPromise = initDatabase().catch(error => {
      console.error('Failed to initialize database:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    });
  }
  
  return initPromise;
};

// Create a proxy object that ensures database is initialized before any operation
const createDBProxy = () => {
  return new Proxy(dbAPI, {
    get(target, prop) {
      const originalMethod = target[prop as keyof typeof target];
      
      if (typeof originalMethod === 'function') {
        return async (...args: any[]) => {
          await ensureInitialized();
          return originalMethod.apply(target, args);
        };
      }
      
      return originalMethod;
    }
  });
};

// Export the database instance
export const db = createDBProxy();

// Export initialization function for manual initialization if needed
export { initDatabase, isDatabaseInitialized } from './localDatabase';