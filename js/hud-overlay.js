/**
 * HUD Overlay Module
 * Manages the visual speech bubble overlays and UI elements
 */

const HUDOverlay = (function() {
    let container = null;
    let debugOverlay = null;
    let filters = {
        new: true,
        known: true,
        frequent: true,
        nearby: false
    };
    
    /**
     * Initialize the HUD overlay
     */
    function init() {
        container = document.getElementById('person-cards-container');
        debugOverlay = document.getElementById('debug-overlay');
        
        // Setup filter button listeners
        setupFilterButtons();
        
        console.log('HUD Overlay initialized');
    }
    
    /**
     * Setup filter button click handlers
     */
    function setupFilterButtons() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterType = btn.dataset.filter;
                filters[filterType] = !filters[filterType];
                btn.classList.toggle('active', filters[filterType]);
                
                // Trigger re-render
                renderPersonCards(PersonTracker.getDetectedPersons());
            });
        });
    }
    
    /**
     * Get current filter settings
     * @returns {Object} Filter settings
     */
    function getFilters() {
        return { ...filters };
    }
    
    /**
     * Create a person card element
     * @param {Object} person - Person data
     * @param {boolean} isSelected - Whether person is selected
     * @returns {HTMLElement} Card element
     */
    function createPersonCard(person, isSelected = false) {
        const card = document.createElement('div');
        card.className = `person-card ${person.category}${isSelected ? ' selected' : ''}`;
        card.dataset.trackingId = person.trackingId;
        card.dataset.dbId = person.dbId;
        
        // Position the card
        card.style.left = `${person.position.x}px`;
        card.style.top = `${person.position.y}px`;
        
        // Format time since last seen
        const timeSince = formatTimeSince(person.lastSeen);
        
        card.innerHTML = `
            <div class="name">${escapeHtml(person.name)}</div>
            <div class="stats">
                <div>Last seen: ${timeSince}</div>
                <div>Distance: ${person.distance ? person.distance.toFixed(1) + 'm' : 'Unknown'}</div>
            </div>
            <span class="encounter-badge">${person.encounterCount} encounter${person.encounterCount !== 1 ? 's' : ''}</span>
        `;
        
        return card;
    }
    
    /**
     * Render all person cards
     * @param {Array} persons - Array of detected persons
     */
    function renderPersonCards(persons) {
        if (!container) return;
        
        container.innerHTML = '';
        
        const filteredPersons = persons.filter(person => {
            if (filters.new && person.category === 'new') return true;
            if (filters.known && person.category === 'known') return true;
            if (filters.frequent && person.category === 'frequent') return true;
            if (filters.nearby && person.distance < 8) return true;
            
            // Show if no filters active except nearby
            const hasActiveFilter = filters.new || filters.known || filters.frequent;
            return !hasActiveFilter;
        });
        
        const selectedPerson = PersonTracker.getSelectedPerson();
        
        filteredPersons.forEach(person => {
            const isSelected = selectedPerson && selectedPerson.trackingId === person.trackingId;
            const card = createPersonCard(person, isSelected);
            
            // Add click handler to open details
            card.addEventListener('click', () => {
                openPersonModal(person.dbId);
            });
            
            container.appendChild(card);
        });
        
        // Update debug info
        updateDebugInfo('detection-count', `People Detected: ${persons.length}`);
    }
    
    /**
     * Update a single person card
     * @param {Object} person - Person data
     */
    function updatePersonCard(person) {
        const card = container.querySelector(`[data-tracking-id="${person.trackingId}"]`);
        if (card) {
            card.style.left = `${person.position.x}px`;
            card.style.top = `${person.position.y}px`;
        }
    }
    
    /**
     * Remove a person card
     * @param {string} trackingId - Tracking ID
     */
    function removePersonCard(trackingId) {
        const card = container.querySelector(`[data-tracking-id="${trackingId}"]`);
        if (card) {
            card.remove();
        }
    }
    
    /**
     * Highlight selected person
     * @param {string} trackingId - Tracking ID of selected person
     */
    function setSelectedPerson(trackingId) {
        // Remove selection from all cards
        container.querySelectorAll('.person-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to target card
        if (trackingId) {
            const card = container.querySelector(`[data-tracking-id="${trackingId}"]`);
            if (card) {
                card.classList.add('selected');
            }
        }
    }
    
    /**
     * Update debug overlay information
     * @param {string} field - Field identifier
     * @param {string} value - Value to display
     */
    function updateDebugInfo(field, value) {
        if (!debugOverlay) return;
        
        const element = document.getElementById(`debug-${field}`);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * Show debug error
     * @param {string} message - Error message
     */
    function showDebugError(message) {
        const errorsElement = document.getElementById('debug-errors');
        if (errorsElement) {
            errorsElement.textContent = message;
        }
    }
    
    /**
     * Clear debug errors
     */
    function clearDebugErrors() {
        const errorsElement = document.getElementById('debug-errors');
        if (errorsElement) {
            errorsElement.textContent = '';
        }
    }
    
    /**
     * Show ghost avatar for memory trail replay
     * @param {Object} position - Position data
     */
    function showGhostAvatar(position) {
        const ghost = document.createElement('div');
        ghost.className = 'ghost-avatar';
        ghost.style.left = `${position.x}px`;
        ghost.style.top = `${position.y}px`;
        
        document.body.appendChild(ghost);
        
        // Remove after animation (6 seconds)
        setTimeout(() => {
            ghost.remove();
        }, 6000);
    }
    
    /**
     * Format time since a date
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted time string
     */
    function formatTimeSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Open person detail modal
     * @param {number} dbId - Database ID
     */
    async function openPersonModal(dbId) {
        const person = await MemoryDB.getPerson(dbId);
        if (!person) return;
        
        const modal = document.getElementById('person-modal');
        
        // Populate modal fields
        document.getElementById('modal-name').value = person.name;
        document.getElementById('modal-encounter-count').textContent = person.encounterCount;
        document.getElementById('modal-first-seen').textContent = new Date(person.firstSeen).toLocaleDateString();
        document.getElementById('modal-last-seen').textContent = new Date(person.lastSeen).toLocaleDateString();
        document.getElementById('modal-time-since').textContent = formatTimeSince(person.lastSeen);
        document.getElementById('modal-location').textContent = person.locations.length > 0 ? 
            `${person.locations.length} recorded locations` : 'No location data';
        document.getElementById('modal-notes-input').value = person.notes || '';
        
        // Store current person ID for save/delete actions
        modal.dataset.personId = dbId;
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    /**
     * Close person modal
     */
    function closePersonModal() {
        document.getElementById('person-modal').style.display = 'none';
    }
    
    // Public API
    return {
        init,
        getFilters,
        createPersonCard,
        renderPersonCards,
        updatePersonCard,
        removePersonCard,
        setSelectedPerson,
        updateDebugInfo,
        showDebugError,
        clearDebugErrors,
        showGhostAvatar,
        formatTimeSince,
        openPersonModal,
        closePersonModal
    };
})();
