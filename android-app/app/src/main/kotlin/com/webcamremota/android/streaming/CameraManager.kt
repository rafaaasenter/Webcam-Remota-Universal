package com.webcamremota.android.streaming

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.*
import android.media.MediaRecorder
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Size
import android.view.Surface
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import org.webrtc.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraManager(
    private val context: Context,
    private val previewView: PreviewView
) {
    private val tag = "CameraManager"
    private var cameraProvider: ProcessCameraProvider? = null
    private var preview: Preview? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var camera: androidx.camera.core.Camera? = null
    private var cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
    private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    
    // WebRTC components
    private var videoCapturer: CameraVideoCapturer? = null
    private var videoSource: VideoSource? = null
    private var localVideoTrack: VideoTrack? = null
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var surfaceTextureHelper: SurfaceTextureHelper? = nil
    
    private var isFlashEnabled = false
    private var currentZoomLevel = 1f
    
    fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
                setupWebRTCCapture()
                
            } catch (e: Exception) {
                Log.e(tag, "Erro ao inicializar câmera", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }
    
    private fun bindCameraUseCases() {
        val cameraProvider = cameraProvider ?: return
        
        // Preview use case
        preview = Preview.Builder()
            .setTargetResolution(Size(1280, 720))
            .build()
            .also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
        
        // Video capture use case
        val recorder = Recorder.Builder()
            .setQualitySelector(QualitySelector.from(Quality.HD))
            .build()
            
        videoCapture = VideoCapture.withOutput(recorder)
        
        try {
            // Unbind use cases before rebinding
            cameraProvider.unbindAll()
            
            // Bind use cases to camera
            camera = cameraProvider.bindToLifecycle(
                context as LifecycleOwner,
                cameraSelector,
                preview,
                videoCapture
            )
            
            // Configure camera controls
            configureCameraControls()
            
            Log.d(tag, "Câmera vinculada com sucesso")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao vincular casos de uso da câmera", e)
        }
    }
    
    private fun configureCameraControls() {
        camera?.let { cam ->
            val cameraControl = cam.cameraControl
            val cameraInfo = cam.cameraInfo
            
            // Configure zoom
            val zoomState = cameraInfo.zoomState.value
            if (zoomState != null) {
                Log.d(tag, "Zoom configurado - Min: ${zoomState.minZoomRatio}, Max: ${zoomState.maxZoomRatio}")
            }
            
            // Configure torch (flash)
            if (cameraInfo.hasFlashUnit()) {
                Log.d(tag, "Flash disponível")
            }
        }
    }
    
    private fun setupWebRTCCapture() {
        try {
            // Initialize PeerConnectionFactory if not already done
            if (peerConnectionFactory == null) {
                val initOptions = PeerConnectionFactory.InitializationOptions.builder(context)
                    .createInitializationOptions()
                PeerConnectionFactory.initialize(initOptions)
                
                peerConnectionFactory = PeerConnectionFactory.builder()
                    .setVideoEncoderFactory(DefaultVideoEncoderFactory(
                        EglBase.create().eglBaseContext, true, true))
                    .setVideoDecoderFactory(DefaultVideoDecoderFactory(
                        EglBase.create().eglBaseContext))
                    .createPeerConnectionFactory()
            }
            
            // Create video source
            videoSource = peerConnectionFactory?.createVideoSource(false)
            
            // Create video track
            localVideoTrack = peerConnectionFactory?.createVideoTrack("video_track", videoSource)
            
            // Setup camera capturer
            setupCameraCapturer()
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao configurar captura WebRTC", e)
        }
    }
    
    private fun setupCameraCapturer() {
        try {
            val cameraEnumerator = Camera2Enumerator(context)
            val deviceNames = cameraEnumerator.deviceNames
            
            var cameraDeviceName: String? = null
            for (deviceName in deviceNames) {
                if (cameraEnumerator.isBackFacing(deviceName)) {
                    cameraDeviceName = deviceName
                    break
                }
            }
            
            if (cameraDeviceName == null) {
                // Fallback to front camera
                for (deviceName in deviceNames) {
                    if (cameraEnumerator.isFrontFacing(deviceName)) {
                        cameraDeviceName = deviceName
                        break
                    }
                }
            }
            
            if (cameraDeviceName != null) {
                videoCapturer = cameraEnumerator.createCapturer(cameraDeviceName, null)
                
                surfaceTextureHelper = SurfaceTextureHelper.create(
                    "CameraThread", 
                    EglBase.create().eglBaseContext
                )
                
                videoCapturer?.initialize(
                    surfaceTextureHelper,
                    context,
                    videoSource?.capturerObserver
                )
                
                videoCapturer?.startCapture(1280, 720, 30)
                
                Log.d(tag, "Camera capturer configurado: $cameraDeviceName")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao configurar camera capturer", e)
        }
    }
    
    fun switchCamera() {
        try {
            cameraSelector = if (cameraSelector == CameraSelector.DEFAULT_BACK_CAMERA) {
                CameraSelector.DEFAULT_FRONT_CAMERA
            } else {
                CameraSelector.DEFAULT_BACK_CAMERA
            }
            
            bindCameraUseCases()
            
            // Update WebRTC capturer
            videoCapturer?.switchCamera(null)
            
            Log.d(tag, "Câmera alternada")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao alternar câmera", e)
            throw e
        }
    }
    
    fun toggleFlash(): Boolean {
        return try {
            camera?.let { cam ->
                val cameraControl = cam.cameraControl
                isFlashEnabled = !isFlashEnabled
                cameraControl.enableTorch(isFlashEnabled)
                
                Log.d(tag, "Flash ${if (isFlashEnabled) "ligado" else "desligado"}")
                isFlashEnabled
            } ?: false
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao controlar flash", e)
            false
        }
    }
    
    fun focusAtPoint(x: Float, y: Float) {
        try {
            camera?.let { cam ->
                val cameraControl = cam.cameraControl
                val factory = SurfaceOrientedMeteringPointFactory(
                    previewView.width.toFloat(),
                    previewView.height.toFloat()
                )
                
                val point = factory.createPoint(x, y)
                val action = FocusMeteringAction.Builder(point).build()
                
                cameraControl.startFocusAndMetering(action)
                
                Log.d(tag, "Foco ajustado para ($x, $y)")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao ajustar foco", e)
        }
    }
    
    fun setZoom(zoomLevel: Float) {
        try {
            camera?.let { cam ->
                val cameraControl = cam.cameraControl
                currentZoomLevel = zoomLevel
                cameraControl.setZoomRatio(zoomLevel)
                
                Log.d(tag, "Zoom ajustado para ${zoomLevel}x")
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao ajustar zoom", e)
        }
    }
    
    fun updateVideoSettings(settings: VideoSettings) {
        try {
            // Restart capture with new settings
            videoCapturer?.stopCapture()
            videoCapturer?.startCapture(settings.width, settings.height, settings.frameRate)
            
            Log.d(tag, "Configurações de vídeo atualizadas: ${settings.width}x${settings.height} @ ${settings.frameRate}fps")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao atualizar configurações de vídeo", e)
        }
    }
    
    fun getCameraStream(): MediaStream? {
        return try {
            val stream = peerConnectionFactory?.createLocalMediaStream("local_stream")
            localVideoTrack?.let { track ->
                stream?.addTrack(track)
            }
            stream
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao obter stream da câmera", e)
            null
        }
    }
    
    fun release() {
        try {
            videoCapturer?.stopCapture()
            videoCapturer?.dispose()
            
            surfaceTextureHelper?.dispose()
            
            localVideoTrack?.dispose()
            videoSource?.dispose()
            
            cameraProvider?.unbindAll()
            cameraExecutor.shutdown()
            
            Log.d(tag, "CameraManager liberado")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao liberar CameraManager", e)
        }
    }
}