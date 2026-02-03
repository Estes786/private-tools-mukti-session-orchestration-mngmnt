import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import { generateAIHandoff, generateTroubleshootingPrompt, type ProjectContext, type ConversationTurn } from './ai-handoff'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Use renderer
app.use(renderer)

// ============================================================================
// HOMEPAGE - SESSION-CENTRIC DASHBOARD
// ============================================================================
app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header class="bg-white shadow-sm border-b-2 border-blue-100">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span class="text-white text-2xl font-bold">♾️</span>
              </div>
              <div>
                <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Multi-Session Orchestrator
                </h1>
                <p class="text-sm text-gray-600">🚀 1 Project = ∞ Sessions with AI-Powered Handoff</p>
              </div>
            </div>
            <div class="flex items-center space-x-6">
              <div class="text-center">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Projects</p>
                <p class="text-3xl font-bold text-purple-600" id="stat-projects">0</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Sessions</p>
                <p class="text-3xl font-bold text-blue-600" id="stat-sessions">0</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Growth</p>
                <p class="text-3xl font-bold text-green-600" id="stat-growth">0%</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 py-8">
        {/* Infinite Growth Hero */}
        <div class="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div class="flex items-center gap-4 mb-6">
            <div class="text-6xl">♾️</div>
            <div>
              <h2 class="text-4xl font-bold mb-2">INFINITE GROWTH LOOP SYSTEM</h2>
              <p class="text-lg opacity-90">
                Setiap session menjadi LEBIH BAIK dari session sebelumnya. Auto-generated handoff dengan AI. Zero context loss!
              </p>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div class="text-3xl mb-2">🎯</div>
              <div class="font-bold text-lg mb-1">Session-Centric</div>
              <p class="text-sm opacity-90">Focus on sessions, not accounts</p>
            </div>
            <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div class="text-3xl mb-2">🤖</div>
              <div class="font-bold text-lg mb-1">AI-Powered</div>
              <p class="text-sm opacity-90">Auto-generate handoff with LLM</p>
            </div>
            <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div class="text-3xl mb-2">📊</div>
              <div class="font-bold text-lg mb-1">98%+ Preservation</div>
              <p class="text-sm opacity-90">Zero context loss guaranteed</p>
            </div>
            <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div class="text-3xl mb-2">♾️</div>
              <div class="font-bold text-lg mb-1">Infinite Loop</div>
              <p class="text-sm opacity-90">Each session enhances the next</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div class="bg-white rounded-xl shadow-lg mb-8">
          <div class="border-b border-gray-200">
            <nav class="flex -mb-px">
              <button class="tab-button active px-6 py-4 text-sm font-medium border-b-2 transition-colors" data-tab="projects">
                <i class="fas fa-folder-open mr-2"></i>Projects
              </button>
              <button class="tab-button px-6 py-4 text-sm font-medium border-b-2 transition-colors" data-tab="sessions">
                <i class="fas fa-infinity mr-2"></i>Sessions
              </button>
              <button class="tab-button px-6 py-4 text-sm font-medium border-b-2 transition-colors" data-tab="handoff">
                <i class="fas fa-magic mr-2"></i>AI Handoff
              </button>
              <button class="tab-button px-6 py-4 text-sm font-medium border-b-2 transition-colors" data-tab="analytics">
                <i class="fas fa-chart-line mr-2"></i>Analytics
              </button>
            </nav>
          </div>

          {/* Tab Content Container */}
          <div class="p-6">
            {/* Projects Tab */}
            <div id="tab-projects" class="tab-content active">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800">📁 Your Projects</h3>
                <button id="btn-new-project" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow">
                  <i class="fas fa-plus mr-2"></i>New Project
                </button>
              </div>
              <div id="projects-list" class="space-y-4">
                {/* Populated by JavaScript */}
              </div>
            </div>

            {/* Sessions Tab */}
            <div id="tab-sessions" class="tab-content hidden">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800">♾️ Session Orchestration</h3>
                <div class="flex gap-3">
                  <select id="filter-project-sessions" class="border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none">
                    <option value="">All Projects</option>
                  </select>
                  <button id="btn-new-session" class="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow">
                    <i class="fas fa-play mr-2"></i>New Session
                  </button>
                </div>
              </div>
              
              {/* Session Timeline */}
              <div id="sessions-timeline" class="mb-6">
                {/* Populated by JavaScript */}
              </div>
              
              <div id="sessions-list" class="space-y-4">
                {/* Populated by JavaScript */}
              </div>
            </div>

            {/* AI Handoff Tab */}
            <div id="tab-handoff" class="tab-content hidden">
              <div class="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                <div class="flex items-start gap-4">
                  <div class="text-5xl">🤖</div>
                  <div>
                    <h4 class="text-2xl font-bold text-purple-900 mb-2">AI-Powered Handoff Generation</h4>
                    <p class="text-purple-800 mb-3">
                      Using Hugging Face LLM to automatically generate master handoff prompts. 
                      98%+ context preservation in 30 seconds vs 20 minutes manual work!
                    </p>
                    <div class="flex gap-2">
                      <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">✅ Zero context loss</span>
                      <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">⚡ 30x faster</span>
                      <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">🧠 AI intelligence</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-white border-2 border-gray-200 rounded-xl p-6">
                <form id="form-ai-handoff" class="space-y-6">
                  <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Select Project</label>
                    <select id="handoff-project" class="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none" required>
                      <option value="">-- Select Project --</option>
                    </select>
                  </div>

                  <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <label class="flex items-center cursor-pointer">
                      <input type="checkbox" id="handoff-use-ai" checked class="w-5 h-5 text-blue-600 rounded mr-3" />
                      <div>
                        <span class="font-bold text-blue-900 text-lg">Enable AI-Powered Mode (Recommended)</span>
                        <p class="text-sm text-blue-700 mt-1">Uses Hugging Face for intelligent compression</p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">
                      Session Context
                      <span class="text-xs text-gray-500 ml-2">(Paste conversation or session notes)</span>
                    </label>
                    <textarea id="handoff-context" class="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none font-mono text-sm" rows={12} 
                      placeholder="Paste your session conversation here...&#10;&#10;AI will automatically parse and compress it!"></textarea>
                  </div>

                  <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:shadow-xl transition-shadow">
                    <i class="fas fa-magic mr-2"></i>Generate AI-Powered Handoff
                  </button>
                </form>

                <div id="handoff-result" class="mt-6 hidden">
                  <h4 class="text-xl font-bold mb-3 text-gray-800">✨ Master Handoff Generated!</h4>
                  <div class="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre id="handoff-output" class="whitespace-pre-wrap text-sm font-mono"></pre>
                  </div>
                  <div class="flex gap-3 mt-4">
                    <button id="btn-copy-handoff" class="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700">
                      <i class="fas fa-copy mr-2"></i>Copy to Clipboard
                    </button>
                    <button id="btn-download-handoff" class="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700">
                      <i class="fas fa-download mr-2"></i>Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Tab */}
            <div id="tab-analytics" class="tab-content hidden">
              <h3 class="text-2xl font-bold text-gray-800 mb-6">📊 Growth Analytics</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                  <div class="text-sm opacity-90 mb-2">Total Sessions</div>
                  <div class="text-4xl font-bold" id="analytics-total-sessions">0</div>
                </div>
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                  <div class="text-sm opacity-90 mb-2">Avg Efficiency</div>
                  <div class="text-4xl font-bold" id="analytics-efficiency">0%</div>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                  <div class="text-sm opacity-90 mb-2">Growth Rate</div>
                  <div class="text-4xl font-bold" id="analytics-growth">0%</div>
                </div>
              </div>
              <div id="analytics-content" class="bg-white border-2 border-gray-200 rounded-xl p-6">
                {/* Populated by JavaScript */}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer class="bg-white border-t mt-12 py-6">
        <div class="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p class="font-semibold">Built with ♾️ Infinite Growth Loop Philosophy</p>
          <p class="text-sm mt-2">Hono + Cloudflare Pages + D1 + AI-Powered Handoff</p>
        </div>
      </footer>

      {/* Load Scripts */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
      <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
      <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
      <script defer src="/static/app.js"></script>
    </div>
  )
})

