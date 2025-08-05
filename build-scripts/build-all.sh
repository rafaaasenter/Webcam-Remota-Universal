#!/bin/bash
# Script principal para compilar ambos os aplicativos
# Webcam Remota Universal - Build Completo

echo "=========================================="
echo "  WEBCAM REMOTA UNIVERSAL - BUILD TOTAL  "
echo "=========================================="
echo ""
echo "Este script irá compilar:"
echo "📱 Aplicativo Android (.apk)"
echo "💻 Programa Windows (.exe)"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "android-app" ] || [ ! -d "windows-app" ]; then
    echo "❌ ERRO: Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Criar diretório de distribuição
mkdir -p dist

echo "🚀 Iniciando compilação completa..."
echo ""

# Compilar aplicativo Android
echo "1️⃣ COMPILANDO APLICATIVO ANDROID"
echo "=================================="
bash build-scripts/build-android.sh

if [ $? -ne 0 ]; then
    echo "❌ Falha na compilação do Android!"
    exit 1
fi

echo ""
echo "2️⃣ COMPILANDO PROGRAMA WINDOWS"
echo "==============================="

# Verificar se estamos no Linux/Mac (para compilação cruzada)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo "ℹ️ Sistema detectado: $OSTYPE"
    echo "Para compilar o programa Windows, execute em um sistema Windows:"
    echo "   build-scripts\\build-windows.bat"
    echo ""
    echo "Ou use Wine para executar o script:"
    echo "   wine cmd /c build-scripts\\build-windows.bat"
else
    # Se estiver no Windows (Git Bash, WSL, etc.)
    echo "Executando compilação Windows..."
    ./build-scripts/build-windows.bat
    
    if [ $? -ne 0 ]; then
        echo "❌ Falha na compilação do Windows!"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "  COMPILAÇÃO COMPLETA FINALIZADA         "
echo "=========================================="
echo ""

# Verificar arquivos gerados
echo "📁 Arquivos gerados em 'dist/':"
echo ""

if [ -f "dist/WebcamRemota-Android-v1.0.0.apk" ]; then
    APK_SIZE=$(du -h "dist/WebcamRemota-Android-v1.0.0.apk" | cut -f1)
    echo "✅ WebcamRemota-Android-v1.0.0.apk ($APK_SIZE)"
else
    echo "❌ WebcamRemota-Android-v1.0.0.apk (não encontrado)"
fi

if [ -f "dist/WebcamRemota-PC-v1.0.0.exe" ]; then
    EXE_SIZE=$(du -h "dist/WebcamRemota-PC-v1.0.0.exe" | cut -f1)
    echo "✅ WebcamRemota-PC-v1.0.0.exe ($EXE_SIZE)"
else
    echo "❌ WebcamRemota-PC-v1.0.0.exe (não encontrado)"
fi

echo ""
echo "📋 INSTRUÇÕES DE USO:"
echo "===================="
echo ""
echo "📱 ANDROID (.apk):"
echo "   1. Transfira o arquivo .apk para seu dispositivo Android"
echo "   2. Habilite 'Fontes desconhecidas' nas configurações"
echo "   3. Instale o aplicativo tocando no arquivo .apk"
echo "   4. Conceda as permissões de câmera, microfone e rede"
echo ""
echo "💻 WINDOWS (.exe):"
echo "   1. Execute o arquivo .exe no seu PC Windows"
echo "   2. O programa abrirá automaticamente"
echo "   3. Clique em 'Procurar Dispositivos Android'"
echo "   4. Aceite a conexão quando solicitada"
echo ""
echo "🔗 CONEXÃO:"
echo "   1. Conecte ambos os dispositivos na mesma rede Wi-Fi"
echo "   2. Execute primeiro o programa no PC"
echo "   3. Abra o aplicativo no Android"
echo "   4. Use 'Procurar PCs' ou conecte manualmente via IP"
echo "   5. Inicie a transmissão e aproveite!"
echo ""
echo "=========================================="
echo "  PRONTO PARA USO!                        "
echo "=========================================="