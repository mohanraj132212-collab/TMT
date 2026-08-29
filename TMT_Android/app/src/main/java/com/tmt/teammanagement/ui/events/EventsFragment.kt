package com.tmt.teammanagement.ui.events

import android.content.Intent
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
import com.tmt.teammanagement.databinding.DialogEventFormBinding
import com.tmt.teammanagement.databinding.FragmentEventsBinding
import com.tmt.teammanagement.utils.SessionManager

class EventsFragment : Fragment() {

    private var _binding: FragmentEventsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: EventsViewModel by viewModels()
    private lateinit var adapter: EventsAdapter
    private lateinit var sessionManager: SessionManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentEventsBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())

        setupRecyclerView()
        setupListeners()
        observeViewModel()

        viewModel.startListeningEvents()
    }

    private fun setupRecyclerView() {
        adapter = EventsAdapter { event ->
            val intent = Intent(requireContext(), EventDetailActivity::class.java).apply {
                putExtra("EVENT_ID", event.id)
                putExtra("EVENT_NAME", event.name)
                putExtra("EVENT_DESC", event.description)
                putExtra("EVENT_DATE", event.date)
                putExtra("EVENT_LOCATION", event.location)
            }
            startActivity(intent)
        }
        binding.rvEventsList.layoutManager = LinearLayoutManager(requireContext())
        binding.rvEventsList.adapter = adapter
    }

    private fun setupListeners() {
        binding.btnAddEvent.setOnClickListener {
            showCreateEventDialog()
        }
    }

    private fun observeViewModel() {
        viewModel.events.observe(viewLifecycleOwner) { list ->
            adapter.submitList(list)
        }

        viewModel.status.observe(viewLifecycleOwner) { result ->
            result.onSuccess { msg ->
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }.onFailure { err ->
                Toast.makeText(requireContext(), "Error: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showCreateEventDialog() {
        val dialogBinding = DialogEventFormBinding.inflate(layoutInflater)
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogBinding.root)
            .create()

        val memberId = sessionManager.getMemberId().orEmpty()

        dialogBinding.btnSaveEvent.setOnClickListener {
            val name = dialogBinding.etEventName.text?.toString().orEmpty()
            val desc = dialogBinding.etEventDesc.text?.toString().orEmpty()
            val date = dialogBinding.etEventDate.text?.toString().orEmpty()
            val location = dialogBinding.etEventLocation.text?.toString().orEmpty()

            if (name.isBlank()) {
                dialogBinding.etEventName.error = "Name is required"
                return@setOnClickListener
            }

            viewModel.createEvent(name, desc, date, location, memberId)
            dialog.dismiss()
        }

        dialogBinding.btnCancelEvent.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
