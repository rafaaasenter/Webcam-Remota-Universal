// Aplicativo móvel - Webcam Android
class MobileWebcamApp {
    constructor() {
        this.socket = null;
        this.webrtc = new WebRTCUtils();
        this.isConnected = false;
        this.isStreaming = false;
        this.currentCamera = 'user'; // 'user' para frontal, 'environment' para traseira
        this.flashEnabled = false;
        this.deviceName = this.generateDeviceName();
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSocket();
        this.requestPermissions();
    }

    generateDeviceName() {
        const userAgent = navigator.userAgent;
        let deviceName = 'Android Device';
        
        if (userAgent.includes('Android')) {
            const match = userAgent.match(/Android\s([0-9\.]*)/);
            if (match) {
                deviceName = `Android ${match[1]}`;
            }
        }
        
        return deviceName + ' - ' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    initializeElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            localVideo: document.getElementById('localVideo'),
            overlayCanvas: document.getElementById('overlayCanvas'),
            focusIndicator: document.getElementById('focusIndicator'),
            
            // Controles da câmera
            flashToggle: document.getElementById('flashToggle'),
            cameraSwitch: document.getElementById('cameraSwitch'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Controles de conexão
            discoverBtn: document.getElementById('discoverBtn'),
            devicesList: document.getElementById('devicesList'),
            manualConnection: document.getElementById('manualConnection'),
            ipInput: document.getElementById('ipInput'),
            portInput: document.getElementById('portInput'),
            connectManualBtn: document.getElementById('connectManualBtn'),
            
            // Controles de streaming
            controlPanel: document.getElementById('controlPanel'),
            streamingControls: document.getElementById('streamingControls'),
            startStreamBtn: document.getElementById('startStreamBtn'),
            stopStreamBtn: document.getElementById('stopStreamBtn'),
            
            // Configurações
            settingsPanel: document.getElementById('settingsPanel'),
            resolutionSelect: document.getElementById('resolutionSelect'),
            fpsSelect: document.getElementById('fpsSelect'),
            qualitySlider: document.getElementById('qualitySlider'),
            qualityValue: document.getElementById('qualityValue'),
            audioEnabled: document.getElementById('audioEnabled'),
            audioGain: document.getElementById('audioGain'),
            audioGainValue: document.getElementById('audioGainValue'),
            closeSettings: document.getElementById('closeSettings'),
            
            // Notificação
            notificationBar: document.getElementById('notificationBar'),
            notificationStop: document.getElementById('notificationStop')
        };
    }