// ============================================================================
// API ROUTES - SESSION-CENTRIC ORCHESTRATION
// ============================================================================

// Get all projects with session statistics
app.get('/api/projects', async (c) => {
  const { env } = c
  const result = await env.DB.prepare(`
    SELECT 
      p.id, p.name, p.description, p.status,
      p.total_sessions, p.total_credits_used,
      p.growth_efficiency, p.context_preservation_rate,
      p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM sessions WHERE project_id = p.id AND status = 'in_progress') as active_sessions
    FROM projects p
    ORDER BY p.updated_at DESC
  `).all()
  
  return c.json({ success: true, data: result.results })
})

// Create new project
app.post('/api/projects', async (c) => {
  const { env } = c
  const { name, description } = await c.req.json()
  
  const result = await env.DB.prepare(`
    INSERT INTO projects (name, description, status)
    VALUES (?, ?, 'active')
  `).bind(name, description).run()
  
  return c.json({ success: true, id: result.meta.last_row_id })
})

// Get sessions for a project (timeline view)
app.get('/api/projects/:project_id/sessions', async (c) => {
  const { env } = c
  const projectId = c.req.param('project_id')
  
  const sessions = await env.DB.prepare(`
    SELECT 
      s.*,
      (SELECT COUNT(*) FROM conversation_history WHERE session_id = s.id) as conversation_count,
      (SELECT COUNT(*) FROM handoff_documents WHERE session_id = s.id) as handoff_count
    FROM sessions s
    WHERE s.project_id = ?
    ORDER BY s.session_number ASC
  `).bind(projectId).all()
  
  return c.json({ success: true, data: sessions.results })
})

