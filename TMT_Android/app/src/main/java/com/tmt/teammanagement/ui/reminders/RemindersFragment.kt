package com.tmt.teammanagement.ui.reminders

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
import com.tmt.teammanagement.databinding.DialogReminderFormBinding
import com.tmt.teammanagement.databinding.FragmentRemindersBinding
import com.tmt.teammanagement.utils.SessionManager

class RemindersFragment : Fragment() {

    private var _binding: FragmentRemindersBinding? = null
    private val binding get() = _binding!!

    private val viewModel: RemindersViewModel by viewModels()
    private lateinit var adapter: RemindersAdapter
    private lateinit var sessionManager: SessionManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentRemindersBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        val memberId = sessionManager.getMemberId().orEmpty()

        setupRecyclerView()
        setupListeners(memberId)
        observeViewModel()

        viewModel.startListening(memberId)
    }

    private fun setupRecyclerView() {
        adapter = RemindersAdapter(
            onToggleComplete = { reminder, completed ->
                viewModel.toggleComplete(reminder.id, completed)
            },
            onDeleteClick = { reminder ->
                viewModel.deleteReminder(reminder.id)
            }
        )
        binding.rvReminders.layoutManager = LinearLayoutManager(requireContext())
        binding.rvReminders.adapter = adapter
    }

    private fun setupListeners(memberId: String) {
        binding.btnAddReminder.setOnClickListener {
            showAddReminderDialog(memberId)
        }
    }

    private fun observeViewModel() {
        viewModel.reminders.observe(viewLifecycleOwner) { list ->
            adapter.submitList(list)
            binding.tvEmptyReminders.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.status.observe(viewLifecycleOwner) { result ->
            result.onSuccess { msg ->
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Error: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showAddReminderDialog(memberId: String) {
        val dialogBinding = DialogReminderFormBinding.inflate(layoutInflater)
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogBinding.root)
            .create()

        dialogBinding.btnSave.setOnClickListener {
            val title = dialogBinding.etTitle.text?.toString().orEmpty()
            val desc = dialogBinding.etDesc.text?.toString().orEmpty()

            if (title.isBlank()) {
                dialogBinding.etTitle.error = "Title required"
                return@setOnClickListener
            }

            viewModel.addReminder(memberId, title, desc)
            dialog.dismiss()
        }

        dialogBinding.btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
