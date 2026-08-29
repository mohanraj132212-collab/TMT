package com.tmt.teammanagement.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.data.repository.AuthRepository
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {

    private val authRepository = AuthRepository()

    private val _loginResult = MutableLiveData<Result<TeamMember>>()
    val loginResult: LiveData<Result<TeamMember>> = _loginResult

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun login(phone: String) {
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.loginWithPhone(phone)
            _isLoading.value = false
            _loginResult.value = result
        }
    }
}
