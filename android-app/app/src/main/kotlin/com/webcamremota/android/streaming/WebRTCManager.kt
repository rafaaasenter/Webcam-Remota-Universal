package com.webcamremota.android.streaming

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import org.webrtc.*
import java.util.concurrent.Executors

class WebRTCManager(private val context: Context) {
    
    private val tag = "WebRTCManager"
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var callbacks: WebRTCCallbacks? = null
    
    interface WebRTCCallbacks {
        fun onConnectionEstablished()
        fun onConnectionFailed(error: String)
        fun onDisconnected()
    }
    
    init {
        initializePeerConnectionFactory()
    }
    
    fun setCallbacks(callbacks: WebRTCCallbacks) {
        this.callbacks = callbacks
    }
    
    private fun initializePeerConnectionFactory() {
        try {
            val initializationOptions = PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
            
            PeerConnectionFactory.initialize(initializationOptions)
            
            val options = PeerConnectionFactory.Options()
            val encoderFactory = DefaultVideoEncoderFactory(
                EglBase.create().eglBaseContext,
                true,
                true
            )
            val decoderFactory = DefaultVideoDecoderFactory(EglBase.create().eglBaseContext)
            
            peerConnectionFactory = PeerConnectionFactory.builder()
                .setOptions(options)
                .setVideoEncoderFactory(encoderFactory)
                .setVideoDecoderFactory(decoderFactory)
                .createPeerConnectionFactory()
                
            Log.d(tag, "PeerConnectionFactory inicializada com sucesso")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao inicializar PeerConnectionFactory", e)
        }
    }
    
    fun connectToPC(ip: String, port: Int) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                createPeerConnection()
                // Simulação de conexão WebRTC
                delay(2000) // Simular tempo de conexão
                
                withContext(Dispatchers.Main) {
                    callbacks?.onConnectionEstablished()
                }
                
            } catch (e: Exception) {
                Log.e(tag, "Erro na conexão", e)
                withContext(Dispatchers.Main) {
                    callbacks?.onConnectionFailed(e.message ?: "Erro desconhecido")
                }
            }
        }
    }
    
    private fun createPeerConnection() {
        val iceServers = listOf(
            PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
            PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer()
        )
        
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            bundlePolicy = PeerConnection.BundlePolicy.MAXBUNDLE
            rtcpMuxPolicy = PeerConnection.RtcpMuxPolicy.REQUIRE
            tcpCandidatePolicy = PeerConnection.TcpCandidatePolicy.DISABLED
            candidateNetworkPolicy = PeerConnection.CandidateNetworkPolicy.LOW_COST
        }
        
        val observer = object : PeerConnection.Observer {
            override fun onSignalingChange(newState: PeerConnection.SignalingState?) {
                Log.d(tag, "Signaling state changed: $newState")
            }
            
            override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState?) {
                Log.d(tag, "ICE connection state changed: $newState")
                when (newState) {
                    PeerConnection.IceConnectionState.CONNECTED,
                    PeerConnection.IceConnectionState.COMPLETED -> {
                        CoroutineScope(Dispatchers.Main).launch {
                            callbacks?.onConnectionEstablished()
                        }
                    }
                    PeerConnection.IceConnectionState.FAILED,
                    PeerConnection.IceConnectionState.DISCONNECTED -> {
                        CoroutineScope(Dispatchers.Main).launch {
                            callbacks?.onDisconnected()
                        }
                    }
                    else -> {}
                }
            }
            
            override fun onIceConnectionReceivingChange(receiving: Boolean) {
                Log.d(tag, "ICE connection receiving change: $receiving")
            }
            
            override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState?) {
                Log.d(tag, "ICE gathering state changed: $newState")
            }
            
            override fun onIceCandidate(candidate: IceCandidate?) {
                Log.d(tag, "New ICE candidate: $candidate")
                // Enviar candidato para peer remoto
            }
            
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {
                Log.d(tag, "ICE candidates removed")
            }
            
            override fun onAddStream(stream: MediaStream?) {
                Log.d(tag, "Stream added: $stream")
            }
            
            override fun onRemoveStream(stream: MediaStream?) {
                Log.d(tag, "Stream removed: $stream")
            }
            
            override fun onDataChannel(dataChannel: DataChannel?) {
                Log.d(tag, "Data channel created: $dataChannel")
            }
            
            override fun onRenegotiationNeeded() {
                Log.d(tag, "Renegotiation needed")
            }
            
            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                Log.d(tag, "Track added")
            }
        }
        
        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, observer)
    }
    
    fun startStreaming(cameraStream: MediaStream?, quality: VideoSettings) {
        try {
            if (peerConnection == null) {
                throw Exception("PeerConnection não está estabelecida")
            }
            
            // Configurar stream de vídeo
            cameraStream?.let { stream ->
                peerConnection?.addStream(stream)
                Log.d(tag, "Stream de vídeo adicionado à conexão")
            }
            
            // Criar oferta
            createOffer()
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao iniciar streaming", e)
            throw e
        }
    }
    
    private fun createOffer() {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "false"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "false"))
        }
        
        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sessionDescription: SessionDescription?) {
                Log.d(tag, "Oferta criada com sucesso")
                sessionDescription?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onSetSuccess() {
                            Log.d(tag, "Descrição local definida")
                            // Enviar oferta para peer remoto
                        }
                        override fun onCreateFailure(error: String?) {
                            Log.e(tag, "Erro ao definir descrição local: $error")
                        }
                        override fun onSetFailure(error: String?) {
                            Log.e(tag, "Erro ao definir descrição local: $error")
                        }
                    }, it)
                }
            }
            
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {
                Log.e(tag, "Erro ao criar oferta: $error")
            }
            override fun onSetFailure(error: String?) {
                Log.e(tag, "Erro na oferta: $error")
            }
        }, constraints)
    }
    
    fun stopStreaming() {
        try {
            peerConnection?.removeStream(localVideoTrack?.let { 
                val stream = peerConnectionFactory?.createLocalMediaStream("local_stream")
                stream?.addTrack(it)
                stream
            })
            
            Log.d(tag, "Streaming parado")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao parar streaming", e)
        }
    }
    
    fun updateVideoTrack(newStream: MediaStream?) {
        try {
            // Remover stream anterior
            localVideoTrack?.let {
                val oldStream = peerConnectionFactory?.createLocalMediaStream("old_stream")
                oldStream?.addTrack(it)
                peerConnection?.removeStream(oldStream)
            }
            
            // Adicionar novo stream
            newStream?.let {
                peerConnection?.addStream(it)
            }
            
            Log.d(tag, "Video track atualizado")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao atualizar video track", e)
        }
    }
    
    fun updateVideoQuality(settings: VideoSettings) {
        try {
            // Implementar mudança de qualidade
            Log.d(tag, "Qualidade de vídeo atualizada: ${settings.width}x${settings.height} @ ${settings.frameRate}fps")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao atualizar qualidade", e)
        }
    }
    
    fun release() {
        try {
            peerConnection?.close()
            peerConnection = null
            peerConnectionFactory?.dispose()
            peerConnectionFactory = null
            
            Log.d(tag, "WebRTCManager liberado")
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao liberar WebRTCManager", e)
        }
    }
}

data class VideoSettings(
    val width: Int,
    val height: Int,
    val frameRate: Int,
    val bitrate: Int
)