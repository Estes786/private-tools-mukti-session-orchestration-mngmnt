/**
 * AI-POWERED HANDOFF - Hugging Face Integration
 * GAME CHANGER: Automatic context compression & master prompt generation
 */

interface HuggingFaceConfig {
  apiKey: string
  model?: string
}

interface ConversationTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface ProjectContext {
  projectId: number
  projectName: string
  projectDescription: string
  conversationHistory: ConversationTurn[]
  sessionNumber: number
  lastAccomplishments?: string
  currentBlockers?: string
  relevantDocs?: string[]
}

interface AIHandoffResult {
  masterPrompt: string
  compressedContext: string
  nextSteps: string[]
  troubleshootingNotes?: string
  confidence: number
}

/**
 * Call Hugging Face Inference API
 */
async function callHuggingFaceAPI(
  config: HuggingFaceConfig,
  prompt: string
): Promise<string> {
  const model = config.model || 'meta-llama/Meta-Llama-3.1-8B-Instruct'
  
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
        return_full_text: false
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Hugging Face API Error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  
  // Handle array response (common with Hugging Face)
  if (Array.isArray(result) && result.length > 0) {
    return result[0].generated_text || result[0].text || ''
  }
  
  return result.generated_text || result.text || result[0] || ''
}

/**
 * CORE FUNCTION: Generate AI-Powered Handoff Briefing
 */
export async function generateAIHandoff(
  context: ProjectContext,
  hfConfig: HuggingFaceConfig
): Promise<AIHandoffResult> {
  
  // Build comprehensive prompt for AI
  const systemPrompt = `You are an AI System Architect specialized in context compression and handoff generation.

Your task: Analyze the conversation history and project context to generate:
1. A COMPRESSED MASTER PROMPT that captures ALL critical information
2. Key accomplishments and current state
3. Identified blockers and issues
4. Clear next steps for continuation
5. Troubleshooting notes if errors detected

Focus on PRESERVING 100% information while being CONCISE.
Use markers: ✅ (done), ⚠️ (warning), 🚧 (blocker), 🎯 (next step)`

  // Build conversation context
  let conversationContext = '=== PROJECT CONTEXT ===\n'
  conversationContext += `Project: ${context.projectName}\n`
  conversationContext += `Description: ${context.projectDescription}\n`
  conversationContext += `Session: #${context.sessionNumber}\n\n`
  
  conversationContext += '=== CONVERSATION HISTORY ===\n'
  context.conversationHistory.slice(-20).forEach(turn => {
    conversationContext += `${turn.role.toUpperCase()}: ${turn.content}\n\n`
  })
  
  if (context.lastAccomplishments) {
    conversationContext += `=== PREVIOUS ACCOMPLISHMENTS ===\n${context.lastAccomplishments}\n\n`
  }
  
  if (context.currentBlockers) {
    conversationContext += `=== CURRENT BLOCKERS ===\n${context.currentBlockers}\n\n`
  }
  
  if (context.relevantDocs && context.relevantDocs.length > 0) {
    conversationContext += `=== RELEVANT DOCUMENTS ===\n${context.relevantDocs.join('\n')}\n\n`
  }

  const fullPrompt = `${systemPrompt}

${conversationContext}

Generate a compressed master handoff prompt that includes:
1. PROJECT SUMMARY (2-3 sentences)
2. CRITICAL CONTEXT (5-7 key points with markers)
3. LAST ACCOMPLISHMENTS (what was done)
4. CURRENT STATE (where we are now)
5. BLOCKERS & ISSUES (if any)
6. NEXT STEPS (3-5 actionable items)
7. TECHNICAL NOTES (important details)

Format as structured markdown with clear sections.`

  try {
    // Call Hugging Face API
    const aiResponse = await callHuggingFaceAPI(hfConfig, fullPrompt)
    
    // Parse AI response
    const masterPrompt = extractMasterPrompt(aiResponse)
    const compressedContext = extractCompressedContext(aiResponse)
    const nextSteps = extractNextSteps(aiResponse)
    const troubleshootingNotes = extractTroubleshootingNotes(aiResponse)
    
    return {
      masterPrompt,
      compressedContext,
      nextSteps,
      troubleshootingNotes,
      confidence: calculateConfidence(aiResponse)
    }
    
  } catch (error) {
    console.error('AI Handoff Generation Error:', error)
    
    // Fallback: Use rule-based compression
    return generateFallbackHandoff(context)
  }
}

/**
 * Extract master prompt from AI response
 */