    setupEventListeners() {
        // Controles da câmera
        this.elements.flashToggle.addEventListener('click', () => this.toggleFlash());
        this.elements.cameraSwitch.addEventListener('click', () => this.switchCamera());
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        
        // Controles de conexão
        this.elements.discoverBtn.addEventListener('click', () => this.discoverDevices());
        this.elements.connectManualBtn.addEventListener('click', () => this.connectManually());
        
        // Controles de streaming
        this.elements.startStreamBtn.addEventListener('click', () => this.startStreaming());
        this.elements.stopStreamBtn.addEventListener('click', () => this.stopStreaming());
        
        // Configurações
        this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
        this.elements.qualitySlider.addEventListener('input', (e) => {
            this.elements.qualityValue.textContent = Math.round(e.target.value * 100) + '%';
        });
        this.elements.audioGain.addEventListener('input', (e) => {
            this.elements.audioGainValue.textContent = Math.round(e.target.value * 100) + '%';
        });
        
        // Notificação
        this.elements.notificationStop.addEventListener('click', () => this.stopStreaming());
        
        // Foco ao tocar na tela
        this.elements.localVideo.addEventListener('click', (e) => this.handleVideoTap(e));
        
        // Evitar sleep da tela
        this.keepScreenActive();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.socket.emit('register-mobile', { name: this.deviceName });
        });
        
        this.socket.on('devices-discovered', (devices) => {
            this.displayDiscoveredDevices(devices);
        });
        
        this.socket.on('connection-established', (data) => {
            this.handleConnectionEstablished(data.peerId);
        });
        
        this.socket.on('connection-rejected', () => {
            this.updateStatus('Conexão rejeitada pelo PC', 'error');
        });
        
        this.socket.on('webrtc-offer', (data) => {
            this.webrtc.handleOffer(data.offer, this.socket);
        });
        
        this.socket.on('webrtc-answer', (data) => {
            this.webrtc.handleAnswer(data.answer);
        });
        
        this.socket.on('webrtc-ice-candidate', (data) => {
            this.webrtc.handleIceCandidate(data.candidate);
        });
        
        this.socket.on('camera-control', (data) => {
            this.handleRemoteCameraControl(data);
        });
        
        this.socket.on('peer-disconnected', () => {
            this.handleDisconnection();
        });
    }

    async requestPermissions() {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            await this.initializeCamera();
            console.log('Permissões concedidas');
        } catch (error) {
            console.error('Erro ao solicitar permissões:', error);
            this.updateStatus('Permissões de câmera/microfone negadas', 'error');
        }
    }

    async initializeCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            await this.webrtc.initializeMedia(this.elements.localVideo, constraints);
            this.updateStatus('Câmera inicializada', 'success');
            
            // Configurar callbacks do WebRTC
            this.webrtc.setCallbacks({
                onRemoteStream: (stream) => console.log('Stream remoto disponível'),
                onConnectionStateChange: (state) => this.handleConnectionStateChange(state),
                onIceConnectionStateChange: (state) => this.handleIceConnectionStateChange(state)
            });
            
        } catch (error) {
            console.error('Erro ao inicializar câmera:', error);
            this.updateStatus('Erro ao acessar câmera', 'error');
        }
    }

    discoverDevices() {
        this.updateStatus('Procurando PCs na rede...', 'connecting');
        this.elements.discoverBtn.disabled = true;
        this.elements.discoverBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procurando...';
        
        this.socket.emit('discover-devices');
        
        // Timeout para descoberta
        setTimeout(() => {
            this.elements.discoverBtn.disabled = false;
            this.elements.discoverBtn.innerHTML = '<i class="fas fa-search"></i> Procurar PCs';
            
            if (!this.isConnected) {
                this.showManualConnection();
            }
        }, 5000);
    }

    displayDiscoveredDevices(devices) {
        if (devices.length === 0) {
            this.showManualConnection();
            return;
        }
        
        this.elements.devicesList.innerHTML = '';
        this.elements.devicesList.classList.remove('hidden');
        
        devices.forEach(device => {
            const deviceItem = document.createElement('div');
            deviceItem.className = 'device-item';
            deviceItem.innerHTML = `
                <div class="device-info">
                    <h4>${device.name}</h4>
                    <p>IP: ${device.ip}</p>
                </div>
                <button class="btn-connect" data-device-id="${device.id}">
                    <i class="fas fa-link"></i> Conectar
                </button>
            `;
            
            deviceItem.querySelector('.btn-connect').addEventListener('click', () => {
                this.requestConnection(device.id);
            });
            
            this.elements.devicesList.appendChild(deviceItem);
        });
        
        this.updateStatus(`${devices.length} PC(s) encontrado(s)`, 'success');
        this.elements.discoverBtn.disabled = false;
        this.elements.discoverBtn.innerHTML = '<i class="fas fa-search"></i> Procurar PCs';
    }

    showManualConnection() {
        this.updateStatus('Nenhum PC encontrado automaticamente', 'warning');
        this.elements.manualConnection.classList.remove('hidden');
    }

    requestConnection(deviceId) {
        this.updateStatus('Solicitando conexão...', 'connecting');
        this.socket.emit('request-connection', { targetId: deviceId });
    }

    connectManually() {
        const ip = this.elements.ipInput.value.trim();
        const port = this.elements.portInput.value.trim();
        
        if (!ip || !port) {
            alert('Por favor, insira o IP e a porta do PC');
            return;
        }
        
        this.updateStatus('Conectando manualmente...', 'connecting');
        // Em uma implementação real, isso conectaria diretamente via IP
        // Para esta demo, vamos simular uma conexão bem-sucedida
        setTimeout(() => {
            this.handleConnectionEstablished('manual-connection');
        }, 2000);
    }

    async handleConnectionEstablished(peerId) {
        this.isConnected = true;
        this.webrtc.setRemoteSocketId(peerId);
        
        this.updateStatus('Conectado ao PC', 'connected');
        this.elements.devicesList.classList.add('hidden');
        this.elements.manualConnection.classList.add('hidden');
        this.elements.streamingControls.classList.remove('hidden');
        
        // Criar conexão WebRTC
        await this.webrtc.createPeerConnection(this.socket, true);
    }

    async startStreaming() {
        if (!this.isConnected) {
            alert('Conecte-se a um PC primeiro');
            return;
        }
        
        try {
            this.isStreaming = true;
            this.updateStatus('Transmitindo para PC...', 'streaming');
            
            this.elements.startStreamBtn.classList.add('hidden');
            this.elements.stopStreamBtn.classList.remove('hidden');
            this.elements.notificationBar.classList.remove('hidden');
            
            // Aplicar configurações de qualidade
            await this.applyQualitySettings();
            
            console.log('Streaming iniciado');
        } catch (error) {
            console.error('Erro ao iniciar streaming:', error);
            this.updateStatus('Erro ao iniciar transmissão', 'error');
        }
    }

    stopStreaming() {
        this.isStreaming = false;
        this.isConnected = false;
        
        this.webrtc.stopStreaming();
        this.socket.emit('stop-streaming');
        
        this.updateStatus('Transmissão finalizada', 'disconnected');
        
        this.elements.startStreamBtn.classList.remove('hidden');
        this.elements.stopStreamBtn.classList.add('hidden');
        this.elements.streamingControls.classList.add('hidden');
        this.elements.notificationBar.classList.add('hidden');
        
        // Mostrar controles de conexão novamente
        this.elements.devicesList.classList.add('hidden');
        this.elements.manualConnection.classList.add('hidden');
    }

    async switchCamera() {
        try {
            this.elements.cameraSwitch.disabled = true;
            this.elements.cameraSwitch.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const success = await this.webrtc.switchCamera();
            if (success) {
                this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
                console.log('Câmera alternada para:', this.currentCamera);
            }
            
            this.elements.cameraSwitch.disabled = false;
            this.elements.cameraSwitch.innerHTML = '<i class="fas fa-sync-alt"></i>';
        } catch (error) {
            console.error('Erro ao alternar câmera:', error);
            this.elements.cameraSwitch.disabled = false;
            this.elements.cameraSwitch.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
    }

    async toggleFlash() {
        try {
            const flashState = await this.webrtc.toggleFlash();
            this.flashEnabled = flashState;
            
            if (this.flashEnabled) {
                this.elements.flashToggle.classList.add('active');
                this.elements.flashToggle.innerHTML = '<i class="fas fa-bolt"></i>';
            } else {
                this.elements.flashToggle.classList.remove('active');
                this.elements.flashToggle.innerHTML = '<i class="fas fa-bolt"></i>';
            }
        } catch (error) {
            console.error('Erro ao controlar flash:', error);
        }
    }

    handleVideoTap(event) {
        const rect = this.elements.localVideo.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Mostrar indicador de foco
        this.showFocusIndicator(x, y);
        
        // Aplicar foco
        this.webrtc.focusAt(x, y, rect.width, rect.height);
    }

    showFocusIndicator(x, y) {
        this.elements.focusIndicator.style.left = (x - 40) + 'px';
        this.elements.focusIndicator.style.top = (y - 40) + 'px';
        this.elements.focusIndicator.classList.add('active');
        
        setTimeout(() => {
            this.elements.focusIndicator.classList.remove('active');
        }, 1000);
    }

    showSettings() {
        this.elements.settingsPanel.classList.remove('hidden');
    }

    hideSettings() {
        this.elements.settingsPanel.classList.add('hidden');
    }

    async applyQualitySettings() {
        const resolution = this.elements.resolutionSelect.value.split('x');
        const width = parseInt(resolution[0]);
        const height = parseInt(resolution[1]);
        const fps = parseInt(this.elements.fpsSelect.value);
        const quality = parseFloat(this.elements.qualitySlider.value);
        const bitrate = Math.round(2000 * quality); // Base bitrate * quality
        
        await this.webrtc.updateVideoQuality(width, height, fps, bitrate);
    }

    handleRemoteCameraControl(data) {
        switch (data.command) {
            case 'switch':
                this.switchCamera();
                break;
            case 'flash':
                this.toggleFlash();
                break;
            case 'focus':
                this.webrtc.focusAt(data.x || 0.5, data.y || 0.5, 1, 1);
                break;
            case 'zoom':
                this.webrtc.applyZoom(data.level || 1);
                break;
        }
    }

    handleConnectionStateChange(state) {
        console.log('Estado da conexão WebRTC:', state);
        if (state === 'connected') {
            this.updateStatus('Conectado e transmitindo', 'streaming');
        } else if (state === 'disconnected' || state === 'failed') {
            this.handleDisconnection();
        }
    }

    handleIceConnectionStateChange(state) {
        console.log('Estado da conexão ICE:', state);
    }

    handleDisconnection() {
        this.isConnected = false;
        this.isStreaming = false;
        this.updateStatus('Desconectado do PC', 'disconnected');
        
        this.elements.startStreamBtn.classList.remove('hidden');
        this.elements.stopStreamBtn.classList.add('hidden');
        this.elements.streamingControls.classList.add('hidden');
        this.elements.notificationBar.classList.add('hidden');
    }

    updateStatus(message, type) {
        this.elements.statusText.textContent = message;
        
        // Remover classes de status antigas
        this.elements.connectionStatus.classList.remove('connected', 'connecting', 'streaming', 'error', 'warning');
        
        // Adicionar nova classe de status
        if (type) {
            this.elements.connectionStatus.classList.add(type);
        }
        
        console.log('Status:', message);
    }

    keepScreenActive() {
        // Implementação para manter a tela ativa
        this.webrtc.keepScreenActive();
        
        // Simular notificação persistente
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('Service Worker não registrado:', err);
            });
        }
    }
}

// Inicializar aplicativo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileWebcamApp();
});
