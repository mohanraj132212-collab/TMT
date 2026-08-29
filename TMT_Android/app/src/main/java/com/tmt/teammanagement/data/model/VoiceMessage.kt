package com.tmt.teammanagement.data.model

import com.google.firebase.firestore.DocumentId

data class EventFile(
    @DocumentId
    val id: String = "",
    val eventId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val fileName: String = "",
    val fileType: String = "",
    val mimeType: String = "",
    val fileSize: Long = 0,
    val cloudinaryUrl: String = "",
    val cloudinaryPublicId: String? = null,
    val publicId: String? = null,
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)

data class VoiceMessage(
    @DocumentId
    val id: String = "",
    val senderId: String = "",
    val senderName: String? = null,
    val eventId: String? = null,
    val workId: String? = null,
    val audioUrl: String = "",
    val cloudinaryUrl: String = "",
    val cloudinaryPublicId: String? = null,
    val publicId: String? = null,
    val fileSize: Long = 0,
    val mimeType: String = "audio/webm",
    val duration: Long = 0,
    val status: String = "sent",
    val replyTo: String? = null,
    val isEdited: Boolean = false,
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)

data class TeamDocument(
    @DocumentId
    val id: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val fileName: String = "",
    val fileType: String = "",
    val mimeType: String = "",
    val fileSize: Long = 0,
    val cloudinaryUrl: String = "",
    val cloudinaryPublicId: String? = null,
    val publicId: String? = null,
    val createdAt: Any? = null,
    val updatedAt: Any? = null
)

data class PrivateReminder(
    @DocumentId
    val id: String = "",
    val memberId: String = "",
    val title: String = "",
    val description: String = "",
    val reminderDate: String? = null,
    val reminderTime: String? = null,
    val completed: Boolean = false,
    val createdAt: Any? = null
)
