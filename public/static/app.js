// ============================================================================
// MULTI-SESSION ORCHESTRATION - Frontend JavaScript
// Revolutionary: Session-Centric with AI-Powered Handoff
// ============================================================================

const API_BASE = '/api'
let currentProject = null
let huggingFaceToken = localStorage.getItem('hf_token') || ''

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp()
  setupEventListeners()
  loadStats()
  loadProjects()
})

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabName = e.currentTarget.getAttribute('data-tab')
      switchTab(tabName)
    })
  })
  
  // New project button
  document.getElementById('btn-new-project')?.addEventListener('click', createNewProject)
  
  // New session button
  document.getElementById('btn-new-session')?.addEventListener('click', createNewSession)
  
  // AI Handoff form
  document.getElementById('form-ai-handoff')?.addEventListener('submit', generateAIHandoff)
  
  // Copy & Download buttons
  document.getElementById('btn-copy-handoff')?.addEventListener('click', copyHandoffToClipboard)
  document.getElementById('btn-download-handoff')?.addEventListener('click', downloadHandoff)
}

function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active', 'border-purple-600', 'text-purple-600')
    btn.classList.add('border-transparent', 'text-gray-600')
  })
  
  const activeBtn = document.querySelector(`[data-tab="${tabName}"]`)
  activeBtn?.classList.add('active', 'border-purple-600', 'text-purple-600')
  activeBtn?.classList.remove('border-transparent', 'text-gray-600')
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden')
  })
  
  document.getElementById(`tab-${tabName}`)?.classList.remove('hidden')
  
  // Load data for specific tabs
  if (tabName === 'sessions') {
    loadSessions()
  } else if (tabName === 'analytics') {
    loadAnalytics()
  }
}

// ============================================================================
// STATS & DASHBOARD
// ============================================================================

async function loadStats() {
  try {
    const response = await axios.get(`${API_BASE}/stats`)
    if (response.data.success) {
      const { projects, sessions, growth } = response.data.data
      document.getElementById('stat-projects').textContent = projects
      document.getElementById('stat-sessions').textContent = sessions
      document.getElementById('stat-growth').textContent = `${growth}%`
    }
  } catch (error) {
    console.error('Load stats error:', error)
  }
}

// ============================================================================
// PROJECTS MANAGEMENT
// ============================================================================

async function loadProjects() {
  try {
    const response = await axios.get(`${API_BASE}/projects`)
    if (response.data.success) {
      renderProjects(response.data.data)
      populateProjectDropdowns(response.data.data)
    }
  } catch (error) {
    console.error('Load projects error:', error)
    showError('Failed to load projects')
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projects-list')
  if (!container) return
  
  if (projects.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">📁</div>
        <p class="text-lg font-semibold mb-2">No projects yet</p>
        <p class="text-sm">Create your first project to start orchestrating sessions!</p>
      </div>
    `
    return
  }
  
  container.innerHTML = projects.map(project => `
    <div class="bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
         onclick="viewProjectSessions(${project.id})">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(project.name)}</h4>
          <p class="text-gray-600 text-sm mb-4">${escapeHtml(project.description || 'No description')}</p>
          <div class="flex gap-4 text-sm">
            <div>
              <span class="text-gray-500">Sessions:</span>
              <span class="font-bold text-blue-600 ml-1">${project.total_sessions}</span>
            </div>
            <div>
              <span class="text-gray-500">Credits:</span>
              <span class="font-bold text-purple-600 ml-1">${project.total_credits_used}</span>
            </div>
            <div>
              <span class="text-gray-500">Growth:</span>
              <span class="font-bold text-green-600 ml-1">${Math.round((project.growth_efficiency || 0) * 100)}%</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${
            project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }">
            ${project.status.toUpperCase()}
          </span>
          ${project.active_sessions > 0 ? `
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              ${project.active_sessions} Active
            </span>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('')
}

async function createNewProject() {
  const name = await promptDialog('New Project', 'Enter project name')
  if (!name) return
  
  const description = await promptTextarea('Project Description', 'Enter project description (optional)')
  
  try {
    showLoading('Creating project...')
    
    const response = await axios.post(`${API_BASE}/projects`, {
      name,
      description: description || ''
    })
    
    hideLoading()
    
    if (response.data.success) {
      showSuccess('Project created successfully!')
      loadProjects()
      loadStats()
    }
  } catch (error) {
    console.error('Create project error:', error)
    hideLoading()
    showError('Failed to create project')
  }
}

function populateProjectDropdowns(projects) {
  const selects = [
    document.getElementById('filter-project-sessions'),
    document.getElementById('handoff-project')
  ]
  
  selects.forEach(select => {
    if (!select) return
    
    const currentValue = select.value
    const options = projects.map(p => 
      `<option value="${p.id}" ${p.id == currentValue ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    ).join('')
    
    if (select.id === 'filter-project-sessions') {
      select.innerHTML = `<option value="">All Projects</option>${options}`
    } else {
      select.innerHTML = `<option value="">-- Select Project --</option>${options}`
    }
  })
}

