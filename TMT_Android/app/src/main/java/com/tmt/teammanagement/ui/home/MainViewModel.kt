package com.tmt.teammanagement.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.data.repository.AuthRepository

class MainViewModel : ViewModel() {
    private val authRepository = AuthRepository()
    private val _currentMember = MutableLiveData<TeamMember?>()
    val currentMember: LiveData<TeamMember?> = _currentMember

    fun loadCurrentMember(memberId: String) {
        kotlinx.coroutines.GlobalScope.launch {
            val m = authRepository.getMemberById(memberId)
            _currentMember.postValue(m)
        }
    }
}
private fun kotlinx.coroutines.GlobalScope.launch(block: suspend () -> Unit) {
    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { block() }
}
