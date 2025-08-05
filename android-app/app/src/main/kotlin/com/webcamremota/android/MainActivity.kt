package com.webcamremota.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.*
import android.media.AudioManager
import android.media.MediaRecorder
import android.os.*
import android.util.Log
import android.util.Size
import android.view.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.snackbar.Snackbar
import com.webcamremota.android.databinding.ActivityMainBinding
import com.webcamremota.android.network.DeviceDiscovery
import com.webcamremota.android.streaming.WebRTCManager
import com.webcamremota.android.streaming.CameraManager
import pub.devrel.easypermissions.EasyPermissions
import java.util.concurrent.Semaphore

class MainActivity : AppCompatActivity(), EasyPermissions.PermissionCallbacks {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraManager: CameraManager
    private lateinit var webrtcManager: WebRTCManager
    private lateinit var deviceDiscovery: DeviceDiscovery
    
    private var isStreaming = false
    private var isConnected = false
    private var currentCameraFacing = CameraCharacteristics.LENS_FACING_BACK
    private var flashEnabled = false
    
    private val deviceName = "Android ${Build.VERSION.RELEASE} - ${Build.MODEL}"
    
    companion object {
        private const val TAG = "MainActivity"
        private const val PERMISSION_REQUEST_CODE = 1001
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.WAKE_LOCK
        )
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Manter tela ligada
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Configurar interface
        setupUI()
        
