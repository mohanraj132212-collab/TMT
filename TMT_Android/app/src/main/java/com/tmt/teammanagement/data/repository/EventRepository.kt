package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.tmt.teammanagement.data.model.Event
import com.tmt.teammanagement.data.model.EventFile
import com.tmt.teammanagement.data.model.EventWork
import com.tmt.teammanagement.data.model.WorkCheck
import kotlinx.coroutines.tasks.await

class EventRepository {

    private val db = FirebaseFirestore.getInstance()

    fun listenEvents(
        onSuccess: (List<Event>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return db.collection("events")
            .orderBy("date", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    onError(err)
                    return@addSnapshotListener
                }
                if (snap != null) {
                    val events = snap.documents.mapNotNull { d ->
                        d.toObject(Event::class.java)?.copy(id = d.id)
                    }
                    onSuccess(events)
                }
            }
    }

    suspend fun createEvent(
        name: String,
        description: String,
        date: String?,
        location: String,
        createdBy: String
    ): String {
        val data = hashMapOf(
            "name" to name.trim(),
            "description" to description.trim(),
            "date" to date,
            "location" to location.trim(),
            "createdBy" to createdBy,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val docRef = db.collection("events").add(data).await()
        return docRef.id
    }

    suspend fun updateEvent(eventId: String, fields: Map<String, Any?>) {
        val updatedFields = fields.toMutableMap()
        updatedFields["updatedAt"] = FieldValue.serverTimestamp()
        db.collection("events").document(eventId).update(updatedFields).await()
    }

    suspend fun deleteEvent(eventId: String) {
        try {
            val worksSnap = db.collection("events").document(eventId).collection("works").get().await()
            for (w in worksSnap.documents) {
                val checksSnap = db.collection("events").document(eventId).collection("works").document(w.id).collection("checks").get().await()
                for (c in checksSnap.documents) {
                    db.collection("events").document(eventId).collection("works").document(w.id).collection("checks").document(c.id).delete().await()
                }
                db.collection("events").document(eventId).collection("works").document(w.id).delete().await()
            }
        } catch (e: Exception) {
            // ignore subcollection errors
        }
        db.collection("events").document(eventId).delete().await()
    }

    fun listenEventWorks(
        eventId: String,
        onSuccess: (List<EventWork>) -> Unit
    ): ListenerRegistration {
        return db.collection("events").document(eventId).collection("works")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, _ ->
                if (snap != null) {
                    val works = snap.documents.mapNotNull { d ->
                        d.toObject(EventWork::class.java)?.copy(id = d.id)
                    }
                    onSuccess(works)
                }
            }
    }

    suspend fun addEventWork(eventId: String, name: String, description: String): String {
        val data = hashMapOf(
            "name" to name.trim(),
            "description" to description.trim(),
            "status" to "Pending",
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val ref = db.collection("events").document(eventId).collection("works").add(data).await()
        return ref.id
    }

    fun listenWorkChecks(
        eventId: String,
        workId: String,
        onSuccess: (List<WorkCheck>) -> Unit
    ): ListenerRegistration {
        return db.collection("events").document(eventId).collection("works").document(workId).collection("checks")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, _ ->
                if (snap != null) {
                    val checks = snap.documents.mapNotNull { d ->
                        d.toObject(WorkCheck::class.java)?.copy(id = d.id)
                    }
                    onSuccess(checks)
                }
            }
    }

    suspend fun updateWorkCheckStatus(eventId: String, workId: String, checkId: String, status: String) {
        db.collection("events").document(eventId).collection("works").document(workId).collection("checks").document(checkId)
            .update(mapOf("status" to status, "updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }
}
