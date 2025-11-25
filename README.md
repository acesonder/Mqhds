# MR Memory Assistant

A mixed-reality memory assistant that lets you visually "tag" people you meet in the real world using passthrough AR on the Meta Quest 3 / 3S. Each tag creates a persistent local record — time, place, and metadata — with an in-scene speech-bubble overlay that changes color and message depending on whether the person is new or previously encountered.

## Features

### 🎯 Core Functionality
- **WebXR Passthrough Mode**: Full AR experience with video passthrough enabled on Meta Quest 3/3S. The app requests the `passthrough` WebXR feature to enable real-world visibility while overlaying digital content.
- **Person Detection**: Continuously scans for people around you
- **Local Database**: All data stored locally using IndexedDB (no cloud storage)
- **Privacy-First**: No data shared between users or uploaded anywhere

### 🎨 Visual HUD Overlay
- **Speech Bubble Design**: Colored bubbles appear above detected people
- **Color-Coded System**:
  - 🔵 Blue = New (<2 encounters)
  - 🟠 Amber = Occasional (3-5 encounters)
  - 🔴 Red = Frequent (>5 encounters)
- **Real-Time Stats**: Shows name, last seen time, encounter count, and location
- **Glow Effects**: Visual highlights when selecting people

### 🎮 Interactive Controls
- **X/A Button Navigation**: Hold X or A button to enter selection mode
- **Left/Right Arrows**: Navigate between detected people
- **Visual Feedback**: Selected person glows with pulsing animation

### 📊 Dashboard & History
- **Encounter History**: View all people you've met, sorted by most recent
- **Detailed Stats**: See encounter count, first/last seen dates, time since last meeting
- **Rename Function**: Give custom names to people you meet
- **Add Notes**: Record conversation topics, context, or any information
- **Memory Trail Replay**: Spawns a translucent "ghost" avatar at last known location for 6 seconds

### 🔍 Smart Filtering
- **Show New**: Toggle visibility of people with <2 encounters
- **Show Known**: Toggle people with 3-5 encounters
- **Show Frequent**: Toggle people with >5 encounters
- **Show Nearby**: Filter by proximity (<8m) - currently stubbed for future enhancement

### 🐛 Debug Overlay
- **WebXR Support Status**: Check if device supports WebXR AR
- **Session Lifecycle**: Monitor session start/end states
- **Error Messages**: See any errors directly in headset
- **Detection Count**: Live count of currently detected people

## Installation

### Prerequisites
- Meta Quest 3 or Meta Quest 3S headset
- Web browser with WebXR support (Meta Quest Browser)
- Local web server (for development/testing)

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/acesonder/Mqhds.git
   cd Mqhds
   ```

2. Start a local web server:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js
   npx serve
   ```

3. Open in Meta Quest Browser:
   - Navigate to `http://YOUR_IP:8080`
   - Click "Start AR Session" to begin

### Demo Mode
If WebXR is not available (e.g., on desktop), the app automatically starts in demo mode with simulated person detection.

## Usage

### Starting an AR Session
1. Click "Start AR Session" on the home screen
2. Allow camera/passthrough permissions when prompted
3. Look around to detect people in your environment

### Navigating Between People
1. Hold X (left controller) or A (right controller) button
2. Use thumbstick left/right to navigate between detected people
3. Selected person will glow with a pulsing animation

### Managing Records
1. Click on a person's speech bubble to open their profile
2. Add a custom name by editing the name field
3. Add notes about your conversation or meeting context
4. Click "Save Changes" to update the record

### Viewing History
1. From the home screen, click "View History"
2. Use search to find specific people
3. Sort by most recent, most encounters, or oldest first
4. Click on any entry to view/edit details

## Project Structure

```
Mqhds/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All application styles
├── js/
│   ├── app.js          # Main application entry point
│   ├── database.js     # IndexedDB wrapper for local storage
│   ├── person-tracker.js  # Person detection and tracking
│   ├── hud-overlay.js  # Visual HUD and speech bubbles
│   ├── xr-session.js   # WebXR session management
│   └── dashboard.js    # History and management UI
└── README.md           # This file
```

## Technical Details

### Browser Requirements
- WebXR Device API support
- IndexedDB support
- ES6+ JavaScript support

### Passthrough Mode
The application uses WebXR's `immersive-ar` session mode with the `passthrough` optional feature to enable real-world visibility on Meta Quest devices. When running on Meta Quest 3 or 3S:

1. The app requests an AR session with passthrough capability
2. The headset's cameras provide a live video feed of the real world
3. Digital overlays (speech bubbles, HUD elements) are rendered on top of the passthrough view
4. All app features (person detection, HUD overlay, navigation) work seamlessly in passthrough mode

If passthrough is not available (e.g., on desktop browsers), the app automatically falls back to demo mode with simulated detections.

### Privacy & Data Storage
- All data is stored locally in the browser's IndexedDB
- No data is transmitted to external servers
- Data persists across sessions but can be cleared

## Keyboard Controls (Demo Mode)
- **Space/X/A**: Hold to enter selection mode
- **Arrow Left/Right**: Navigate between detected people
- **Escape**: Exit AR session

## License

MIT License - See LICENSE file for details