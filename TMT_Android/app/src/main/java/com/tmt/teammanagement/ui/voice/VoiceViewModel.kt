package com.tmt.teammanagement.ui.voice

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.VoiceMessage
import com.tmt.teammanagement.data.repository.VoiceRepository
import kotlinx.coroutines.launch
import java.io.File

class VoiceViewModel : ViewModel() {

    private val voiceRepository = VoiceRepository()

    private val _voiceMessages = MutableLiveData<List<VoiceMessage>>()
    val voiceMessages: LiveData<List<VoiceMessage>> = _voiceMessages

    private val _operationStatus = MutableLiveData<Result<String>>()
    val operationStatus: LiveData<Result<String>> = _operationStatus

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening() {
        listenerRegistration = voiceRepository.listenTeamVoiceMessages(
            onSuccess = { list -> _voiceMessages.value = list },
            onError = { err -> _operationStatus.value = Result.failure(err) }
        )
    }

    fun updateVoiceNote(messageId: String, audioFile: File, durationSeconds: Long, senderId: String) {
        viewModelScope.launch {
            try {
                val url = voiceRepository.updateVoiceNote(messageId, audioFile, durationSeconds, senderId)
                _operationStatus.value = Result.success("Voice note updated!")
            } catch (e: Exception) {
                _operationStatus.value = Result.failure(e)
            } finally {
                audioFile.delete()
            }
        }
    }

    fun deleteVoiceNote(messageId: String) {
        viewModelScope.launch {
            try {
                voiceRepository.deleteVoiceNote(messageId)
                _operationStatus.value = Result.success("Voice note deleted.")
            } catch (e: Exception) {
                _operationStatus.value = Result.failure(e)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}
