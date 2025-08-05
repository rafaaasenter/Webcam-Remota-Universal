# Webcam Remota Universal

Sistema completo de webcam remota com aplicativo Android (.apk) e programa Windows (.exe) totalmente em português para streaming profissional via Wi-Fi/USB.

## 📱 Características Principais

### Aplicativo Android (.apk)
- **Interface nativa em português** com design Material
- **Streaming de alta qualidade** até 4K (3840x2160) a 60fps
- **Controles avançados da câmera**: zoom, foco, flash, alternância frontal/traseira
- **Conexão Wi-Fi e USB** com descoberta automática de PCs
- **Serviço em background** para manter streaming quando minimizado
- **Configurações de qualidade** personalizáveis em tempo real

### Programa Windows (.exe)
- **Interface profissional em português** construída com PyQt5
- **Player de vídeo avançado** com controles de zoom e qualidade
- **Gravação de sessões** em múltiplos formatos (MP4, AVI, MOV)
- **Estatísticas em tempo real** (FPS, latência, bitrate, qualidade)
- **Controles remotos da câmera** diretamente do PC
- **Sistema de bandeja** para operação em background
- **Multi-dispositivos** - conecte vários Android simultaneamente

## 🚀 Funcionalidades Avançadas

### Conectividade
- **Descoberta automática** de dispositivos na rede local
- **Conexão manual** via IP quando necessário
- **Modo USB** como alternativa ao Wi-Fi
- **Protocolo otimizado** para baixa latência

### Qualidade de Vídeo
- **Resoluções**: 480p, 720p HD, 1080p Full HD, 4K
- **Taxa de quadros**: 15, 24, 30, 60 FPS
- **Bitrate adaptativo**: 500 kbps até 8000 kbps
- **Codec H.264** para máxima compatibilidade

### Segurança
- **Criptografia de conexão** para proteger o stream
- **Autenticação de dispositivos** antes da conexão
- **Operação apenas em rede local** para máxima segurança

## 📋 Requisitos do Sistema

### Android
- **Android 5.0 (API 21)** ou superior
- **Câmera traseira e/ou frontal**
- **Microfone** (opcional)
- **Wi-Fi** ou **conexão USB**
- **50 MB** de espaço livre

### Windows
- **Windows 7, 8, 10 ou 11** (32 ou 64 bits)
- **2 GB RAM** mínimo (4 GB recomendado)
- **200 MB** de espaço livre
- **Placa de rede** Wi-Fi ou Ethernet

## 🔧 Instalação

### Compilar do Código Fonte

1. **Clone o repositório**:
```bash
git clone https://github.com/rafaaasenter/webcam-remota-universal.git
cd webcam-remota-universal
```

2. **Compile ambos os aplicativos**:
```bash
chmod +x build-scripts/build-all.sh
./build-scripts/build-all.sh
```

3. **Ou compile individualmente**:

**Android**:
```bash
chmod +x build-scripts/build-android.sh
./build-scripts/build-android.sh
```

**Windows** (no Windows):
```cmd
build-scripts\build-windows.bat
```

### Arquivos Gerados
- `dist/WebcamRemota-Android-v1.0.0.apk` - Aplicativo Android
- `dist/WebcamRemota-PC-v1.0.0.exe` - Programa Windows

## 📖 Como Usar

### 1. Instalação no Android
1. Transfira o arquivo `.apk` para seu dispositivo Android
2. Habilite **"Fontes desconhecidas"** nas configurações de segurança
3. Toque no arquivo `.apk` para instalar
4. Conceda as permissões solicitadas (câmera, microfone, rede)

### 2. Instalação no Windows
1. Execute o arquivo `.exe` no seu PC Windows
2. O programa abrirá automaticamente (não requer instalação)

### 3. Primeira Conexão
1. **Conecte ambos os dispositivos na mesma rede Wi-Fi**
2. **Execute primeiro o programa no PC**
3. **Abra o aplicativo no Android**
4. **No Android**: toque em "Procurar PCs na Rede"
5. **Selecione seu PC** da lista de dispositivos encontrados
6. **Toque em "Iniciar Transmissão"**

### 4. Conexão Manual (se necessário)
1. No programa do PC, anote o **endereço IP** mostrado
2. No Android, toque em **"Conectar Manualmente"**
3. Digite o **IP do PC** e a **porta** (padrão: 5000)
4. Toque em **"Conectar"**

## 🎛️ Controles Disponíveis

### No Android
- **Alternar câmera** (frontal ↔ traseira)
- **Flash** liga/desliga
- **Foco** por toque na tela
- **Configurações de qualidade** em tempo real

### No PC
- **Zoom digital** da visualização
- **Controles remotos** da câmera Android
- **Gravação de sessões** em vários formatos
- **Ajustes de qualidade** e áudio
- **Estatísticas detalhadas** da conexão

## 🔍 Solução de Problemas

### Conexão não encontrada
- Verifique se ambos estão na **mesma rede Wi-Fi**
- Desative **firewall/antivírus** temporariamente
- Use **conexão manual** com o IP específico
- Reinicie o **roteador Wi-Fi** se necessário

### Qualidade baixa
- Aproxime os dispositivos do **roteador Wi-Fi**
- Feche **outros apps** que usam internet
- Reduza a **resolução/fps** nas configurações
- Use **conexão USB** se disponível

### App trava ou fecha
- Verifique se concedeu **todas as permissões**
- Feche **outros apps de câmera**
- Reinicie o **dispositivo Android**
- Reinstale o **aplicativo** se necessário

## 📚 Arquitetura Técnica

### Android (Kotlin)
- **Camera2 API** para controle avançado da câmera
- **WebRTC** para streaming P2P de baixa latência  
- **Material Design** para interface moderna
- **Foreground Service** para operação em background
- **UDP Discovery** para encontrar PCs automaticamente

### Windows (Python + PyQt5)
- **PyQt5** para interface nativa profissional
- **OpenCV** para processamento de vídeo
- **Threading** para operações não-bloqueantes
- **Socket Programming** para comunicação direta
- **PyInstaller** para gerar executável único

### Comunicação
- **Protocolo proprietário** otimizado para baixa latência
- **Descoberta UDP** na rede local (porta 8888)
- **Streaming TCP** direto entre dispositivos (porta 5000)
- **Criptografia** de dados para segurança

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um **fork** do projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um **Pull Request**

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/rafaaasenter/webcam-remota-universal/issues)
- **Documentação**: [Wiki do projeto](https://github.com/rafaaasenter/webcam-remota-universal/wiki)
- **Email**: suporte@webcamremota.com

## 🎯 Roadmap

### Versão 1.1 (Próxima)
- [ ] **Múltiplas câmeras** simultâneas
- [ ] **Transmissão via internet** (além de rede local)
- [ ] **Gravação no Android** além do PC
- [ ] **Efeitos de vídeo** em tempo real

### Versão 1.2 (Futuro)
- [ ] **Suporte macOS** e **Linux**
- [ ] **App iOS** complementar
- [ ] **Streaming para web** (browser)
- [ ] **IA para estabilização** de imagem

---

**Webcam Remota Universal** - Transforme seu Android em uma webcam profissional! 📱➡️💻
