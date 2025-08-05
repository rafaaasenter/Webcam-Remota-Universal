package com.webcamremota.android.ui

import android.app.Dialog
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.*
import androidx.appcompat.app.AlertDialog
import com.webcamremota.android.R
import com.webcamremota.android.streaming.VideoSettings

class SettingsDialog(
    private val context: Context,
    private val onSettingsChanged: (VideoSettings) -> Unit
) {
    
    private lateinit var dialog: AlertDialog
    private lateinit var resolutionSpinner: Spinner
    private lateinit var fpsSpinner: Spinner
    private lateinit var bitrateSeekBar: SeekBar
    private lateinit var bitrateLabel: TextView
    private lateinit var audioSwitch: Switch
    
    fun show() {
        val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_settings, null)
        setupViews(dialogView)
        
        dialog = AlertDialog.Builder(context)
            .setTitle(R.string.settings_title)
            .setView(dialogView)
            .setPositiveButton("Aplicar") { _, _ ->
                applySettings()
            }
            .setNegativeButton("Cancelar", null)
            .create()
            
        dialog.show()
    }
    
    private fun setupViews(view: android.view.View) {
        resolutionSpinner = view.findViewById(R.id.spinner_resolution)
        fpsSpinner = view.findViewById(R.id.spinner_fps)
        bitrateSeekBar = view.findViewById(R.id.seekbar_bitrate)
        bitrateLabel = view.findViewById(R.id.label_bitrate)
        audioSwitch = view.findViewById(R.id.switch_audio)
        
        // Setup resolution spinner
        val resolutions = arrayOf("480p", "720p", "1080p", "4K")
        resolutionSpinner.adapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, resolutions)
        resolutionSpinner.setSelection(1) // 720p default
        
        // Setup FPS spinner
        val fpsOptions = arrayOf("15 FPS", "24 FPS", "30 FPS", "60 FPS")
        fpsSpinner.adapter = ArrayAdapter(context, android.R.layout.simple_spinner_item, fpsOptions)
        fpsSpinner.setSelection(2) // 30 FPS default
        
        // Setup bitrate seekbar
        bitrateSeekBar.max = 8000
        bitrateSeekBar.progress = 2000
        bitrateSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                bitrateLabel.text = "${progress} kbps"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        
        // Set initial bitrate label
        bitrateLabel.text = "2000 kbps"
        
        // Setup audio switch
        audioSwitch.isChecked = true
    }
    
    private fun applySettings() {
        val resolution = when (resolutionSpinner.selectedItemPosition) {
            0 -> Pair(640, 480)   // 480p
            1 -> Pair(1280, 720)  // 720p
            2 -> Pair(1920, 1080) // 1080p
            3 -> Pair(3840, 2160) // 4K
            else -> Pair(1280, 720)
        }
        
        val fps = when (fpsSpinner.selectedItemPosition) {
            0 -> 15
            1 -> 24
            2 -> 30
            3 -> 60
            else -> 30
        }
        
        val bitrate = bitrateSeekBar.progress * 1000 // Convert to bps
        
        val settings = VideoSettings(
            width = resolution.first,
            height = resolution.second,
            frameRate = fps,
            bitrate = bitrate
        )
        
        onSettingsChanged(settings)
    }
}