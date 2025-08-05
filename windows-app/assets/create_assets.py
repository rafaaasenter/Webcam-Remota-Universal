#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para criar assets básicos do programa Windows
Webcam Remota Universal - Gerador de Assets
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_icon():
    """Criar ícone do aplicativo"""
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circular azul
    margin = 20
    draw.ellipse([margin, margin, size-margin, size-margin], fill=(33, 150, 243, 255))
    
    # Câmera simples
    # Corpo da câmera
    cam_margin = 60
    draw.rectangle([cam_margin, cam_margin+30, size-cam_margin, size-cam_margin-10], 
                   fill=(255, 255, 255, 255))
    
    # Lente
    lens_center = size // 2
    lens_radius = 35
    draw.ellipse([lens_center-lens_radius, lens_center-lens_radius+10, 
                  lens_center+lens_radius, lens_center+lens_radius+10], 
                 fill=(64, 64, 64, 255))
    
    # Lente interna
    inner_radius = 20
    draw.ellipse([lens_center-inner_radius, lens_center-inner_radius+10, 
                  lens_center+inner_radius, lens_center+inner_radius+10], 
                 fill=(0, 0, 0, 255))
    
    # Flash
    flash_size = 12
    draw.ellipse([cam_margin+20, cam_margin+35, cam_margin+20+flash_size, cam_margin+35+flash_size], 
                 fill=(255, 255, 0, 255))
    
    # Salvar em múltiplos tamanhos
    for icon_size in [16, 32, 48, 64, 128, 256]:
        resized = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        resized.save(f'icon_{icon_size}.png')
    
    # Salvar ICO para Windows
    img.save('icon.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
    
    print("✅ Ícones criados com sucesso!")

def create_tray_icon():
    """Criar ícone para bandeja do sistema"""
    size = 64
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Ícone minimalista para bandeja
    # Círculo de fundo
    draw.ellipse([8, 8, size-8, size-8], fill=(33, 150, 243, 255))
    
    # Câmera simples
    cam_size = 20
    cam_x = (size - cam_size) // 2
    cam_y = (size - cam_size) // 2
    
    # Corpo
    draw.rectangle([cam_x, cam_y+3, cam_x+cam_size, cam_y+cam_size-3], fill=(255, 255, 255, 255))
    
    # Lente
    lens_radius = 6
    lens_center_x = cam_x + cam_size // 2
    lens_center_y = cam_y + cam_size // 2
    draw.ellipse([lens_center_x-lens_radius, lens_center_y-lens_radius, 
                  lens_center_x+lens_radius, lens_center_y+lens_radius], 
                 fill=(0, 0, 0, 255))
    
    img.save('tray_icon.png')
    print("✅ Ícone da bandeja criado!")

def create_splash_screen():
    """Criar tela de splash"""
    width, height = 600, 400
    img = Image.new('RGB', (width, height), (44, 62, 80))
    draw = ImageDraw.Draw(img)
    
    # Gradiente simulado
    for y in range(height):
        color_ratio = y / height
        r = int(44 + (52 - 44) * color_ratio)
        g = int(62 + (73 - 62) * color_ratio)  
        b = int(80 + (94 - 80) * color_ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Título
    try:
        # Tentar usar fonte padrão
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_medium = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        # Fallback para fonte padrão
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Texto principal
    title = "Webcam Remota Universal"
    subtitle = "Receptor PC - Versão 1.0.0"
    description = "Sistema profissional de streaming para Android"
    
    # Calcular posições centralizadas
    title_bbox = draw.textbbox((0, 0), title, font=font_large)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_medium)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    
    desc_bbox = draw.textbbox((0, 0), description, font=font_small)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (width - desc_width) // 2
    
    # Desenhar textos
    draw.text((title_x, height//2 - 60), title, fill=(255, 255, 255), font=font_large)
    draw.text((subtitle_x, height//2 - 10), subtitle, fill=(189, 195, 199), font=font_medium)
    draw.text((desc_x, height//2 + 20), description, fill=(149, 165, 166), font=font_small)
    
    # Logo/ícone simplificado
    logo_size = 80
    logo_x = (width - logo_size) // 2
    logo_y = height//2 - 140
    
    # Círculo de fundo do logo
    draw.ellipse([logo_x, logo_y, logo_x + logo_size, logo_y + logo_size], 
                 fill=(52, 152, 219))
    
    # Câmera no logo
    cam_margin = 20
    draw.rectangle([logo_x + cam_margin, logo_y + cam_margin + 10, 
                    logo_x + logo_size - cam_margin, logo_y + logo_size - cam_margin - 5], 
                   fill=(255, 255, 255))
    
    # Lente do logo
    lens_center_x = logo_x + logo_size // 2
    lens_center_y = logo_y + logo_size // 2
    lens_radius = 15
    draw.ellipse([lens_center_x - lens_radius, lens_center_y - lens_radius, 
                  lens_center_x + lens_radius, lens_center_y + lens_radius], 
                 fill=(0, 0, 0))
    
    img.save('splash.png')
    print("✅ Tela de splash criada!")

def create_button_icons():
    """Criar ícones para botões"""
    icons = {
        'play': '▶',
        'stop': '⏹',
        'record': '⏺',
        'settings': '⚙',
        'connect': '🔗',
        'disconnect': '❌',
        'camera': '📷',
        'zoom_in': '🔍+',
        'zoom_out': '🔍-',
        'fullscreen': '⛶'
    }
    
    size = 64
    for name, symbol in icons.items():
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Círculo de fundo
        margin = 8
        draw.ellipse([margin, margin, size-margin, size-margin], 
                     fill=(52, 152, 219, 255))
        
        # Símbolo
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        # Centralizar texto
        text_bbox = draw.textbbox((0, 0), symbol, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2
        
        draw.text((text_x, text_y), symbol, fill=(255, 255, 255), font=font)
        
        img.save(f'{name}_icon.png')
    
    print("✅ Ícones de botões criados!")

def main():
    """Criar todos os assets"""
    print("🎨 Criando assets para Webcam Remota Universal...")
    
    # Criar diretório se não existir
    os.makedirs('assets', exist_ok=True)
    os.chdir('assets')
    
    create_icon()
    create_tray_icon() 
    create_splash_screen()
    create_button_icons()
    
    print("\n🎉 Todos os assets foram criados com sucesso!")
    print("📁 Arquivos criados no diretório 'assets/':")
    
    for file in os.listdir('.'):
        print(f"   - {file}")

if __name__ == "__main__":
    main()