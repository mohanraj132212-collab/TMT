package com.tmt.teammanagement.ui.voice

import android.media.MediaRecorder
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.tmt.teammanagement.databinding.FragmentVoiceBinding
import com.tmt.teammanagement.utils.SessionManager
import java.io.File

class VoiceFragment : Fragment() {

    private var _binding: FragmentVoiceBinding? = null
    private val binding get() = _binding!!

    private val viewModel: VoiceViewModel by viewModels()
    private lateinit var adapter: VoiceAdapter
    private lateinit var sessionManager: SessionManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentVoiceBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        val currentUserId = sessionManager.getMemberId().orEmpty()

        setupRecyclerView(currentUserId)
        observeViewModel()
        viewModel.startListening()
    }

    private fun setupRecyclerView(currentUserId: String) {
        adapter = VoiceAdapter(
            currentUserId = currentUserId,
            onEditClick = { message ->
                showEditVoiceDialog(message.id, currentUserId)
            },
            onDeleteClick = { message ->
                showDeleteConfirmDialog(message.id)
            }
        )
        binding.rvVoiceList.layoutManager = LinearLayoutManager(requireContext())
        binding.rvVoiceList.adapter = adapter
    }

    private fun observeViewModel() {
        viewModel.voiceMessages.observe(viewLifecycleOwner) { list ->
            adapter.submitList(list)
            binding.tvEmptyVoice.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.operationStatus.observe(viewLifecycleOwner) { result ->
            result.onSuccess { msg ->
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Error: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showEditVoiceDialog(messageId: String, currentUserId: String) {
        var mediaRecorder: MediaRecorder? = null
        var replacementFile: File? = null
        var isRecording = false
        var startTime = 0L

        val builder = AlertDialog.Builder(requireContext())
        builder.setTitle("Record Replacement Voice Note")
        builder.setMessage("Tap Record to capture new replacement audio.")

        builder.setPositiveButton("Record") { dialog, _ -> }
        builder.setNegativeButton("Cancel", null)

        val alertDialog = builder.create()
        alertDialog.show()

        alertDialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            if (!isRecording) {
                try {
                    replacementFile = File(requireContext().cacheDir, "replace_${System.currentTimeMillis()}.m4a")
                    mediaRecorder = MediaRecorder().apply {
                        setAudioSource(MediaRecorder.AudioSource.MIC)
                        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                        setOutputFile(replacementFile?.absolutePath)
                        prepare()
                        start()
                    }
                    isRecording = true
                    startTime = System.currentTimeMillis()
                    alertDialog.setMessage("Recording... Tap Stop & Upload when finished.")
                    alertDialog.getButton(AlertDialog.BUTTON_POSITIVE).text = "Stop & Upload"
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Failed to record: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            } else {
                try {
                    mediaRecorder?.stop()
                    mediaRecorder?.release()
                    val durationSeconds = (System.currentTimeMillis() - startTime) / 1000
                    replacementFile?.let { file ->
                        viewModel.updateVoiceNote(messageId, file, durationSeconds, currentUserId)
                    }
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "Save error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
                alertDialog.dismiss()
            }
        }
    }

    private fun showDeleteConfirmDialog(messageId: String) {
        AlertDialog.Builder(requireContext())
            .setTitle("Delete Voice Message")
            .setMessage("Are you sure you want to permanently delete this voice note?")
            .setPositiveButton("Delete") { _, _ ->
                viewModel.deleteVoiceNote(messageId)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        adapter.releaseMediaPlayer()
        _binding = null
    }
}
