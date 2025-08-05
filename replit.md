# Webcam Remota Universal

## Overview

This is a real-time webcam streaming system that allows Android devices to function as professional webcams for desktop computers. The system consists of a web-based application with separate interfaces for mobile devices (acting as webcam sources) and desktop computers (acting as video receivers). It uses WebRTC for peer-to-peer video streaming and Socket.IO for real-time communication and device discovery over local networks.

The application enables high-quality video streaming with features like camera switching, flash control, zoom functionality, video recording, and quality adjustments. It's designed to work seamlessly across Wi-Fi networks without requiring external tools or third-party applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Multi-page Web Application**: Three distinct HTML pages serving different purposes:
  - `index.html`: Device selection landing page
  - `mobile.html`: Android webcam interface with camera controls
  - `desktop.html`: PC receiver interface with video display and controls
- **Responsive Design**: CSS-based styling with mobile-first approach and desktop adaptations
- **Client-side JavaScript**: Modular architecture with separate scripts for mobile (`mobile-app.js`), desktop (`desktop-app.js`), and shared WebRTC utilities (`webrtc-utils.js`)

### Backend Architecture
- **Express.js Server**: Lightweight HTTP server serving static files and handling routing
- **Socket.IO Integration**: Real-time bidirectional communication for device discovery and connection management
- **Device Management System**: In-memory storage using JavaScript Map to track connected devices and their states

### Real-time Communication
- **WebRTC Implementation**: Peer-to-peer video streaming with STUN servers for NAT traversal
- **Socket.IO Events**: Custom event system for device registration, discovery, and connection establishment
- **Device Discovery Protocol**: Broadcast-based mechanism for automatic device detection on local networks

### Media Handling
- **Camera API Integration**: Uses modern web APIs (getUserMedia) for camera and microphone access
- **Video Streaming**: Real-time video capture and transmission with configurable quality settings
- **Audio Processing**: Synchronized audio capture with echo cancellation and noise suppression
- **Media Constraints**: Flexible resolution and frame rate configuration (up to 1280x720 at 30fps)

### Connection Management
- **Multi-device Support**: Ability to handle multiple mobile devices and desktop receivers simultaneously
- **Connection States**: Comprehensive status tracking (available, connected, streaming, disconnected)
- **Auto-discovery**: UDP broadcast-based device discovery within local network
- **Manual Connection**: Fallback option for direct IP/port connection entry

### Security Considerations
- **CORS Configuration**: Configured to allow cross-origin requests for development
- **Local Network Only**: System designed to operate within trusted local network environments
- **No Authentication**: Current implementation focuses on simplicity over security (suitable for local use)

## External Dependencies

### Runtime Dependencies
- **Express.js (^5.1.0)**: Web server framework for serving static files and handling HTTP requests
- **Socket.IO (^4.8.1)**: Real-time communication library for WebSocket-based messaging between devices

### Client-side Libraries
- **Font Awesome (6.0.0)**: Icon library loaded via CDN for user interface elements

### Web APIs
- **WebRTC**: Browser-native peer-to-peer communication for video streaming
- **MediaDevices API**: For camera and microphone access
- **Canvas API**: For video overlay and visual effects rendering

### Network Protocols
- **WebSocket**: For real-time bidirectional communication via Socket.IO
- **UDP**: For device discovery broadcasts on local network
- **TCP**: For reliable data transmission in WebRTC connections
- **STUN Protocol**: Uses Google's public STUN servers for NAT traversal

### Browser Compatibility
- **Modern Web Browsers**: Requires support for ES6+, WebRTC, and modern media APIs
- **Mobile Browsers**: Optimized for Android Chrome and similar WebRTC-capable browsers
- **Desktop Browsers**: Compatible with Chrome, Firefox, and Edge