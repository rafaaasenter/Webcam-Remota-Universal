# Scripts de Compilação - Webcam Remota Universal

Este diretório contém os scripts automatizados para compilar os aplicativos Android (.apk) e Windows (.exe) do projeto Webcam Remota Universal.

## 📋 Scripts Disponíveis

### `build-android.sh` 
**Compila o aplicativo Android (.apk)**

- Verifica se o Android SDK está configurado
- Executa limpeza de builds anteriores
- Baixa dependências via Gradle
- Compila APK de release otimizado
- Gera arquivo final: `dist/WebcamRemota-Android-v1.0.0.apk`

**Uso:**
```bash
chmod +x build-scripts/build-android.sh
./build-scripts/build-android.sh
```

**Requisitos:**
- Android Studio instalado
- ANDROID_HOME configurado
- Java JDK 8+

### `build-windows.bat`
**Compila o programa Windows (.exe)**

- Verifica se Python está instalado
- Instala dependências via pip
- Compila executável único com PyInstaller
- Gera arquivo final: `dist/WebcamRemota-PC-v1.0.0.exe`

**Uso:**
```cmd
build-scripts\build-windows.bat
```

**Requisitos:**
- Python 3.8+ instalado
- pip atualizado
- Visual Studio Build Tools (para dependências nativas)

### `build-all.sh`
**Compila ambos os aplicativos automaticamente**

- Executa build do Android
- Executa build do Windows (se no Windows)
- Gera relatório final com arquivos criados
- Mostra instruções de uso

**Uso:**
```bash
chmod +x build-scripts/build-all.sh
./build-scripts/build-all.sh
```

## 📁 Estrutura de Saída

Após a compilação, os arquivos são organizados em:

```
dist/
├── WebcamRemota-Android-v1.0.0.apk    # App Android (15-20 MB)
└── WebcamRemota-PC-v1.0.0.exe         # Programa Windows (40-60 MB)
```

## 🔧 Configuração do Ambiente

### Android (Linux/Mac/Windows)

1. **Instale o Android Studio**:
   - Download: https://developer.android.com/studio
   - Inclui Android SDK, build tools e emulador

2. **Configure variáveis de ambiente**:
   ```bash
   # Linux/Mac
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   
   # Windows
   # Adicione via Painel de Controle > Sistema > Variáveis de Ambiente
   # ANDROID_HOME = C:\Users\SeuUsuario\AppData\Local\Android\Sdk
   ```

3. **Verifique a instalação**:
   ```bash
   adb version
   gradle --version
   ```

### Windows/Python

1. **Instale Python 3.8+**:
   - Download: https://python.org
   - ⚠️ Marque "Add Python to PATH" durante instalação

2. **Instale Visual Studio Build Tools** (necessário para dependências nativas):
   - Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Selecione "C++ build tools" durante instalação

3. **Verifique a instalação**:
   ```cmd
   python --version
   pip --version
   ```

## 🐛 Solução de Problemas

### Erro: "ANDROID_HOME not found"
```bash
# Verifique se Android Studio está instalado
ls $HOME/Android/Sdk
# ou Windows: dir %LOCALAPPDATA%\Android\Sdk

# Configure manualmente se necessário
export ANDROID_HOME=$HOME/Android/Sdk  # Linux/Mac
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk  # Windows
```

### Erro: "gradlew: Permission denied"
```bash
chmod +x android-app/gradlew
```

### Erro: "Python command not found"
```bash
# Linux/Ubuntu
sudo apt install python3 python3-pip

# Windows - reinstale Python marcando "Add to PATH"
```

### Erro: "Microsoft Visual C++ 14.0 is required"
```bash
# Instale Visual Studio Build Tools
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### Erro: "No space left on device"
```bash
# Limpe builds anteriores
./gradlew clean
rm -rf android-app/build
rm -rf windows-app/build
```

### Erro: "Task failed with exit code 1"
```bash
# Compile em modo verbose para mais detalhes
./gradlew assembleRelease --stacktrace --info
```

## ⚙️ Personalização dos Builds

### Modificar versão do app
```kotlin
// android-app/app/build.gradle
android {
    defaultConfig {
        versionCode 2
        versionName "1.1.0"
    }
}
```

### Modificar nome do executável Windows
```python
# Editar build-windows.bat linha do PyInstaller:
--name "MeuWebcamApp-PC"
```

### Adicionar ícone personalizado
```bash
# Android: substitua os arquivos em
android-app/app/src/main/res/mipmap/

# Windows: adicione parâmetro no PyInstaller
--icon "assets/icon.ico"
```

### Build de debug (desenvolvimento)
```bash
# Android
./gradlew assembleDebug

# Windows - modo debug com console
python main.py
```

## 📊 Otimizações de Build

### Android
- **ProGuard habilitado**: Reduz tamanho do APK
- **Compressão de recursos**: Remove recursos não utilizados
- **Assinatura automática**: Usa debug keystore para builds rápidos

### Windows
- **PyInstaller --onefile**: Gera executável único
- **UPX compression**: Comprime executável (opcional)
- **Exclude modules**: Remove módulos desnecessários

## 🔄 Integração Contínua

Exemplo de configuração para GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build Apps
on: [push, pull_request]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
      - run: ./build-scripts/build-android.sh
      
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - run: build-scripts\build-windows.bat
```

## 📝 Logs de Build

Os logs são salvos em:
- Android: `android-app/build/outputs/logs/`
- Windows: Console do terminal durante build

Para debug avançado:
```bash
# Android verbose
./gradlew assembleRelease --debug --stacktrace

# Windows verbose
pyinstaller --log-level DEBUG main.py
```

---

**Desenvolvido para Webcam Remota Universal** 📱➡️💻