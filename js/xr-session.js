/**
 * XR Session Module
 * Manages WebXR session lifecycle for Meta Quest 3/3S
 */

const XRSession = (function() {
    let xrSession = null;
    let xrRefSpace = null;
    let isSupported = false;
    let onSessionStart = null;
    let onSessionEnd = null;
    let onError = null;
    
    // Controller input state
    let leftControllerPressed = false;
    let rightControllerPressed = false;
    
    /**
     * Check WebXR support
     * @returns {Promise<boolean>} Whether WebXR AR is supported
     */
    async function checkSupport() {
        if (!navigator.xr) {
            isSupported = false;
            return false;
        }
        
        try {
            isSupported = await navigator.xr.isSessionSupported('immersive-ar');
            return isSupported;
        } catch (error) {
            console.error('Error checking XR support:', error);
            isSupported = false;
            return false;
        }
    }
    
    /**
     * Initialize the XR session manager
     * @param {Object} callbacks - Callback functions
     */
    async function init(callbacks = {}) {
        onSessionStart = callbacks.onSessionStart || null;
        onSessionEnd = callbacks.onSessionEnd || null;
        onError = callbacks.onError || null;
        
        const supported = await checkSupport();
        
        // Update UI based on support
        const statusElement = document.getElementById('device-status');
        const startButton = document.getElementById('start-ar-btn');
        
        if (supported) {
            if (statusElement) {
                statusElement.textContent = '✓ WebXR AR Supported';
                statusElement.className = 'supported';
            }
            HUDOverlay.updateDebugInfo('webxr-status', 'WebXR: Supported');
            document.getElementById('debug-webxr-status').classList.add('active');
        } else {
            if (statusElement) {
                statusElement.textContent = '✗ WebXR AR Not Supported - Using Demo Mode';
                statusElement.className = 'unsupported';
            }
            if (startButton) {
                startButton.textContent = 'Start Demo Mode';
            }
            HUDOverlay.updateDebugInfo('webxr-status', 'WebXR: Not Supported (Demo Mode)');
            document.getElementById('debug-webxr-status').classList.add('inactive');
        }
        
        console.log('XR Session manager initialized. Supported:', supported);
        return supported;
    }
    
    /**
     * Start an AR session
     * @returns {Promise} Resolves when session starts
     */
    async function startSession() {
        if (!isSupported) {
            // Start in demo mode
            return startDemoMode();
        }
        
        try {
            // Request AR session with passthrough
            xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['hand-tracking', 'hit-test']
            });
            
            // Setup session event handlers
            xrSession.addEventListener('end', handleSessionEnd);
            xrSession.addEventListener('inputsourceschange', handleInputSourcesChange);
            
            // Get reference space
            xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
            
            // Start render loop
            xrSession.requestAnimationFrame(onXRFrame);
            
            HUDOverlay.updateDebugInfo('session-status', 'Session: Active');
            
            if (onSessionStart) {
                onSessionStart(xrSession);
            }
            
            console.log('XR Session started successfully');
            
        } catch (error) {
            console.error('Failed to start XR session:', error);
            HUDOverlay.showDebugError(`Session Error: ${error.message}`);
            
            if (onError) {
                onError(error);
            }
            
            // Fallback to demo mode
            return startDemoMode();
        }
    }
    
    /**
     * Start demo mode (for non-XR devices)
     */
    function startDemoMode() {
        console.log('Starting demo mode...');
        HUDOverlay.updateDebugInfo('session-status', 'Session: Demo Mode');
        
        // Show AR scene
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ar-scene').style.display = 'block';
        
        // Start person tracking simulation
        PersonTracker.startDetection();
        
        // Setup keyboard controls for demo
        setupDemoControls();
        
        if (onSessionStart) {
            onSessionStart(null);
        }
        
        return Promise.resolve();
    }
    
    /**
     * Setup keyboard controls for demo mode
     */
    function setupDemoControls() {
        let selectionHeld = false;
        
        document.addEventListener('keydown', (e) => {
            // Space or X key for selection mode
            if ((e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyA') && !selectionHeld) {
                selectionHeld = true;
                PersonTracker.enterSelectionMode();
                HUDOverlay.setSelectedPerson(
                    PersonTracker.getSelectedPerson()?.trackingId
                );
            }
            
            // Arrow keys for navigation
            if (e.code === 'ArrowRight' && selectionHeld) {
                PersonTracker.selectNext();
                HUDOverlay.setSelectedPerson(
                    PersonTracker.getSelectedPerson()?.trackingId
                );
            }
            if (e.code === 'ArrowLeft' && selectionHeld) {
                PersonTracker.selectPrevious();
                HUDOverlay.setSelectedPerson(
                    PersonTracker.getSelectedPerson()?.trackingId
                );
            }
            
            // Escape to exit
            if (e.code === 'Escape') {
                endSession();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'KeyX' || e.code === 'KeyA') {
                selectionHeld = false;
                PersonTracker.exitSelectionMode();
            }
        });
    }
    
    /**
     * XR animation frame handler
     * @param {number} time - Timestamp
     * @param {XRFrame} frame - XR frame
     */
    function onXRFrame(time, frame) {
        if (!xrSession) return;
        
        // Schedule next frame
        xrSession.requestAnimationFrame(onXRFrame);
        
        // Get pose
        const pose = frame.getViewerPose(xrRefSpace);
        if (!pose) return;
        
        // Process input
        processControllerInput(frame);
        
        // Update detected persons positions based on pose
        // In real implementation, this would update person positions
        // relative to the user's current position
    }
    
    /**
     * Process controller input
     * @param {XRFrame} frame - XR frame
     */
    function processControllerInput(frame) {
        for (const inputSource of xrSession.inputSources) {
            if (!inputSource.gamepad) continue;
            
            const gamepad = inputSource.gamepad;
            const isLeft = inputSource.handedness === 'left';
            
            // Check for X button (left) or A button (right)
            // Button indices: 0=trigger, 1=squeeze, 4=X/A, 5=Y/B (Meta Quest controllers)
            const primaryButton = gamepad.buttons[4] || gamepad.buttons[5] || gamepad.buttons[0];
            
            if (primaryButton && primaryButton.pressed) {
                if (isLeft && !leftControllerPressed) {
                    leftControllerPressed = true;
                    PersonTracker.enterSelectionMode();
                } else if (!isLeft && !rightControllerPressed) {
                    rightControllerPressed = true;
                    PersonTracker.enterSelectionMode();
                }
            } else {
                if (isLeft) {
                    leftControllerPressed = false;
                } else {
                    rightControllerPressed = false;
                }
                
                if (!leftControllerPressed && !rightControllerPressed) {
                    PersonTracker.exitSelectionMode();
                }
            }
            
            // Check thumbstick for navigation
            if (PersonTracker.inSelectionMode()) {
                const thumbstickX = gamepad.axes[2] || 0;
                
                if (thumbstickX > 0.5) {
                    PersonTracker.selectNext();
                    HUDOverlay.setSelectedPerson(
                        PersonTracker.getSelectedPerson()?.trackingId
                    );
                } else if (thumbstickX < -0.5) {
                    PersonTracker.selectPrevious();
                    HUDOverlay.setSelectedPerson(
                        PersonTracker.getSelectedPerson()?.trackingId
                    );
                }
            }
        }
    }
    
    /**
     * Handle input source changes
     * @param {XRInputSourcesChangeEvent} event - Event
     */
    function handleInputSourcesChange(event) {
        console.log('Input sources changed:', event.added.length, 'added,', event.removed.length, 'removed');
    }
    
    /**
     * Handle session end
     */
    function handleSessionEnd() {
        console.log('XR Session ended');
        xrSession = null;
        xrRefSpace = null;
        
        HUDOverlay.updateDebugInfo('session-status', 'Session: Ended');
        
        // Stop person tracking
        PersonTracker.stopDetection();
        
        // Show start screen
        document.getElementById('ar-scene').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        
        if (onSessionEnd) {
            onSessionEnd();
        }
    }
    
    /**
     * End the current session
     */
    async function endSession() {
        if (xrSession) {
            await xrSession.end();
        } else {
            // Demo mode - just trigger end handler
            handleSessionEnd();
        }
    }
    
    /**
     * Check if session is active
     * @returns {boolean}
     */
    function isActive() {
        return xrSession !== null;
    }
    
    /**
     * Check if WebXR is supported
     * @returns {boolean}
     */
    function isXRSupported() {
        return isSupported;
    }
    
    // Public API
    return {
        init,
        checkSupport,
        startSession,
        endSession,
        isActive,
        isXRSupported
    };
})();