        // Verificar e solicitar permissões
        if (hasRequiredPermissions()) {
            initializeApp()
        } else {
            requestPermissions()
        }
    }
    
    private fun setupUI() {
        // Configurar status da conexão
        updateConnectionStatus("Desconectado", false)
        
        // Configurar botões
        binding.btnDiscoverDevices.setOnClickListener { discoverPCDevices() }
        binding.btnConnectManual.setOnClickListener { connectManually() }
        binding.btnStartStreaming.setOnClickListener { startStreaming() }
        binding.btnStopStreaming.setOnClickListener { stopStreaming() }
        
        // Controles da câmera
        binding.btnSwitchCamera.setOnClickListener { switchCamera() }
        binding.btnToggleFlash.setOnClickListener { toggleFlash() }
        binding.btnSettings.setOnClickListener { showSettings() }
        
        // Foco ao tocar na prévia
        binding.previewView.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_DOWN) {
                focusAtPoint(event.x, event.y)
            }
            true
        }
        
        // Configurar controles iniciais
        binding.controlsLayout.visibility = View.VISIBLE
        binding.streamingControls.visibility = View.GONE
        binding.manualConnectionLayout.visibility = View.GONE
    }
    
    private fun hasRequiredPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun requestPermissions() {
        EasyPermissions.requestPermissions(
            this,
            "Este aplicativo precisa de acesso à câmera, microfone e rede para funcionar.",
            PERMISSION_REQUEST_CODE,
            *REQUIRED_PERMISSIONS
        )
    }
    
    override fun onPermissionsGranted(requestCode: Int, perms: MutableList<String>) {
        if (requestCode == PERMISSION_REQUEST_CODE && hasRequiredPermissions()) {
            initializeApp()
        }
    }
    
    override fun onPermissionsDenied(requestCode: Int, perms: MutableList<String>) {
        showError("Permissões necessárias foram negadas. O aplicativo não pode funcionar.")
        finish()
    }
    
    private fun initializeApp() {
        try {
            // Inicializar gerenciadores
            cameraManager = CameraManager(this, binding.previewView)
            webrtcManager = WebRTCManager(this)
            deviceDiscovery = DeviceDiscovery(this)
            
            // Configurar callbacks
            setupCallbacks()
            
            // Inicializar câmera
            cameraManager.startCamera()
            
            updateConnectionStatus("Pronto para conectar", false)
            
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao inicializar aplicativo", e)
            showError("Erro ao inicializar: ${e.message}")
        }
    }
    
    private fun setupCallbacks() {
        // Callbacks do WebRTC
        webrtcManager.setCallbacks(object : WebRTCManager.WebRTCCallbacks {
            override fun onConnectionEstablished() {
                runOnUiThread {
                    isConnected = true
                    updateConnectionStatus("Conectado ao PC", true)
                    binding.streamingControls.visibility = View.VISIBLE
                    binding.controlsLayout.visibility = View.GONE
                }
            }
            
            override fun onConnectionFailed(error: String) {
                runOnUiThread {
                    showError("Falha na conexão: $error")
                    updateConnectionStatus("Falha na conexão", false)
                }
            }
            
            override fun onDisconnected() {
                runOnUiThread {
                    isConnected = false
                    isStreaming = false
                    updateConnectionStatus("Desconectado", false)
                    binding.streamingControls.visibility = View.GONE
                    binding.controlsLayout.visibility = View.VISIBLE
                }
            }
        })
        
        // Callbacks da descoberta de dispositivos
        deviceDiscovery.setCallbacks(object : DeviceDiscovery.DiscoveryCallbacks {
            override fun onDevicesFound(devices: List<DeviceDiscovery.PCDevice>) {
                runOnUiThread {
                    displayFoundDevices(devices)
                }
            }
            
            override fun onNoDevicesFound() {
                runOnUiThread {
                    showManualConnection()
                }
            }
            
            override fun onDiscoveryError(error: String) {
                runOnUiThread {
                    showError("Erro na descoberta: $error")
                    showManualConnection()
                }
            }
        })
    }
    
    private fun discoverPCDevices() {
        updateConnectionStatus("Procurando PCs na rede...", false)
        binding.btnDiscoverDevices.isEnabled = false
        binding.btnDiscoverDevices.text = "Procurando..."
        
        deviceDiscovery.startDiscovery()
        
        // Timeout de 10 segundos
        Handler(Looper.getMainLooper()).postDelayed({
            binding.btnDiscoverDevices.isEnabled = true
            binding.btnDiscoverDevices.text = "Procurar PCs"
        }, 10000)
    }
    
    private fun displayFoundDevices(devices: List<DeviceDiscovery.PCDevice>) {
        binding.devicesRecyclerView.visibility = View.VISIBLE
        
        val adapter = DevicesAdapter(devices) { device ->
            connectToDevice(device)
        }
        binding.devicesRecyclerView.adapter = adapter
        
        updateConnectionStatus("${devices.size} PC(s) encontrado(s)", false)
        binding.btnDiscoverDevices.isEnabled = true
        binding.btnDiscoverDevices.text = "Procurar PCs"
    }
    
    private fun showManualConnection() {
        updateConnectionStatus("Nenhum PC encontrado", false)
        binding.manualConnectionLayout.visibility = View.VISIBLE
        binding.btnDiscoverDevices.isEnabled = true
        binding.btnDiscoverDevices.text = "Procurar PCs"
    }
    
    private fun connectToDevice(device: DeviceDiscovery.PCDevice) {
        updateConnectionStatus("Conectando ao ${device.name}...", false)
        webrtcManager.connectToPC(device.ip, device.port)
    }
    
    private fun connectManually() {
        val ip = binding.etManualIp.text.toString().trim()
        val port = binding.etManualPort.text.toString().trim().toIntOrNull() ?: 5000
        
        if (ip.isEmpty()) {
            showError("Por favor, insira o endereço IP do PC")
            return
        }
        
        updateConnectionStatus("Conectando manualmente...", false)
        webrtcManager.connectToPC(ip, port)
    }
    
    private fun startStreaming() {
        if (!isConnected) {
            showError("Conecte-se a um PC primeiro")
            return
        }
        
        try {
            // Obter configurações de qualidade
            val quality = getVideoQualitySettings()
            
            // Iniciar streaming
            webrtcManager.startStreaming(cameraManager.getCameraStream(), quality)
            
            isStreaming = true
            updateConnectionStatus("Transmitindo para PC...", true)
            
            // Iniciar serviço em background
            startStreamingService()
            
            // Atualizar UI
            binding.btnStartStreaming.visibility = View.GONE
            binding.btnStopStreaming.visibility = View.VISIBLE
            
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao iniciar streaming", e)
            showError("Erro ao iniciar transmissão: ${e.message}")
        }
    }
    
    private fun stopStreaming() {
        isStreaming = false
        
        webrtcManager.stopStreaming()
        stopStreamingService()
        
        updateConnectionStatus("Transmissão finalizada", false)
        
        // Atualizar UI
        binding.btnStartStreaming.visibility = View.VISIBLE
        binding.btnStopStreaming.visibility = View.GONE
    }
    
    private fun switchCamera() {
        try {
            cameraManager.switchCamera()
            currentCameraFacing = if (currentCameraFacing == CameraCharacteristics.LENS_FACING_BACK) {
                CameraCharacteristics.LENS_FACING_FRONT
            } else {
                CameraCharacteristics.LENS_FACING_BACK
            }
            
            // Atualizar stream se estiver transmitindo
            if (isStreaming) {
                webrtcManager.updateVideoTrack(cameraManager.getCameraStream())
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao alternar câmera", e)
            showError("Erro ao alternar câmera")
        }
    }
    
    private fun toggleFlash() {
        try {
            flashEnabled = cameraManager.toggleFlash()
            
            binding.btnToggleFlash.setImageResource(
                if (flashEnabled) R.drawable.ic_flash_on else R.drawable.ic_flash_off
            )
            
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao controlar flash", e)
            showError("Flash não disponível neste dispositivo")
        }
    }
    
    private fun focusAtPoint(x: Float, y: Float) {
        try {
            cameraManager.focusAtPoint(x, y)
            showFocusIndicator(x, y)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao focar", e)
        }
    }
    
    private fun showFocusIndicator(x: Float, y: Float) {
        binding.focusIndicator.visibility = View.VISIBLE
        binding.focusIndicator.x = x - binding.focusIndicator.width / 2
        binding.focusIndicator.y = y - binding.focusIndicator.height / 2
        
        binding.focusIndicator.animate()
            .scaleX(1.2f)
            .scaleY(1.2f)
            .setDuration(200)
            .withEndAction {
                binding.focusIndicator.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(200)
                    .withEndAction {
                        Handler(Looper.getMainLooper()).postDelayed({
                            binding.focusIndicator.visibility = View.GONE
                        }, 1000)
                    }
            }
    }
    
    private fun showSettings() {
        // Implementar dialog de configurações
        val settingsDialog = SettingsDialog(this) { settings ->
            applySettings(settings)
        }
        settingsDialog.show()
    }
    
    private fun applySettings(settings: VideoSettings) {
        try {
            cameraManager.updateVideoSettings(settings)
            if (isStreaming) {
                webrtcManager.updateVideoQuality(settings)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao aplicar configurações", e)
            showError("Erro ao aplicar configurações")
        }
    }
    
    private fun getVideoQualitySettings(): VideoSettings {
        // Retornar configurações padrão ou as definidas pelo usuário
        return VideoSettings(
            width = 1280,
            height = 720,
            frameRate = 30,
            bitrate = 2000000
        )
    }
    
    private fun startStreamingService() {
        val serviceIntent = Intent(this, WebcamStreamingService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
    }
    
    private fun stopStreamingService() {
        val serviceIntent = Intent(this, WebcamStreamingService::class.java)
        stopService(serviceIntent)
    }
    
    private fun updateConnectionStatus(status: String, connected: Boolean) {
        binding.tvConnectionStatus.text = status
        binding.connectionStatusIcon.setImageResource(
            if (connected) R.drawable.ic_connected else R.drawable.ic_disconnected
        )
    }
    
    private fun showError(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
        Log.e(TAG, message)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (isStreaming) {
            stopStreaming()
        }
        cameraManager.release()
        webrtcManager.release()
        deviceDiscovery.release()
    }
    
    override fun onPause() {
        super.onPause()
        // Continuar streaming em background se ativo
    }
    
    override fun onResume() {
        super.onResume()
        // Retomar UI se necessário
    }
}