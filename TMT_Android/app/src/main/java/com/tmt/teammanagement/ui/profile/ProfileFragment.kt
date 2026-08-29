package com.tmt.teammanagement.ui.profile

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.bumptech.glide.Glide
import com.tmt.teammanagement.R
import com.tmt.teammanagement.databinding.DialogCropperBinding
import com.tmt.teammanagement.databinding.FragmentProfileBinding
import com.tmt.teammanagement.ui.login.LoginActivity
import com.tmt.teammanagement.utils.SessionManager

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    private val viewModel: ProfileViewModel by viewModels()
    private lateinit var sessionManager: SessionManager

    private val selectPhotoLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { showCropperDialog(it) }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        val memberId = sessionManager.getMemberId().orEmpty()

        setupThemeSelector()
        setupListeners(memberId)
        observeViewModel()

        viewModel.loadMember(memberId)
    }

    private fun setupThemeSelector() {
        when (sessionManager.getThemePreference()) {
            "dark" -> binding.rbThemeDark.isChecked = true
            else -> binding.rbThemeLight.isChecked = true
        }

        binding.rgTheme.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.rbThemeDark) {
                sessionManager.saveThemePreference("dark")
            } else {
                sessionManager.saveThemePreference("light")
            }
        }
    }

    private fun setupListeners(memberId: String) {
        binding.fabChangePhoto.setOnClickListener {
            selectPhotoLauncher.launch("image/*")
        }

        binding.btnSaveProfile.setOnClickListener {
            val name = binding.etProfileName.text?.toString().orEmpty()
            val phone = binding.etProfilePhone.text?.toString().orEmpty()
            viewModel.updateProfile(memberId, name, phone)
        }

        binding.btnLogout.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(requireContext(), LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            requireActivity().finish()
        }
    }

    private fun observeViewModel() {
        viewModel.member.observe(viewLifecycleOwner) { member ->
            member?.let {
                binding.tvProfileNameDisplay.text = it.name
                binding.tvProfilePhoneDisplay.text = it.phone
                binding.etProfileName.setText(it.name)
                binding.etProfilePhone.setText(it.phone)

                if (!it.profilePhoto.isNull_or_Empty()) {
                    Glide.with(this)
                        .load(it.profilePhoto)
                        .circleCrop()
                        .into(binding.ivProfileAvatar)
                }
            }
        }

        viewModel.status.observe(viewLifecycleOwner) { result ->
            result.onSuccess { msg ->
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Error: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showCropperDialog(imageUri: Uri) {
        val memberId = sessionManager.getMemberId().orEmpty()
        val dialogBinding = DialogCropperBinding.inflate(layoutInflater)
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogBinding.root)
            .create()

        try {
            val inputStream = requireContext().contentResolver.openInputStream(imageUri)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream?.close()

            if (bitmap != null) {
                dialogBinding.cropperView.setImageBitmap(bitmap)
            }
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Failed to load image for cropping", Toast.LENGTH_SHORT).show()
            return
        }

        dialogBinding.btnResetCrop.setOnClickListener {
            dialogBinding.cropperView.resetCropState()
        }

        dialogBinding.btnCancelCrop.setOnClickListener {
            dialog.dismiss()
        }

        dialogBinding.btnApplyCrop.setOnClickListener {
            val cropped = dialogBinding.cropperView.getCroppedBitmap(256)
            if (cropped != null) {
                Toast.makeText(requireContext(), "Uploading avatar...", Toast.LENGTH_SHORT).show()
                viewModel.uploadCroppedProfilePhoto(memberId, cropped)
            }
            dialog.dismiss()
        }

        dialog.show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
