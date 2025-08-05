// Aplicativo desktop - Receptor PC
class DesktopWebcamApp {
    constructor() {
        this.socket = null;
        this.webrtc = new WebRTCUtils();
        this.isConnected = false;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.connectionStartTime = null;
        this.statsInterval = null;
        this.currentZoom = 1;
        this.isMuted = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSocket();
        this.startStatsMonitoring();
    }

    initializeElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            remoteVideo: document.getElementById('remoteVideo'),
            videoContainer: document.getElementById('videoContainer'),
            videoPlaceholder: document.getElementById('videoPlaceholder'),
            videoInfo: document.getElementById('videoInfo'),
            recordingIndicator: document.getElementById('recordingIndicator'),
            
            // Controles de zoom
            zoomOut: document.getElementById('zoomOut'),
            zoomIn: document.getElementById('zoomIn'),
            zoomReset: document.getElementById('zoomReset'),
            zoomLevel: document.getElementById('zoomLevel'),
            
            // Controles de conexão
            refreshDevices: document.getElementById('refreshDevices'),
            devicesList: document.getElementById('devicesList'),
            connectionModal: document.getElementById('connectionModal'),
            connectionRequestText: document.getElementById('connectionRequestText'),
            acceptConnection: document.getElementById('acceptConnection'),
            rejectConnection: document.getElementById('rejectConnection'),
            
            // Controles de qualidade
            resolutionControl: document.getElementById('resolutionControl'),
            fpsControl: document.getElementById('fpsControl'),
            bitrateControl: document.getElementById('bitrateControl'),
            bitrateValue: document.getElementById('bitrateValue'),
            
            // Controles de câmera
            switchCamera: document.getElementById('switchCamera'),
            toggleFlash: document.getElementById('toggleFlash'),
            autoFocus: document.getElementById('autoFocus'),
            
            // Controles de áudio
            volumeControl: document.getElementById('volumeControl'),
            volumeValue: document.getElementById('volumeValue'),
            muteToggle: document.getElementById('muteToggle'),
            audioVisualizer: document.getElementById('audioVisualizer'),
            
            // Gravação
            startRecord: document.getElementById('startRecord'),
            stopRecord: document.getElementById('stopRecord'),
            recordingInfo: document.getElementById('recordingInfo'),
            recordingTime: document.getElementById('recordingTime'),
            recordingSize: document.getElementById('recordingSize'),
            