function extractMasterPrompt(aiResponse: string): string {
  // Look for PROJECT SUMMARY section
  const summaryMatch = aiResponse.match(/PROJECT SUMMARY[:\s]*([\s\S]*?)(?=\n##|CRITICAL CONTEXT|$)/i)
  const criticalMatch = aiResponse.match(/CRITICAL CONTEXT[:\s]*([\s\S]*?)(?=\n##|LAST ACCOMPLISHMENTS|$)/i)
  
  let masterPrompt = '# 🎯 MASTER HANDOFF PROMPT\n\n'
  
  if (summaryMatch) {
    masterPrompt += `## Project Summary\n${summaryMatch[1].trim()}\n\n`
  }
  
  if (criticalMatch) {
    masterPrompt += `## Critical Context\n${criticalMatch[1].trim()}\n\n`
  }
  
  return masterPrompt || aiResponse
}

/**
 * Extract compressed context
 */
function extractCompressedContext(aiResponse: string): string {
  const sections = [
    'LAST ACCOMPLISHMENTS',
    'CURRENT STATE',
    'BLOCKERS',
    'TECHNICAL NOTES'
  ]
  
  let compressed = ''
  
  sections.forEach(section => {
    const regex = new RegExp(`${section}[:\\s]*([\\s\\S]*?)(?=\\n##|${sections.join('|')}|$)`, 'i')
    const match = aiResponse.match(regex)
    
    if (match) {
      compressed += `## ${section}\n${match[1].trim()}\n\n`
    }
  })
  
  return compressed || aiResponse
}

/**
 * Extract next steps from AI response
 */
function extractNextSteps(aiResponse: string): string[] {
  const nextStepsMatch = aiResponse.match(/NEXT STEPS[:\s]*([\s\S]*?)(?=\n##|TECHNICAL NOTES|$)/i)
  
  if (!nextStepsMatch) return []
  
  const stepsText = nextStepsMatch[1]
  const steps = stepsText
    .split('\n')
    .filter(line => line.trim().match(/^[\d\-\*•]/))
    .map(line => line.replace(/^[\d\-\*•]\s*/, '').trim())
    .filter(step => step.length > 0)
  
  return steps
}

/**
 * Extract troubleshooting notes
 */
function extractTroubleshootingNotes(aiResponse: string): string | undefined {
  const troubleshootingMatch = aiResponse.match(/(?:TROUBLESHOOTING|BLOCKERS|ISSUES)[:\s]*([\s\S]*?)(?=\n##|$)/i)
  
  if (troubleshootingMatch && troubleshootingMatch[1].trim().length > 10) {
    return troubleshootingMatch[1].trim()
  }
  
  return undefined
}

/**
 * Calculate confidence score based on AI response quality
 */
function calculateConfidence(aiResponse: string): number {
  let score = 0.5 // Base score
  
  // Check for required sections
  if (aiResponse.match(/PROJECT SUMMARY/i)) score += 0.1
  if (aiResponse.match(/CRITICAL CONTEXT/i)) score += 0.1
  if (aiResponse.match(/NEXT STEPS/i)) score += 0.1
  if (aiResponse.match(/[✅⚠️🚧🎯]/)) score += 0.1
  
  // Check response length (should be substantial)
  if (aiResponse.length > 500) score += 0.1
  
  return Math.min(score, 1.0)
}

/**
 * Fallback: Rule-based handoff generation when AI fails
 */
function generateFallbackHandoff(context: ProjectContext): AIHandoffResult {
  const masterPrompt = `# 🔄 HANDOFF BRIEFING - ${context.projectName}

## Project Context
${context.projectDescription}

## Session #${context.sessionNumber}

## Recent Activity
${context.conversationHistory.slice(-5).map(t => `- ${t.role}: ${t.content.substring(0, 100)}...`).join('\n')}

## Last Accomplishments
${context.lastAccomplishments || 'Review previous sessions'}

## Current Blockers
${context.currentBlockers || 'None reported'}

## Next Steps
1. Review codebase state
2. Continue development
3. Maintain context
`

  return {
    masterPrompt,
    compressedContext: masterPrompt,
    nextSteps: ['Review codebase', 'Continue development', 'Maintain context'],
    confidence: 0.6
  }
}

/**
 * TROUBLESHOOTING MODE: Generate fix & resolve prompts
 */
export async function generateTroubleshootingPrompt(
  errorContext: {
    errorMessage: string
    stackTrace?: string
    codeSnippet?: string
    environment?: string
  },
  projectContext: ProjectContext,
  hfConfig: HuggingFaceConfig
): Promise<string> {
  
  const troubleshootingPrompt = `You are an expert debugging assistant.

=== ERROR CONTEXT ===
Error: ${errorContext.errorMessage}
${errorContext.stackTrace ? `Stack: ${errorContext.stackTrace}` : ''}
${errorContext.codeSnippet ? `Code:\n${errorContext.codeSnippet}` : ''}
Environment: ${errorContext.environment || 'Cloudflare Pages + Hono'}

=== PROJECT CONTEXT ===
Project: ${projectContext.projectName}
${projectContext.projectDescription}

Generate a MASTER TROUBLESHOOTING PROMPT that:
1. Identifies the root cause
2. Provides step-by-step fix instructions
3. Suggests preventive measures
4. Includes code examples if applicable

Use clear markers: ⚠️ (warning), 🔧 (fix), ✅ (verified solution)`

  try {
    const aiResponse = await callHuggingFaceAPI(hfConfig, troubleshootingPrompt)
    return `# 🔧 TROUBLESHOOTING & FIX PROMPT\n\n${aiResponse}`
  } catch (error) {
    return `# 🔧 TROUBLESHOOTING PROMPT\n\nError: ${errorContext.errorMessage}\n\nPlease investigate and resolve this issue.`
  }
}
