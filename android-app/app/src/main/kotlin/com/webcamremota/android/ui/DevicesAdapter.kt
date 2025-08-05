package com.webcamremota.android.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.webcamremota.android.R
import com.webcamremota.android.network.DeviceDiscovery

class DevicesAdapter(
    private val devices: List<DeviceDiscovery.PCDevice>,
    private val onDeviceClick: (DeviceDiscovery.PCDevice) -> Unit
) : RecyclerView.Adapter<DevicesAdapter.DeviceViewHolder>() {
    
    class DeviceViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val deviceIcon: ImageView = view.findViewById(R.id.iv_device_icon)
        val deviceName: TextView = view.findViewById(R.id.tv_device_name)
        val deviceInfo: TextView = view.findViewById(R.id.tv_device_info)
        val deviceStatus: TextView = view.findViewById(R.id.tv_device_status)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DeviceViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_device, parent, false)
        return DeviceViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: DeviceViewHolder, position: Int) {
        val device = devices[position]
        
        // Set device icon based on type
        when (device.type) {
            "windows" -> holder.deviceIcon.setImageResource(R.drawable.ic_computer_windows)
            "usb" -> holder.deviceIcon.setImageResource(R.drawable.ic_usb)
            else -> holder.deviceIcon.setImageResource(R.drawable.ic_computer)
        }
        
        // Set device information
        holder.deviceName.text = device.name
        holder.deviceInfo.text = "${device.ip}:${device.port}"
        holder.deviceStatus.text = holder.itemView.context.getString(R.string.device_available)
        
        // Set click listener
        holder.itemView.setOnClickListener {
            onDeviceClick(device)
        }
        
        // Add ripple effect
        holder.itemView.isClickable = true
        holder.itemView.isFocusable = true
    }
    
    override fun getItemCount(): Int = devices.size
}