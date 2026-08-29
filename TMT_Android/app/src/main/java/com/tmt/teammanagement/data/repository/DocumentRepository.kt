package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.tmt.teammanagement.data.cloudinary.CloudinaryUploader
import com.tmt.teammanagement.data.model.TeamDocument
import com.tmt.teammanagement.data.model.TeamMember
import kotlinx.coroutines.tasks.await
import java.io.File

class DocumentRepository {

    private val db = FirebaseFirestore.getInstance()

    fun listenDocuments(
        onSuccess: (List<TeamDocument>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return db.collection("documents")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    onError(err)
                    return@addSnapshotListener
                }
                if (snap != null) {
                    val docs = snap.documents.mapNotNull { d ->
                        d.toObject(TeamDocument::class.java)?.copy(id = d.id)
                    }
                    onSuccess(docs)
                }
            }
    }

    fun getFileTypeCategory(mimeType: String): String {
        return when {
            mimeType.startsWith("image/") -> "image"
            mimeType.startsWith("video/") -> "video"
            mimeType.startsWith("audio/") -> "audio"
            mimeType.contains("pdf") -> "pdf"
            else -> "document"
        }
    }

    suspend fun uploadDocument(file: File, mimeType: String, senderMember: TeamMember): String {
        val uploadResult = CloudinaryUploader.uploadFile(file, mimeType)
        val category = getFileTypeCategory(mimeType)

        val data = hashMapOf(
            "senderId" to senderMember.id,
            "senderName" to senderMember.name,
            "fileName" to file.name,
            "fileType" to category,
            "mimeType" to mimeType,
            "fileSize" to uploadResult.bytes,
            "cloudinaryUrl" to uploadResult.secureUrl,
            "cloudinaryPublicId" to uploadResult.publicId,
            "publicId" to uploadResult.publicId,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )

        val docRef = db.collection("documents").add(data).await()
        return docRef.id
    }

    suspend fun deleteDocument(docId: String) {
        var oldPublicId: String? = null
        var category = "raw"
        try {
            val snap = db.collection("documents").document(docId).get().await()
            oldPublicId = snap.getString("cloudinaryPublicId") ?: snap.getString("publicId")
            category = snap.getString("fileType") ?: "raw"
        } catch (e: Exception) {
            // ignore
        }

        if (!oldPublicId.isNull_or_Empty()) {
            val resourceType = when (category) {
                "image" -> "image"
                "video", "audio" -> "video"
                else -> "raw"
            }
            CloudinaryUploader.deleteAsset(oldPublicId!!, resourceType)
        }

        db.collection("documents").document(docId).delete().await()
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
