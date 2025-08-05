#!/bin/bash
# Script para compilar o aplicativo Android (.apk)
# Webcam Remota Universal - Android

echo "=========================================="
echo "  Compilando Aplicativo Android (.apk)   "
echo "=========================================="

# Verificar se o Android SDK está instalado
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ERRO: Android SDK não encontrado!"
    echo "Por favor, instale o Android Studio e configure ANDROID_HOME"
    exit 1
fi

# Navegar para o diretório do projeto Android
cd android-app

echo "📱 Verificando dependências..."

# Verificar se o Gradle Wrapper existe
if [ ! -f "gradlew" ]; then
    echo "❌ ERRO: Gradle Wrapper não encontrado!"
    echo "Execute 'gradle wrapper' primeiro"
    exit 1
fi

# Dar permissão de execução ao gradlew
chmod +x gradlew

echo "🔧 Configurando projeto..."

# Limpar build anterior
./gradlew clean

echo "📦 Baixando dependências..."

# Sincronizar dependências
./gradlew build --stacktrace

echo "🏗️ Compilando aplicativo..."

# Compilar APK de release
./gradlew assembleRelease

# Verificar se a compilação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "✅ Compilação concluída com sucesso!"
    
    # Localizar o APK gerado
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        # Criar diretório de output se não existir
        mkdir -p ../dist
        
        # Copiar APK para diretório de distribuição
        cp "$APK_PATH" "../dist/WebcamRemota-Android-v1.0.0.apk"
        
        echo "📱 APK criado com sucesso!"
        echo "   Localização: dist/WebcamRemota-Android-v1.0.0.apk"
        echo ""
        echo "📋 Informações do APK:"
        
        # Mostrar informações do APK
        $ANDROID_HOME/build-tools/*/aapt dump badging "../dist/WebcamRemota-Android-v1.0.0.apk" | grep -E "(package|versionName|versionCode)"
        
        # Mostrar tamanho do arquivo
        APK_SIZE=$(du -h "../dist/WebcamRemota-Android-v1.0.0.apk" | cut -f1)
        echo "   Tamanho: $APK_SIZE"
        
        echo ""
        echo "🚀 Instalação:"
        echo "   Para instalar no dispositivo Android:"
        echo "   adb install dist/WebcamRemota-Android-v1.0.0.apk"
        echo ""
        echo "   Ou transfira o arquivo .apk para o dispositivo"
        echo "   e instale manualmente habilitando 'Fontes desconhecidas'"
        
    else
        echo "❌ ERRO: APK não encontrado após compilação!"
        exit 1
    fi
    
else
    echo "❌ ERRO: Falha na compilação!"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Compilação Android Finalizada          "
echo "=========================================="