package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.tmt.teammanagement.data.cloudinary.CloudinaryUploader
import com.tmt.teammanagement.data.model.VoiceMessage
import kotlinx.coroutines.tasks.await
import java.io.File

class VoiceRepository {

    private val db = FirebaseFirestore.getInstance()

    fun listenTeamVoiceMessages(
        onSuccess: (List<VoiceMessage>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return db.collection("voiceMessages")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    onError(err)
                    return@addSnapshotListener
                }
                if (snap != null) {
                    val messages = snap.documents.mapNotNull { d ->
                        d.toObject(VoiceMessage::class.java)?.copy(id = d.id)
                    }.filter { it.eventId == null }
                    onSuccess(messages)
                }
            }
    }

    suspend fun sendVoiceNote(
        audioFile: File,
        durationSeconds: Long,
        senderId: String,
        senderName: String?,
        eventId: String? = null,
        workId: String? = null
    ): String {
        val uploadResult = CloudinaryUploader.uploadFile(audioFile, "audio/mp4")

        val data = hashMapOf(
            "senderId" to senderId,
            "senderName" to senderName,
            "eventId" to eventId,
            "workId" to workId,
            "audioUrl" to uploadResult.secureUrl,
            "cloudinaryUrl" to uploadResult.secureUrl,
            "cloudinaryPublicId" to uploadResult.publicId,
            "publicId" to uploadResult.publicId,
            "fileSize" to uploadResult.bytes,
            "mimeType" to "audio/mp4",
            "duration" to durationSeconds,
            "status" to "sent",
            "isEdited" to false,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )

        val docRef = db.collection("voiceMessages").add(data).await()
        return docRef.id
    }

    suspend fun updateVoiceNote(
        messageId: String,
        audioFile: File,
        durationSeconds: Long,
        senderId: String
    ): String {
        // Fetch old publicId
        var oldPublicId: String? = null
        try {
            val snap = db.collection("voiceMessages").document(messageId).get().await()
            oldPublicId = snap.getString("cloudinaryPublicId") ?: snap.getString("publicId")
        } catch (e: Exception) {
            // ignore
        }

        val uploadResult = CloudinaryUploader.uploadFile(audioFile, "audio/mp4")

        db.collection("voiceMessages").document(messageId)
            .update(mapOf(
                "audioUrl" to uploadResult.secureUrl,
                "cloudinaryUrl" to uploadResult.secureUrl,
                "cloudinaryPublicId" to uploadResult.publicId,
                "publicId" to uploadResult.publicId,
                "fileSize" to uploadResult.bytes,
                "duration" to durationSeconds,
                "isEdited" to true,
                "updatedAt" to FieldValue.serverTimestamp()
            )).await()

        if (!oldPublicId.isNull_or_Empty() && oldPublicId != uploadResult.publicId) {
            CloudinaryUploader.deleteAsset(oldPublicId!!, "video")
        }

        return uploadResult.secureUrl
    }

    suspend fun deleteVoiceNote(messageId: String) {
        var oldPublicId: String? = null
        try {
            val snap = db.collection("voiceMessages").document(messageId).get().await()
            oldPublicId = snap.getString("cloudinaryPublicId") ?: snap.getString("publicId")
        } catch (e: Exception) {
            // ignore
        }

        if (!oldPublicId.isNull_or_Empty()) {
            CloudinaryUploader.deleteAsset(oldPublicId!!, "video")
        }

        db.collection("voiceMessages").document(messageId).delete().await()
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
