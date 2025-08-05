#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configurações do programa Windows
Webcam Remota Universal - Configurações
"""

import os
import json
from pathlib import Path

class Config:
    """Gerenciador de configurações do aplicativo"""
    
    def __init__(self):
        self.config_dir = Path.home() / ".webcamremota"
        self.config_file = self.config_dir / "config.json"
        self.ensure_config_dir()
        self.load_config()
    
    def ensure_config_dir(self):
        """Criar diretório de configuração se não existir"""
        self.config_dir.mkdir(exist_ok=True)
    
    def load_config(self):
        """Carregar configurações do arquivo"""
        default_config = {
            "video": {
                "default_resolution": "720p",
                "default_fps": 30,
                "default_bitrate": 2000,
                "auto_quality": True
            },
            "audio": {
                "enabled": True,
                "volume": 80,
                "sample_rate": 44100
            },
            "network": {
                "discovery_port": 8888,
                "streaming_port": 5000,
                "timeout": 10
            },
            "ui": {
                "remember_window_size": True,
                "minimize_to_tray": True,
                "auto_start_discovery": False
            },
            "recording": {
                "default_format": "mp4",
                "default_quality": "alta",
                "save_location": str(Path.home() / "Videos" / "WebcamRemota")
            }
        }
        
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
                    # Merge with defaults for missing keys
                    self.config = {**default_config, **loaded_config}
            except Exception as e:
                print(f"Erro ao carregar configurações: {e}")
                self.config = default_config
        else:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """Salvar configurações no arquivo"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Erro ao salvar configurações: {e}")
    
    def get(self, key_path, default=None):
        """Obter valor de configuração usando caminho de chave (ex: 'video.resolution')"""
        keys = key_path.split('.')
        value = self.config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
                
        return value
    
    def set(self, key_path, value):
        """Definir valor de configuração usando caminho de chave"""
        keys = key_path.split('.')
        config_ref = self.config
        
        for key in keys[:-1]:
            if key not in config_ref:
                config_ref[key] = {}
            config_ref = config_ref[key]
        
        config_ref[keys[-1]] = value
        self.save_config()

# Instância global de configuração
config = Config()