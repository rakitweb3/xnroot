/**
 * Offline Storage Wrapper for XnRoot Application
 * 
 * This module provides offline localStorage functionality while maintaining
 * compatibility with the original dataSdk API structure.
 * 
 * Features:
 * - Automatic localStorage synchronization
 * - Mimics dataSdk API for easy switching between online/offline modes
 * - Data persistence across sessions
 * - Support for CRUD operations (Create, Read, Update, Delete)
 */

(function () {
  'use strict';



  // Storage keys
  const STORAGE_KEYS = {
    PLAYERS: 'xnroot_players',
    CURRENT_PLAYER: 'xnroot_current_player',
    SETTINGS: 'xnroot_settings'
  };

  /**
   * Result class compatible with dataSdk
   */
  class OfflineResult {
    constructor(success, data, error) {
      this._success = success;
      this._data = data;
      this._error = error;
    }

    static ok(data) {
      return new OfflineResult(true, data, undefined);
    }

    static error(error) {
      return new OfflineResult(false, undefined, error);
    }

    get isOk() {
      return this._success;
    }

    get isError() {
      return !this._success;
    }

    get data() {
      if (!this._success) {
        throw new Error("Cannot access data on error result");
      }
      return this._data;
    }

    get error() {
      if (this._success) {
        throw new Error("Cannot access error on success result");
      }
      return this._error;
    }
  }

  /**
   * Offline Storage Service
   * Mimics the behavior of the online dataSdk
   */
  class OfflineStorageService {
    constructor() {
      this.dataHandler = null;
      this.initialized = false;
      this.pollingInterval = null;

      // Initialize storage if not exists
      this._initializeStorage();
    }

    /**
     * Initialize localStorage structure
     */
    _initializeStorage() {
      if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([]));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({}));
      }
    }

    /**
     * Generate unique ID for records
     */
    _generateId() {
      return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all players from localStorage
     */
    _getAllPlayers() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return [];
      }
    }

    /**
     * Save all players to localStorage
     */
    _saveAllPlayers(players) {
      try {
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
        return true;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        return false;
      }
    }

    /**
     * Initialize the offline storage (mimics dataSdk.init)
     */
    async init(handler) {
      try {
        this.dataHandler = handler;
        this.initialized = true;

        // Load initial data
        const players = this._getAllPlayers();

        // Notify handler of initial data
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(players);
        }

        // Silent success
        return OfflineResult.ok(undefined);
      } catch (error) {
        console.error('[Offline Storage] Initialization failed:', error);
        return OfflineResult.error(error);
      }
    }

    /**
     * Create a new record (mimics dataSdk.create)
     */
    async create(record) {
      try {
        if (!this.initialized) {
          throw new Error('Storage not initialized. Call init() first.');
        }

        const players = this._getAllPlayers();

        // Add __backendId to mimic online behavior
        const newRecord = {
          ...record,
          __backendId: this._generateId()
        };

        players.push(newRecord);

        if (!this._saveAllPlayers(players)) {
          throw new Error('Failed to save to localStorage');
        }

        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(players);
        }

        // Silent success - only log in debug mode
        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] Created record:', newRecord.__backendId);
        }
        return OfflineResult.ok(undefined);
      } catch (error) {
        console.error('[Offline Storage] Create failed:', error);
        return OfflineResult.error(error);
      }
    }

    /**
     * Update an existing record (mimics dataSdk.update)
     */
    async update(record) {
      try {
        if (!this.initialized) {
          throw new Error('Storage not initialized. Call init() first.');
        }

        if (!record.__backendId) {
          throw new Error('Record must have __backendId to update');
        }

        const players = this._getAllPlayers();
        const index = players.findIndex(p => p.__backendId === record.__backendId);

        if (index === -1) {
          throw new Error('Record not found');
        }

        players[index] = { ...record };

        if (!this._saveAllPlayers(players)) {
          throw new Error('Failed to save to localStorage');
        }

        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(players);
        }

        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] Updated record:', record.__backendId);
        }
        return OfflineResult.ok(undefined);
      } catch (error) {
        console.error('[Offline Storage] Update failed:', error);
        return OfflineResult.error(error);
      }
    }

    /**
     * Delete a record (mimics dataSdk.delete)
     */
    async delete(record) {
      try {
        if (!this.initialized) {
          throw new Error('Storage not initialized. Call init() first.');
        }

        if (!record.__backendId) {
          throw new Error('Record must have __backendId to delete');
        }

        const players = this._getAllPlayers();
        const filteredPlayers = players.filter(p => p.__backendId !== record.__backendId);

        if (players.length === filteredPlayers.length) {
          throw new Error('Record not found');
        }

        if (!this._saveAllPlayers(filteredPlayers)) {
          throw new Error('Failed to save to localStorage');
        }

        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(filteredPlayers);
        }

        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] Deleted record:', record.__backendId);
        }
        return OfflineResult.ok(undefined);
      } catch (error) {
        console.error('[Offline Storage] Delete failed:', error);
        return OfflineResult.error(error);
      }
    }

    /**
     * Read all records (mimics dataSdk.read)
     */
    async read() {
      try {
        if (!this.initialized) {
          throw new Error('Storage not initialized. Call init() first.');
        }

        const players = this._getAllPlayers();

        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] Read records:', players.length);
        }
        return OfflineResult.ok(players);
      } catch (error) {
        console.error('[Offline Storage] Read failed:', error);
        return OfflineResult.error(error);
      }
    }

    /**
     * Clear all data (utility function)
     */
    clearAll() {
      try {
        localStorage.removeItem(STORAGE_KEYS.PLAYERS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYER);
        this._initializeStorage();

        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged([]);
        }

        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] All data cleared');
        }
        return true;
      } catch (error) {
        console.error('[Offline Storage] Clear failed:', error);
        return false;
      }
    }

    /**
     * Export data for backup
     */
    exportData() {
      try {
        const data = {
          players: this._getAllPlayers(),
          settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
          exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
      } catch (error) {
        console.error('[Offline Storage] Export failed:', error);
        return null;
      }
    }

    /**
     * Import data from backup
     */
    importData(jsonString) {
      try {
        const data = JSON.parse(jsonString);

        if (data.players) {
          localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(data.players));
        }

        if (data.settings) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        }

        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(data.players || []);
        }

        if (window.DEBUG_MODE) {
          console.log('[Offline Storage] Data imported successfully');
        }
        return true;
      } catch (error) {
        console.error('[Offline Storage] Import failed:', error);
        return false;
      }
    }

    /**
     * Get storage statistics
     */
    getStats() {
      const players = this._getAllPlayers();
      return {
        totalPlayers: players.length,
        storageUsed: new Blob([JSON.stringify(players)]).size,
        isOnline: false,
        mode: 'offline'
      };
    }
  }

  /**
   * Storage Mode Manager
   * Allows switching between online (dataSdk) and offline storage
   */
  class StorageModeManager {
    constructor() {
      this.mode = 'auto'; // 'auto', 'online', 'offline'
      this.offlineService = new OfflineStorageService();
      this.onlineAvailable = false;
    }

    /**
     * Get the active storage service
     */
    getActiveService() {
      // Check if online SDK is available and mode allows it
      if (this.mode === 'online' && window.dataSdk) {
        return window.dataSdk;
      }

      // Check auto mode
      if (this.mode === 'auto' && window.dataSdk && this.onlineAvailable) {
        return window.dataSdk;
      }

      // Default to offline
      return this.offlineService;
    }

    /**
     * Set storage mode
     */
    setMode(mode) {
      if (['auto', 'online', 'offline'].includes(mode)) {
        this.mode = mode;
        if (window.DEBUG_MODE) {
          console.log(`[Storage Manager] Mode set to: ${mode}`);
        }
        return true;
      }
      return false;
    }

    /**
     * Check if online service is available
     */
    async checkOnlineAvailability() {
      try {
        if (window.dataSdk) {
          // Simple availability check
          this.onlineAvailable = true;
          return true;
        }
        this.onlineAvailable = false;
        return false;
      } catch (error) {
        this.onlineAvailable = false;
        return false;
      }
    }

    /**
     * Get current mode info
     */
    getInfo() {
      const service = this.getActiveService();
      return {
        mode: this.mode,
        activeService: service === window.dataSdk ? 'online' : 'offline',
        onlineAvailable: this.onlineAvailable,
        stats: this.offlineService.getStats()
      };
    }
  }

  // Create and expose global instances
  window.offlineStorage = new OfflineStorageService();
  window.storageModeManager = new StorageModeManager();

  // Utility function to get active storage
  window.getActiveStorage = function () {
    return window.storageModeManager.getActiveService();
  };

  // Silent load - only log if there's an actual issue
  if (typeof console !== 'undefined' && console.info) {
    console.info('[Offline Storage] Ready ✓');
  }
})();
