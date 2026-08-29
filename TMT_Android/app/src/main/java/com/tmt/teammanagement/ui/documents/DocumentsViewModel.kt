package com.tmt.teammanagement.ui.documents

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.firestore.ListenerRegistration
import com.tmt.teammanagement.data.model.TeamDocument
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.data.repository.DocumentRepository
import kotlinx.coroutines.launch
import java.io.File

class DocumentsViewModel : ViewModel() {

    private val documentRepository = DocumentRepository()

    private val _documents = MutableLiveData<List<TeamDocument>>()
    val documents: LiveData<List<TeamDocument>> = _documents

    private val _status = MutableLiveData<Result<String>>()
    val status: LiveData<Result<String>> = _status

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening() {
        listenerRegistration = documentRepository.listenDocuments(
            onSuccess = { list -> _documents.value = list },
            onError = { err -> _status.value = Result.failure(err) }
        )
    }

    fun uploadDocument(file: File, mimeType: String, senderMember: TeamMember) {
        viewModelScope.launch {
            try {
                documentRepository.uploadDocument(file, mimeType, senderMember)
                _status.value = Result.success("Document uploaded successfully!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            } finally {
                file.delete()
            }
        }
    }

    fun deleteDocument(docId: String) {
        viewModelScope.launch {
            try {
                documentRepository.deleteDocument(docId)
                _status.value = Result.success("Document deleted.")
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
