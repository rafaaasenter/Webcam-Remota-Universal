# Guia de Instalação - Webcam Remota Universal

Este guia irá ajudá-lo a instalar e configurar o sistema completo de webcam remota com aplicativo Android (.apk) e programa Windows (.exe).

## 📋 Pré-requisitos

### Para Compilação (Desenvolvedores)

#### Android
- **Android Studio** 4.0 ou superior
- **Android SDK** API 21+ (Android 5.0+)
- **JDK** 8 ou superior
- **Gradle** 7.0+ (incluído no Android Studio)

#### Windows
- **Python** 3.8 ou superior
- **pip** (gerenciador de pacotes Python)
- **Visual Studio Build Tools** (para compilação de dependências nativas)

### Para Uso (Usuários Finais)

#### Android
- **Android 5.0 (API 21)** ou superior
- **50 MB** de espaço livre
- **Câmera** (frontal e/ou traseira)
- **Conexão Wi-Fi** ou **cabo USB**

#### Windows
- **Windows 7, 8, 10 ou 11** (32 ou 64 bits)
- **200 MB** de espaço livre
- **2 GB RAM** (mínimo), 4 GB recomendado
- **Conexão de rede** (Wi-Fi ou Ethernet)

## 🚀 Instalação Rápida (Usuários)

### 1. Download dos Arquivos

