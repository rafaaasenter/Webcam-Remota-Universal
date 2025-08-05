@echo off
REM Script para compilar o programa Windows (.exe)
REM Webcam Remota Universal - Windows

echo ==========================================
echo   Compilando Programa Windows (.exe)
echo ==========================================

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRO: Python não encontrado!
    echo Por favor, instale Python 3.8+ do site oficial: https://python.org
    pause
    exit /b 1
)

echo 🐍 Python encontrado:
python --version

REM Navegar para o diretório do projeto Windows
cd windows-app

echo 📦 Instalando dependências...

REM Atualizar pip
python -m pip install --upgrade pip

REM Instalar dependências
python -m pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ ERRO: Falha ao instalar dependências!
    echo Verifique sua conexão com a internet e tente novamente
    pause
    exit /b 1
)

echo 🏗️ Compilando executável...

REM Criar diretório de distribuição se não existir
if not exist "..\dist" mkdir "..\dist"

REM Compilar com PyInstaller
python -m PyInstaller ^
    --onefile ^
    --windowed ^
    --name "WebcamRemota-PC-v1.0.0" ^
    --icon "assets\icon.ico" ^
    --add-data "assets;assets" ^
    --hidden-import "PyQt5.sip" ^
    --hidden-import "cv2" ^
    --hidden-import "numpy" ^
    --hidden-import "pyaudio" ^
    --distpath "..\dist" ^
    main.py

if %errorlevel% neq 0 (
    echo ❌ ERRO: Falha na compilação!
    echo Verifique os logs acima para mais detalhes
    pause
    exit /b 1
)

echo ✅ Compilação concluída com sucesso!

REM Verificar se o executável foi criado
if exist "..\dist\WebcamRemota-PC-v1.0.0.exe" (
    echo 💻 Executável criado com sucesso!
    echo    Localização: dist\WebcamRemota-PC-v1.0.0.exe
    echo.
    
    REM Mostrar tamanho do arquivo
    for %%I in ("..\dist\WebcamRemota-PC-v1.0.0.exe") do (
        echo 📋 Tamanho do arquivo: %%~zI bytes
    )
    
    echo.
    echo 🚀 Execução:
    echo    Clique duas vezes no arquivo .exe para executar
    echo    Ou execute: dist\WebcamRemota-PC-v1.0.0.exe
    echo.
    echo 📦 Distribuição:
    echo    O arquivo .exe é completamente autônomo
    echo    Pode ser distribuído sem necessidade de instalar Python
    echo    Compatível com Windows 7, 8, 10 e 11
    
) else (
    echo ❌ ERRO: Executável não encontrado após compilação!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Compilação Windows Finalizada
echo ==========================================

pause