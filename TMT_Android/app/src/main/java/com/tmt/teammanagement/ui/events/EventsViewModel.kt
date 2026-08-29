package com.tmt.teammanagement.ui.events

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.Event
import com.tmt.teammanagement.data.model.EventWork
import com.tmt.teammanagement.data.repository.EventRepository
import kotlinx.coroutines.launch

class EventsViewModel : ViewModel() {

    private val repository = EventRepository()

    private val _events = MutableLiveData<List<Event>>()
    val events: LiveData<List<Event>> = _events

    private val _eventWorks = MutableLiveData<List<EventWork>>()
    val eventWorks: LiveData<List<EventWork>> = _eventWorks

    private val _status = MutableLiveData<Result<String>>()
    val status: LiveData<Result<String>> = _status

    private var eventsListener: ListenerRegistration? = null
    private var worksListener: ListenerRegistration? = null

    fun startListeningEvents() {
        eventsListener = repository.listenEvents(
            onSuccess = { list -> _events.value = list },
            onError = { err -> _status.value = Result.failure(err) }
        )
    }

    fun startListeningEventWorks(eventId: String) {
        worksListener = repository.listenEventWorks(eventId) { works ->
            _eventWorks.value = works
        }
    }

    fun createEvent(name: String, desc: String, date: String?, location: String, createdBy: String) {
        viewModelScope.launch {
            try {
                repository.createEvent(name, desc, date, location, createdBy)
                _status.value = Result.success("Event created!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    fun addWork(eventId: String, name: String, desc: String) {
        viewModelScope.launch {
            try {
                repository.addEventWork(eventId, name, desc)
                _status.value = Result.success("Work added!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        eventsListener?.remove()
        worksListener?.remove()
    }
}
