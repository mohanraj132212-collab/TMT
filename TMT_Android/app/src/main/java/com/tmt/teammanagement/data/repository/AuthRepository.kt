package com.tmt.teammanagement.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.utils.FormatUtils
import kotlinx.coroutines.tasks.await

class AuthRepository {

    private val db = FirebaseFirestore.getInstance()

    suspend fun loginWithPhone(rawPhone: String): Result<TeamMember> {
        val normalized = FormatUtils.normalizePhone(rawPhone)
        if (normalized.length < 6) {
            return Result.failure(Exception("Enter a valid mobile number."))
        }

        return try {
            val snapshot = db.collection("teamMembers").get().await()
            val member = snapshot.documents.mapNotNull { doc ->
                val m = doc.toObject(TeamMember::class.java)
                m?.copy(id = doc.id)
            }.find { m ->
                val memberPhoneDigits = FormatUtils.normalizePhone(m.phone)
                memberPhoneDigits.endsWith(normalized) || normalized.endsWith(memberPhoneDigits)
            }

            if (member == null) {
                Result.failure(Exception("This mobile number is not registered with TMT."))
            } else if (!member.active) {
                Result.failure(Exception("This account is inactive. Contact your team admin."))
            } else {
                Result.success(member)
            }
        } catch (e: Exception) {
            Result.failure(Exception("Failed to verify mobile number: ${e.message}"))
        }
    }

    suspend fun getMemberById(memberId: String): TeamMember? {
        return try {
            val doc = db.collection("teamMembers").document(memberId).get().await()
            if (doc.exists()) {
                doc.toObject(TeamMember::class.java)?.copy(id = doc.id)
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
