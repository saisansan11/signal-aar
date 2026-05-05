import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const MAX_RESPONSES = 200
const MAX_RESPONSE_CHARS = 300
const MIN_RESPONSES = 3

type QuestionType = 'multipleChoice' | 'yesNo' | 'rating' | 'openText'

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

function asQuestionType(value: unknown): QuestionType | null {
  return value === 'multipleChoice' || value === 'yesNo' || value === 'rating' || value === 'openText'
    ? value
    : null
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
        text: source.replace(/\s+/g, ' ').trim().slice(0, MAX_RESPONSE_CHARS),
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

    logger.info('clusterAarResponses safe proxy stub invoked', {
      sessionId: data.sessionId,
      questionId: data.questionId,
      responseCount: sanitizedResponses.length,
      geminiSecretConfigured: hasGeminiSecret(),
    })

    // Gemini prompt and model call intentionally deferred. The callable proxy,
    // secret boundary, input limits, and frontend fallback are ready first.
    return {
      clusters: [],
      fallbackReason: 'gemini_not_implemented',
      meta: { usedAi: false, sanitizedCount: sanitizedResponses.length },
    }
  },
)
