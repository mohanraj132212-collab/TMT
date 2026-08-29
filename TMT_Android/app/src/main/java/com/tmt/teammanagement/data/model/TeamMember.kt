package com.tmt.teammanagement.data.model

import com.google.firebase.firestore.DocumentId

data class TeamMember(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val profilePhoto: String? = null,
    val profilePhotoPublicId: String? = null,
    val active: Boolean = true,
    val updatedAt: Any? = null
)
