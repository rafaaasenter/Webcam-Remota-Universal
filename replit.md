# Webcam Remota Universal

## Overview

This is a comprehensive native application system that transforms Android devices into professional webcams for Windows computers. The system consists of two native applications: an Android app (.apk) built with Kotlin that captures and transmits video/audio from the device's camera and microphone, and a Windows program (.exe) built with Python/PyQt5 that receives and displays the stream. Both applications are completely in Portuguese and communicate via Wi-Fi or USB connection.

The system enables high-quality real-time streaming with advanced features including security encryption, multi-device support, session recording/playback, remote camera controls, quality adjustments, and professional streaming capabilities. It's designed to work seamlessly across local networks without requiring external tools or web browsers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Android Application Architecture
- **Native Android App (.apk)**: Built with Kotlin using modern Android development practices
- **Camera2 API Integration**: Advanced camera control with support for multiple cameras, flash, focus, and zoom
- **Material Design UI**: Professional interface in Portuguese with intuitive controls
- **WebRTC Implementation**: Real-time peer-to-peer video streaming with adaptive quality
- **Background Service**: Foreground service to maintain streaming when app is minimized
- **Device Discovery**: UDP broadcast mechanism for automatic PC detection on local networks

### Windows Application Architecture  
- **Native Desktop Program (.exe)**: Built with Python and PyQt5 for professional Windows interface
- **Multi-threaded Design**: Separate threads for UI, network communication, and media processing
- **Advanced Video Player**: Custom widget with zoom, recording, and quality monitoring
- **Connection Manager**: Handles both Wi-Fi and USB connection modes with automatic fallback
- **System Tray Integration**: Minimizes to system tray for background operation
- **Media Recording**: Built-in video recording with multiple format support

### Communication Architecture
- **Direct P2P Connection**: No web browser required - native socket communication
- **Dual Connection Modes**: Wi-Fi (primary) and USB (fallback) connection options
- **Custom Protocol**: Proprietary communication protocol optimized for low latency
- **Security Layer**: Connection encryption and device authentication

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