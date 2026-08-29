package com.tmt.teammanagement.utils

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object FormatUtils {

    fun normalizePhone(rawPhone: String): String {
        return rawPhone.replace(Regex("[^0-9]"), "")
    }

    fun formatDurationSeconds(seconds: Long): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return String.format(Locale.US, "%d:%02d", mins, secs)
    }

    fun formatFileSize(bytes: Long): String {
        if (bytes <= 0) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB")
        val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
        val count = bytes / Math.pow(1024.0, digitGroups.toDouble())
        return String.format(Locale.US, "%.1f %s", count, units[Math.min(digitGroups, units.size - 1)])
    }

    fun formatTimestamp(timestamp: Any?): String {
        if (timestamp is com.google.firebase.Timestamp) {
            val sdf = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
            return sdf.format(timestamp.toDate())
        }
        val sdf = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
        return sdf.format(Date())
    }
}
