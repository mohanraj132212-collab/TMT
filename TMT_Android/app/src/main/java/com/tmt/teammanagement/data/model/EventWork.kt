package com.tmt.teammanagement.data.model

import com.google.firebase.firestore.DocumentId

data class EventWork(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val assignedMemberIds: List<String> = emptyList(),
    val status: String = "Pending",
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)

data class WorkCheck(
    @DocumentId
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val status: String = "Pending",
    val assignedMemberIds: List<String> = emptyList(),
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)
