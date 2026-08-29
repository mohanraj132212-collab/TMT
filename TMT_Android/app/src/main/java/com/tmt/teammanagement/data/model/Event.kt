package com.tmt.teammanagement.data.model

import com.google.firebase.firestore.DocumentId

data class Event(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val date: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val location: String = "",
    val memberIds: List<String> = emptyList(),
    val notes: String = "",
    val createdBy: String = "",
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)
