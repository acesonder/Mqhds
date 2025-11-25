/**
 * Person Tracker Module
 * Handles detection and tracking of people in the AR scene
 * Note: Actual person detection requires ML models - this is a simulation/stub
 */

const PersonTracker = (function() {
    let detectedPersons = [];
    let selectedIndex = -1;
    let isSelectionMode = false;
    let onPersonDetected = null;
    let onPersonLost = null;
    let onSelectionChanged = null;
    
    // Simulation interval for demo purposes
    let simulationInterval = null;
    
    /**
     * Initialize the person tracker
     * @param {Object} callbacks - Callback functions
     */
    function init(callbacks = {}) {
        onPersonDetected = callbacks.onPersonDetected || null;
        onPersonLost = callbacks.onPersonLost || null;
        onSelectionChanged = callbacks.onSelectionChanged || null;
        
        console.log('PersonTracker initialized');
    }
    
    /**
     * Start detection (simulation mode for demo)
     * In production, this would connect to ML-based person detection
     */
    function startDetection() {
        console.log('Starting person detection...');
        
        // For demo purposes, simulate detecting people
        // In real implementation, this would use TensorFlow.js or similar
        startSimulation();
    }
    
    /**
     * Stop detection
     */
    function stopDetection() {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
        detectedPersons = [];
        selectedIndex = -1;
        isSelectionMode = false;
    }
    
    /**
     * Simulation mode - creates fake detections for testing
     */
    function startSimulation() {
        // Create some initial simulated persons
        const simulatedPositions = [
            { x: -150, y: 100 },
            { x: 100, y: 80 },
            { x: 0, y: 120 }
        ];
        
        simulatedPositions.forEach((pos, i) => {
            setTimeout(() => {
                addDetectedPerson({
                    trackingId: `sim_${Date.now()}_${i}`,
                    position: pos,
                    distance: Math.random() * 10 + 2 // 2-12 meters
                });
            }, i * 1000);
        });
    }
    
    /**
     * Add a newly detected person
     * @param {Object} personData - Detection data
     */
    async function addDetectedPerson(personData) {
        // Check if already tracking this person
        const existing = detectedPersons.find(p => p.trackingId === personData.trackingId);
        if (existing) {
            // Update position
            existing.position = personData.position;
            existing.distance = personData.distance;
            return existing;
        }
        
        // Check database for existing record
        const allPersons = await MemoryDB.getAllPersons();
        let dbRecord = allPersons.find(p => p.trackingId === personData.trackingId);
        
        if (dbRecord) {
            // Record new encounter
            dbRecord = await MemoryDB.recordEncounter(dbRecord.id, {
                time: new Date().toISOString(),
                position: personData.position
            });
        } else {
            // Create new person record
            const newId = await MemoryDB.addPerson({
                trackingId: personData.trackingId,
                location: {
                    time: new Date().toISOString(),
                    position: personData.position
                }
            });
            dbRecord = await MemoryDB.getPerson(newId);
        }
        
        const person = {
            ...personData,
            dbId: dbRecord.id,
            name: dbRecord.name,
            encounterCount: dbRecord.encounterCount,
            firstSeen: dbRecord.firstSeen,
            lastSeen: dbRecord.lastSeen,
            notes: dbRecord.notes,
            category: MemoryDB.getCategory(dbRecord.encounterCount)
        };
        
        detectedPersons.push(person);
        
        if (onPersonDetected) {
            onPersonDetected(person);
        }
        
        return person;
    }
    
    /**
     * Remove a person that is no longer detected
     * @param {string} trackingId - Tracking ID
     */
    function removeDetectedPerson(trackingId) {
        const index = detectedPersons.findIndex(p => p.trackingId === trackingId);
        if (index !== -1) {
            const person = detectedPersons[index];
            detectedPersons.splice(index, 1);
            
            // Adjust selected index if needed
            if (detectedPersons.length === 0) {
                selectedIndex = -1;
            } else if (selectedIndex >= detectedPersons.length) {
                selectedIndex = detectedPersons.length - 1;
            }
            
            if (onPersonLost) {
                onPersonLost(person);
            }
        }
    }
    
    /**
     * Get all currently detected persons
     * @returns {Array} Detected persons
     */
    function getDetectedPersons() {
        return [...detectedPersons];
    }
    
    /**
     * Get filtered persons based on visibility settings
     * @param {Object} filters - Active filters
     * @returns {Array} Filtered persons
     */
    function getFilteredPersons(filters) {
        return detectedPersons.filter(person => {
            if (filters.new && person.category === 'new') return true;
            if (filters.known && person.category === 'known') return true;
            if (filters.frequent && person.category === 'frequent') return true;
            if (filters.nearby && person.distance < 8) return true;
            return false;
        });
    }
    
    /**
     * Enter selection mode (hold X/A button)
     */
    function enterSelectionMode() {
        if (detectedPersons.length === 0) return;
        
        isSelectionMode = true;
        if (selectedIndex < 0) {
            selectedIndex = 0;
        }
        
        if (onSelectionChanged) {
            onSelectionChanged(detectedPersons[selectedIndex], selectedIndex);
        }
    }
    
    /**
     * Exit selection mode
     */
    function exitSelectionMode() {
        isSelectionMode = false;
    }
    
    /**
     * Navigate to next person
     */
    function selectNext() {
        if (!isSelectionMode || detectedPersons.length === 0) return;
        
        selectedIndex = (selectedIndex + 1) % detectedPersons.length;
        
        if (onSelectionChanged) {
            onSelectionChanged(detectedPersons[selectedIndex], selectedIndex);
        }
    }
    
    /**
     * Navigate to previous person
     */
    function selectPrevious() {
        if (!isSelectionMode || detectedPersons.length === 0) return;
        
        selectedIndex = selectedIndex <= 0 ? detectedPersons.length - 1 : selectedIndex - 1;
        
        if (onSelectionChanged) {
            onSelectionChanged(detectedPersons[selectedIndex], selectedIndex);
        }
    }
    
    /**
     * Get currently selected person
     * @returns {Object|null} Selected person or null
     */
    function getSelectedPerson() {
        if (!isSelectionMode || selectedIndex < 0 || selectedIndex >= detectedPersons.length) {
            return null;
        }
        return detectedPersons[selectedIndex];
    }
    
    /**
     * Check if in selection mode
     * @returns {boolean}
     */
    function inSelectionMode() {
        return isSelectionMode;
    }
    
    /**
     * Update person data from database
     * @param {number} dbId - Database ID
     */
    async function refreshPersonData(dbId) {
        const person = detectedPersons.find(p => p.dbId === dbId);
        if (!person) return;
        
        const dbRecord = await MemoryDB.getPerson(dbId);
        if (dbRecord) {
            person.name = dbRecord.name;
            person.encounterCount = dbRecord.encounterCount;
            person.notes = dbRecord.notes;
            person.category = MemoryDB.getCategory(dbRecord.encounterCount);
        }
    }
    
    // Public API
    return {
        init,
        startDetection,
        stopDetection,
        addDetectedPerson,
        removeDetectedPerson,
        getDetectedPersons,
        getFilteredPersons,
        enterSelectionMode,
        exitSelectionMode,
        selectNext,
        selectPrevious,
        getSelectedPerson,
        inSelectionMode,
        refreshPersonData
    };
})();
