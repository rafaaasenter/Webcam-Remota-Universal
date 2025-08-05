// Utilidades para WebRTC e comunicação P2P
class WebRTCUtils {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        this.mediaConstraints = {
            video: {
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
    }

    // Inicializar captura de mídia (câmera e microfone)
    async initializeMedia(videoElement, constraints = null) {
        try {
            const mediaConstraints = constraints || this.mediaConstraints;
            this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            
            if (videoElement) {
                videoElement.srcObject = this.localStream;
            }
            
            console.log('Mídia inicializada com sucesso');
            return this.localStream;
        } catch (error) {
            console.error('Erro ao acessar mídia:', error);
            throw new Error('Não foi possível acessar a câmera ou microfone. Verifique as permissões.');
        }
    }

    // Criar conexão peer-to-peer
    async createPeerConnection(socket, isInitiator = false) {
        try {
            this.peerConnection = new RTCPeerConnection(this.configuration);
            
            // Adicionar stream local
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Configurar eventos
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc-ice-candidate', {
                        candidate: event.candidate,
                        target: this.remoteSocketId
                    });
                }
            };

            this.peerConnection.ontrack = (event) => {
                console.log('Stream remoto recebido');
                this.remoteStream = event.streams[0];
                if (this.onRemoteStream) {
                    this.onRemoteStream(this.remoteStream);
                }
            };

            this.peerConnection.onconnectionstatechange = () => {
                console.log('Estado da conexão:', this.peerConnection.connectionState);
                if (this.onConnectionStateChange) {
                    this.onConnectionStateChange(this.peerConnection.connectionState);
                }
            };

            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('Estado da conexão ICE:', this.peerConnection.iceConnectionState);
                if (this.onIceConnectionStateChange) {
                    this.onIceConnectionStateChange(this.peerConnection.iceConnectionState);
                }
            };

            // Se for o iniciador, criar oferta
            if (isInitiator) {
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);
                
                socket.emit('webrtc-offer', {
                    offer: offer,
                    target: this.remoteSocketId
                });
            }

            return this.peerConnection;
        } catch (error) {
            console.error('Erro ao criar conexão peer:', error);
            throw error;
        }
    }

    // Processar oferta WebRTC
    async handleOffer(offer, socket) {
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            socket.emit('webrtc-answer', {
                answer: answer,
                target: this.remoteSocketId
            });
            
            console.log('Oferta processada e resposta enviada');
        } catch (error) {
            console.error('Erro ao processar oferta:', error);
            throw error;
        }
    }

    // Processar resposta WebRTC
    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('Resposta processada');
        } catch (error) {
            console.error('Erro ao processar resposta:', error);
            throw error;
        }
    }

    // Processar candidato ICE
    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('Candidato ICE adicionado');
        } catch (error) {
            console.error('Erro ao adicionar candidato ICE:', error);
        }
    }

    // Alternar câmera (frontal/traseira)
    async switchCamera() {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            const constraints = videoTrack.getConstraints();
            const currentFacingMode = constraints.facingMode;
            
            const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            
            // Parar stream atual
            this.localStream.getTracks().forEach(track => track.stop());
            
            // Criar novo stream com câmera alternada
            const newConstraints = {
                ...this.mediaConstraints,
                video: {
                    ...this.mediaConstraints.video,
                    facingMode: newFacingMode
                }
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(newConstraints);
            
            // Atualizar peer connection
            if (this.peerConnection) {
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    await sender.replaceTrack(this.localStream.getVideoTracks()[0]);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao alternar câmera:', error);
            return false;
        }
    }

    // Controlar flash (onde suportado)
    async toggleFlash() {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            const capabilities = videoTrack.getCapabilities();
            if (!capabilities.torch) {
                console.log('Flash não suportado neste dispositivo');
                return false;
            }

            const settings = videoTrack.getSettings();
            const newTorchState = !settings.torch;
            
            await videoTrack.applyConstraints({
                advanced: [{ torch: newTorchState }]
            });
            
            return newTorchState;
        } catch (error) {
            console.error('Erro ao controlar flash:', error);
            return false;
        }
    }

    // Aplicar zoom
    async applyZoom(zoomLevel) {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            const capabilities = videoTrack.getCapabilities();
            if (!capabilities.zoom) {
                console.log('Zoom não suportado neste dispositivo');
                return false;
            }

            const { min, max } = capabilities.zoom;
            const clampedZoom = Math.max(min, Math.min(max, zoomLevel));
            
            await videoTrack.applyConstraints({
                advanced: [{ zoom: clampedZoom }]
            });
            
            return clampedZoom;
        } catch (error) {
            console.error('Erro ao aplicar zoom:', error);
            return false;
        }
    }

    // Focar na posição especificada
    async focusAt(x, y, width, height) {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            const capabilities = videoTrack.getCapabilities();
            if (!capabilities.focusMode || !capabilities.pointsOfInterest) {
                console.log('Foco manual não suportado neste dispositivo');
                return false;
            }

            // Converter coordenadas para valores normalizados (0-1)
            const normalizedX = x / width;
            const normalizedY = y / height;
            
            await videoTrack.applyConstraints({
                advanced: [{
                    focusMode: 'single-shot',
                    pointsOfInterest: [{ x: normalizedX, y: normalizedY }]
                }]
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao focar:', error);
            return false;
        }
    }

    // Atualizar qualidade do vídeo
    async updateVideoQuality(width, height, frameRate, bitrate) {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            const constraints = {
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: frameRate }
            };

            await videoTrack.applyConstraints(constraints);
            
            // Atualizar bitrate se peer connection estiver ativa
            if (this.peerConnection && bitrate) {
                const sender = this.peerConnection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    const params = sender.getParameters();
                    if (params.encodings && params.encodings.length > 0) {
                        params.encodings[0].maxBitrate = bitrate * 1000; // Convert to bps
                        await sender.setParameters(params);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar qualidade:', error);
            return false;
        }
    }

    // Obter estatísticas da conexão
    async getStats() {
        if (!this.peerConnection) return null;

        try {
            const stats = await this.peerConnection.getStats();
            const report = {};
            
            stats.forEach((stat) => {
                if (stat.type === 'inbound-rtp' && stat.mediaType === 'video') {
                    report.inboundVideo = {
                        bytesReceived: stat.bytesReceived,
                        packetsReceived: stat.packetsReceived,
                        packetsLost: stat.packetsLost,
                        framesReceived: stat.framesReceived,
                        frameWidth: stat.frameWidth,
                        frameHeight: stat.frameHeight,
                        framesPerSecond: stat.framesPerSecond
                    };
                }
                
                if (stat.type === 'outbound-rtp' && stat.mediaType === 'video') {
                    report.outboundVideo = {
                        bytesSent: stat.bytesSent,
                        packetsSent: stat.packetsSent,
                        framesSent: stat.framesSent,
                        frameWidth: stat.frameWidth,
                        frameHeight: stat.frameHeight,
                        framesPerSecond: stat.framesPerSecond
                    };
                }
                
                if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                    report.connection = {
                        currentRoundTripTime: stat.currentRoundTripTime,
                        availableOutgoingBitrate: stat.availableOutgoingBitrate,
                        availableIncomingBitrate: stat.availableIncomingBitrate
                    };
                }
            });
            
            return report;
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return null;
        }
    }

    // Parar todos os streams
    stopStreaming() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.remoteStream = null;
        console.log('Streaming finalizado');
    }

    // Definir callbacks
    setCallbacks(callbacks) {
        this.onRemoteStream = callbacks.onRemoteStream;
        this.onConnectionStateChange = callbacks.onConnectionStateChange;
        this.onIceConnectionStateChange = callbacks.onIceConnectionStateChange;
    }

    // Definir ID do socket remoto
    setRemoteSocketId(socketId) {
        this.remoteSocketId = socketId;
    }

    // Manter tela ativa (para dispositivos móveis)
    keepScreenActive() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(err => {
                console.log('Wake Lock não suportado:', err);
            });
        } else {
            // Fallback: criar elemento de vídeo invisível
            const video = document.createElement('video');
            video.style.position = 'fixed';
            video.style.top = '-1px';
            video.style.left = '-1px';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.opacity = '0';
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            
            // Criar stream de áudio silencioso
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0;
            oscillator.frequency.value = 440;
            oscillator.start();
            
            document.body.appendChild(video);
        }
    }
}

// Exportar para uso global
window.WebRTCUtils = WebRTCUtils;
