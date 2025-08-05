package com.webcamremota.android.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.webcamremota.android.MainActivity
import com.webcamremota.android.R

class WebcamStreamingService : Service() {
    
    companion object {
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "webcam_streaming_channel"
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.service_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.service_description)
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val stopIntent = Intent(this, WebcamStreamingService::class.java).apply {
            action = "STOP_STREAMING"
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_streaming))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_stop, getString(R.string.notification_stop), stopPendingIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
}