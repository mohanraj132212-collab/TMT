package com.tmt.teammanagement.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.appcompat.app.AppCompatDelegate

class SessionManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREF_NAME = "tmt_session_prefs"
        private const val KEY_MEMBER_ID = "member_id"
        private const val KEY_MEMBER_PHONE = "member_phone"
        private const val KEY_THEME = "app_theme"
    }

    fun saveSession(memberId: String, phone: String) {
        prefs.edit()
            .putString(KEY_MEMBER_ID, memberId)
            .putString(KEY_MEMBER_PHONE, phone)
            .apply()
    }

    fun getMemberId(): String? {
        return prefs.getString(KEY_MEMBER_ID, null)
    }

    fun getMemberPhone(): String? {
        return prefs.getString(KEY_MEMBER_PHONE, null)
    }

    fun clearSession() {
        prefs.edit().remove(KEY_MEMBER_ID).remove(KEY_MEMBER_PHONE).apply()
    }

    fun isLoggedIn(): Boolean {
        return !getMemberId().isNull_or_Empty()
    }

    fun saveThemePreference(themeMode: String) {
        prefs.edit().putString(KEY_THEME, themeMode).apply()
        applyThemePreference()
    }

    fun getThemePreference(): String {
        return prefs.getString(KEY_THEME, "light") ?: "light"
    }

    fun applyThemePreference() {
        when (getThemePreference()) {
            "dark" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
            "light" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
            else -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
