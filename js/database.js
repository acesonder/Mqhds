/**
 * Database Module - IndexedDB wrapper for local storage
 * Handles all person records and encounter data
 */

const MemoryDB = (function() {
    const DB_NAME = 'MRMemoryAssistant';
    const DB_VERSION = 1;
    const STORE_NAME = 'persons';
    
    let db = null;
    
    /**
     * Initialize the database
     * @returns {Promise} Resolves when database is ready
     */
    async function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database initialized successfully');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                
                // Create persons object store
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for querying
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('encounterCount', 'encounterCount', { unique: false });
                    store.createIndex('lastSeen', 'lastSeen', { unique: false });
                    store.createIndex('firstSeen', 'firstSeen', { unique: false });
                    
                    console.log('Object store created');
                }
            };
        });
    }
    
    /**
     * Add a new person record
     * @param {Object} person - Person data
     * @returns {Promise<number>} The ID of the added record
     */
    async function addPerson(person) {
        await init();
        
        const record = {
            name: person.name || 'Unknown Person',
            encounterCount: 1,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            locations: person.location ? [person.location] : [],
            notes: person.notes || '',
            metadata: person.metadata || {},
            trackingId: person.trackingId || null
        };
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(record);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get a person by ID
     * @param {number} id - Person ID
     * @returns {Promise<Object>} Person record
     */
    async function getPerson(id) {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Update a person record
     * @param {Object} person - Person data with id
     * @returns {Promise}
     */
    async function updatePerson(person) {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(person);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Record a new encounter for an existing person
     * @param {number} id - Person ID
     * @param {Object} location - Optional location data
     * @returns {Promise<Object>} Updated person record
     */
    async function recordEncounter(id, location = null) {
        const person = await getPerson(id);
        
        if (!person) {
            throw new Error('Person not found');
        }
        
        person.encounterCount += 1;
        person.lastSeen = new Date().toISOString();
        
        if (location) {
            person.locations.push(location);
        }
        
        await updatePerson(person);
        return person;
    }
    
    /**
     * Delete a person record
     * @param {number} id - Person ID
     * @returns {Promise}
     */
    async function deletePerson(id) {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get all persons
     * @returns {Promise<Array>} Array of all person records
     */
    async function getAllPersons() {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get persons filtered by encounter category
     * @param {string} category - 'new', 'known', or 'frequent'
     * @returns {Promise<Array>} Filtered array of persons
     */
    async function getPersonsByCategory(category) {
        const allPersons = await getAllPersons();
        
        switch(category) {
            case 'new':
                return allPersons.filter(p => p.encounterCount < 2);
            case 'known':
                return allPersons.filter(p => p.encounterCount >= 3 && p.encounterCount <= 5);
            case 'frequent':
                return allPersons.filter(p => p.encounterCount > 5);
            default:
                return allPersons;
        }
    }
    
    /**
     * Search persons by name
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching persons
     */
    async function searchPersons(query) {
        const allPersons = await getAllPersons();
        const lowerQuery = query.toLowerCase();
        
        return allPersons.filter(p => 
            p.name.toLowerCase().includes(lowerQuery) ||
            (p.notes && p.notes.toLowerCase().includes(lowerQuery))
        );
    }
    
    /**
     * Get sorted persons
     * @param {string} sortBy - 'recent', 'encounters', or 'oldest'
     * @returns {Promise<Array>} Sorted array of persons
     */
    async function getSortedPersons(sortBy) {
        const allPersons = await getAllPersons();
        
        switch(sortBy) {
            case 'recent':
                return allPersons.sort((a, b) => 
                    new Date(b.lastSeen) - new Date(a.lastSeen)
                );
            case 'encounters':
                return allPersons.sort((a, b) => 
                    b.encounterCount - a.encounterCount
                );
            case 'oldest':
                return allPersons.sort((a, b) => 
                    new Date(a.firstSeen) - new Date(b.firstSeen)
                );
            default:
                return allPersons;
        }
    }
    
    /**
     * Get category for a person based on encounter count
     * @param {number} encounterCount - Number of encounters
     * @returns {string} Category: 'new', 'known', or 'frequent'
     */
    function getCategory(encounterCount) {
        if (encounterCount < 2) return 'new';
        if (encounterCount <= 5) return 'known';
        return 'frequent';
    }
    
    /**
     * Clear all data (for testing/reset)
     * @returns {Promise}
     */
    async function clearAll() {
        await init();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    // Public API
    return {
        init,
        addPerson,
        getPerson,
        updatePerson,
        recordEncounter,
        deletePerson,
        getAllPersons,
        getPersonsByCategory,
        searchPersons,
        getSortedPersons,
        getCategory,
        clearAll
    };
})();
