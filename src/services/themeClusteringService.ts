import type { Response, ThemeCluster, ThemeCategory } from '../models'
import { newId } from '../utils/id'
import { nowIso } from '../utils/dateFormat'

// Rule-based keyword → theme mapping. Replace with AI API call later.
const THEME_RULES: Array<{
  themeTitle: string
  category: ThemeCategory
  keywords: string[]
}> = [
  { themeTitle: 'อุปกรณ์ไม่เพียงพอ',    category: 'equipment', keywords: ['อุปกรณ์', 'เครื่องมือ', 'วิทยุ', 'ชุดฝึก', 'ชำรุด', 'ไม่ครบ', 'หาย', 'พัง'] },
  { themeTitle: 'เวลาเรียนไม่เพียงพอ',   category: 'time',      keywords: ['เวลา', 'ฝึกไม่ทัน', 'เพิ่มเวลา', 'น้อยไป', 'รีบ', 'ไม่พอ'] },
  { themeTitle: 'เพิ่มการฝึกปฏิบัติ',   category: 'practice',  keywords: ['ฝึกจริง', 'ภาคปฏิบัติ', 'ลงมือทำ', 'สนาม', 'ออกนอก', 'ทดลอง', 'ปฏิบัติ'] },
  { themeTitle: 'ครูสอนดี / น่าฟัง',    category: 'instructor', keywords: ['ครูสอนดี', 'อาจารย์ดี', 'เนื้อหาชัด', 'อธิบายดี', 'เข้าใจง่าย', 'ชัดเจน', 'ประทับใจ'] },
  { themeTitle: 'ครูสอนเร็วเกินไป',     category: 'instructor', keywords: ['สอนเร็ว', 'เร็วเกินไป', 'ตามไม่ทัน', 'ไม่เข้าใจ', 'งง'] },
  { themeTitle: 'เอกสารไม่ทันสมัย',     category: 'content',   keywords: ['เอกสาร', 'ตำรา', 'หนังสือ', 'เก่า', 'ไม่อัปเดต', 'ล้าสมัย', 'ผิด'] },
  { themeTitle: 'อยากมี Simulator',     category: 'practice',  keywords: ['simulator', 'จำลอง', 'VR', 'ซอฟต์แวร์', 'โปรแกรม', 'คอมพิวเตอร์'] },
  { themeTitle: 'สถานที่ไม่เหมาะสม',   category: 'location',  keywords: ['ห้อง', 'สถานที่', 'เสียง', 'ร้อน', 'แสง', 'แคบ', 'ไม่สะดวก', 'ที่นั่ง'] },
  { themeTitle: 'เนื้อหายากเกินไป',     category: 'content',   keywords: ['ยาก', 'ซับซ้อน', 'เข้าใจยาก', 'สูตร', 'คณิต', 'คำนวณ'] },
  { themeTitle: 'การประเมินไม่ยุติธรรม', category: 'assessment', keywords: ['สอบ', 'ข้อสอบ', 'คะแนน', 'ประเมิน', 'วัดผล', 'ยุติธรรม', 'ไม่ยุติธรรม'] },
  { themeTitle: 'เนื้อหาดี / มีประโยชน์', category: 'content',  keywords: ['ดีมาก', 'มีประโยชน์', 'นำไปใช้ได้', 'เป็นประโยชน์', 'ดี', 'ได้เรียนรู้'] },
  { themeTitle: 'ปัญหาการสื่อสารใน team', category: 'other',   keywords: ['ทีม', 'สื่อสาร', 'ประสาน', 'ร่วมมือ', 'กลุ่ม', 'สมาชิก'] },
]

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.reduce((s, kw) => s + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0)
}

export function clusterResponses(
  responses: Response[],
  sessionId: string,
  questionId: string,
): ThemeCluster[] {
  const texts = responses.filter(r => r.answerText.trim().length > 0)
  if (!texts.length) return []

  const clusterMap = new Map<string, { rule: typeof THEME_RULES[0]; responseIds: string[]; comments: string[] }>()

  texts.forEach(r => {
    let bestScore = 0
    let bestRule: typeof THEME_RULES[0] | null = null

    THEME_RULES.forEach(rule => {
      const s = scoreText(r.answerText, rule.keywords)
      if (s > bestScore) { bestScore = s; bestRule = rule }
    })

    const rule = bestScore > 0 ? bestRule! : { themeTitle: 'ความคิดเห็นอื่นๆ', category: 'other' as ThemeCategory, keywords: [] }
    const key = rule.themeTitle

    if (!clusterMap.has(key)) {
      clusterMap.set(key, { rule, responseIds: [], comments: [] })
    }
    const entry = clusterMap.get(key)!
    entry.responseIds.push(r.responseId)
    if (entry.comments.length < 4) entry.comments.push(r.answerText)
  })

  const total = texts.length || 1
  const now = nowIso()

  return Array.from(clusterMap.values())
    .filter(e => e.responseIds.length > 0)
    .map(e => ({
      clusterId: newId('cl'),
      sessionId,
      questionId,
      themeTitle: e.rule.themeTitle,
      category: e.rule.category,
      keywords: e.rule.keywords,
      responseIds: e.responseIds,
      count: e.responseIds.length,
      percentage: Math.round((e.responseIds.length / total) * 100),
      representativeComments: e.comments,
      createdAt: now,
      updatedAt: now,
    }))
    .sort((a, b) => b.count - a.count)
}
