/**
 * Main Application Entry Point
 * MR Memory Assistant - Mixed Reality Person Tracking for Meta Quest 3/3S
 */

(function() {
    'use strict';
    
    /**
     * Initialize the application
     */
    async function init() {
        console.log('Initializing MR Memory Assistant...');
        
        try {
            // Initialize database
            await MemoryDB.init();
            console.log('Database ready');
            
            // Initialize HUD overlay
            HUDOverlay.init();
            
            // Initialize person tracker
            PersonTracker.init({
                onPersonDetected: handlePersonDetected,
                onPersonLost: handlePersonLost,
                onSelectionChanged: handleSelectionChanged
            });
            
            // Initialize XR session manager
            await XRSession.init({
                onSessionStart: handleSessionStart,
                onSessionEnd: handleSessionEnd,
                onError: handleSessionError
            });
            
            // Initialize dashboard
            Dashboard.init();
            
            // Setup UI event handlers
            setupEventHandlers();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            HUDOverlay.showDebugError(`Init Error: ${error.message}`);
        }
    }
    
    /**
     * Setup UI event handlers
     */
    function setupEventHandlers() {
        // Start AR button
        const startARBtn = document.getElementById('start-ar-btn');
        if (startARBtn) {
            startARBtn.addEventListener('click', async () => {
                await XRSession.startSession();
            });
        }
        
        // View history button
        const viewHistoryBtn = document.getElementById('view-history-btn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                Dashboard.show();
            });
        }
        
        // Back to start button
        const backToStartBtn = document.getElementById('back-to-start-btn');
        if (backToStartBtn) {
            backToStartBtn.addEventListener('click', () => {
                Dashboard.hide();
            });
        }
        
        // Exit AR button
        const exitARBtn = document.getElementById('exit-ar-btn');
        if (exitARBtn) {
            exitARBtn.addEventListener('click', async () => {
                await XRSession.endSession();
            });
        }
    }
    
    /**
     * Handle new person detected
     * @param {Object} person - Person data
     */
    function handlePersonDetected(person) {
        console.log('Person detected:', person.name, '- Encounters:', person.encounterCount);
        HUDOverlay.renderPersonCards(PersonTracker.getDetectedPersons());
    }
    
    /**
     * Handle person lost from view
     * @param {Object} person - Person data
     */
    function handlePersonLost(person) {
        console.log('Person lost:', person.name);
        HUDOverlay.removePersonCard(person.trackingId);
    }
    
    /**
     * Handle selection changed
     * @param {Object} person - Selected person
     * @param {number} index - Selection index
     */
    function handleSelectionChanged(person, index) {
        console.log('Selection changed:', person?.name, 'at index', index);
        if (person) {
            HUDOverlay.setSelectedPerson(person.trackingId);
        }
    }
    
    /**
     * Handle XR session start
     * @param {XRSession} session - XR session or null for demo mode
     */
    function handleSessionStart(session) {
        console.log('Session started:', session ? 'XR Mode' : 'Demo Mode');
        
        // Show AR scene
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ar-scene').style.display = 'block';
    }
    
    /**
     * Handle XR session end
     */
    function handleSessionEnd() {
        console.log('Session ended');
    }
    
    /**
     * Handle XR session error
     * @param {Error} error - Error object
     */
    function handleSessionError(error) {
        console.error('Session error:', error);
        alert(`Failed to start AR session: ${error.message}\n\nStarting demo mode instead.`);
    }
    
    // Start the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