            // Estatísticas
            latencyValue: document.getElementById('latencyValue'),
            packetLoss: document.getElementById('packetLoss'),
            connectionQuality: document.getElementById('connectionQuality'),
            connectionTime: document.getElementById('connectionTime'),
            resolution: document.getElementById('resolution'),
            fps: document.getElementById('fps'),
            bitrate: document.getElementById('bitrate')
        };
    }

    setupEventListeners() {
        // Controles de zoom
        this.elements.zoomOut.addEventListener('click', () => this.adjustZoom(-0.1));
        this.elements.zoomIn.addEventListener('click', () => this.adjustZoom(0.1));
        this.elements.zoomReset.addEventListener('click', () => this.resetZoom());
        
        // Controles de conexão
        this.elements.refreshDevices.addEventListener('click', () => this.refreshDevices());
        this.elements.acceptConnection.addEventListener('click', () => this.acceptConnection());
        this.elements.rejectConnection.addEventListener('click', () => this.rejectConnection());
        
        // Controles de qualidade
        this.elements.bitrateControl.addEventListener('input', (e) => {
            this.elements.bitrateValue.textContent = e.target.value + ' kbps';
            this.applyQualitySettings();
        });
        this.elements.resolutionControl.addEventListener('change', () => this.applyQualitySettings());
        this.elements.fpsControl.addEventListener('change', () => this.applyQualitySettings());
        
        // Controles de câmera
        this.elements.switchCamera.addEventListener('click', () => this.sendCameraControl('switch'));
        this.elements.toggleFlash.addEventListener('click', () => this.sendCameraControl('flash'));
        this.elements.autoFocus.addEventListener('click', () => this.sendCameraControl('focus'));
        
        // Controles de áudio
        this.elements.volumeControl.addEventListener('input', (e) => {
            this.elements.volumeValue.textContent = e.target.value + '%';
            this.adjustVolume(e.target.value / 100);
        });
        this.elements.muteToggle.addEventListener('click', () => this.toggleMute());
        
        // Gravação
        this.elements.startRecord.addEventListener('click', () => this.startRecording());
        this.elements.stopRecord.addEventListener('click', () => this.stopRecording());
        
        // Foco ao clicar no vídeo
        this.elements.remoteVideo.addEventListener('click', (e) => this.handleVideoClick(e));
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.socket.emit('register-desktop', { name: 'PC Windows' });
            this.updateStatus('Aguardando conexão de dispositivo móvel...', 'waiting');
        });
        
        this.socket.on('mobile-devices-list', (devices) => {
            this.displayMobileDevices(devices);
        });
        
        this.socket.on('mobile-available', (device) => {
            this.addMobileDevice(device);
        });
        
        this.socket.on('mobile-disconnected', (deviceId) => {
            this.removeMobileDevice(deviceId);
        });
        
        this.socket.on('connection-request', (data) => {
            this.showConnectionRequest(data);
        });
        
        this.socket.on('connection-established', (data) => {
            this.handleConnectionEstablished(data.peerId);
        });
        
        this.socket.on('webrtc-offer', (data) => {
            this.webrtc.setRemoteSocketId(data.from);
            this.webrtc.handleOffer(data.offer, this.socket);
        });
        
        this.socket.on('webrtc-answer', (data) => {
            this.webrtc.handleAnswer(data.answer);
        });
        
        this.socket.on('webrtc-ice-candidate', (data) => {
            this.webrtc.handleIceCandidate(data.candidate);
        });
        
        this.socket.on('peer-disconnected', () => {
            this.handleDisconnection();
        });
    }

    displayMobileDevices(devices) {
        this.elements.devicesList.innerHTML = '';
        
        if (devices.length === 0) {
            this.elements.devicesList.innerHTML = '<p>Nenhum dispositivo móvel encontrado</p>';
            return;
        }
        
        devices.forEach(device => {
            this.addMobileDevice(device);
        });
    }

    addMobileDevice(device) {
        const deviceItem = document.createElement('div');
        deviceItem.className = 'device-item';
        deviceItem.id = `device-${device.id}`;
        deviceItem.innerHTML = `
            <div class="device-info">
                <h4>${device.name}</h4>
                <p>Disponível para conexão</p>
            </div>
            <button class="btn-connect" onclick="desktopApp.requestConnection('${device.id}')">
                <i class="fas fa-link"></i> Conectar
            </button>
        `;
        
        this.elements.devicesList.appendChild(deviceItem);
    }

    removeMobileDevice(deviceId) {
        const deviceElement = document.getElementById(`device-${deviceId}`);
        if (deviceElement) {
            deviceElement.remove();
        }
    }

    requestConnection(deviceId) {
        // Para esta implementação, o mobile é que solicita conexão
        console.log('Aguardando solicitação do dispositivo móvel:', deviceId);
    }

    showConnectionRequest(data) {
        this.pendingMobileId = data.from;
        this.elements.connectionRequestText.textContent = 
            `${data.fromName} está solicitando conexão. Deseja aceitar?`;
        this.elements.connectionModal.classList.remove('hidden');
    }

    acceptConnection() {
        this.elements.connectionModal.classList.add('hidden');
        this.socket.emit('accept-connection', { mobileId: this.pendingMobileId });
    }

    rejectConnection() {
        this.elements.connectionModal.classList.add('hidden');
        this.socket.emit('reject-connection', { mobileId: this.pendingMobileId });
        this.pendingMobileId = null;
    }

    async handleConnectionEstablished(peerId) {
        this.isConnected = true;
        this.connectionStartTime = Date.now();
        this.webrtc.setRemoteSocketId(peerId);
        
        this.updateStatus('Conectado - Aguardando stream de vídeo...', 'connected');
        
        // Configurar callbacks do WebRTC
        this.webrtc.setCallbacks({
            onRemoteStream: (stream) => this.handleRemoteStream(stream),
            onConnectionStateChange: (state) => this.handleConnectionStateChange(state),
            onIceConnectionStateChange: (state) => this.handleIceConnectionStateChange(state)
        });
        
        // Criar conexão WebRTC (desktop é o receptor)
        await this.webrtc.createPeerConnection(this.socket, false);
    }

    handleRemoteStream(stream) {
        console.log('Stream remoto recebido');
        this.elements.remoteVideo.srcObject = stream;
        this.elements.videoPlaceholder.classList.add('hidden');
        this.elements.remoteVideo.style.display = 'block';
        
        this.updateStatus('Recebendo transmissão ao vivo', 'streaming');
        
        // Configurar controle de volume
        this.adjustVolume(this.elements.volumeControl.value / 100);
        
        // Iniciar visualizador de áudio
        this.startAudioVisualization(stream);
    }

    adjustZoom(delta) {
        this.currentZoom = Math.max(0.5, Math.min(3, this.currentZoom + delta));
        this.elements.zoomLevel.textContent = Math.round(this.currentZoom * 100) + '%';
        
        // Aplicar zoom ao vídeo
        this.elements.remoteVideo.style.transform = `scale(${this.currentZoom})`;
        
        // Enviar comando de zoom para o dispositivo móvel
        this.sendCameraControl('zoom', { level: this.currentZoom });
    }

    resetZoom() {
        this.currentZoom = 1;
        this.elements.zoomLevel.textContent = '100%';
        this.elements.remoteVideo.style.transform = 'scale(1)';
        this.sendCameraControl('zoom', { level: 1 });
    }

    sendCameraControl(command, data = {}) {
        if (!this.isConnected) return;
        
        this.socket.emit('camera-control', {
            command: command,
            ...data
        });
        
        // Feedback visual
        const button = this.elements[command === 'switch' ? 'switchCamera' : 
                                    command === 'flash' ? 'toggleFlash' : 'autoFocus'];
        if (button) {
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 500);
        }
    }

    handleVideoClick(event) {
        const rect = this.elements.remoteVideo.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        this.sendCameraControl('focus', { x, y });
    }

    adjustVolume(volume) {
        if (this.elements.remoteVideo.srcObject) {
            this.elements.remoteVideo.volume = this.isMuted ? 0 : volume;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.elements.muteToggle.innerHTML = '<i class="fas fa-volume-mute"></i> Reativar Som';
            this.elements.muteToggle.classList.add('active');
        } else {
            this.elements.muteToggle.innerHTML = '<i class="fas fa-volume-up"></i> Silenciar';
            this.elements.muteToggle.classList.remove('active');
        }
        
        this.adjustVolume(this.elements.volumeControl.value / 100);
    }

    startAudioVisualization(stream) {
        try {
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            
            source.connect(analyser);
            analyser.fftSize = 256;
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const bars = this.elements.audioVisualizer.querySelectorAll('.bar');
            
            const updateVisualization = () => {
                analyser.getByteFrequencyData(dataArray);
                
                bars.forEach((bar, index) => {
                    const height = (dataArray[index * 5] / 255) * 30;
                    bar.style.height = Math.max(5, height) + 'px';
                });
                
                requestAnimationFrame(updateVisualization);
            };
            
            updateVisualization();
        } catch (error) {
            console.error('Erro ao inicializar visualização de áudio:', error);
        }
    }

    applyQualitySettings() {
        const resolution = this.elements.resolutionControl.value.split('x');
        const fps = parseInt(this.elements.fpsControl.value);
        const bitrate = parseInt(this.elements.bitrateControl.value);
        
        // Enviar configurações para o dispositivo móvel
        this.socket.emit('quality-settings', {
            width: parseInt(resolution[0]),
            height: parseInt(resolution[1]),
            fps: fps,
            bitrate: bitrate
        });
    }

    async startRecording() {
        if (!this.elements.remoteVideo.srcObject) {
            alert('Nenhum stream de vídeo disponível para gravação');
            return;
        }
        
        try {
            this.recordedChunks = [];
            
            const stream = this.elements.remoteVideo.srcObject;
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            this.mediaRecorder.start(1000); // Chunk a cada segundo
            this.isRecording = true;
            
            this.elements.startRecord.classList.add('hidden');
            this.elements.stopRecord.classList.remove('hidden');
            this.elements.recordingIndicator.classList.remove('hidden');
            this.elements.recordingInfo.classList.remove('hidden');
            
            this.startRecordingTimer();
            
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            alert('Erro ao iniciar gravação: ' + error.message);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.elements.startRecord.classList.remove('hidden');
            this.elements.stopRecord.classList.add('hidden');
            this.elements.recordingIndicator.classList.add('hidden');
            this.elements.recordingInfo.classList.add('hidden');
            
            this.stopRecordingTimer();
        }
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.elements.recordingTime.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Calcular tamanho estimado
            const estimatedSize = (this.recordedChunks.length * 500) / 1024; // Estimativa em KB
            this.elements.recordingSize.textContent = 
                estimatedSize > 1024 ? 
                `${(estimatedSize / 1024).toFixed(1)} MB` : 
                `${estimatedSize.toFixed(0)} KB`;
                
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    saveRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `webcam-recording-${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        console.log('Gravação salva com sucesso');
    }

    startStatsMonitoring() {
        this.statsInterval = setInterval(async () => {
            if (this.isConnected) {
                await this.updateConnectionStats();
                this.updateConnectionTime();
            }
        }, 1000);
    }

    async updateConnectionStats() {
        try {
            const stats = await this.webrtc.getStats();
            if (!stats) return;
            
            // Latência
            if (stats.connection && stats.connection.currentRoundTripTime) {
                const latency = Math.round(stats.connection.currentRoundTripTime * 1000);
                this.elements.latencyValue.textContent = latency + ' ms';
            }
            
            // Informações de vídeo
            if (stats.inboundVideo) {
                const video = stats.inboundVideo;
                if (video.frameWidth && video.frameHeight) {
                    this.elements.resolution.textContent = `${video.frameWidth}x${video.frameHeight}`;
                }
                if (video.framesPerSecond) {
                    this.elements.fps.textContent = Math.round(video.framesPerSecond);
                }
            }
            
            // Calcular perda de pacotes
            if (stats.inboundVideo && stats.inboundVideo.packetsLost && stats.inboundVideo.packetsReceived) {
                const lost = stats.inboundVideo.packetsLost;
                const received = stats.inboundVideo.packetsReceived;
                const total = lost + received;
                const lossPercentage = total > 0 ? ((lost / total) * 100).toFixed(1) : '0.0';
                this.elements.packetLoss.textContent = lossPercentage + '%';
            }
            
            // Qualidade da conexão
            this.updateConnectionQuality();
            
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }

    updateConnectionTime() {
        if (this.connectionStartTime) {
            const elapsed = Date.now() - this.connectionStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.elements.connectionTime.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateConnectionQuality() {
        const latencyText = this.elements.latencyValue.textContent;
        const latency = parseInt(latencyText);
        
        let quality = 'Excelente';
        if (latency > 100) quality = 'Boa';
        if (latency > 200) quality = 'Regular';
        if (latency > 500) quality = 'Ruim';
        
        this.elements.connectionQuality.textContent = quality;
    }

    refreshDevices() {
        this.elements.refreshDevices.disabled = true;
        this.elements.refreshDevices.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        
        // Simular atualização
        setTimeout(() => {
            this.elements.refreshDevices.disabled = false;
            this.elements.refreshDevices.innerHTML = '<i class="fas fa-sync"></i> Atualizar Dispositivos';
        }, 2000);
    }

    handleConnectionStateChange(state) {
        console.log('Estado da conexão WebRTC:', state);
        if (state === 'connected') {
            this.updateStatus('Conectado e recebendo transmissão', 'streaming');
        } else if (state === 'disconnected' || state === 'failed') {
            this.handleDisconnection();
        }
    }

    handleIceConnectionStateChange(state) {
        console.log('Estado da conexão ICE:', state);
    }

    handleDisconnection() {
        this.isConnected = false;
        this.connectionStartTime = null;
        
        this.elements.remoteVideo.srcObject = null;
        this.elements.remoteVideo.style.display = 'none';
        this.elements.videoPlaceholder.classList.remove('hidden');
        
        this.updateStatus('Desconectado - Aguardando novo dispositivo', 'waiting');
        
        // Parar gravação se estiver ativa
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Reset dos controles
        this.resetZoom();
    }

    updateStatus(message, type) {
        this.elements.statusText.textContent = message;
        
        // Remover classes de status antigas
        this.elements.connectionStatus.classList.remove('connected', 'waiting', 'streaming', 'error');
        
        // Adicionar nova classe de status
        if (type) {
            this.elements.connectionStatus.classList.add(type);
        }
        
        console.log('Status:', message);
    }
}

// Inicializar aplicativo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.desktopApp = new DesktopWebcamApp();
});
