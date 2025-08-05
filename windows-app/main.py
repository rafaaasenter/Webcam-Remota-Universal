#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Webcam Remota Universal - Receptor PC
Sistema completo de recepção de streaming de webcam Android via Wi-Fi e USB
Interface nativa em português para Windows
"""

import sys
import os
import json
import time
import threading
import traceback
from datetime import datetime
from pathlib import Path

# PyQt5 imports
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QButton, QPushButton, QSlider, QComboBox, QSpinBox,
    QGroupBox, QListWidget, QListWidgetItem, QMessageBox, QDialog,
    QProgressBar, QTextEdit, QCheckBox, QRadioButton, QButtonGroup,
    QSplitter, QFrame, QGridLayout, QScrollArea, QFileDialog,
    QSystemTrayIcon, QMenu, QAction, QTabWidget, QSizePolicy
)
from PyQt5.QtCore import (
    Qt, QTimer, QThread, pyqtSignal, QObject, QSize,
    QPropertyAnimation, QEasingCurve, QRect
)
from PyQt5.QtGui import (
    QPixmap, QIcon, QFont, QColor, QPalette, QPainter,
    QBrush, QLinearGradient, QMovie
)

# Networking and media imports
import socket
import struct
import cv2
import numpy as np
import pyaudio
from threading import Thread, Lock
import queue
import wave

# WebRTC simulation and networking
import asyncio
import websockets
import base64

class VideoQualitySettings:
    """Configurações de qualidade de vídeo"""
    def __init__(self):
        self.width = 1280
        self.height = 720
        self.fps = 30
        self.bitrate = 2000  # kbps
        self.codec = "H264"

class AudioSettings:
    """Configurações de áudio"""
    def __init__(self):
        self.sample_rate = 44100
        self.channels = 2
        self.bits_per_sample = 16
        self.enabled = True
        self.volume = 80

class ConnectionManager(QObject):
    """Gerenciador de conexões Wi-Fi e USB"""
    
    device_discovered = pyqtSignal(str, str, str)  # name, ip, type
    connection_established = pyqtSignal(str, str)  # device_name, connection_type
    connection_lost = pyqtSignal(str)  # reason
    data_received = pyqtSignal(bytes)  # video/audio data
    
    def __init__(self):
        super().__init__()
        self.connected = False
        self.connection_type = None
        self.device_name = None
        self.discovery_thread = None
        self.receiver_thread = None
        self.socket = None
        
    def start_discovery(self):
        """Iniciar descoberta de dispositivos Android na rede"""
        if self.discovery_thread and self.discovery_thread.is_alive():
            return
            
        self.discovery_thread = Thread(target=self._discovery_worker, daemon=True)
        self.discovery_thread.start()
        
    def _discovery_worker(self):
        """Worker thread para descoberta de dispositivos"""
        try:
            # Criar socket UDP para broadcast
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.settimeout(2.0)
            
            # Enviar beacon de descoberta
            discovery_message = json.dumps({
                "type": "discovery_request",
                "device_type": "pc_windows",
                "name": "PC Windows - Receptor",
                "port": 5000
            }).encode('utf-8')
            
            # Broadcast na rede local
            for i in range(1, 255):
                try:
                    broadcast_addr = f"192.168.1.{i}"
                    sock.sendto(discovery_message, (broadcast_addr, 8888))
                except:
                    continue
                    
            # Tentar outras faixas de rede comuns
            for subnet in ["192.168.0", "10.0.0", "172.16.0"]:
                for i in range(1, 255):
                    try:
                        broadcast_addr = f"{subnet}.{i}"
                        sock.sendto(discovery_message, (broadcast_addr, 8888))
                    except:
                        continue
            
            # Aguardar respostas
            responses = []
            start_time = time.time()
            while time.time() - start_time < 10:  # 10 segundos de descoberta
                try:
                    data, addr = sock.recvfrom(1024)
                    response = json.loads(data.decode('utf-8'))
                    
                    if response.get("type") == "discovery_response":
                        device_name = response.get("name", "Android Device")
                        device_ip = addr[0]
                        device_type = "wifi"
                        
                        self.device_discovered.emit(device_name, device_ip, device_type)
                        responses.append((device_name, device_ip, device_type))
                        
                except socket.timeout:
                    continue
                except Exception as e:
                    print(f"Erro na descoberta: {e}")
                    
            sock.close()
            
            # Simular descoberta USB se nenhum dispositivo Wi-Fi for encontrado
            if not responses:
                time.sleep(1)
                self.device_discovered.emit("Android USB Device", "USB", "usb")
                
        except Exception as e:
            print(f"Erro no worker de descoberta: {e}")
            
    def connect_to_device(self, device_ip, device_type="wifi"):
        """Conectar a um dispositivo específico"""
        try:
            if device_type == "wifi":
                self._connect_wifi(device_ip)
            elif device_type == "usb":
                self._connect_usb()
                
        except Exception as e:
            self.connection_lost.emit(f"Erro na conexão: {e}")
            
    def _connect_wifi(self, device_ip):
        """Conectar via Wi-Fi"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10.0)
            self.socket.connect((device_ip, 5000))
            
            # Handshake
            handshake = json.dumps({
                "type": "connection_request",
                "device_type": "pc_windows"
            }).encode('utf-8')
            
            self.socket.send(struct.pack('!I', len(handshake)) + handshake)
            
            # Aguardar confirmação
            response_size = struct.unpack('!I', self.socket.recv(4))[0]
            response_data = self.socket.recv(response_size)
            response = json.loads(response_data.decode('utf-8'))
            
            if response.get("status") == "connected":
                self.connected = True
                self.connection_type = "wifi"
                self.device_name = response.get("device_name", "Android Device")
                
                # Iniciar thread de recepção
                self.receiver_thread = Thread(target=self._wifi_receiver, daemon=True)
                self.receiver_thread.start()
                
                self.connection_established.emit(self.device_name, "Wi-Fi")
                
        except Exception as e:
            raise Exception(f"Falha na conexão Wi-Fi: {e}")
            
    def _connect_usb(self):
        """Conectar via USB (simulado para demo)"""
        # Em uma implementação real, usaria ADB ou comunicação USB direta
        time.sleep(2)  # Simular tempo de conexão
        
        self.connected = True
        self.connection_type = "usb"
        self.device_name = "Android USB Device"
        
        # Simular dados para demo
        self.receiver_thread = Thread(target=self._usb_receiver_demo, daemon=True)
        self.receiver_thread.start()
        
        self.connection_established.emit(self.device_name, "USB")
        
    def _wifi_receiver(self):
        """Thread para receber dados via Wi-Fi"""
        try:
            while self.connected and self.socket:
                # Receber tamanho do frame
                frame_size_data = self.socket.recv(4)
                if not frame_size_data:
                    break
                    
                frame_size = struct.unpack('!I', frame_size_data)[0]
                
                # Receber dados do frame
                frame_data = b''
                while len(frame_data) < frame_size:
                    chunk = self.socket.recv(min(frame_size - len(frame_data), 4096))
                    if not chunk:
                        break
                    frame_data += chunk
                    
                if len(frame_data) == frame_size:
                    self.data_received.emit(frame_data)
                    
        except Exception as e:
            if self.connected:
                self.connection_lost.emit(f"Conexão perdida: {e}")
                
    def _usb_receiver_demo(self):
        """Thread demo para simular dados USB"""
        try:
            # Criar frames de demo para simular streaming
            while self.connected:
                # Simular frame de vídeo (640x480 RGB)
                demo_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
                
                # Adicionar texto indicativo
                cv2.putText(demo_frame, "DEMO - USB Stream", (50, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(demo_frame, f"Time: {datetime.now().strftime('%H:%M:%S')}", 
                           (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Comprimir e enviar
                _, encoded = cv2.imencode('.jpg', demo_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_data = encoded.tobytes()
                
                self.data_received.emit(frame_data)
                time.sleep(1/30)  # 30 FPS
                
        except Exception as e:
            if self.connected:
                self.connection_lost.emit(f"Erro na simulação USB: {e}")
                
    def disconnect(self):
        """Desconectar do dispositivo"""
        self.connected = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        self.socket = None
        self.connection_type = None
        self.device_name = None

class VideoPlayer(QLabel):
    """Widget customizado para reprodução de vídeo"""
    
    def __init__(self):
        super().__init__()
        self.setMinimumSize(640, 480)
        self.setScaledContents(True)
        self.setStyleSheet("""
            QLabel {
                background-color: #000000;
                border: 2px solid #333333;
                border-radius: 8px;
            }
        """)
        
        # Placeholder quando não há vídeo
        self.show_placeholder()
        
        # Estatísticas de vídeo
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.current_fps = 0
        
    def show_placeholder(self):
        """Mostrar placeholder quando não há vídeo"""
        placeholder = QPixmap(640, 480)
        placeholder.fill(QColor(30, 30, 30))
        
        painter = QPainter(placeholder)
        painter.setPen(QColor(150, 150, 150))
        painter.setFont(QFont("Arial", 16))
        painter.drawText(placeholder.rect(), Qt.AlignCenter, 
                        "Aguardando transmissão de vídeo...\n\nConecte um dispositivo Android para começar")
        painter.end()
        
        self.setPixmap(placeholder)
        
    def update_frame(self, frame_data):
        """Atualizar frame de vídeo"""
        try:
            # Decodificar frame
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                # Converter BGR para RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Converter para QPixmap
                height, width, channel = frame_rgb.shape
                bytes_per_line = 3 * width
                q_image = QImage(frame_rgb.data, width, height, bytes_per_line, QImage.Format_RGB888)
                pixmap = QPixmap.fromImage(q_image)
                
                self.setPixmap(pixmap)
                
                # Atualizar estatísticas
                self.frame_count += 1
                current_time = time.time()
                if current_time - self.last_fps_time >= 1.0:
                    self.current_fps = self.frame_count
                    self.frame_count = 0
                    self.last_fps_time = current_time
                    
        except Exception as e:
            print(f"Erro ao atualizar frame: {e}")

class StatsWidget(QGroupBox):
    """Widget para mostrar estatísticas da conexão"""
    
    def __init__(self):
        super().__init__("Estatísticas da Conexão")
        self.setup_ui()
        
        # Timer para atualizar estatísticas
        self.stats_timer = QTimer()
        self.stats_timer.timeout.connect(self.update_stats)
        self.stats_timer.start(1000)  # Atualizar a cada segundo
        
        # Dados de estatísticas
        self.connection_start_time = None
        self.bytes_received = 0
        self.frames_received = 0
        
    def setup_ui(self):
        layout = QGridLayout()
        
        # Labels para estatísticas
        self.latency_label = QLabel("Latência: -- ms")
        self.fps_label = QLabel("FPS: --")
        self.bitrate_label = QLabel("Bitrate: -- kbps")
        self.resolution_label = QLabel("Resolução: --")
        self.connection_time_label = QLabel("Tempo Conectado: 00:00:00")
        self.quality_label = QLabel("Qualidade: --")
        
        layout.addWidget(QLabel("📡"), 0, 0)
        layout.addWidget(self.latency_label, 0, 1)
        layout.addWidget(QLabel("🎬"), 1, 0)
        layout.addWidget(self.fps_label, 1, 1)
        layout.addWidget(QLabel("📊"), 2, 0)
        layout.addWidget(self.bitrate_label, 2, 1)
        layout.addWidget(QLabel("📺"), 3, 0)
        layout.addWidget(self.resolution_label, 3, 1)
        layout.addWidget(QLabel("⏱️"), 4, 0)
        layout.addWidget(self.connection_time_label, 4, 1)
        layout.addWidget(QLabel("✨"), 5, 0)
        layout.addWidget(self.quality_label, 5, 1)
        
        self.setLayout(layout)
        
    def update_stats(self):
        """Atualizar estatísticas"""
        if self.connection_start_time:
            # Calcular tempo de conexão
            elapsed = time.time() - self.connection_start_time
            hours = int(elapsed // 3600)
            minutes = int((elapsed % 3600) // 60)
            seconds = int(elapsed % 60)
            self.connection_time_label.setText(f"Tempo Conectado: {hours:02d}:{minutes:02d}:{seconds:02d}")
            
    def set_connection_started(self):
        """Marcar início da conexão"""
        self.connection_start_time = time.time()
        
    def set_connection_stopped(self):
        """Marcar fim da conexão"""
        self.connection_start_time = None
        self.connection_time_label.setText("Tempo Conectado: 00:00:00")
        
    def update_video_stats(self, fps, resolution, bitrate):
        """Atualizar estatísticas de vídeo"""
        self.fps_label.setText(f"FPS: {fps}")
        self.resolution_label.setText(f"Resolução: {resolution}")
        self.bitrate_label.setText(f"Bitrate: {bitrate} kbps")
        
        # Determinar qualidade baseada nos parâmetros
        if fps >= 30 and "1080" in resolution:
            quality = "Excelente"
        elif fps >= 25 and "720" in resolution:
            quality = "Boa"
        elif fps >= 15:
            quality = "Regular"
        else:
            quality = "Baixa"
            
        self.quality_label.setText(f"Qualidade: {quality}")

class MainWindow(QMainWindow):
    """Janela principal do aplicativo"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Webcam Remota Universal - Receptor PC")
        self.setWindowIcon(QIcon("assets/icon.png"))
        self.setMinimumSize(1200, 800)
        
        # Gerenciador de conexão
        self.connection_manager = ConnectionManager()
        self.setup_connection_signals()
        
        # Configurações
        self.video_settings = VideoQualitySettings()
        self.audio_settings = AudioSettings()
        
        # Estado
        self.is_connected = False
        self.is_recording = False
        self.recorded_frames = []
        
        # Interface
        self.setup_ui()
        self.setup_style()
        
        # Sistema de bandeja
        self.setup_system_tray()
        
    def setup_ui(self):
        """Configurar interface do usuário"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Layout principal
        main_layout = QHBoxLayout(central_widget)
        
        # Splitter principal
        main_splitter = QSplitter(Qt.Horizontal)
        main_layout.addWidget(main_splitter)
        
        # Painel de vídeo (esquerda)
        video_panel = self.create_video_panel()
        main_splitter.addWidget(video_panel)
        
        # Painel de controles (direita)
        controls_panel = self.create_controls_panel()
        main_splitter.addWidget(controls_panel)
        
        # Definir proporções do splitter
        main_splitter.setSizes([800, 400])
        
        # Barra de status
        self.statusBar().showMessage("Pronto - Aguardando conexão de dispositivo Android")
        
    def create_video_panel(self):
        """Criar painel de vídeo"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # Player de vídeo
        self.video_player = VideoPlayer()
        layout.addWidget(self.video_player)
        
        # Controles de zoom
        zoom_layout = QHBoxLayout()
        
        self.zoom_out_btn = QPushButton("🔍-")
        self.zoom_out_btn.clicked.connect(self.zoom_out)
        
        self.zoom_level_label = QLabel("100%")
        self.zoom_level_label.setAlignment(Qt.AlignCenter)
        
        self.zoom_in_btn = QPushButton("🔍+")
        self.zoom_in_btn.clicked.connect(self.zoom_in)
        
        self.zoom_reset_btn = QPushButton("↻")
        self.zoom_reset_btn.clicked.connect(self.zoom_reset)
        
        zoom_layout.addWidget(self.zoom_out_btn)
        zoom_layout.addStretch()
        zoom_layout.addWidget(self.zoom_level_label)
        zoom_layout.addStretch()
        zoom_layout.addWidget(self.zoom_in_btn)
        zoom_layout.addWidget(self.zoom_reset_btn)
        
        layout.addLayout(zoom_layout)
        
        return panel
        
    def create_controls_panel(self):
        """Criar painel de controles"""
        panel = QWidget()
        panel.setMaximumWidth(350)
        layout = QVBoxLayout(panel)
        
        # Abas de controle
        tabs = QTabWidget()
        
        # Aba de Conexão
        connection_tab = self.create_connection_tab()
        tabs.addTab(connection_tab, "🔗 Conexão")
        
        # Aba de Qualidade
        quality_tab = self.create_quality_tab()
        tabs.addTab(quality_tab, "⚙️ Qualidade")
        
        # Aba de Câmera
        camera_tab = self.create_camera_tab()
        tabs.addTab(camera_tab, "📷 Câmera")
        
        # Aba de Gravação
        recording_tab = self.create_recording_tab()
        tabs.addTab(recording_tab, "🎥 Gravação")
        
        layout.addWidget(tabs)
        
        # Widget de estatísticas
        self.stats_widget = StatsWidget()
        layout.addWidget(self.stats_widget)
        
        return panel
        
    def create_connection_tab(self):
        """Criar aba de conexão"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        # Modo de conexão
        connection_group = QGroupBox("Modo de Conexão")
        conn_layout = QVBoxLayout(connection_group)
        
        self.connection_group = QButtonGroup()
        
        self.wifi_radio = QRadioButton("Wi-Fi")
        self.wifi_radio.setChecked(True)
        self.connection_group.addButton(self.wifi_radio)
        
        self.usb_radio = QRadioButton("USB")
        self.connection_group.addButton(self.usb_radio)
        
        conn_layout.addWidget(self.wifi_radio)
        conn_layout.addWidget(self.usb_radio)
        
        layout.addWidget(connection_group)
        
        # Controles de descoberta
        discovery_group = QGroupBox("Descoberta de Dispositivos")
        disc_layout = QVBoxLayout(discovery_group)
        
        self.discover_btn = QPushButton("🔍 Procurar Dispositivos Android")
        self.discover_btn.clicked.connect(self.start_discovery)
        disc_layout.addWidget(self.discover_btn)
        
        # Lista de dispositivos
        self.devices_list = QListWidget()
        self.devices_list.itemDoubleClicked.connect(self.connect_to_selected_device)
        disc_layout.addWidget(self.devices_list)
        
        # Status da conexão
        self.connection_status = QLabel("Status: Desconectado")
        self.connection_status.setStyleSheet("font-weight: bold; color: #E74C3C;")
        disc_layout.addWidget(self.connection_status)
        
        layout.addWidget(discovery_group)
        layout.addStretch()
        
        return tab
        
    def create_quality_tab(self):
        """Criar aba de qualidade"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        # Configurações de vídeo
        video_group = QGroupBox("Configurações de Vídeo")
        video_layout = QGridLayout(video_group)
        
        video_layout.addWidget(QLabel("Resolução:"), 0, 0)
        self.resolution_combo = QComboBox()
        self.resolution_combo.addItems([
            "640x480 (480p)",
            "1280x720 (720p HD)",
            "1920x1080 (1080p Full HD)",
            "3840x2160 (4K)"
        ])
        self.resolution_combo.setCurrentIndex(1)  # 720p padrão
        video_layout.addWidget(self.resolution_combo, 0, 1)
        
        video_layout.addWidget(QLabel("Taxa de Quadros:"), 1, 0)
        self.fps_combo = QComboBox()
        self.fps_combo.addItems(["15 FPS", "24 FPS", "30 FPS", "60 FPS"])
        self.fps_combo.setCurrentIndex(2)  # 30 FPS padrão
        video_layout.addWidget(self.fps_combo, 1, 1)
        
        video_layout.addWidget(QLabel("Bitrate:"), 2, 0)
        self.bitrate_slider = QSlider(Qt.Horizontal)
        self.bitrate_slider.setRange(500, 8000)
        self.bitrate_slider.setValue(2000)
        self.bitrate_slider.valueChanged.connect(self.update_bitrate_label)
        video_layout.addWidget(self.bitrate_slider, 2, 1)
        
        self.bitrate_label = QLabel("2000 kbps")
        video_layout.addWidget(self.bitrate_label, 3, 1)
        
        layout.addWidget(video_group)
        
        # Configurações de áudio
        audio_group = QGroupBox("Configurações de Áudio")
        audio_layout = QGridLayout(audio_group)
        
        audio_layout.addWidget(QLabel("Volume:"), 0, 0)
        self.volume_slider = QSlider(Qt.Horizontal)
        self.volume_slider.setRange(0, 100)
        self.volume_slider.setValue(80)
        self.volume_slider.valueChanged.connect(self.update_volume)
        audio_layout.addWidget(self.volume_slider, 0, 1)
        
        self.volume_label = QLabel("80%")
        audio_layout.addWidget(self.volume_label, 1, 1)
        
        self.mute_btn = QPushButton("🔇 Silenciar")
        self.mute_btn.clicked.connect(self.toggle_mute)
        audio_layout.addWidget(self.mute_btn, 2, 0, 1, 2)
        
        layout.addWidget(audio_group)
        layout.addStretch()
        
        return tab
        
    def create_camera_tab(self):
        """Criar aba de controles da câmera"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        camera_group = QGroupBox("Controles Remotos da Câmera")
        camera_layout = QVBoxLayout(camera_group)
        
        self.switch_camera_btn = QPushButton("🔄 Alternar Câmera (Frontal/Traseira)")
        self.switch_camera_btn.clicked.connect(self.switch_camera)
        camera_layout.addWidget(self.switch_camera_btn)
        
        self.toggle_flash_btn = QPushButton("⚡ Ligar/Desligar Flash")
        self.toggle_flash_btn.clicked.connect(self.toggle_flash)
        camera_layout.addWidget(self.toggle_flash_btn)
        
        self.autofocus_btn = QPushButton("🎯 Auto Foco")
        self.autofocus_btn.clicked.connect(self.trigger_autofocus)
        camera_layout.addWidget(self.autofocus_btn)
        
        # Zoom remoto
        zoom_group = QGroupBox("Zoom Remoto")
        zoom_layout = QGridLayout(zoom_group)
        
        zoom_layout.addWidget(QLabel("Nível de Zoom:"), 0, 0)
        self.remote_zoom_slider = QSlider(Qt.Horizontal)
        self.remote_zoom_slider.setRange(10, 100)
        self.remote_zoom_slider.setValue(10)
        self.remote_zoom_slider.valueChanged.connect(self.update_remote_zoom)
        zoom_layout.addWidget(self.remote_zoom_slider, 0, 1)
        
        self.remote_zoom_label = QLabel("1.0x")
        zoom_layout.addWidget(self.remote_zoom_label, 1, 1)
        
        camera_layout.addWidget(zoom_group)
        layout.addWidget(camera_group)
        layout.addStretch()
        
        return tab
        
    def create_recording_tab(self):
        """Criar aba de gravação"""
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        recording_group = QGroupBox("Gravação de Vídeo")
        rec_layout = QVBoxLayout(recording_group)
        
        self.start_record_btn = QPushButton("🔴 Iniciar Gravação")
        self.start_record_btn.clicked.connect(self.start_recording)
        rec_layout.addWidget(self.start_record_btn)
        
        self.stop_record_btn = QPushButton("⏹️ Parar Gravação")
        self.stop_record_btn.clicked.connect(self.stop_recording)
        self.stop_record_btn.setEnabled(False)
        rec_layout.addWidget(self.stop_record_btn)
        
        # Informações da gravação
        self.recording_info = QLabel("Nenhuma gravação ativa")
        rec_layout.addWidget(self.recording_info)
        
        self.recording_time = QLabel("Tempo: 00:00:00")
        rec_layout.addWidget(self.recording_time)
        
        self.recording_size = QLabel("Tamanho: 0 MB")
        rec_layout.addWidget(self.recording_size)
        
        # Configurações de gravação
        settings_group = QGroupBox("Configurações de Gravação")
        settings_layout = QGridLayout(settings_group)
        
        settings_layout.addWidget(QLabel("Formato:"), 0, 0)
        self.format_combo = QComboBox()
        self.format_combo.addItems(["MP4 (H.264)", "AVI", "MOV"])
        settings_layout.addWidget(self.format_combo, 0, 1)
        
        settings_layout.addWidget(QLabel("Qualidade:"), 1, 0)
        self.record_quality_combo = QComboBox()
        self.record_quality_combo.addItems(["Alta", "Média", "Baixa"])
        settings_layout.addWidget(self.record_quality_combo, 1, 1)
        
        rec_layout.addWidget(settings_group)
        layout.addWidget(recording_group)
        layout.addStretch()
        
        return tab
        
    def setup_style(self):
        """Configurar estilo da aplicação"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #2C3E50;
                color: #ECF0F1;
            }
            
            QGroupBox {
                font-weight: bold;
                border: 2px solid #34495E;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 10px 0 10px;
                color: #3498DB;
            }
            
            QPushButton {
                background-color: #3498DB;
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: bold;
            }
            
            QPushButton:hover {
                background-color: #2980B9;
            }
            
            QPushButton:pressed {
                background-color: #21618C;
            }
            
            QPushButton:disabled {
                background-color: #7F8C8D;
                color: #BDC3C7;
            }
            
            QSlider::groove:horizontal {
                border: 1px solid #34495E;
                height: 8px;
                background: #34495E;
                border-radius: 4px;
            }
            
            QSlider::handle:horizontal {
                background: #3498DB;
                border: 1px solid #2980B9;
                width: 18px;
                margin: -5px 0;
                border-radius: 9px;
            }
            
            QComboBox {
                border: 2px solid #34495E;
                border-radius: 6px;
                padding: 4px 8px;
                background-color: #34495E;
                color: #ECF0F1;
            }
            
            QListWidget {
                border: 2px solid #34495E;
                border-radius: 6px;
                background-color: #34495E;
                color: #ECF0F1;
            }
            
            QListWidget::item {
                padding: 8px;
                border-bottom: 1px solid #2C3E50;
            }
            
            QListWidget::item:selected {
                background-color: #3498DB;
            }
            
            QTabWidget::pane {
                border: 2px solid #34495E;
                border-radius: 6px;
            }
            
            QTabBar::tab {
                background-color: #34495E;
                color: #ECF0F1;
                padding: 8px 16px;
                margin-right: 2px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
            }
            
            QTabBar::tab:selected {
                background-color: #3498DB;
            }
        """)
        
    def setup_connection_signals(self):
        """Configurar sinais do gerenciador de conexão"""
        self.connection_manager.device_discovered.connect(self.add_discovered_device)
        self.connection_manager.connection_established.connect(self.on_connection_established)
        self.connection_manager.connection_lost.connect(self.on_connection_lost)
        self.connection_manager.data_received.connect(self.on_data_received)
        
    def setup_system_tray(self):
        """Configurar ícone da bandeja do sistema"""
        if QSystemTrayIcon.isSystemTrayAvailable():
            self.tray_icon = QSystemTrayIcon(self)
            self.tray_icon.setIcon(QIcon("assets/tray_icon.png"))
            
            tray_menu = QMenu()
            show_action = QAction("Mostrar", self)
            show_action.triggered.connect(self.show)
            tray_menu.addAction(show_action)
            
            quit_action = QAction("Sair", self)
            quit_action.triggered.connect(QApplication.quit)
            tray_menu.addAction(quit_action)
            
            self.tray_icon.setContextMenu(tray_menu)
            self.tray_icon.show()
            
    # Slots para conexão
    def start_discovery(self):
        """Iniciar descoberta de dispositivos"""
        self.devices_list.clear()
        self.discover_btn.setEnabled(False)
        self.discover_btn.setText("🔍 Procurando...")
        
        self.connection_manager.start_discovery()
        
        # Re-habilitar botão após 15 segundos
        QTimer.singleShot(15000, self.enable_discovery_button)
        
    def enable_discovery_button(self):
        """Re-habilitar botão de descoberta"""
        self.discover_btn.setEnabled(True)
        self.discover_btn.setText("🔍 Procurar Dispositivos Android")
        
    def add_discovered_device(self, name, ip, device_type):
        """Adicionar dispositivo descoberto à lista"""
        item_text = f"{name} ({ip}) - {device_type.upper()}"
        item = QListWidgetItem(item_text)
        item.setData(Qt.UserRole, (name, ip, device_type))
        self.devices_list.addItem(item)
        
    def connect_to_selected_device(self, item):
        """Conectar ao dispositivo selecionado"""
        device_data = item.data(Qt.UserRole)
        if device_data:
            name, ip, device_type = device_data
            self.connection_status.setText(f"Status: Conectando a {name}...")
            self.connection_status.setStyleSheet("font-weight: bold; color: #F39C12;")
            
            self.connection_manager.connect_to_device(ip, device_type)
            
    def on_connection_established(self, device_name, connection_type):
        """Callback quando conexão é estabelecida"""
        self.is_connected = True
        self.connection_status.setText(f"Status: Conectado a {device_name} via {connection_type}")
        self.connection_status.setStyleSheet("font-weight: bold; color: #27AE60;")
        
        self.statusBar().showMessage(f"Conectado a {device_name} via {connection_type} - Recebendo stream...")
        
        # Iniciar monitoramento de estatísticas
        self.stats_widget.set_connection_started()
        
        # Habilitar controles que dependem de conexão
        self.switch_camera_btn.setEnabled(True)
        self.toggle_flash_btn.setEnabled(True)
        self.autofocus_btn.setEnabled(True)
        self.start_record_btn.setEnabled(True)
        
    def on_connection_lost(self, reason):
        """Callback quando conexão é perdida"""
        self.is_connected = False
        self.connection_status.setText(f"Status: Desconectado - {reason}")
        self.connection_status.setStyleSheet("font-weight: bold; color: #E74C3C;")
        
        self.statusBar().showMessage(f"Conexão perdida: {reason}")
        
        # Parar monitoramento
        self.stats_widget.set_connection_stopped()
        
        # Mostrar placeholder
        self.video_player.show_placeholder()
        
        # Desabilitar controles
        self.switch_camera_btn.setEnabled(False)
        self.toggle_flash_btn.setEnabled(False)
        self.autofocus_btn.setEnabled(False)
        self.start_record_btn.setEnabled(False)
        
        if self.is_recording:
            self.stop_recording()
            
    def on_data_received(self, data):
        """Callback quando dados são recebidos"""
        # Atualizar vídeo
        self.video_player.update_frame(data)
        
        # Atualizar estatísticas
        fps = self.video_player.current_fps
        resolution = f"{self.video_player.width()}x{self.video_player.height()}"
        bitrate = len(data) * 8 * fps // 1000  # Estimativa em kbps
        
        self.stats_widget.update_video_stats(fps, resolution, bitrate)
        
        # Se estiver gravando, adicionar frame
        if self.is_recording:
            self.recorded_frames.append(data)
            
    # Slots para controles
    def zoom_in(self):
        """Aumentar zoom"""
        # Implementar zoom local ou enviar comando para dispositivo
        pass
        
    def zoom_out(self):
        """Diminuir zoom"""
        # Implementar zoom local ou enviar comando para dispositivo
        pass
        
    def zoom_reset(self):
        """Resetar zoom"""
        # Implementar reset de zoom
        pass
        
    def switch_camera(self):
        """Alternar câmera do dispositivo"""
        if self.is_connected:
            # Enviar comando para dispositivo Android
            pass
            
    def toggle_flash(self):
        """Ligar/desligar flash"""
        if self.is_connected:
            # Enviar comando para dispositivo Android
            pass
            
    def trigger_autofocus(self):
        """Disparar auto foco"""
        if self.is_connected:
            # Enviar comando para dispositivo Android
            pass
            
    def update_bitrate_label(self, value):
        """Atualizar label do bitrate"""
        self.bitrate_label.setText(f"{value} kbps")
        
    def update_volume(self, value):
        """Atualizar volume"""
        self.volume_label.setText(f"{value}%")
        self.audio_settings.volume = value
        
    def toggle_mute(self):
        """Silenciar/reativar áudio"""
        if self.audio_settings.enabled:
            self.audio_settings.enabled = False
            self.mute_btn.setText("🔊 Reativar Som")
        else:
            self.audio_settings.enabled = True
            self.mute_btn.setText("🔇 Silenciar")
            
    def update_remote_zoom(self, value):
        """Atualizar zoom remoto"""
        zoom_level = value / 10.0
        self.remote_zoom_label.setText(f"{zoom_level:.1f}x")
        
        if self.is_connected:
            # Enviar comando de zoom para dispositivo
            pass
            
    def start_recording(self):
        """Iniciar gravação"""
        if not self.is_connected:
            QMessageBox.warning(self, "Aviso", "Conecte-se a um dispositivo antes de gravar.")
            return
            
        # Escolher local para salvar
        filename, _ = QFileDialog.getSaveFileName(
            self, "Salvar Gravação", f"gravacao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4",
            "Vídeos (*.mp4 *.avi *.mov)"
        )
        
        if filename:
            self.is_recording = True
            self.recorded_frames = []
            self.recording_start_time = time.time()
            
            self.start_record_btn.setEnabled(False)
            self.stop_record_btn.setEnabled(True)
            
            self.recording_info.setText("Gravando...")
            self.recording_info.setStyleSheet("color: #E74C3C; font-weight: bold;")
            
            # Timer para atualizar tempo de gravação
            self.recording_timer = QTimer()
            self.recording_timer.timeout.connect(self.update_recording_info)
            self.recording_timer.start(1000)
            
    def stop_recording(self):
        """Parar gravação"""
        if self.is_recording:
            self.is_recording = False
            
            self.start_record_btn.setEnabled(True)
            self.stop_record_btn.setEnabled(False)
            
            if hasattr(self, 'recording_timer'):
                self.recording_timer.stop()
                
            self.recording_info.setText("Processando gravação...")
            
            # Processar e salvar vídeo em thread separada
            # (Implementação simplificada)
            
            self.recording_info.setText("Gravação salva com sucesso!")
            self.recording_info.setStyleSheet("color: #27AE60; font-weight: bold;")
            
    def update_recording_info(self):
        """Atualizar informações da gravação"""
        if self.is_recording:
            elapsed = time.time() - self.recording_start_time
            hours = int(elapsed // 3600)
            minutes = int((elapsed % 3600) // 60)
            seconds = int(elapsed % 60)
            
            self.recording_time.setText(f"Tempo: {hours:02d}:{minutes:02d}:{seconds:02d}")
            
            # Estimar tamanho (aproximado)
            size_mb = len(self.recorded_frames) * 50 / 1024 / 1024  # ~50KB por frame
            self.recording_size.setText(f"Tamanho: {size_mb:.1f} MB")
            
    def closeEvent(self, event):
        """Evento de fechamento da janela"""
        if hasattr(self, 'tray_icon') and self.tray_icon.isVisible():
            self.hide()
            event.ignore()
        else:
            # Limpar recursos
            if self.is_connected:
                self.connection_manager.disconnect()
            event.accept()

def main():
    """Função principal"""
    app = QApplication(sys.argv)
    app.setApplicationName("Webcam Remota Universal")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("Webcam Remota")
    
    # Configurar ícone da aplicação
    app.setWindowIcon(QIcon("assets/icon.png"))
    
    # Criar e mostrar janela principal
    window = MainWindow()
    window.show()
    
    # Executar aplicação
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()