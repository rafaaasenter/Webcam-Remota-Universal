const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota principal - seleção de dispositivo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para dispositivo móvel (Android)
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
});

// Rota para desktop (PC)
app.get('/desktop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'desktop.html'));
});

// Armazenar dispositivos conectados
const connectedDevices = new Map();

io.on('connection', (socket) => {
    console.log('Dispositivo conectado:', socket.id);

    // Registro de dispositivo móvel
    socket.on('register-mobile', (data) => {
        connectedDevices.set(socket.id, {
            type: 'mobile',
            name: data.name || 'Android Device',
            socket: socket,
            status: 'disponível'
        });
        
        // Notificar todos os desktops sobre novo dispositivo móvel
        socket.broadcast.emit('mobile-available', {
            id: socket.id,
            name: data.name || 'Android Device'
        });
        
        console.log('Dispositivo móvel registrado:', data.name);
    });

    // Registro de dispositivo desktop
    socket.on('register-desktop', (data) => {
        connectedDevices.set(socket.id, {
            type: 'desktop',
            name: data.name || 'PC Windows',
            socket: socket,
            status: 'disponível'
        });
        
        // Enviar lista de dispositivos móveis disponíveis
        const mobileDevices = [];
        connectedDevices.forEach((device, id) => {
            if (device.type === 'mobile' && device.status === 'disponível') {
                mobileDevices.push({
                    id: id,
                    name: device.name
                });
            }
        });
        
        socket.emit('mobile-devices-list', mobileDevices);
        console.log('Desktop registrado:', data.name);
    });

    // Descoberta de dispositivos na rede
    socket.on('discover-devices', () => {
        const devices = [];
        connectedDevices.forEach((device, id) => {
            if (device.type === 'desktop' && device.status === 'disponível') {
                devices.push({
                    id: id,
                    name: device.name,
                    ip: socket.handshake.address
                });
            }
        });
        socket.emit('devices-discovered', devices);
    });

    // Solicitação de conexão do móvel para desktop
    socket.on('request-connection', (data) => {
        const targetDevice = connectedDevices.get(data.targetId);
        if (targetDevice && targetDevice.type === 'desktop') {
            targetDevice.socket.emit('connection-request', {
                from: socket.id,
                fromName: connectedDevices.get(socket.id)?.name || 'Dispositivo Móvel'
            });
        }
    });

    // Aceitar conexão do desktop
    socket.on('accept-connection', (data) => {
        const mobileDevice = connectedDevices.get(data.mobileId);
        if (mobileDevice && mobileDevice.type === 'mobile') {
            // Marcar ambos como conectados
            connectedDevices.get(socket.id).status = 'conectado';
            mobileDevice.status = 'conectado';
            
            // Notificar ambos sobre conexão estabelecida
            socket.emit('connection-established', { peerId: data.mobileId });
            mobileDevice.socket.emit('connection-established', { peerId: socket.id });
        }
    });

    // Rejeitar conexão
    socket.on('reject-connection', (data) => {
        const mobileDevice = connectedDevices.get(data.mobileId);
        if (mobileDevice) {
            mobileDevice.socket.emit('connection-rejected');
        }
    });

    // Encerrar streaming
    socket.on('stop-streaming', () => {
        const device = connectedDevices.get(socket.id);
        if (device) {
            device.status = 'disponível';
            // Notificar o par sobre desconexão
            connectedDevices.forEach((otherDevice, otherId) => {
                if (otherId !== socket.id && otherDevice.status === 'conectado') {
                    otherDevice.socket.emit('peer-disconnected');
                    otherDevice.status = 'disponível';
                }
            });
        }
    });

    // Transmitir ofertas e respostas WebRTC
    socket.on('webrtc-offer', (data) => {
        socket.to(data.target).emit('webrtc-offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('webrtc-answer', (data) => {
        socket.to(data.target).emit('webrtc-answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.target).emit('webrtc-ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Controles remotos da câmera
    socket.on('camera-control', (data) => {
        const device = connectedDevices.get(socket.id);
        if (device && device.type === 'desktop') {
            // Encontrar dispositivo móvel conectado e enviar comando
            connectedDevices.forEach((mobileDevice, mobileId) => {
                if (mobileDevice.type === 'mobile' && mobileDevice.status === 'conectado') {
                    mobileDevice.socket.emit('camera-control', data);
                }
            });
        }
    });

    // Desconexão
    socket.on('disconnect', () => {
        const device = connectedDevices.get(socket.id);
        if (device) {
            // Notificar outros dispositivos sobre desconexão
            if (device.type === 'mobile') {
                socket.broadcast.emit('mobile-disconnected', socket.id);
            }
            
            // Se estava conectado, liberar o par
            if (device.status === 'conectado') {
                connectedDevices.forEach((otherDevice, otherId) => {
                    if (otherId !== socket.id && otherDevice.status === 'conectado') {
                        otherDevice.socket.emit('peer-disconnected');
                        otherDevice.status = 'disponível';
                    }
                });
            }
            
            connectedDevices.delete(socket.id);
        }
        console.log('Dispositivo desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Webcam Remota executando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para começar`);
});