// ============================================================================
// SESSIONS MANAGEMENT
// ============================================================================

async function loadSessions(projectId = null) {
  const filterSelect = document.getElementById('filter-project-sessions')
  const selectedProject = projectId || filterSelect?.value
  
  if (!selectedProject) {
    document.getElementById('sessions-list').innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">♾️</div>
        <p class="text-lg">Select a project to view its sessions</p>
      </div>
    `
    return
  }
  
  try {
    const response = await axios.get(`${API_BASE}/projects/${selectedProject}/sessions`)
    if (response.data.success) {
      renderSessions(response.data.data, selectedProject)
    }
  } catch (error) {
    console.error('Load sessions error:', error)
    showError('Failed to load sessions')
  }
}

function renderSessions(sessions, projectId) {
  const container = document.getElementById('sessions-list')
  if (!container) return
  
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">🎯</div>
        <p class="text-lg font-semibold mb-2">No sessions yet</p>
        <p class="text-sm">Start your first session to begin the infinite growth loop!</p>
      </div>
    `
    return
  }
  
  // Render timeline
  const timeline = document.getElementById('sessions-timeline')
  if (timeline) {
    timeline.innerHTML = `
      <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <h4 class="font-bold text-lg text-purple-900 mb-4">♾️ Session Timeline</h4>
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          ${sessions.map((s, idx) => `
            <div class="flex items-center">
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                  s.status === 'completed' ? 'bg-green-500' : 
                  s.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                }">
                  ${s.session_number}
                </div>
                <div class="text-xs mt-1 text-gray-600">${s.credits_used || 0}c</div>
              </div>
              ${idx < sessions.length - 1 ? '<div class="w-8 h-1 bg-purple-300 mx-2"></div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }
  
  // Render sessions list
  container.innerHTML = sessions.map(session => `
    <div class="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h4 class="text-xl font-bold text-gray-800">Session #${session.session_number}</h4>
          <p class="text-sm text-gray-500">${new Date(session.started_at).toLocaleString()}</p>
        </div>
        <span class="px-4 py-2 rounded-lg font-semibold ${
          session.status === 'completed' ? 'bg-green-100 text-green-800' :
          session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }">
          ${session.status.toUpperCase()}
        </span>
      </div>
      
      ${session.objectives ? `
        <div class="mb-3">
          <span class="text-sm font-semibold text-gray-700">Objectives:</span>
          <p class="text-sm text-gray-600 mt-1">${escapeHtml(session.objectives)}</p>
        </div>
      ` : ''}
      
      ${session.accomplishments ? `
        <div class="mb-3">
          <span class="text-sm font-semibold text-green-700">✅ Accomplishments:</span>
          <p class="text-sm text-gray-600 mt-1">${escapeHtml(session.accomplishments)}</p>
        </div>
      ` : ''}
      
      <div class="flex gap-4 text-sm mt-4">
        <div>
          <span class="text-gray-500">Credits:</span>
          <span class="font-bold text-purple-600 ml-1">${session.credits_used || 0}</span>
        </div>
        <div>
          <span class="text-gray-500">Conversations:</span>
          <span class="font-bold text-blue-600 ml-1">${session.conversation_count || 0}</span>
        </div>
        <div>
          <span class="text-gray-500">Handoffs:</span>
          <span class="font-bold text-green-600 ml-1">${session.handoff_count || 0}</span>
        </div>
      </div>
      
      ${session.status === 'in_progress' ? `
        <div class="mt-4 flex gap-3">
          <button 
            onclick="completeSession('${session.id}', '${projectId}')" 
            class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-shadow"
          >
            <i class="fas fa-check-circle mr-2"></i>Complete Session
          </button>
          <button 
            onclick="viewHandoff('${session.id}')" 
            class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors"
          >
            <i class="fas fa-file-alt mr-2"></i>View Handoff
          </button>
        </div>
      ` : ''}
    </div>
  `).join('')
}

async function createNewSession() {
  const filterSelect = document.getElementById('filter-project-sessions')
  const projectId = filterSelect?.value
  
  if (!projectId) {
    showWarning('Please select a project first!')
    return
  }
  
  const objectives = await promptTextarea('Session Objectives', 'Enter session objectives (optional)')
  const accountName = await promptDialog('Account Name', 'Enter account name (optional)', 'default')
  
  if (objectives === null) return
  
  try {
    showLoading('Creating new session...')
    
    const response = await axios.post(`${API_BASE}/sessions/create`, {
      project_id: projectId,
      account_name: accountName || 'default',
      objectives: objectives || ''
    })
    
    hideLoading()
    
    if (response.data.success) {
      showSuccess(response.data.data.message)
      loadSessions(projectId)
      loadStats()
      
      if (response.data.data.previous_handoff) {
        showInfo('Previous handoff loaded! Check console for details.')
        console.log('Previous Handoff:', response.data.data.previous_handoff)
        
        // Auto-display previous handoff in modal
        await showModal('📝 Previous Session Handoff', response.data.data.previous_handoff, 'textarea', true)
      }
    }
  } catch (error) {
    console.error('Create session error:', error)
    hideLoading()
    showError('Failed to create session')
  }
}

// Complete session workflow with AI handoff generation
async function completeSession(sessionId, projectId) {
  try {
    // Prompt for accomplishments
    const accomplishments = await promptTextarea(
      'Session Accomplishments',
      'What did you accomplish in this session?\n\nBe specific and detailed:'
    )
    
    if (!accomplishments) {
      showWarning('Please provide accomplishments')
      return
    }
    
    // Prompt for blockers (optional)
    const blockers = await promptTextarea(
      'Blockers or Issues (Optional)',
      'Any blockers or issues encountered?'
    )
    
    // Prompt for credits used
    const creditsStr = await promptDialog(
      'Credits Used',
      'Enter credits used in this session:',
      '90'
    )
    
    const creditsUsed = parseInt(creditsStr) || 90
    
    showLoading('Completing session & generating handoff...')
    
    // Complete session
    const response = await axios.post(`${API_BASE}/sessions/${sessionId}/complete`, {
      accomplishments: accomplishments,
      blockers: blockers || '',
      credits_used: creditsUsed
    })
    
    hideLoading()
    
    if (response.data.success) {
      showSuccess('Session completed successfully! Handoff generated.')
      
      // Show handoff in modal if available
      if (response.data.data.handoff_content) {
        await showModal(
          '📝 Handoff Document Generated',
          response.data.data.handoff_content,
          'textarea',
          true
        )
      }
      
      // Reload sessions
      loadSessions(projectId)
      loadStats()
    }
  } catch (error) {
    console.error('Complete session error:', error)
    hideLoading()
    showError('Failed to complete session: ' + (error.response?.data?.message || error.message))
  }
}

// View handoff document for a session
async function viewHandoff(sessionId) {
  try {
    showLoading('Loading handoff document...')
    
    const response = await axios.get(`${API_BASE}/sessions/${sessionId}`)
    
    hideLoading()
    
    if (response.data.success) {
      const session = response.data.data
      
      if (session.handoff_content) {
        await showModal(
          `📝 Session #${session.session_number} Handoff`,
          session.handoff_content,
          'textarea',
          true
        )
      } else {
        showWarning('No handoff document available for this session')
      }
    }
  } catch (error) {
    console.error('View handoff error:', error)
    hideLoading()
    showError('Failed to load handoff document')
  }
}

function viewProjectSessions(projectId) {
  currentProject = projectId
  
  // Switch to sessions tab
  switchTab('sessions')
  
  // Set filter
  const filterSelect = document.getElementById('filter-project-sessions')
  if (filterSelect) {
    filterSelect.value = projectId
  }
  
  // Load sessions
  loadSessions(projectId)
}

// ============================================================================
// AI HANDOFF GENERATION
// ============================================================================

async function generateAIHandoff(e) {
  e.preventDefault()
  
  const projectId = document.getElementById('handoff-project').value
  const context = document.getElementById('handoff-context').value
  const useAI = document.getElementById('handoff-use-ai').checked
  
  if (!projectId || !context) {
    showWarning('Please select project and provide context!')
    return
  }
  
  // Get or prompt for HF token
  if (useAI && !huggingFaceToken) {
    huggingFaceToken = await promptDialog(
      'Hugging Face Token Required', 
      'Enter your Hugging Face API token'
    )
    if (!huggingFaceToken) {
      showWarning('AI mode requires Hugging Face token!')
      return
    }
    localStorage.setItem('hf_token', huggingFaceToken)
  }
  
  try {
    showLoading('Generating AI-powered handoff...')
    
    if (useAI && huggingFaceToken) {
      // Real AI endpoint call
      const response = await axios.post(`${API_BASE}/ai/handoff`, {
        projectId,
        conversationText: context,
        useAI: true,
        huggingFaceToken
      })
      
      hideLoading()
      
      if (response.data.success) {
        document.getElementById('handoff-output').textContent = response.data.data.masterPrompt
        document.getElementById('handoff-result').classList.remove('hidden')
        showSuccess('AI handoff generated successfully!')
      } else {
        throw new Error(response.data.message || 'AI generation failed')
      }
    } else {
      // Fallback to formatted version
      const handoff = formatHandoff(context, projectId)
      document.getElementById('handoff-output').textContent = handoff
      document.getElementById('handoff-result').classList.remove('hidden')
      hideLoading()
      showSuccess('Handoff generated successfully!')
    }
    
  } catch (error) {
    console.error('Generate handoff error:', error)
    hideLoading()
    showError('Failed to generate handoff: ' + error.message)
  }
}

function formatHandoff(context, projectId) {
  return `# 🎯 MASTER HANDOFF PROMPT

**Project ID**: ${projectId}
**Generated**: ${new Date().toISOString()}

## 📝 Context Summary

${context.substring(0, 500)}...

## ✅ Accomplishments

[Auto-extracted from context]

## 🎯 Next Steps

1. Review current state
2. Continue development
3. Maintain quality standards

## 🔧 Technical Notes

[Auto-generated based on conversation analysis]

---
*Generated by Multi-Session Orchestrator with AI*
`
}

function copyHandoffToClipboard() {
  const text = document.getElementById('handoff-output').textContent
  navigator.clipboard.writeText(text)
  showSuccess('Copied to clipboard!')
}

function downloadHandoff() {
  const text = document.getElementById('handoff-output').textContent
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `handoff-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showSuccess('Downloaded!')
}

// ============================================================================
// ANALYTICS
// ============================================================================

async function loadAnalytics() {
  const container = document.getElementById('analytics-content')
  if (!container) return
  
  try {
    // Get sessions data
    const response = await axios.get(`${API_BASE}/projects`)
    if (!response.data.success || response.data.data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <div class="text-6xl mb-4">📊</div>
          <p class="text-lg">No analytics data yet!</p>
          <p class="text-sm mt-2">Create a project and start sessions to see growth metrics</p>
        </div>
      `
      return
    }
    
    // Calculate analytics for all sessions
    let allSessions = []
    for (const project of response.data.data) {
      const sessionsResp = await axios.get(`${API_BASE}/projects/${project.id}/sessions`)
      if (sessionsResp.data.success) {
        allSessions = allSessions.concat(sessionsResp.data.data.map(s => ({...s, projectName: project.name})))
      }
    }
    
    // Sort by created_at
    allSessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    
    // Calculate metrics
    const sessionCount = allSessions.length
    const currentEfficiency = calculateEfficiency(sessionCount)
    const currentKnowledge = calculateKnowledge(sessionCount)
    const sessionsTo95 = calculateSessionsToTarget(0.95)
    
    // Update stats
    document.getElementById('analytics-total-sessions').textContent = sessionCount
    document.getElementById('analytics-efficiency').textContent = `${(currentEfficiency * 100).toFixed(1)}%`
    
    // Calculate growth rate
    const growthRate = sessionCount > 1 
      ? ((calculateEfficiency(sessionCount) - calculateEfficiency(sessionCount - 1)) / calculateEfficiency(sessionCount - 1) * 100)
      : 0
    document.getElementById('analytics-growth').textContent = `+${growthRate.toFixed(1)}%`
    
    // Render charts
    container.innerHTML = `
      <div class="space-y-8">
        <!-- Predictions Card -->
        <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
          <h4 class="text-xl font-bold text-purple-900 mb-4">🔮 Growth Predictions</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white rounded-lg p-4 shadow">
              <p class="text-sm text-gray-600 mb-1">Current Efficiency</p>
              <p class="text-3xl font-bold text-purple-600">${(currentEfficiency * 100).toFixed(1)}%</p>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
              <p class="text-sm text-gray-600 mb-1">Current Knowledge</p>
              <p class="text-3xl font-bold text-blue-600">${currentKnowledge.toFixed(2)}x</p>
            </div>
            <div class="bg-white rounded-lg p-4 shadow">
              <p class="text-sm text-gray-600 mb-1">Sessions to 95%</p>
              <p class="text-3xl font-bold text-green-600">${sessionsTo95 - sessionCount}</p>
              <p class="text-xs text-gray-500 mt-1">~${Math.ceil((sessionsTo95 - sessionCount) / 2)} weeks at 2/week</p>
            </div>
          </div>
        </div>
        
        <!-- Efficiency Growth Chart -->
        <div class="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4">📈 Efficiency Growth Over Time</h4>
          <canvas id="efficiencyChart" height="80"></canvas>
        </div>
        
        <!-- Knowledge Accumulation Chart -->
        <div class="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4">🧠 Knowledge Accumulation</h4>
          <canvas id="knowledgeChart" height="80"></canvas>
        </div>
        
        <!-- Effective Output Chart -->
        <div class="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4">💎 Effective Output (Credits × Efficiency × Knowledge)</h4>
          <canvas id="outputChart" height="80"></canvas>
        </div>
        
        <!-- Session Timeline -->
        <div class="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h4 class="text-xl font-bold text-gray-800 mb-4">🕐 Session Timeline</h4>
          <div id="session-timeline-viz" class="space-y-3"></div>
        </div>
      </div>
    `
    
    // Render charts
    renderEfficiencyChart(sessionCount)
    renderKnowledgeChart(sessionCount)
    renderOutputChart(sessionCount)
    renderSessionTimeline(allSessions)
    
  } catch (error) {
    console.error('Load analytics error:', error)
    container.innerHTML = `
      <div class="text-center py-12 text-red-500">
        <div class="text-6xl mb-4">❌</div>
        <p class="text-lg">Failed to load analytics</p>
        <p class="text-sm mt-2">${error.message}</p>
      </div>
    `
  }
}

