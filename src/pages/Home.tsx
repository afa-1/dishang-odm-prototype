import { useEffect, useRef, useState } from 'react'
import LeftPanel from '@/components/prototype/LeftPanel'
import CanvasArea from '@/components/prototype/CanvasArea'
import ChatPanel from '@/components/prototype/ChatPanel'
import AgentHome from '@/components/prototype/AgentHome'
import type { Mark } from '@/components/prototype/types'
import type { TeamMember } from '@/components/prototype/skills'

export default function Home() {
  // 视图切换：Agent 首页（任务启动中枢） ↔ 无限画布编辑器
  const [view, setView] = useState<'home' | 'canvas'>('home')
  // 首页分配的任务：进入画布后自动注入右侧 Agent 执行
  const [initialTask, setInitialTask] = useState<{ text: string; autoSubmit: boolean } | null>(null)
  // 技能页「使用」：进入画布后对话框自动选中该技能（无需装备即可体验）
  const [initialSkill, setInitialSkill] = useState<{ id: string; name: string } | null>(null)
  // 首页「选择团队」：进入画布后团队显示在 Agent 对话框头部（会话快照，可增减成员）
  const [initialTeam, setInitialTeam] = useState<{ name: string; members: TeamMember[] } | null>(null)
  // 画布「发送至Agent」：选中图片一键带入对话框附件（ts 标识批次，消费后清空）
  const [agentInbox, setAgentInbox] = useState<{ ts: number; items: { name: string; url: string }[] } | null>(null)

  // 对话面板宽度按视口比例管理：初始 50%，可拖拽拉宽至 75%（对照竞品比例关系）
  const [winW, setWinW] = useState(() => window.innerWidth)
  const [chatW, setChatW] = useState(448) // 初始宽度：加大 AI 对话卡片面积占比（约 448px）
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const chatMinW = 380 // 可拖拽收窄的下限（默认 448，需要时可拖回至此）
  const chatMaxW = Math.round(winW / 3) // 拖拽加宽极限：画布的三分之一
  const chatDefaultW = 448 // 默认/还原宽度：与初始一致，加大卡片占比
  // 视口缩小时同步收窄，避免面板超界
  useEffect(() => {
    setChatW((w) => Math.min(chatMaxW, Math.max(chatMinW, w)))
  }, [chatMaxW])
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(true) // 初始状态：素材库面板收起
  const [marks, setMarks] = useState<Mark[]>([])
  // 框选编辑：记录最近被标记的图片，发送后生成结果同步放到该图片正下方
  const markCardRef = useRef<string | null>(null)
  useEffect(() => {
    const staged = marks.filter((m) => m.staged)
    if (staged.length) markCardRef.current = staged[staged.length - 1].cardId
  }, [marks])
  // AI 对话交付：在画布生成设计节点组（ts 标识批次，views 为各卡片视角标签）
  const [deliver, setDeliver] = useState<{ title: string; n: number; ts: number; views?: string[]; anchorCardId?: string | null } | null>(null)
  // 视野聚焦信号：定位到最近交付的节点组（index 指定时定位单张交付卡片）
  const [focusSignal, setFocusSignal] = useState<{ ts: number; index: number | null }>({ ts: 0, index: null })

  if (view === 'home') {
    return (
      <AgentHome
        onLaunch={(task, autoSubmit, team) => {
          setInitialTask({ text: task, autoSubmit })
          setInitialTeam(team ?? null)
          setChatCollapsed(false)
          setView('canvas')
        }}
        onOpenCanvas={() => setView('canvas')}
      />
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-panel text-ink antialiased">
      <div className="relative flex-1 min-h-0">
        <CanvasArea
          leftOffset={(chatCollapsed ? 0 : chatW) + 20} // 随对话栏缩小/放大/最小化动态变化：收起时不占位，画布底部导航栏随即回到全画布居中（常数随面板外边距 12→8 同步）
          marks={marks}
          onMarksChange={setMarks}
          onMarkPlaced={() => setChatCollapsed(false)}
          onMarkToChat={() => setChatCollapsed(false)} // 框选编辑：区域标记自动以需求胶囊卡片进入输入区
          deliver={deliver}
          focusSignal={focusSignal}
          onSendToAgent={(imgs) => {
            // 仅数据层面载入对话框：对话框保持收起，待用户主动展开时已载入的图片正常显示
            setAgentInbox({ ts: Date.now(), items: imgs })
          }}
        />
        <LeftPanel collapsed={leftCollapsed} onCollapsedChange={setLeftCollapsed} />
        <ChatPanel
          onBackHome={() => setView('home')}
          width={chatW}
          onWidthChange={setChatW}
          minW={chatMinW}
          maxW={chatMaxW}
          defaultW={chatDefaultW}
          collapsed={chatCollapsed}
          onCollapsedChange={setChatCollapsed}
          marks={marks.filter((m) => m.staged)} // 仅带入对话框的标记（框选区域）进入输入框
          onRemoveMark={(id) => setMarks((ms) => ms.filter((m) => m.id !== id))}
          onClearMarks={() => setMarks((ms) => ms.filter((m) => !m.staged))} // 发送后仅清除已带入对话框的标记
          onDeliver={(title, views) => {
            setDeliver({ title, n: views.length, views, ts: Date.now(), anchorCardId: markCardRef.current })
            markCardRef.current = null
          }}
          onOpenCanvas={(index) => setFocusSignal({ ts: Date.now(), index: index ?? null })}
          initialTask={initialTask}
          onInitialTaskConsumed={() => {
            setInitialTask(null)
            setInitialSkill(null)
            setInitialTeam(null)
          }}
          initialSkill={initialSkill}
          initialTeam={initialTeam}
          agentInbox={agentInbox}
          onAgentInboxConsumed={() => setAgentInbox(null)}
        />
      </div>
    </div>
  )
}
