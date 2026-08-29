package com.tmt.teammanagement.ui.reminders

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.PrivateReminder
import com.tmt.teammanagement.data.repository.ReminderRepository
import kotlinx.coroutines.launch

class RemindersViewModel : ViewModel() {

    private val repository = ReminderRepository()

    private val _reminders = MutableLiveData<List<PrivateReminder>>()
    val reminders: LiveData<List<PrivateReminder>> = _reminders

    private val _status = MutableLiveData<Result<String>>()
    val status: LiveData<Result<String>> = _status

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(memberId: String) {
        listenerRegistration = repository.listenMyReminders(
            memberId = memberId,
            onSuccess = { list -> _reminders.value = list },
            onError = { err -> _status.value = Result.failure(err) }
        )
    }

    fun addReminder(memberId: String, title: String, description: String) {
        viewModelScope.launch {
            try {
                repository.addReminder(memberId, title, description)
                _status.value = Result.success("Reminder added!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    fun toggleComplete(reminderId: String, completed: Boolean) {
        viewModelScope.launch {
            try {
                repository.toggleComplete(reminderId, completed)
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    fun deleteReminder(reminderId: String) {
        viewModelScope.launch {
            try {
                repository.deleteReminder(reminderId)
                _status.value = Result.success("Reminder deleted.")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        listenerRegistration?.remove()
    }
}