**Opção A - Releases (Recomendado)**
1. Acesse a página de [Releases](https://github.com/seu-usuario/webcam-remota-universal/releases)
2. Baixe a versão mais recente:
   - `WebcamRemota-Android-v1.0.0.apk` (para Android)
   - `WebcamRemota-PC-v1.0.0.exe` (para Windows)

**Opção B - Compilar do Código**
```bash
git clone https://github.com/seu-usuario/webcam-remota-universal.git
cd webcam-remota-universal
chmod +x build-scripts/build-all.sh
./build-scripts/build-all.sh
```

### 2. Instalação no Android

1. **Transfira o APK** para seu dispositivo Android via:
   - Email para si mesmo
   - Google Drive/OneDrive
   - Cabo USB
   - Bluetooth

2. **Habilite fontes desconhecidas**:
   - Vá em **Configurações** > **Segurança**
   - Ative **"Fontes desconhecidas"** ou **"Instalar apps desconhecidos"**
   - No Android 8+: permita instalação para o app específico (navegador, gerenciador de arquivos)

3. **Instale o aplicativo**:
   - Toque no arquivo `.apk` baixado
   - Confirme a instalação
   - Aguarde a conclusão

4. **Conceda permissões**:
   - Abra o app **"Webcam Remota Universal"**
   - Permita acesso à **Câmera**
   - Permita acesso ao **Microfone**
   - Permita acesso à **Rede**

### 3. Instalação no Windows

1. **Execute o programa**:
   - Clique duas vezes em `WebcamRemota-PC-v1.0.0.exe`
   - **Não requer instalação** - é um executável portátil

2. **Configuração do Firewall** (se necessário):
   - O Windows pode perguntar sobre acesso à rede
   - Clique em **"Permitir acesso"** para redes privadas
   - Isto é necessário para descoberta de dispositivos

3. **Teste de funcionamento**:
   - O programa deve abrir automaticamente
   - Você verá a interface principal
   - Na parte inferior, será mostrado o IP do PC

## 🔧 Compilação Avançada (Desenvolvedores)

### Configuração do Ambiente Android

1. **Instale o Android Studio**:
   ```bash
   # Ubuntu/Debian
   sudo snap install android-studio --classic
   
   # Windows - baixe do site oficial
   # https://developer.android.com/studio
   ```

2. **Configure variáveis de ambiente**:
   ```bash
   # Linux/Mac - adicione ao ~/.bashrc ou ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   
   # Windows - configure via Painel de Controle
   # ANDROID_HOME = C:\Users\SeuUsuario\AppData\Local\Android\Sdk
   ```

3. **Instale SDKs necessários**:
   ```bash
   # Via sdkmanager
   sdkmanager "platforms;android-21"
   sdkmanager "platforms;android-34"
   sdkmanager "build-tools;34.0.0"
   ```

### Configuração do Ambiente Python

1. **Instale Python**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-dev
   
   # Windows - baixe de python.org
   # Certifique-se de marcar "Add to PATH"
   ```

2. **Instale dependências do sistema** (Linux):
   ```bash
   sudo apt install python3-pyqt5 python3-pyqt5.qtmultimedia
   sudo apt install libpulse-dev portaudio19-dev
   sudo apt install python3-opencv
   ```

3. **Instale dependências Python**:
   ```bash
   cd windows-app
   pip install -r requirements.txt
   ```

### Compilação Passo a Passo

#### Compilar Android
```bash
cd android-app

# Limpar builds anteriores
./gradlew clean

# Compilar APK de debug
./gradlew assembleDebug

# Compilar APK de release
./gradlew assembleRelease

# APK será gerado em:
# app/build/outputs/apk/release/app-release.apk
```

#### Compilar Windows
```bash
cd windows-app

# Instalar dependências
pip install -r requirements.txt

# Gerar executável
pyinstaller --onefile --windowed --name "WebcamRemota-PC" main.py

# Executável será gerado em:
# dist/WebcamRemota-PC.exe
```

## 🛠️ Solução de Problemas

### Problemas no Android

**Erro: "App não instalado"**
- Verifique se habilitou "Fontes desconhecidas"
- Baixe o APK novamente (pode estar corrompido)
- Verifique espaço livre (mínimo 50 MB)

**Erro: "Permissões negadas"**
- Vá em Configurações > Apps > Webcam Remota > Permissões
- Habilite manualmente Câmera, Microfone e Armazenamento

**App trava ao abrir**
- Reinicie o dispositivo
- Feche outros apps de câmera
- Verifique se o Android é 5.0+

### Problemas no Windows

**Erro: "MSVCP140.dll não encontrado"**
```bash
# Instale Visual C++ Redistributable 2015-2022
# Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
```

**Erro: "Não foi possível carregar PyQt5"**
```bash
pip uninstall PyQt5
pip install PyQt5==5.15.7
```

**Programa não detecta dispositivos Android**
- Verifique se ambos estão na mesma rede Wi-Fi
- Desative temporariamente firewall/antivírus
- Teste conexão manual com IP específico

### Problemas de Conectividade

**Dispositivos não se encontram**
1. Confirme que estão na mesma rede Wi-Fi
2. Reinicie o roteador Wi-Fi
3. Use conexão manual:
   - Anote IP do PC (mostrado no programa Windows)
   - No Android: "Conectar Manualmente" > Digite o IP

**Qualidade de vídeo baixa**
1. Aproxime dispositivos do roteador
2. Feche outros apps que usam internet
3. Diminua resolução/FPS nas configurações
4. Use cabo USB se disponível

**Latência alta**
1. Use rede 5GHz se disponível
2. Feche downloads/streaming
3. Configure QoS no roteador para priorizar tráfego local

## 📞 Suporte Técnico

### Logs e Diagnóstico

**Android**
```bash
# Conecte via USB e execute:
adb logcat | grep "WebcamRemota"
```

**Windows**
- Logs são salvos em: `%APPDATA%\WebcamRemota\logs\`
- Execute o programa via prompt para ver logs em tempo real

### Informações para Suporte

Ao reportar problemas, inclua:
1. **Versão do app** (Android e Windows)
2. **Modelo do dispositivo** Android e versão do Android
3. **Versão do Windows**
4. **Tipo de rede** (Wi-Fi 2.4GHz/5GHz, roteador)
5. **Logs de erro** se disponíveis
6. **Passos para reproduzir** o problema

### Contato

- **Issues GitHub**: [github.com/seu-usuario/webcam-remota-universal/issues](https://github.com/seu-usuario/webcam-remota-universal/issues)
- **Email**: suporte@webcamremota.com
- **Documentação**: [wiki do projeto](https://github.com/seu-usuario/webcam-remota-universal/wiki)

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. **Leia o [README.md](README.md)** para instruções de uso
2. **Teste a conexão** entre os dispositivos
3. **Configure qualidade** conforme sua rede
4. **Explore recursos avançados** como gravação e zoom

---

**Webcam Remota Universal** - Transforme seu Android em uma webcam profissional! 📱➡️💻