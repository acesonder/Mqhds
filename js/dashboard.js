/**
 * Dashboard Module
 * Manages the history view and person management UI
 */

const Dashboard = (function() {
    let currentSort = 'recent';
    let searchQuery = '';
    
    /**
     * Initialize the dashboard
     */
    function init() {
        setupEventListeners();
        console.log('Dashboard initialized');
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                refreshHistoryList();
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                refreshHistoryList();
            });
        }
        
        // Modal close button
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                HUDOverlay.closePersonModal();
            });
        }
        
        // Modal save button
        const saveBtn = document.getElementById('modal-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', savePersonChanges);
        }
        
        // Modal replay button
        const replayBtn = document.getElementById('modal-replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', triggerMemoryReplay);
        }
        
        // Modal delete button
        const deleteBtn = document.getElementById('modal-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deletePersonRecord);
        }
        
        // Close modal on background click
        const modal = document.getElementById('person-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    HUDOverlay.closePersonModal();
                }
            });
        }
    }
    
    /**
     * Show the history dashboard
     */
    async function show() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ar-scene').style.display = 'none';
        document.getElementById('history-dashboard').style.display = 'block';
        
        await refreshHistoryList();
    }
    
    /**
     * Hide the dashboard
     */
    function hide() {
        document.getElementById('history-dashboard').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    }
    
    /**
     * Refresh the history list
     */
    async function refreshHistoryList() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        let persons;
        
        if (searchQuery) {
            persons = await MemoryDB.searchPersons(searchQuery);
        } else {
            persons = await MemoryDB.getSortedPersons(currentSort);
        }
        
        if (persons.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <p>No encounters recorded yet</p>
                    <p>Start an AR session to begin tracking people you meet</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = persons.map(person => createHistoryItem(person)).join('');
        
        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const dbId = parseInt(item.dataset.dbId);
                HUDOverlay.openPersonModal(dbId);
            });
        });
    }
    
    /**
     * Create a history item HTML
     * @param {Object} person - Person data
     * @returns {string} HTML string
     */
    function createHistoryItem(person) {
        const category = MemoryDB.getCategory(person.encounterCount);
        const timeSince = HUDOverlay.formatTimeSince(person.lastSeen);
        
        const categoryLabels = {
            'new': 'New',
            'known': 'Known',
            'frequent': 'Frequent'
        };
        
        return `
            <div class="history-item ${category}" data-db-id="${person.id}">
                <div class="item-header">
                    <span class="item-name">${escapeHtml(person.name)}</span>
                    <span class="item-badge">${categoryLabels[category]}</span>
                </div>
                <div class="item-stats">
                    <div>👀 ${person.encounterCount} encounter${person.encounterCount !== 1 ? 's' : ''}</div>
                    <div>🕐 Last seen: ${timeSince}</div>
                    <div>📅 First met: ${new Date(person.firstSeen).toLocaleDateString()}</div>
                    ${person.notes ? `<div>📝 ${escapeHtml(person.notes.substring(0, 50))}${person.notes.length > 50 ? '...' : ''}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Save changes from the modal
     */
    async function savePersonChanges() {
        const modal = document.getElementById('person-modal');
        const personId = parseInt(modal.dataset.personId);
        
        const person = await MemoryDB.getPerson(personId);
        if (!person) return;
        
        // Update person data
        person.name = document.getElementById('modal-name').value || 'Unknown Person';
        person.notes = document.getElementById('modal-notes-input').value;
        
        await MemoryDB.updatePerson(person);
        
        // Refresh UI
        await PersonTracker.refreshPersonData(personId);
        HUDOverlay.renderPersonCards(PersonTracker.getDetectedPersons());
        await refreshHistoryList();
        
        // Show save confirmation
        const saveBtn = document.getElementById('modal-save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'var(--color-accent)';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 1500);
    }
    
    /**
     * Trigger memory trail replay
     */
    async function triggerMemoryReplay() {
        const modal = document.getElementById('person-modal');
        const personId = parseInt(modal.dataset.personId);
        
        const person = await MemoryDB.getPerson(personId);
        if (!person || person.locations.length === 0) {
            alert('No location data available for replay');
            return;
        }
        
        // Get last known location
        const lastLocation = person.locations[person.locations.length - 1];
        
        // Close modal
        HUDOverlay.closePersonModal();
        
        // Show ghost avatar at last location
        // In a real XR session, this would use 3D positioning
        const position = lastLocation.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        HUDOverlay.showGhostAvatar(position);
    }
    
    /**
     * Delete a person record
     */
    async function deletePersonRecord() {
        const modal = document.getElementById('person-modal');
        const personId = parseInt(modal.dataset.personId);
        
        if (!confirm('Are you sure you want to delete this record? This cannot be undone.')) {
            return;
        }
        
        await MemoryDB.deletePerson(personId);
        
        // Close modal and refresh
        HUDOverlay.closePersonModal();
        await refreshHistoryList();
        HUDOverlay.renderPersonCards(PersonTracker.getDetectedPersons());
    }
    
    /**
     * Escape HTML for display
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    return {
        init,
        show,
        hide,
        refreshHistoryList
    };
})();
