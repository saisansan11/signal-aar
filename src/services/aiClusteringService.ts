import { getFunctions, httpsCallable } from 'firebase/functions'
import { firebaseApp, USE_MOCK } from './firebase'
import { clusterResponses } from './themeClusteringService'
import type { QuestionType, Response, ThemeCluster } from '../models'

const MAX_RESPONSES = 200
const MAX_RESPONSE_CHARS = 300
const MIN_RESPONSES = 3

interface AiClusterRequest {
  sessionId: string
  questionId: string
  questionType: QuestionType
  responses: Array<{ index: number; text: string }>
}

interface AiClusterResult {
  clusters?: unknown
  fallbackReason?: string
}

function sanitizeForAi(responses: Response[]): AiClusterRequest['responses'] {
  return responses
    .slice(0, MAX_RESPONSES)
    .map((response, index) => ({
      index,
      text: response.answerText.replace(/\s+/g, ' ').trim().slice(0, MAX_RESPONSE_CHARS),
    }))
    .filter(response => response.text.length > 0)
}

function isClusterArray(value: unknown): value is ThemeCluster[] {
  return Array.isArray(value)
    && value.every(item =>
      typeof item === 'object'
      && item !== null
      && typeof (item as ThemeCluster).themeTitle === 'string'
      && typeof (item as ThemeCluster).count === 'number'
      && Array.isArray((item as ThemeCluster).responseIds),
    )
}

async function requestAiClusters(
  sessionId: string,
  questionId: string,
  questionType: QuestionType,
  responses: Response[],
): Promise<ThemeCluster[] | null> {
  if (USE_MOCK || !firebaseApp || questionType !== 'openText') return null

  const sanitized = sanitizeForAi(responses)
  if (sanitized.length < MIN_RESPONSES) return null

  try {
    const functions = getFunctions(firebaseApp, 'asia-southeast1')
    const callable = httpsCallable<AiClusterRequest, AiClusterResult>(functions, 'clusterAarResponses')
    const result = await callable({
      sessionId,
      questionId,
      questionType,
      responses: sanitized,
    })

    if (isClusterArray(result.data.clusters) && result.data.clusters.length > 0) {
      return result.data.clusters
    }

    if (result.data.fallbackReason) {
      console.info(`[AI clustering] Using rule-based fallback: ${result.data.fallbackReason}`)
    }
  } catch (err) {
    console.info('[AI clustering] Callable unavailable; using rule-based fallback', {
      message: err instanceof Error ? err.message : 'unknown error',
    })
  }

  return null
}

export async function clusterOpenTextResponses(
  responses: Response[],
  sessionId: string,
  questionId: string,
  questionType: QuestionType,
): Promise<ThemeCluster[]> {
  const fallback = clusterResponses(responses, sessionId, questionId)
  const aiClusters = await requestAiClusters(sessionId, questionId, questionType, responses)
  return aiClusters ?? fallback
}
