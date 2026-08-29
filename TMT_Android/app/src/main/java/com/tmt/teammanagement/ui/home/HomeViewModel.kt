package com.tmt.teammanagement.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.Event
import com.tmt.teammanagement.data.model.VoiceMessage
import com.tmt.teammanagement.data.repository.EventRepository
import com.tmt.teammanagement.data.repository.VoiceRepository

class HomeViewModel : ViewModel() {

    private val voiceRepository = VoiceRepository()
    private val eventRepository = EventRepository()

    private val _voiceMessages = MutableLiveData<List<VoiceMessage>>()
    val voiceMessages: LiveData<List<VoiceMessage>> = _voiceMessages

    private val _events = MutableLiveData<List<Event>>()
    val events: LiveData<List<Event>> = _events

    private var voiceListener: ListenerRegistration? = null
    private var eventListener: ListenerRegistration? = null

    fun startListening() {
        voiceListener = voiceRepository.listenTeamVoiceMessages(
            onSuccess = { list -> _voiceMessages.value = list },
            onError = {}
        )
        eventListener = eventRepository.listenEvents(
            onSuccess = { list -> _events.value = list },
            onError = {}
        )
    }

    fun stopListening() {
        voiceListener?.remove()
        eventListener?.remove()
    }

    override fun onCleared() {
        super.onCleared()
        stopListening()
    }
}