// ============================================================================
// GROWTH METRICS CALCULATIONS (Infinite Growth Loop Formulas)
// ============================================================================

function calculateEfficiency(sessionNumber) {
  // Formula: 0.7 + 0.25 × tanh(N / 50)
  // Starts at 70%, asymptotically approaches 95%
  return 0.7 + 0.25 * Math.tanh(sessionNumber / 50)
}

function calculateKnowledge(sessionNumber) {
  // Formula: 1 + log(1 + N / 10)
  // Logarithmic growth representing accumulated learning
  return 1 + Math.log(1 + sessionNumber / 10)
}

function calculateOutput(credits, sessionNumber) {
  // Effective output = Credits × Efficiency × Knowledge
  const efficiency = calculateEfficiency(sessionNumber)
  const knowledge = calculateKnowledge(sessionNumber)
  return credits * efficiency * knowledge
}

function calculateSessionsToTarget(targetEfficiency) {
  // Solve for N: targetEfficiency = 0.7 + 0.25 × tanh(N / 50)
  // N = 50 × atanh((targetEfficiency - 0.7) / 0.25)
  return Math.ceil(50 * Math.atanh((targetEfficiency - 0.7) / 0.25))
}

// ============================================================================
// CHART RENDERING
// ============================================================================

function renderEfficiencyChart(currentSession) {
  const canvas = document.getElementById('efficiencyChart')
  if (!canvas) return
  
  // Generate data points (past + future predictions)
  const maxSessions = Math.max(currentSession + 20, 50)
  const labels = []
  const actualData = []
  const predictedData = []
  
  for (let i = 1; i <= maxSessions; i++) {
    labels.push(`S${i}`)
    const efficiency = calculateEfficiency(i) * 100
    
    if (i <= currentSession) {
      actualData.push(efficiency)
      predictedData.push(null)
    } else {
      actualData.push(null)
      predictedData.push(efficiency)
    }
  }
  
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Actual Efficiency',
          data: actualData,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Predicted Efficiency',
          data: predictedData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 65,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%'
            }
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 20
          }
        }
      }
    }
  })
}

