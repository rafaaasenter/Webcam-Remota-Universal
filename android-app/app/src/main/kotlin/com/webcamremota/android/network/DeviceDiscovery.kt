package com.webcamremota.android.network

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import kotlinx.coroutines.*
import java.net.*
import java.util.*
import com.google.gson.Gson
import com.google.gson.JsonObject

class DeviceDiscovery(private val context: Context) {
    
    private val tag = "DeviceDiscovery"
    private val discoveryPort = 8888
    private val gson = Gson()
    private var discoveryJob: Job? = null
    private var callbacks: DiscoveryCallbacks? = null
    
    interface DiscoveryCallbacks {
        fun onDevicesFound(devices: List<PCDevice>)
        fun onNoDevicesFound()
        fun onDiscoveryError(error: String)
    }
    
    data class PCDevice(
        val name: String,
        val ip: String,
        val port: Int,
        val type: String = "windows",
        val capabilities: List<String> = listOf()
    )
    
    fun setCallbacks(callbacks: DiscoveryCallbacks) {
        this.callbacks = callbacks
    }
    
    fun startDiscovery() {
        discoveryJob?.cancel()
        discoveryJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val devices = discoverPCDevices()
                withContext(Dispatchers.Main) {
                    if (devices.isNotEmpty()) {
                        callbacks?.onDevicesFound(devices)
                    } else {
                        callbacks?.onNoDevicesFound()
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Erro na descoberta", e)
                withContext(Dispatchers.Main) {
                    callbacks?.onDiscoveryError(e.message ?: "Erro desconhecido")
                }
            }
        }
    }
    
    private suspend fun discoverPCDevices(): List<PCDevice> = withContext(Dispatchers.IO) {
        val devices = mutableListOf<PCDevice>()
        val discoveryMessage = createDiscoveryMessage()
        
        try {
            // Obter endereço IP local
            val localIp = getLocalIpAddress()
            if (localIp == null) {
                Log.e(tag, "Não foi possível obter IP local")
                return@withContext devices
            }
            
            // Calcular subnet
            val subnet = getSubnet(localIp)
            
            // Criar socket UDP
            val socket = DatagramSocket()
            socket.soTimeout = 2000 // 2 segundos timeout
            socket.broadcast = true
            
            // Enviar mensagem de descoberta para toda a subnet
            for (i in 1..254) {
                val targetIp = "$subnet.$i"
                try {
                    val packet = DatagramPacket(
                        discoveryMessage,
                        discoveryMessage.size,
                        InetAddress.getByName(targetIp),
                        discoveryPort
                    )
                    socket.send(packet)
                } catch (e: Exception) {
                    // Ignorar erros individuais de envio
                    continue
                }
            }
            
            // Também enviar para endereços de broadcast comuns
            val broadcastAddresses = listOf(
                "255.255.255.255",
                "$subnet.255"
            )
            
            for (broadcastIp in broadcastAddresses) {
                try {
                    val packet = DatagramPacket(
                        discoveryMessage,
                        discoveryMessage.size,
                        InetAddress.getByName(broadcastIp),
                        discoveryPort
                    )
                    socket.send(packet)
                } catch (e: Exception) {
                    Log.w(tag, "Falha ao enviar para $broadcastIp: ${e.message}")
                }
            }
            
            // Aguardar respostas por 10 segundos
            val responseBuffer = ByteArray(1024)
            val startTime = System.currentTimeMillis()
            val timeout = 10000L // 10 segundos
            
            while (System.currentTimeMillis() - startTime < timeout) {
                try {
                    val responsePacket = DatagramPacket(responseBuffer, responseBuffer.size)
                    socket.receive(responsePacket)
                    
                    val responseData = String(responsePacket.data, 0, responsePacket.length)
                    val device = parseDeviceResponse(responseData, responsePacket.address.hostAddress)
                    
                    if (device != null && !devices.any { it.ip == device.ip }) {
                        devices.add(device)
                        Log.d(tag, "Dispositivo encontrado: ${device.name} (${device.ip})")
                    }
                    
                } catch (e: SocketTimeoutException) {
                    // Timeout normal, continuar aguardando
                    continue
                } catch (e: Exception) {
                    Log.w(tag, "Erro ao receber resposta: ${e.message}")
                }
            }
            
            socket.close()
            
        } catch (e: Exception) {
            Log.e(tag, "Erro na descoberta de dispositivos", e)
        }
        
        return@withContext devices
    }
    
    private fun createDiscoveryMessage(): ByteArray {
        val message = JsonObject().apply {
            addProperty("type", "discovery_request")
            addProperty("device_type", "android")
            addProperty("device_name", "Android ${android.os.Build.VERSION.RELEASE} - ${android.os.Build.MODEL}")
            addProperty("app_version", "1.0.0")
            addProperty("timestamp", System.currentTimeMillis())
            addProperty("capabilities", gson.toJson(listOf("video", "audio", "camera_control")))
        }
        
        return gson.toJson(message).toByteArray(Charsets.UTF_8)
    }
    
    private fun parseDeviceResponse(responseData: String, senderIp: String): PCDevice? {
        return try {
            val jsonResponse = gson.fromJson(responseData, JsonObject::class.java)
            
            if (jsonResponse.get("type")?.asString == "discovery_response" &&
                jsonResponse.get("device_type")?.asString == "pc_windows") {
                
                val deviceName = jsonResponse.get("device_name")?.asString 
                    ?: "PC Windows - $senderIp"
                val port = jsonResponse.get("port")?.asInt ?: 5000
                val capabilities = try {
                    gson.fromJson(jsonResponse.get("capabilities")?.asString, Array<String>::class.java)?.toList()
                } catch (e: Exception) {
                    listOf()
                } ?: listOf()
                
                PCDevice(
                    name = deviceName,
                    ip = senderIp,
                    port = port,
                    type = "windows",
                    capabilities = capabilities
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w(tag, "Erro ao analisar resposta de $senderIp: ${e.message}")
            null
        }
    }
    
    private fun getLocalIpAddress(): String? {
        try {
            // Tentar através do WifiManager primeiro
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            val ipInt = wifiInfo.ipAddress
            
            if (ipInt != 0) {
                return String.format(
                    Locale.getDefault(),
                    "%d.%d.%d.%d",
                    ipInt and 0xff,
                    ipInt shr 8 and 0xff,
                    ipInt shr 16 and 0xff,
                    ipInt shr 24 and 0xff
                )
            }
            
            // Fallback para NetworkInterface
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (networkInterface in Collections.list(interfaces)) {
                if (networkInterface.isLoopback || !networkInterface.isUp) continue
                
                val addresses = networkInterface.inetAddresses
                for (address in Collections.list(addresses)) {
                    if (address is Inet4Address && !address.isLoopbackAddress) {
                        return address.hostAddress
                    }
                }
            }
            
        } catch (e: Exception) {
            Log.e(tag, "Erro ao obter IP local", e)
        }
        
        return null
    }
    
    private fun getSubnet(ipAddress: String): String {
        val parts = ipAddress.split(".")
        return if (parts.size >= 3) {
            "${parts[0]}.${parts[1]}.${parts[2]}"
        } else {
            "192.168.1" // Fallback padrão
        }
    }
    
    fun release() {
        discoveryJob?.cancel()
        callbacks = null
    }
}