import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const MAX_RESPONSES = 200
const MAX_RESPONSE_CHARS = 300
const MIN_RESPONSES = 3
const GEMINI_MODEL = 'gemini-2.0-flash'

type QuestionType = 'multipleChoice' | 'yesNo' | 'rating' | 'openText'
type ThemeCategory =
  | 'content'
  | 'time'
  | 'equipment'
  | 'instructor'
  | 'practice'
  | 'assessment'
  | 'location'
  | 'safety'
  | 'other'

interface ClusterRequest {
  sessionId?: unknown
  questionId?: unknown
  questionType?: unknown
  responses?: unknown
}

interface SanitizedResponse {
  index: number
  text: string
}

interface GeminiCluster {
  themeTitle: string
  category: ThemeCategory
  keywords: string[]
  responseIndexes: number[]
  confidence: number
  representativeComments: string[]
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'
  suggestedActions: string[]
}

interface ThemeCluster {
  clusterId: string
  sessionId: string
  questionId: string
  themeTitle: string
  category: ThemeCategory
  keywords: string[]
  responseIds: string[]
  count: number
  percentage: number
  representativeComments: string[]
  createdAt: string
  updatedAt: string
}

const THEME_CATEGORIES: ReadonlySet<ThemeCategory> = new Set([
  'content',
  'time',
  'equipment',
  'instructor',
  'practice',
  'assessment',
  'location',
  'safety',
  'other',
])

const CATEGORY_FROM_GEMINI: Record<string, ThemeCategory> = {
  Content: 'content',
  Time: 'time',
  Equipment: 'equipment',
  Instructor: 'instructor',
  Practice: 'practice',
  Assessment: 'assessment',
  Location: 'location',
  Safety: 'safety',
  Other: 'other',
}

const GEMINI_PROMPT = `You are analyzing Thai student After-Action Review responses for a military communications school.

Group semantically similar responses into themes.

Return JSON only:
{
  "clusters": [
    {
      "themeTitle": "string in Thai",
      "category": "Content|Time|Equipment|Instructor|Practice|Assessment|Location|Safety|Other",
      "keywords": ["string"],
      "responseIndexes": [0],
      "confidence": 0.0,
      "representativeComments": ["string"],
      "suggestedSeverity": "low|medium|high|critical",
      "suggestedActions": ["string"]
    }
  ],
  "summary": "short Thai summary"
}

Rules:
- Combine same-meaning comments even if wording differs
- Do not over-split
- Ignore nonsense/spam/empty responses
- Severity: critical >=50%, high >=30%, medium >=15%, low <15%
- Suggested actions must be practical for course improvement`

function asQuestionType(value: unknown): QuestionType | null {
  return value === 'multipleChoice' || value === 'yesNo' || value === 'rating' || value === 'openText'
    ? value
    : null
}

function redactPersonalData(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[url]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(/\bLine\s*ID\s*[:：]?\s*\S+/gi, 'Line ID [redacted]')
}

function sanitizeResponses(value: unknown): SanitizedResponse[] {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'responses must be an array')
  }

  return value
    .slice(0, MAX_RESPONSES)
    .map((item, index) => {
      const source = typeof item === 'string'
        ? item
        : typeof item === 'object' && item !== null && 'text' in item
          ? String((item as { text?: unknown }).text ?? '')
          : ''
      return {
        index,
        text: redactPersonalData(source).replace(/\s+/g, ' ').trim().slice(0, MAX_RESPONSE_CHARS),
      }
    })
    .filter(item => item.text.length > 0)
}

function hasGeminiSecret(): boolean {
  try {
    return GEMINI_API_KEY.value().trim().length > 0
  } catch {
    return false
  }
}

function safeClusterId(index: number): string {
  return `ai-cluster-${index + 1}`
}

