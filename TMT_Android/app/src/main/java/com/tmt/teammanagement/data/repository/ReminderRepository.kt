package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.tmt.teammanagement.data.model.PrivateReminder
import kotlinx.coroutines.tasks.await

class ReminderRepository {

    private val db = FirebaseFirestore.getInstance()

    fun listenMyReminders(
        memberId: String,
        onSuccess: (List<PrivateReminder>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return db.collection("privateReminders")
            .whereEqualTo("memberId", memberId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    onError(err)
                    return@addSnapshotListener
                }
                if (snap != null) {
                    val reminders = snap.documents.mapNotNull { d ->
                        d.toObject(PrivateReminder::class.java)?.copy(id = d.id)
                    }
                    onSuccess(reminders)
                }
            }
    }

    suspend fun addReminder(memberId: String, title: String, description: String): String {
        val data = hashMapOf(
            "memberId" to memberId,
            "title" to title.trim(),
            "description" to description.trim(),
            "completed" to false,
            "createdAt" to FieldValue.serverTimestamp()
        )
        val ref = db.collection("privateReminders").add(data).await()
        return ref.id
    }

    suspend fun toggleComplete(reminderId: String, completed: Boolean) {
        db.collection("privateReminders").document(reminderId)
            .update("completed", completed)
            .await()
    }

    suspend fun deleteReminder(reminderId: String) {
        db.collection("privateReminders").document(reminderId).delete().await()
    }
}
