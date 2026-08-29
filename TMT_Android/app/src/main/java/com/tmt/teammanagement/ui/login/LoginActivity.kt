package com.tmt.teammanagement.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import com.tmt.teammanagement.databinding.ActivityLoginBinding
import com.tmt.teammanagement.ui.home.MainActivity
import com.tmt.teammanagement.utils.SessionManager

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val viewModel: LoginViewModel by viewModels()
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate()
        sessionManager = SessionManager(this)

        if (sessionManager.isLoggedIn()) {
            navigateToMain()
            return
        }

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val phone = binding.etPhone.text?.toString().orEmpty()
            binding.tvError.visibility = View.GONE
            viewModel.login(phone)
        }
    }

    private fun observeViewModel() {
        viewModel.isLoading.observe(this) { isLoading ->
            binding.pbLoading.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.btnLogin.isEnabled = !isLoading
        }

        viewModel.loginResult.observe(this) { result ->
            result.onSuccess { member ->
                sessionManager.saveSession(member.id, member.phone)
                Toast.makeText(this, "Welcome back, ${member.name}!", Toast.LENGTH_SHORT).show()
                navigateToMain()
            }.onFailure { exception ->
                binding.tvError.text = exception.message
                binding.tvError.visibility = View.VISIBLE
            }
        }
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}