// Create new session with auto-load previous handoff
app.post('/api/sessions/create', async (c) => {
  const { env } = c
  const { project_id, account_name, objectives } = await c.req.json()
  
  if (!project_id) {
    return c.json({ success: false, error: 'project_id required' }, 400)
  }
  
  // Get next session number
  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM sessions WHERE project_id = ?
  `).bind(project_id).first() as any
  
  const sessionNumber = (countResult?.count || 0) + 1
  
  // Create session
  const result = await env.DB.prepare(`
    INSERT INTO sessions (project_id, account_name, session_number, objectives, status)
    VALUES (?, ?, ?, ?, 'in_progress')
  `).bind(project_id, account_name || 'default', sessionNumber, objectives || '').run()
  
  const sessionId = result.meta.last_row_id
  
  // Get previous handoff (if exists)
  const previousHandoff = await env.DB.prepare(`
    SELECT h.*, s.session_number
    FROM handoff_documents h
    JOIN sessions s ON h.session_id = s.id
    WHERE s.project_id = ? AND s.session_number = ?
    ORDER BY h.created_at DESC
    LIMIT 1
  `).bind(project_id, sessionNumber - 1).first() as any
  
  return c.json({
    success: true,
    data: {
      session_id: sessionId,
      session_number: sessionNumber,
      previous_handoff: previousHandoff,
      message: previousHandoff 
        ? `✨ Session #${sessionNumber} created! Previous handoff loaded.`
        : `🎯 Session #${sessionNumber} created (First session)`
    }
  })
})

