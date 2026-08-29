package com.tmt.teammanagement.ui.documents

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
import androidx.recyclerview.widget.LinearLayoutManager
import com.tmt.teammanagement.data.model.TeamMember
import com.tmt.teammanagement.data.repository.AuthRepository
import com.tmt.teammanagement.databinding.FragmentDocumentsBinding
import com.tmt.teammanagement.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class DocumentsFragment : Fragment() {

    private var _binding: FragmentDocumentsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: DocumentsViewModel by viewModels()
    private lateinit var adapter: DocumentsAdapter
    private lateinit var sessionManager: SessionManager
    private var currentMember: TeamMember? = null

    private val selectFileLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { handleSelectedFile(it) }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDocumentsBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        val memberId = sessionManager.getMemberId().orEmpty()

        loadMemberInfo(memberId)
        setupRecyclerView(memberId)
        setupListeners()
        observeViewModel()

        viewModel.startListening()
    }

    private fun loadMemberInfo(memberId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            currentMember = AuthRepository().getMemberById(memberId)
        }
    }

    private fun setupRecyclerView(currentUserId: String) {
        adapter = DocumentsAdapter(
            currentUserId = currentUserId,
            onDeleteClick = { doc ->
                AlertDialog.Builder(requireContext())
                    .setTitle("Delete Document")
                    .setMessage("Are you sure you want to delete '${doc.fileName}'?")
                    .setPositiveButton("Delete") { _, _ -> viewModel.deleteDocument(doc.id) }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        )
        binding.rvDocuments.layoutManager = LinearLayoutManager(requireContext())
        binding.rvDocuments.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnUploadDoc.setOnClickListener {
            selectFileLauncher.launch("*/*")
        }
    }

    private fun observeViewModel() {
        viewModel.documents.observe(viewLifecycleOwner) { list ->
            adapter.submitList(list)
            binding.tvEmptyDocs.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.status.observe(viewLifecycleOwner) { result ->
            result.onSuccess { msg ->
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Error: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun handleSelectedFile(uri: Uri) {
        val member = currentMember ?: return
        val contentResolver = requireContext().contentResolver
        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        val fileName = "file_${System.currentTimeMillis()}"

        try {
            val tempFile = File(requireContext().cacheDir, fileName)
            contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            Toast.makeText(requireContext(), "Uploading document...", Toast.LENGTH_SHORT).show()
            viewModel.uploadDocument(tempFile, mimeType, member)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Failed to prepare file: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
