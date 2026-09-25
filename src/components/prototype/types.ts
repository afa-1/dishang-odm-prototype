/** 画布标记点（标记工具产生，同步到 AI 对话输入框） */
export interface Mark {
  id: number
  cardId: string
  /** 相对卡片左上角的世界坐标偏移（卡片拖动时标记跟随） */
  dx: number
  dy: number
  /** 框选编辑：矩形选区尺寸（相对卡片左上角；缺省为点标记） */
  w?: number
  h?: number
  /** AI 识别并经用户在状态栏中确认的部件名称 */
  part?: string
  /** 用户在状态栏中输入的需求描述 */
  note?: string
  /** 已带入 Agent 对话发送区（状态栏「添加到对话」/「发送」后置位），未置位的标记不出现在输入框 */
  staged?: boolean
}

/* ---------- 无限画布款式图片存储（创建工艺单「项目资产」实时同步来源） ---------- */
export interface CanvasStyleAsset {
  id: string
  img: string
  name: string
}
let canvasStyleAssets: CanvasStyleAsset[] = []
const canvasAssetSubs = new Set<() => void>()
/** 画布卡片变化时由 CanvasArea 调用，发布当前画布上的全部图片款式 */
export function setCanvasStyleAssets(list: CanvasStyleAsset[]) {
  canvasStyleAssets = list
  canvasAssetSubs.forEach((fn) => fn())
}
export function getCanvasStyleAssets() {
  return canvasStyleAssets
}
/** 订阅画布款式图片变化，返回取消订阅函数 */
export function subCanvasStyleAssets(fn: () => void) {
  canvasAssetSubs.add(fn)
  return () => {
    canvasAssetSubs.delete(fn)
  }
}