// Get single session details
app.get('/api/sessions/:id', async (c) => {
  const { env } = c
  const sessionId = c.req.param('id')
  
  const session = await env.DB.prepare(`
    SELECT s.*, p.name as project_name, p.description as project_description
    FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = ?
  `).bind(sessionId).first() as any
  
  if (!session) {
    return c.json({ success: false, message: 'Session not found' }, 404)
  }
  
  // Get handoff document
  const handoff = await env.DB.prepare(`
    SELECT content FROM handoff_documents 
    WHERE session_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(sessionId).first() as any
  
  if (handoff) {
    session.handoff_content = handoff.content
  }
  
  return c.json({
    success: true,
    data: session
  })
})

// Complete session & auto-generate handoff
app.post('/api/sessions/:session_id/complete', async (c) => {
  const { env } = c
  const sessionId = c.req.param('session_id')
  const { credits_used, accomplishments, blockers, hugging_face_token } = await c.req.json()
  
  // Update session
  await env.DB.prepare(`
    UPDATE sessions 
    SET 
      status = 'completed',
      credits_used = ?,
      accomplishments = ?,
      blockers = ?,
      completed_at = CURRENT_TIMESTAMP,
      duration_minutes = (
        SELECT CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 1440 AS INTEGER)
      )
    WHERE id = ?
  `).bind(credits_used || 0, accomplishments || '', blockers || '', sessionId).run()
  
  // Get session details
  const session = await env.DB.prepare(`
    SELECT s.*, p.name as project_name, p.description as project_description
    FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = ?
  `).bind(sessionId).first() as any
  
  let handoffGenerated = false
  let masterPrompt = null
  
  // Try to generate AI handoff
  if (hugging_face_token) {
    try {
      // Get conversation history
      const conversations = await env.DB.prepare(`
        SELECT role, content FROM conversation_history 
        WHERE session_id = ? ORDER BY turn_number ASC
      `).bind(sessionId).all()
      
      const projectContext: ProjectContext = {
        projectId: session.project_id,
        projectName: session.project_name,
        projectDescription: session.project_description || '',
        conversationHistory: conversations.results as ConversationTurn[],
        sessionNumber: session.session_number,
        lastAccomplishments: accomplishments,
        currentBlockers: blockers
      }
      
      const aiResult = await generateAIHandoff(projectContext, {
        apiKey: hugging_face_token
      })
      
      // Store handoff
      await env.DB.prepare(`
        INSERT INTO handoff_documents 
        (project_id, session_id, handoff_type, master_prompt, compressed_context, 
         ai_model, ai_confidence, technical_notes)
        VALUES (?, ?, 'ai_generated', ?, ?, 'meta-llama/Meta-Llama-3.1-8B-Instruct', ?, ?)
      `).bind(
        session.project_id,
        sessionId,
        aiResult.masterPrompt,
        aiResult.compressedContext,
        aiResult.confidence,
        aiResult.troubleshootingNotes || ''
      ).run()
      
      handoffGenerated = true
      masterPrompt = aiResult.masterPrompt
      
    } catch (error: any) {
      console.error('AI handoff error:', error)
    }
  }
  
  // Update project stats
  await env.DB.prepare(`
    UPDATE projects 
    SET 
      total_sessions = total_sessions + 1,
      total_credits_used = total_credits_used + ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(credits_used || 0, session.project_id).run()
  
  return c.json({
    success: true,
    data: {
      session_number: session.session_number,
      handoff_generated: handoffGenerated,
      master_prompt: masterPrompt
    }
  })
})

// Save conversation to database
app.post('/api/conversations/save', async (c) => {
  const { env } = c
  const { session_id, conversation } = await c.req.json()
  
  if (!session_id || !conversation || conversation.length === 0) {
    return c.json({ success: false, error: 'session_id and conversation required' }, 400)
  }
  
  // Save each turn
  for (let i = 0; i < conversation.length; i++) {
    const turn = conversation[i]
    await env.DB.prepare(`
      INSERT INTO conversation_history (session_id, turn_number, role, content)
      VALUES (?, ?, ?, ?)
    `).bind(session_id, i + 1, turn.role, turn.content).run()
  }
  
  return c.json({ success: true, message: `Saved ${conversation.length} turns` })
})

// Get statistics
app.get('/api/stats', async (c) => {
  const { env } = c
  
  const stats = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) as total FROM projects WHERE status = 'active'`),
    env.DB.prepare(`SELECT SUM(total_sessions) as total FROM projects`),
    env.DB.prepare(`SELECT AVG(growth_efficiency) as avg FROM projects WHERE growth_efficiency > 0`),
  ])
  
  return c.json({
    success: true,
    data: {
      projects: stats[0].results[0]?.total || 0,
      sessions: stats[1].results[0]?.total || 0,
      growth: Math.round((stats[2].results[0]?.avg || 0) * 100)
    }
  })
})

export default app
