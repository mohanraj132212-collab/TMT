package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.utils.FormatUtils
import kotlinx.coroutines.tasks.await

class TeamRepository {

    private val db = FirebaseFirestore.getInstance()

    fun listenTeamMembers(onSuccess: (List<TeamMember>) -> Unit, onError: (Exception) -> Unit): ListenerRegistration {
        return db.collection("teamMembers").addSnapshotListener { snap, err ->
            if (err != null) {
                onError(err)
                return@addSnapshotListener
            }
            if (snap != null) {
                val list = snap.documents.mapNotNull { d ->
                    d.toObject(TeamMember::class.java)?.copy(id = d.id)
                }.filter { it.active }
                onSuccess(list)
            }
        }
    }

    suspend fun updateProfileName(memberId: String, name: String) {
        db.collection("teamMembers").document(memberId)
            .update(mapOf("name" to name.trim(), "updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }

    suspend fun updateProfilePhone(memberId: String, phone: String) {
        db.collection("teamMembers").document(memberId)
            .update(mapOf("phone" to FormatUtils.normalizePhone(phone), "updatedAt" to FieldValue.serverTimestamp()))
            .await()
    }

    suspend fun updateProfilePhoto(memberId: String, photoUrl: String, publicId: String?) {
        db.collection("teamMembers").document(memberId)
            .update(mapOf(
                "profilePhoto" to photoUrl,
                "profilePhotoPublicId" to publicId,
                "updatedAt" to FieldValue.serverTimestamp()
            ))
            .await()
    }
}