function renderKnowledgeChart(currentSession) {
  const canvas = document.getElementById('knowledgeChart')
  if (!canvas) return
  
  const maxSessions = Math.max(currentSession + 20, 50)
  const labels = []
  const actualData = []
  const predictedData = []
  
  for (let i = 1; i <= maxSessions; i++) {
    labels.push(`S${i}`)
    const knowledge = calculateKnowledge(i)
    
    if (i <= currentSession) {
      actualData.push(knowledge)
      predictedData.push(null)
    } else {
      actualData.push(null)
      predictedData.push(knowledge)
    }
  }
  
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Actual Knowledge',
          data: actualData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Predicted Knowledge',
          data: predictedData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}x`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 1,
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + 'x'
            }
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 20
          }
        }
      }
    }
  })
}

function renderOutputChart(currentSession) {
  const canvas = document.getElementById('outputChart')
  if (!canvas) return
  
  const maxSessions = Math.max(currentSession + 20, 50)
  const labels = []
  const actualData = []
  const predictedData = []
  const credits = 90 // Standard session budget
  
  for (let i = 1; i <= maxSessions; i++) {
    labels.push(`S${i}`)
    const output = calculateOutput(credits, i)
    
    if (i <= currentSession) {
      actualData.push(output)
      predictedData.push(null)
    } else {
      actualData.push(null)
      predictedData.push(output)
    }
  }
  
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Actual Output',
          data: actualData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Predicted Output',
          data: predictedData,
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} effective credits`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 60,
          ticks: {
            callback: function(value) {
              return value.toFixed(0) + ' credits'
            }
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 20
          }
        }
      }
    }
  })
}