function extractJsonText(value: unknown): string {
  const candidates = (value as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates
  return candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim() ?? ''
}

function parseGeminiClusters(text: string): GeminiCluster[] {
  const parsed = JSON.parse(text) as unknown
  const clusters = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { clusters?: unknown }).clusters)
      ? (parsed as { clusters: unknown[] }).clusters
      : []

  return clusters
    .map((cluster): GeminiCluster | null => {
      if (typeof cluster !== 'object' || cluster === null) return null
      const source = cluster as Record<string, unknown>
      const themeTitle = typeof source.themeTitle === 'string' ? source.themeTitle.trim().slice(0, 80) : ''
      const category = typeof source.category === 'string'
        ? CATEGORY_FROM_GEMINI[source.category] ?? (THEME_CATEGORIES.has(source.category as ThemeCategory) ? source.category as ThemeCategory : 'other')
        : 'other'
      const keywords = Array.isArray(source.keywords)
        ? source.keywords
          .filter((item): item is string => typeof item === 'string')
          .map(item => item.trim().slice(0, 32))
          .filter(Boolean)
          .slice(0, 6)
        : []
      const responseIndexes = Array.isArray(source.responseIndexes)
        ? [...new Set(source.responseIndexes
          .filter((item): item is number => Number.isInteger(item) && item >= 0))]
          .slice(0, MAX_RESPONSES)
        : []
      const confidence = typeof source.confidence === 'number'
        ? Math.max(0, Math.min(1, source.confidence))
        : 0
      const representativeComments = Array.isArray(source.representativeComments)
        ? source.representativeComments
          .filter((item): item is string => typeof item === 'string')
          .map(item => redactPersonalData(item).replace(/\s+/g, ' ').trim().slice(0, MAX_RESPONSE_CHARS))
          .filter(Boolean)
          .slice(0, 4)
        : []
      const suggestedSeverity = source.suggestedSeverity === 'low'
        || source.suggestedSeverity === 'medium'
        || source.suggestedSeverity === 'high'
        || source.suggestedSeverity === 'critical'
        ? source.suggestedSeverity
        : 'low'
      const suggestedActions = Array.isArray(source.suggestedActions)
        ? source.suggestedActions
          .filter((item): item is string => typeof item === 'string')
          .map(item => item.trim().slice(0, 120))
          .filter(Boolean)
          .slice(0, 5)
        : []

      if (!themeTitle || responseIndexes.length === 0) return null
      return {
        themeTitle,
        category,
        keywords,
        responseIndexes,
        confidence,
        representativeComments,
        suggestedSeverity,
        suggestedActions,
      }
    })
    .filter((cluster): cluster is GeminiCluster => cluster !== null)
}

function toThemeClusters(
  aiClusters: GeminiCluster[],
  responses: SanitizedResponse[],
  sessionId: string,
  questionId: string,
): ThemeCluster[] {
  const responseByIndex = new Map(responses.map(response => [response.index, response]))
  const total = responses.length || 1
  const now = new Date().toISOString()

  return aiClusters
    .map((cluster, index) => {
      const matched = cluster.responseIndexes
        .map(responseIndex => responseByIndex.get(responseIndex))
        .filter((response): response is SanitizedResponse => response !== undefined)

      return {
        clusterId: safeClusterId(index),
        sessionId,
        questionId,
        themeTitle: cluster.themeTitle,
        category: cluster.category,
        keywords: cluster.keywords,
        responseIds: matched.map(response => `sanitized-${response.index}`),
        count: matched.length,
        percentage: Math.round((matched.length / total) * 100),
        representativeComments: cluster.representativeComments.length
          ? cluster.representativeComments
          : matched.slice(0, 4).map(response => response.text),
        createdAt: now,
        updatedAt: now,
      }
    })
    .filter(cluster => cluster.count > 0)
    .sort((a, b) => b.count - a.count)
}

async function callGemini(
  responses: SanitizedResponse[],
  sessionId: string,
  questionId: string,
): Promise<ThemeCluster[]> {
  const key = GEMINI_API_KEY.value().trim()
  if (!key) return []

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`
  const promptPayload = responses.map(response => ({
    index: response.index,
    text: response.text,
  }))

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: GEMINI_PROMPT,
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: JSON.stringify({
            responseCount: responses.length,
            responses: promptPayload,
          }),
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini request failed with status ${res.status}`)
  }

  const body = await res.json() as unknown
  const text = extractJsonText(body)
  if (!text) return []
  return toThemeClusters(parseGeminiClusters(text), responses, sessionId, questionId)
}

export const clusterAarResponses = onCall(
  {
    region: 'asia-southeast1',
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
  },
  async request => {
    const data = request.data as ClusterRequest
    const questionType = asQuestionType(data.questionType)

    if (typeof data.sessionId !== 'string' || typeof data.questionId !== 'string') {
      throw new HttpsError('invalid-argument', 'sessionId and questionId are required')
    }

    if (questionType !== 'openText') {
      return {
        clusters: [],
        fallbackReason: 'unsupported_question_type',
        meta: { usedAi: false, sanitizedCount: 0 },
      }
    }

    const sanitizedResponses = sanitizeResponses(data.responses)
    if (sanitizedResponses.length < MIN_RESPONSES) {
      return {
        clusters: [],
        fallbackReason: 'not_enough_responses',
        meta: { usedAi: false, sanitizedCount: sanitizedResponses.length },
      }
    }

    logger.info('clusterAarResponses invoked', {
      sessionId: data.sessionId,
      questionId: data.questionId,
      responseCount: sanitizedResponses.length,
      geminiSecretConfigured: hasGeminiSecret(),
    })

    try {
      const clusters = await callGemini(sanitizedResponses, data.sessionId, data.questionId)
      return {
        clusters,
        fallbackReason: clusters.length ? null : 'empty_ai_result',
        meta: { usedAi: clusters.length > 0, sanitizedCount: sanitizedResponses.length },
      }
    } catch (err) {
      logger.warn('clusterAarResponses Gemini call failed; falling back', {
        sessionId: data.sessionId,
        questionId: data.questionId,
        responseCount: sanitizedResponses.length,
        message: err instanceof Error ? err.message : 'unknown error',
      })
      return {
        clusters: [],
        fallbackReason: 'gemini_failed',
        meta: { usedAi: false, sanitizedCount: sanitizedResponses.length },
      }
    }
  },
)
