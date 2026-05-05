import type { Course, Batch, LiveSession, Question, Response, ThemeCluster, Issue, Action, ImpactRecord } from '../models'

export const MOCK_COURSES: Course[] = [
  { courseId: 'c1', name: 'สงครามอิเล็กทรอนิกส์เบื้องต้น', description: 'หลักสูตร EW สำหรับนายสิบชั้นต้น', department: 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์', createdAt: '2025-01-15T08:00:00Z' },
  { courseId: 'c2', name: 'ECM Burn-through & Jamming', description: 'หลักสูตรเทคนิค ECM และการรบกวนสัญญาณ', department: 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์', createdAt: '2025-02-01T08:00:00Z' },
  { courseId: 'c3', name: 'Electronic Support Measures', description: 'ESM / DF / EOB สำหรับนายสิบอาวุโส', department: 'แผนกวิชาการสื่อสารประเภทวิทยุและการสงครามอิเล็กทรอนิกส์', createdAt: '2025-03-01T08:00:00Z' },
]

export const MOCK_BATCHES: Batch[] = [
  { batchId: 'b11', courseId: 'c2', batchName: 'รุ่นที่ 11', startDate: '2025-07-01', endDate: '2025-07-30', instructorName: 'ร.อ. วิชัย สงวน' },
  { batchId: 'b12', courseId: 'c2', batchName: 'รุ่นที่ 12', startDate: '2025-10-01', endDate: '2025-10-30', instructorName: 'ร.อ. วิชัย สงวน' },
  { batchId: 'b13', courseId: 'c2', batchName: 'รุ่นที่ 13', startDate: '2026-01-06', endDate: '2026-01-31', instructorName: 'ร.อ. สมศักดิ์ มั่นคง' },
  { batchId: 'b14', courseId: 'c2', batchName: 'รุ่นที่ 14', startDate: '2026-04-01', endDate: '2026-04-30', instructorName: 'ร.อ. สมศักดิ์ มั่นคง' },
  { batchId: 'b1a', courseId: 'c1', batchName: 'รุ่นที่ 1', startDate: '2026-03-01', endDate: '2026-03-28', instructorName: 'ร.ท. ประเสริฐ ดีใจ' },
]

export const MOCK_SESSIONS: LiveSession[] = [
  {
    sessionId: 's1', courseId: 'c2', batchId: 'b14',
    title: 'AAR — ECM Burn-through สัปดาห์ที่ 2',
    status: 'closed', currentQuestionId: null, joinCode: 'ECM14K',
    createdBy: 'instructor@signal.th', createdAt: '2026-04-15T09:00:00Z', closedAt: '2026-04-15T10:30:00Z',
  },
  {
    sessionId: 's2', courseId: 'c2', batchId: 'b14',
    title: 'AAR — DF Triangulation ภาคสนาม',
    status: 'closed', currentQuestionId: null, joinCode: 'DF14F2',
    createdBy: 'instructor@signal.th', createdAt: '2026-04-22T09:00:00Z', closedAt: '2026-04-22T10:00:00Z',
  },
  {
    sessionId: 's3', courseId: 'c1', batchId: 'b1a',
    title: 'AAR — บทที่ 3 การวิเคราะห์สเปกตรัม',
    status: 'draft', currentQuestionId: null, joinCode: 'EW1S3A',
    createdBy: 'instructor@signal.th', createdAt: '2026-04-30T08:00:00Z', closedAt: null,
  },
]

export const MOCK_QUESTIONS: Question[] = [
  { questionId: 'q1', sessionId: 's1', text: 'ท่านเข้าใจขั้นตอนการคำนวณ Burn-through Range มากน้อยเพียงใด?', type: 'rating', options: [], order: 1, isActive: false, createdAt: '2026-04-15T09:05:00Z' },
  { questionId: 'q2', sessionId: 's1', text: 'อุปกรณ์ในการฝึกมีเพียงพอสำหรับการฝึกปฏิบัติ?', type: 'yesNo', options: ['ใช่', 'ไม่ใช่'], order: 2, isActive: false, createdAt: '2026-04-15T09:20:00Z' },
  { questionId: 'q3', sessionId: 's1', text: 'ข้อใดต่อไปนี้ถูกต้องเกี่ยวกับ ECM Burn-through?', type: 'multipleChoice', options: ['กำลังส่งสูง→ระยะ Burn-through ไกล', 'ความถี่ต่ำ→ Burn-through ดีกว่า', 'J/S Ratio ยิ่งสูงยิ่งดีสำหรับฝ่ายเรา', 'ไม่มีข้อถูก'], order: 3, isActive: false, createdAt: '2026-04-15T09:35:00Z' },
  { questionId: 'q4', sessionId: 's1', text: 'ข้อเสนอแนะ / สิ่งที่อยากให้ปรับปรุงในการฝึกครั้งนี้', type: 'openText', options: [], order: 4, isActive: false, createdAt: '2026-04-15T09:50:00Z' },
  { questionId: 'q5', sessionId: 's1', text: 'ปัญหาหลักที่พบระหว่างการฝึกภาคปฏิบัติ', type: 'openText', options: [], order: 5, isActive: false, createdAt: '2026-04-15T10:05:00Z' },
]

export const MOCK_RESPONSES: Response[] = [
  { responseId: 'r1', sessionId: 's1', questionId: 'q1', batchId: 'b14', studentAlias: 'นยส.1', answerText: '', selectedOption: '', ratingValue: 4, createdAt: '2026-04-15T09:10:00Z' },
  { responseId: 'r2', sessionId: 's1', questionId: 'q1', batchId: 'b14', studentAlias: 'นยส.2', answerText: '', selectedOption: '', ratingValue: 3, createdAt: '2026-04-15T09:10:30Z' },
  { responseId: 'r3', sessionId: 's1', questionId: 'q1', batchId: 'b14', studentAlias: 'นยส.3', answerText: '', selectedOption: '', ratingValue: 5, createdAt: '2026-04-15T09:11:00Z' },
  { responseId: 'r4', sessionId: 's1', questionId: 'q1', batchId: 'b14', studentAlias: 'นยส.4', answerText: '', selectedOption: '', ratingValue: 2, createdAt: '2026-04-15T09:11:30Z' },
  { responseId: 'r5', sessionId: 's1', questionId: 'q2', batchId: 'b14', studentAlias: 'นยส.1', answerText: '', selectedOption: 'ไม่ใช่', ratingValue: null, createdAt: '2026-04-15T09:25:00Z' },
  { responseId: 'r6', sessionId: 's1', questionId: 'q2', batchId: 'b14', studentAlias: 'นยส.2', answerText: '', selectedOption: 'ไม่ใช่', ratingValue: null, createdAt: '2026-04-15T09:25:10Z' },
  { responseId: 'r7', sessionId: 's1', questionId: 'q2', batchId: 'b14', studentAlias: 'นยส.3', answerText: '', selectedOption: 'ใช่', ratingValue: null, createdAt: '2026-04-15T09:25:20Z' },
  { responseId: 'r8', sessionId: 's1', questionId: 'q3', batchId: 'b14', studentAlias: 'นยส.1', answerText: '', selectedOption: 'กำลังส่งสูง→ระยะ Burn-through ไกล', ratingValue: null, createdAt: '2026-04-15T09:40:00Z' },
  { responseId: 'r9', sessionId: 's1', questionId: 'q3', batchId: 'b14', studentAlias: 'นยส.2', answerText: '', selectedOption: 'ไม่มีข้อถูก', ratingValue: null, createdAt: '2026-04-15T09:40:15Z' },
  { responseId: 'r10', sessionId: 's1', questionId: 'q3', batchId: 'b14', studentAlias: 'นยส.3', answerText: '', selectedOption: 'กำลังส่งสูง→ระยะ Burn-through ไกล', ratingValue: null, createdAt: '2026-04-15T09:40:30Z' },
  { responseId: 'r11', sessionId: 's1', questionId: 'q4', batchId: 'b14', studentAlias: 'นยส.1', answerText: 'อุปกรณ์ไม่พอ เครื่องมือในการฝึกมีน้อยมาก', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T09:55:00Z' },
  { responseId: 'r12', sessionId: 's1', questionId: 'q4', batchId: 'b14', studentAlias: 'นยส.2', answerText: 'เวลาเรียนน้อยเกินไป อยากเพิ่มเวลาภาคปฏิบัติ', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T09:55:15Z' },
  { responseId: 'r13', sessionId: 's1', questionId: 'q4', batchId: 'b14', studentAlias: 'นยส.3', answerText: 'อยากฝึกจริงในสนาม ไม่ใช่แค่ในห้อง', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T09:55:30Z' },
  { responseId: 'r14', sessionId: 's1', questionId: 'q4', batchId: 'b14', studentAlias: 'นยส.4', answerText: 'ครูสอนดีมาก เนื้อหาชัดเจน', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T09:55:45Z' },
  { responseId: 'r15', sessionId: 's1', questionId: 'q5', batchId: 'b14', studentAlias: 'นยส.1', answerText: 'วิทยุไม่ครบ ชุดฝึกมีไม่พอ', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T10:10:00Z' },
  { responseId: 'r16', sessionId: 's1', questionId: 'q5', batchId: 'b14', studentAlias: 'นยส.2', answerText: 'ฝึกไม่ทัน เวลาน้อยไปสำหรับ lab', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T10:10:15Z' },
  { responseId: 'r17', sessionId: 's1', questionId: 'q5', batchId: 'b14', studentAlias: 'นยส.3', answerText: 'เครื่องมือชำรุด บางชุดใช้ไม่ได้', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T10:10:30Z' },
  { responseId: 'r18', sessionId: 's1', questionId: 'q5', batchId: 'b14', studentAlias: 'นยส.4', answerText: 'ขอภาคปฏิบัติเพิ่มอีก 2 ชม.', selectedOption: '', ratingValue: null, createdAt: '2026-04-15T10:10:45Z' },
]

export const MOCK_CLUSTERS: ThemeCluster[] = [
  {
    clusterId: 'cl1', sessionId: 's1', questionId: 'q4',
    themeTitle: 'อุปกรณ์ไม่เพียงพอ', category: 'equipment',
    keywords: ['อุปกรณ์', 'เครื่องมือ', 'วิทยุ', 'ชุดฝึก', 'ชำรุด'],
    responseIds: ['r11', 'r15', 'r17'],
    count: 47, percentage: 36,
    representativeComments: ['อุปกรณ์ไม่พอ เครื่องมือในการฝึกมีน้อยมาก', 'วิทยุไม่ครบ ชุดฝึกมีไม่พอ', 'เครื่องมือชำรุด บางชุดใช้ไม่ได้'],
    createdAt: '2026-04-15T10:15:00Z', updatedAt: '2026-04-15T10:15:00Z',
  },
  {
    clusterId: 'cl2', sessionId: 's1', questionId: 'q4',
    themeTitle: 'เวลาเรียนไม่เพียงพอ', category: 'time',
    keywords: ['เวลา', 'ฝึกไม่ทัน', 'เพิ่มเวลา', 'น้อยไป'],
    responseIds: ['r12', 'r16'],
    count: 38, percentage: 29,
    representativeComments: ['เวลาเรียนน้อยเกินไป อยากเพิ่มเวลาภาคปฏิบัติ', 'ฝึกไม่ทัน เวลาน้อยไปสำหรับ lab'],
    createdAt: '2026-04-15T10:15:00Z', updatedAt: '2026-04-15T10:15:00Z',
  },
  {
    clusterId: 'cl3', sessionId: 's1', questionId: 'q4',
    themeTitle: 'เพิ่มการฝึกปฏิบัติ', category: 'practice',
    keywords: ['ฝึกจริง', 'ภาคปฏิบัติ', 'ลงมือทำ', 'สนาม'],
    responseIds: ['r13', 'r18'],
    count: 24, percentage: 18,
    representativeComments: ['อยากฝึกจริงในสนาม ไม่ใช่แค่ในห้อง', 'ขอภาคปฏิบัติเพิ่มอีก 2 ชม.'],
    createdAt: '2026-04-15T10:15:00Z', updatedAt: '2026-04-15T10:15:00Z',
  },
  {
    clusterId: 'cl4', sessionId: 's1', questionId: 'q4',
    themeTitle: 'ครูสอนดี / เนื้อหาชัดเจน', category: 'instructor',
    keywords: ['ครูสอนดี', 'เนื้อหาชัดเจน', 'ประทับใจ'],
    responseIds: ['r14'],
    count: 31, percentage: 24,
    representativeComments: ['ครูสอนดีมาก เนื้อหาชัดเจน'],
    createdAt: '2026-04-15T10:15:00Z', updatedAt: '2026-04-15T10:15:00Z',
  },
]

export const MOCK_ISSUES: Issue[] = [
  {
    issueId: 'i1', courseId: 'c2', batchId: 'b14',
    sourceSessionId: 's1', sourceQuestionId: 'q5', sourceClusterId: 'cl1',
    title: 'อุปกรณ์ฝึก Burn-through ไม่เพียงพอ', category: 'EQUIP', severity: 'P1',
    frequencyCount: 47, percentage: 36, status: 'inProgress',
    createdAt: '2026-04-15T11:00:00Z', updatedAt: '2026-04-20T09:00:00Z',
  },
  {
    issueId: 'i2', courseId: 'c2', batchId: 'b14',
    sourceSessionId: 's1', sourceQuestionId: 'q4', sourceClusterId: 'cl2',
    title: 'เวลาฝึก Lab ไม่เพียงพอ', category: 'TIME', severity: 'P2',
    frequencyCount: 38, percentage: 29, status: 'open',
    createdAt: '2026-04-15T11:00:00Z', updatedAt: '2026-04-15T11:00:00Z',
  },
  {
    issueId: 'i3', courseId: 'c2', batchId: 'b13',
    sourceSessionId: 's2', sourceQuestionId: 'q1', sourceClusterId: '',
    title: 'เอกสารประกอบการสอน J/S Ratio ไม่อัปเดต', category: 'DOC', severity: 'P2',
    frequencyCount: 18, percentage: 22, status: 'resolved',
    createdAt: '2026-01-22T11:00:00Z', updatedAt: '2026-02-15T09:00:00Z',
  },
  {
    issueId: 'i4', courseId: 'c2', batchId: 'b13',
    sourceSessionId: 's2', sourceQuestionId: 'q2', sourceClusterId: '',
    title: 'เพิ่มชั่วโมง DF Triangulation ภาคปฏิบัติ', category: 'CURR', severity: 'P2',
    frequencyCount: 29, percentage: 35, status: 'resolved',
    createdAt: '2026-01-22T11:00:00Z', updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    issueId: 'i5', courseId: 'c2', batchId: 'b12',
    sourceSessionId: '', sourceQuestionId: '', sourceClusterId: '',
    title: 'Spectrum analyzer 2 เครื่อง ต้อง calibrate', category: 'EQUIP', severity: 'P1',
    frequencyCount: 8, percentage: 12, status: 'resolved',
    createdAt: '2025-10-25T11:00:00Z', updatedAt: '2025-11-10T09:00:00Z',
  },
]

export const MOCK_ACTIONS: Action[] = [
  {
    actionId: 'a1', issueId: 'i1',
    description: 'จัดซื้อ Antenna Mast เพิ่ม 4 ชุด งบประมาณ 4.2M บาท',
    responsiblePerson: 'ร.อ. วิชัย สงวน', startDate: '2026-04-20', dueDate: '2026-05-20',
    status: 'inProgress', evidenceNote: 'PO-2026-1142 อยู่ระหว่างจัดซื้อ',
    createdAt: '2026-04-20T09:00:00Z', updatedAt: '2026-04-25T09:00:00Z',
  },
  {
    actionId: 'a2', issueId: 'i4',
    description: 'เพิ่มชั่วโมงฝึก DF Triangulation 2 ชม. ใน Module RDR-201',
    responsiblePerson: 'ร.ท. ประเสริฐ ดีใจ', startDate: '2026-02-01', dueDate: '2026-03-01',
    status: 'done', evidenceNote: 'module-rdr201-v3.pdf, lesson-plan-revised.docx',
    createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    actionId: 'a3', issueId: 'i3',
    description: 'จัดทำ Handbook J/S Ratio ฉบับใหม่ + e-learning module',
    responsiblePerson: 'ร.ต. สุรชัย ใจดี', startDate: '2026-02-10', dueDate: '2026-03-15',
    status: 'done', evidenceNote: 'js-ratio-handbook-v2.pdf, elearning-screenshots.pdf',
    createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-03-15T09:00:00Z',
  },
]

export const MOCK_IMPACT_RECORDS: ImpactRecord[] = [
  {
    impactId: 'im1', issueId: 'i5',
    beforeBatchId: 'b11', afterBatchId: 'b12',
    beforeScore: 51, afterScore: 74,
    beforeNote: 'ECM score ต่ำเนื่องจาก Spectrum analyzer ผิดพลาด',
    afterNote: 'หลัง calibrate และปรับ SOP คะแนน EA เพิ่มขึ้น 23 คะแนน',
    improvementSummary: 'calibrate Spectrum analyzer + ปรับ SOP ทำให้คะแนน EA เพิ่มจาก 51% → 74%',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    impactId: 'im2', issueId: 'i4',
    beforeBatchId: 'b12', afterBatchId: 'b13',
    beforeScore: 47, afterScore: 72,
    beforeNote: 'RDR score ต่ำ นักเรียนฝึก DF ไม่พอ',
    afterNote: 'หลังเพิ่ม 2 ชม. ภาคสนาม คะแนน RDR เพิ่มขึ้น 25 คะแนน',
    improvementSummary: 'เพิ่มชั่วโมงฝึก DF Triangulation 2 ชม. ทำให้คะแนน RDR เพิ่มจาก 47% → 72%',
    createdAt: '2026-04-05T09:00:00Z',
  },
  {
    impactId: 'im3', issueId: 'i3',
    beforeBatchId: 'b12', afterBatchId: 'b14',
    beforeScore: 55, afterScore: 76,
    beforeNote: 'นักเรียนสับสนเรื่อง J/S Ratio เพราะเอกสารไม่ชัดเจน',
    afterNote: 'Handbook ใหม่ + e-learning ช่วยให้เข้าใจดีขึ้นมาก',
    improvementSummary: 'จัดทำ Handbook J/S Ratio ใหม่ ทำให้คะแนน Spectrum เพิ่มจาก 55% → 76%',
    createdAt: '2026-04-15T11:30:00Z',
  },
]
