#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utilitários auxiliares
Webcam Remota Universal - Utilitários
"""

import os
import sys
import socket
import platform
import psutil
from datetime import datetime, timedelta
from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtGui import QIcon, QPixmap
from PyQt5.QtWidgets import QMessageBox

def get_local_ip():
    """Obter endereço IP local da máquina"""
    try:
        # Conectar a um endereço externo para determinar interface ativa
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def get_system_info():
    """Obter informações do sistema"""
    return {
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "processor": platform.processor(),
        "ram": get_size(psutil.virtual_memory().total),
        "local_ip": get_local_ip()
    }

def get_size(size_bytes):
    """Converter bytes para formato legível"""
    if size_bytes == 0:
        return "0B"
    size_name = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

def format_duration(seconds):
    """Formatar duração em segundos para HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def calculate_bitrate(bytes_received, duration_seconds):
    """Calcular bitrate em kbps"""
    if duration_seconds == 0:
        return 0
    bits = bytes_received * 8
    kbps = (bits / duration_seconds) / 1000
    return round(kbps, 2)

def is_port_available(port):
    """Verificar se uma porta está disponível"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
            return True
    except OSError:
        return False

def find_available_port(start_port=5000, max_attempts=100):
    """Encontrar uma porta disponível"""
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    return None

def resource_path(relative_path):
    """Obter caminho para recursos (funciona com PyInstaller)"""
    try:
        # PyInstaller cria uma pasta temp e armazena o caminho em _MEIPASS
        base_path = sys._MEIPASS
    except AttributeError:
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)

def show_error_dialog(parent, title, message, details=None):
    """Mostrar dialog de erro"""
    msg_box = QMessageBox(parent)
    msg_box.setIcon(QMessageBox.Critical)
    msg_box.setWindowTitle(title)
    msg_box.setText(message)
    
    if details:
        msg_box.setDetailedText(details)
    
    msg_box.exec_()

def show_info_dialog(parent, title, message):
    """Mostrar dialog de informação"""
    msg_box = QMessageBox(parent)
    msg_box.setIcon(QMessageBox.Information)
    msg_box.setWindowTitle(title)
    msg_box.setText(message)
    msg_box.exec_()

def show_warning_dialog(parent, title, message):
    """Mostrar dialog de aviso"""
    msg_box = QMessageBox(parent)
    msg_box.setIcon(QMessageBox.Warning)
    msg_box.setWindowTitle(title)
    msg_box.setText(message)
    msg_box.exec_()

class NetworkTestThread(QThread):
    """Thread para testar conectividade de rede"""
    
    result_ready = pyqtSignal(bool, str)  # success, message
    
    def __init__(self, host, port):
        super().__init__()
        self.host = host
        self.port = port
    
    def run(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((self.host, self.port))
            sock.close()
            
            if result == 0:
                self.result_ready.emit(True, f"Conexão com {self.host}:{self.port} bem-sucedida")
            else:
                self.result_ready.emit(False, f"Não foi possível conectar a {self.host}:{self.port}")
                
        except Exception as e:
            self.result_ready.emit(False, f"Erro na conexão: {str(e)}")

import math