function renderSessionTimeline(sessions) {
  const container = document.getElementById('session-timeline-viz')
  if (!container) return
  
  if (sessions.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">No sessions yet</p>'
    return
  }
  
  const timelineHTML = sessions.map((session, index) => {
    const sessionNum = index + 1
    const efficiency = (calculateEfficiency(sessionNum) * 100).toFixed(1)
    const knowledge = calculateKnowledge(sessionNum).toFixed(2)
    const output = calculateOutput(90, sessionNum).toFixed(1)
    
    const statusColor = {
      'active': 'border-blue-500 bg-blue-50',
      'completed': 'border-green-500 bg-green-50',
      'failed': 'border-red-500 bg-red-50'
    }[session.status] || 'border-gray-500 bg-gray-50'
    
    const statusIcon = {
      'active': '🔄',
      'completed': '✅',
      'failed': '❌'
    }[session.status] || '⏸️'
    
    return `
      <div class="relative pl-8 border-l-4 ${statusColor} p-4 rounded-r-lg hover:shadow-lg transition-shadow">
        <div class="absolute left-0 -ml-3 w-6 h-6 rounded-full ${statusColor.replace('bg-', 'bg-')} border-4 border-white flex items-center justify-center">
          <span class="text-xs">${statusIcon}</span>
        </div>
        <div class="flex justify-between items-start">
          <div>
            <h5 class="font-bold text-lg text-gray-800">Session #${sessionNum}</h5>
            <p class="text-sm text-gray-600 mb-2">${session.projectName || 'Unknown Project'}</p>
            <p class="text-xs text-gray-500">${new Date(session.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          <div class="flex gap-3">
            <div class="text-center">
              <p class="text-xs text-gray-500">Efficiency</p>
              <p class="text-lg font-bold text-purple-600">${efficiency}%</p>
            </div>
            <div class="text-center">
              <p class="text-xs text-gray-500">Knowledge</p>
              <p class="text-lg font-bold text-blue-600">${knowledge}x</p>
            </div>
            <div class="text-center">
              <p class="text-xs text-gray-500">Output</p>
              <p class="text-lg font-bold text-green-600">${output}</p>
            </div>
          </div>
        </div>
      </div>
    `
  }).join('')
  
  container.innerHTML = timelineHTML
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.style.cssText = 'transform: translateX(400px); opacity: 0;'
  toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-2xl transition-all duration-300 ease-in-out z-50 ${\n    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-white' :
    'bg-blue-500 text-white'
  }`
  
  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type]
  
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-2xl">${icon}</span>
      <span class="font-semibold">${message}</span>
    </div>
  `
  
  document.body.appendChild(toast)
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)'
    toast.style.opacity = '1'
  }, 10)
  
  // Auto dismiss after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function showSuccess(message) {
  showToast(message, 'success')
}

