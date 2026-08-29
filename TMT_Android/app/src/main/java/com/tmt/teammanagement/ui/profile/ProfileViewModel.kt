package com.tmt.teammanagement.ui.profile

import android.graphics.Bitmap
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmt.teammanagement.data.cloudinary.CloudinaryUploader
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.data.repository.AuthRepository
import com.tmt.teammanagement.data.repository.TeamRepository
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

class ProfileViewModel : ViewModel() {

    private val authRepository = AuthRepository()
    private val teamRepository = TeamRepository()

    private val _member = MutableLiveData<TeamMember?>()
    val member: LiveData<TeamMember?> = _member

    private val _status = MutableLiveData<Result<String>>()
    val status: LiveData<Result<String>> = _status

    fun loadMember(memberId: String) {
        viewModelScope.launch {
            val m = authRepository.getMemberById(memberId)
            _member.value = m
        }
    }

    fun updateProfile(memberId: String, name: String, phone: String) {
        viewModelScope.launch {
            try {
                teamRepository.updateProfileName(memberId, name)
                teamRepository.updateProfilePhone(memberId, phone)
                loadMember(memberId)
                _status.value = Result.success("Profile saved successfully!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }

    fun uploadCroppedProfilePhoto(memberId: String, croppedBitmap: Bitmap) {
        viewModelScope.launch {
            try {
                val oldPublicId = _member.value?.profilePhotoPublicId

                val stream = ByteArrayOutputStream()
                croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 85, stream)
                val byteArray = stream.toByteArray()

                val uploadResult = CloudinaryUploader.uploadBytes(
                    byteArray = byteArray,
                    fileName = "profile_${memberId}_${System.currentTimeMillis()}.jpg",
                    mimeType = "image/jpeg"
                )

                teamRepository.updateProfilePhoto(
                    memberId = memberId,
                    photoUrl = uploadResult.secureUrl,
                    publicId = uploadResult.publicId
                )

                if (!oldPublicId.isNull_or_Empty() && oldPublicId != uploadResult.publicId) {
                    CloudinaryUploader.deleteAsset(oldPublicId!!, "image")
                }

                loadMember(memberId)
                _status.value = Result.success("Profile photo updated!")
            } catch (e: Exception) {
                _status.value = Result.failure(e)
            }
        }
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