function showError(message) {
  showToast(message, 'error')
}

function showWarning(message) {
  showToast(message, 'warning')
}

function showInfo(message) {
  showToast(message, 'info')
}

// ============================================================================
// LOADING SPINNER SYSTEM
// ============================================================================

let loadingOverlay = null

function showLoading(message = 'Processing...') {
  if (loadingOverlay) return
  
  loadingOverlay = document.createElement('div')
  loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  loadingOverlay.innerHTML = `
    <div class="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
      <div class="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p class="text-lg font-semibold text-gray-800">${message}</p>
    </div>
  `
  document.body.appendChild(loadingOverlay)
  document.body.style.overflow = 'hidden'
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.remove()
    loadingOverlay = null
    document.body.style.overflow = ''
  }
}

// ============================================================================
// MODAL DIALOG SYSTEM
// ============================================================================

function showModal(options) {
  return new Promise((resolve) => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    
    const content = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl">
          <h3 class="text-xl font-bold">${options.title || 'Input Required'}</h3>
        </div>
        <div class="p-6">
          ${options.message ? `<p class="text-gray-600 mb-4">${options.message}</p>` : ''}
          ${options.input ? `
            <input type="text" 
                   id="modal-input" 
                   placeholder="${options.placeholder || ''}" 
                   value="${options.defaultValue || ''}" 
                   class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none mb-4"
            />
          ` : ''}
          ${options.textarea ? `
            <textarea id="modal-textarea" 
                      placeholder="${options.placeholder || ''}" 
                      rows="4"
                      class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none mb-4"
            >${options.defaultValue || ''}</textarea>
          ` : ''}
          <div class="flex gap-3 justify-end">
            ${options.showCancel !== false ? `
              <button id="modal-cancel" class="px-6 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            ` : ''}
            <button id="modal-confirm" class="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity">
              ${options.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    `
    
    modal.innerHTML = content
    document.body.appendChild(modal)
    document.body.style.overflow = 'hidden'
    
    const input = modal.querySelector('#modal-input')
    const textarea = modal.querySelector('#modal-textarea')
    const confirmBtn = modal.querySelector('#modal-confirm')
    const cancelBtn = modal.querySelector('#modal-cancel')
    
    // Focus input if exists
    if (input) input.focus()
    if (textarea) textarea.focus()
    
    // Handle confirm
    confirmBtn.onclick = () => {
      const value = input?.value || textarea?.value || true
      modal.remove()
      document.body.style.overflow = ''
      resolve(value)
    }
    
    // Handle cancel
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        modal.remove()
        document.body.style.overflow = ''
        resolve(null)
      }
    }
    
    // Handle escape key
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove()
        document.body.style.overflow = ''
        resolve(null)
      }
      if (e.key === 'Enter' && input) {
        confirmBtn.click()
      }
    })
    
    // Handle backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
        document.body.style.overflow = ''
        resolve(null)
      }
    })
  })
}

function confirmDialog(title, message) {
  return showModal({
    title,
    message,
    showCancel: true,
    confirmText: 'Confirm'
  })
}

function promptDialog(title, placeholder = '', defaultValue = '') {
  return showModal({
    title,
    input: true,
    placeholder,
    defaultValue
  })
}

function promptTextarea(title, placeholder = '', defaultValue = '') {
  return showModal({
    title,
    textarea: true,
    placeholder,
    defaultValue
  })
}

function initializeApp() {
  console.log('♾️ Multi-Session Orchestrator initialized!')
  console.log('Session-centric approach with AI-powered handoff')
}
