/**
 * 设置中心共享内容：订阅套餐 / 充值积分 / 支付方式 / 个人信息 / 账单记录 / 通知公告。
 * SettingsModal（账户体系）与 ConnectorsModal（连接器弹窗）的左侧菜单均复用此处页面，保证全局同一功能只有一份实现。
 */
import { useState } from 'react'
import { Check, Info, X } from 'lucide-react'

/* ================= 数据 ================= */

export const USER = { name: 'Victor Zhou', email: 'victor@huayiyi.ai', credits: 826.25, total: 1000, plan: 'PRO版', expire: '2026-11-06' }

export type SettingsTab = 'plan' | 'recharge' | 'pay' | 'connect' | 'profile' | 'bills' | 'notice'

/** 内容页支持的 tab（connect 由 ConnectorsPanel 单独承载） */
export type SettingsContentTab = Exclude<SettingsTab, 'connect'>

/** 积分变动记录（模拟 25 条，分页展示） */
const CREDIT_LOGS = Array.from({ length: 25 }, (_, i) => {
  const kinds = ['图片编辑 (1K, 1:1)', '图片编辑 (1K, 2:3)', '图片编辑 (4096x2048)', '3D 模型生成 (GLB)', 'Agent', '灵感设计 (3:4)']
  const amounts = [-13.5, -6.7, -24.03, -24.9, -2.06, -6.7]
  const k = i % kinds.length
  const day = 7 - Math.floor(i / 6)
  const hour = 22 - (i % 6)
  return {
    detail: kinds[k],
    date: `2026-08-0${Math.max(1, day)} ${String(Math.max(9, hour)).padStart(2, '0')}:${String(53 - i * 2 > 9 ? 53 - i * 2 : 9).padStart(2, '0')}`,
    amount: amounts[k],
    status: '已消耗',
  }
})

const CREDIT_PACKS = [1000, 2000, 3000, 4000, 5000, 6000]

interface Plan {
  key: string
  name: string
  desc: string
  price: number | null // null = 定制报价（企业版）
  period?: '月' | '年'
  badge?: string
  current?: boolean
  quota: [string, string][]
  feats: [boolean, string][]
}

/** AI 设计套餐：按月订阅，积分代币制（FREE 轻体验 / PRO / MAX） */
const DESIGN_PLANS: Plan[] = [
  {
    key: 'free',
    name: 'FREE',
    desc: '适合轻度体验与学习',
    price: 0,
    period: '月',
    current: true,
    quota: [
      ['每月积分', '新客赠送 100 代币'],
      ['额外充值', '——'],
    ],
    feats: [
      [true, '注册赠送 100 代币（30 天有效）'],
      [true, '基础模型可用'],
      [false, '高级模型受限使用'],
      [true, '最大导出分辨率 2K'],
      [false, '无法购买积分包'],
    ],
  },
  {
    key: 'pro',
    name: 'PRO',
    desc: '适合个人创作者日常使用',
    price: 98,
    period: '月',
    badge: '最受欢迎',
    quota: [
      ['每月积分', '2000 代币'],
      ['额外充值', '¥1 = 10 代币'],
    ],
    feats: [
      [true, '每月订阅 2,000 代币'],
      [true, '首次购买享 50% 积分消耗速率优惠，买多久享多久'],
      [true, '基础模型可用'],
      [true, '高级模型可用'],
      [true, '每日积分上限 无限制'],
      [true, '最大导出分辨率 4K'],
      [true, '可购买积分包'],
    ],
  },
  {
    key: 'max',
    name: 'MAX',
    desc: '适合大批量稳定产出与交付',
    price: 298,
    period: '月',
    badge: '最佳性价比',
    quota: [
      ['每月积分', '8000 代币'],
      ['额外充值', '¥1 = 10 代币'],
    ],
    feats: [
      [true, '每月订阅 8,000 代币'],
      [true, '首次购买享 50% 积分消耗速率优惠，买多久享多久'],
      [true, '基础模型可用'],
      [true, '高级模型 Priority 优先使用权'],
      [true, '每日积分上限 无限制'],
      [true, '最大导出分辨率 4K'],
      [true, '可购买积分包'],
    ],
  },
]

/** AI 打版套餐：按年订阅（PRO版 / MAX版 / 企业版） */
const PATTERN_PLANS: Plan[] = [
  {
    key: 'pro',
    name: 'PRO版',
    desc: '适合独立设计师与小型工作室',
    price: 9800,
    period: '年',
    current: true,
    quota: [
      ['年费', '¥9,800'],
      ['服务周期', '1 年'],
    ],
    feats: [
      [true, 'AI 打版'],
      [true, 'AI 设计'],
      [true, 'AI 平台版师'],
      [false, '专属 AI 版师'],
      [false, '专属品牌版师'],
      [false, '版型数据库'],
      [true, '团队协作 / 权限设置'],
    ],
  },
  {
    key: 'max',
    name: 'MAX版',
    desc: '适合成熟品牌与设计团队',
    price: 98000,
    period: '年',
    badge: '最受欢迎',
    quota: [
      ['年费', '¥98,000'],
      ['服务周期', '1 年'],
    ],
    feats: [
      [true, 'AI 打版'],
      [true, 'AI 设计'],
      [true, 'AI 平台版师'],
      [true, '专属 AI 版师'],
      [true, '专属品牌版师'],
      [true, '版型数据库'],
      [true, '团队协作 / 权限设置'],
    ],
  },
  {
    key: 'ent',
    name: '企业版',
    desc: '适合大型集团与多品牌矩阵',
    price: null,
    badge: '定制',
    quota: [
      ['授权方式', '定制报价'],
      ['部署支持', '专属方案'],
    ],
    feats: [
      [true, 'AI 打版'],
      [true, 'AI 设计'],
      [true, 'AI 平台版师'],
      [true, '专属 AI 版师'],
      [true, '专属品牌版师'],
      [true, '版型数据库'],
      [true, '团队协作 / 权限设置'],
    ],
  },
]

/* ================= 套餐卡片组（套餐弹窗与设置-订阅套餐共用） ================= */

export function PlanCards({ onSubscribe }: { onSubscribe: () => void }) {
  const renderCard = (p: Plan) => (
    <div key={p.key} className={`rounded-2xl border p-5 flex flex-col ${p.badge ? 'border-acc/50 bg-acc-soft/40' : 'border-line bg-panel'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold text-ink tracking-wide">{p.name}</span>
        {p.badge && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-acc-soft text-acc border border-acc-line">{p.badge}</span>}
      </div>
      <div className="text-[11.5px] text-mut mt-1">{p.desc}</div>
      <div className="mt-3 flex items-baseline gap-1">
        {p.price === null ? (
          <span className="text-[26px] font-bold text-ink leading-none">定制报价</span>
        ) : (
          <>
            <span className="text-[30px] font-bold text-ink leading-none">¥{p.price.toLocaleString()}</span>
            <span className="text-[12px] text-mut">/{p.period ?? '月'}</span>
          </>
        )}
      </div>
      <div className="text-[11px] text-mut-2 mt-1">
        {p.current ? (p.price === 0 ? '当前生效套餐，注册即享' : '当前生效套餐') : p.price === null ? '按需定制，商务洽谈' : p.price === 0 ? '免费使用，注册赠送积分' : '按' + (p.period ?? '月') + '支付，自动续费'}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3.5">
        {p.quota.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-fill-2 px-2.5 py-2">
            <div className="text-[10.5px] text-mut-2">{k}</div>
            <div className="text-[12.5px] font-medium text-ink mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      <button
        onClick={p.current ? undefined : onSubscribe}
        disabled={p.current}
        className={`mt-3.5 h-9 rounded-full text-[13px] font-medium transition-colors ${
          p.current ? 'bg-fill text-mut-2 cursor-default' : 'bg-ink text-panel hover:bg-ink/85'
        }`}
      >
        {p.current ? '当前订阅' : p.price === null ? '联系销售' : '订阅'}
      </button>
      <div className="my-3.5 border-t border-fill" />
      <ul className="space-y-2">
        {p.feats.map(([ok, f]) => (
          <li key={f} className={`flex items-start gap-1.5 text-[12px] leading-snug ${ok ? 'text-ink-2' : 'text-mut-3'}`}>
            {ok ? <Check className="w-3.5 h-3.5 text-acc shrink-0 mt-px" /> : <X className="w-3.5 h-3.5 shrink-0 mt-px" />}
            {f}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      {/* AI 设计套餐：按月订阅，代币制 */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-ink">AI 设计套餐</div>
            <div className="text-[12px] text-mut mt-0.5">按月订阅，积分代币随套餐按月发放；首次购买享 50% 积分消耗速率优惠。</div>
          </div>
          <button className="h-7 px-3 rounded-full border border-line text-[12px] text-ink-2 hover:bg-fill transition-colors">API 服务</button>
        </div>
        <div className="grid grid-cols-3 gap-3.5 mt-4">{DESIGN_PLANS.map(renderCard)}</div>
      </section>
      {/* AI 打版套餐：按年订阅 */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-ink">AI 打版套餐</div>
            <div className="text-[12px] text-mut mt-0.5">按年订阅，到期自动续费；企业版支持定制报价与专属部署。</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3.5 mt-4">{PATTERN_PLANS.map(renderCard)}</div>
      </section>
    </div>
  )
}

/* ================= 设置页内容（连接器弹窗与设置弹窗共用） ================= */

export function SettingsTabContent({
  tab,
  showToast,
  onSwitchTab,
}: {
  tab: SettingsContentTab
  showToast: (m: string) => void
  onSwitchTab?: (t: SettingsTab) => void
}) {
  const [billTab, setBillTab] = useState<'orders' | 'credits'>('credits')
  const [page, setPage] = useState(1)
  const [pack, setPack] = useState(2000)
  const pageSize = 10
  const pageCount = Math.ceil(CREDIT_LOGS.length / pageSize)
  const pageRows = CREDIT_LOGS.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      {/* 账单记录 */}
      {tab === 'bills' && (
        <div>
          <div className="text-[16px] font-semibold text-ink">账单记录</div>
          <div className="text-[12px] text-mut mt-1">查看和管理您的支付历史记录</div>
          <div className="flex items-center justify-between mt-4">
            <div className="inline-flex bg-fill rounded-full p-0.5 text-[12.5px]">
              <button
                onClick={() => setBillTab('orders')}
                className={`h-7 px-3.5 rounded-full transition-colors ${billTab === 'orders' ? 'bg-panel shadow-sm font-medium text-ink' : 'text-ink-3'}`}
              >
                订单记录
              </button>
              <button
                onClick={() => setBillTab('credits')}
                className={`h-7 px-3.5 rounded-full transition-colors flex items-center gap-1 ${billTab === 'credits' ? 'bg-panel shadow-sm font-medium text-ink' : 'text-ink-3'}`}
              >
                积分变动 <span className="text-[10px] text-acc">new</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSwitchTab?.('recharge')}
                className="h-8 px-3.5 rounded-full border border-line text-[12.5px] text-ink hover:bg-fill transition-colors"
              >
                充值积分
              </button>
              <button onClick={() => onSwitchTab?.('plan')} className="h-8 px-3.5 rounded-full bg-ink text-panel text-[12.5px] hover:bg-ink/85 transition-colors">
                订阅套餐
              </button>
            </div>
          </div>
          {billTab === 'orders' ? (
            <div className="h-72 flex items-center justify-center text-[13px] text-mut-2">暂无订单记录</div>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-[1fr_150px_110px_90px] px-3 pb-2 text-[11.5px] text-mut-2 border-b border-line-soft">
                <span>明细</span>
                <span>日期</span>
                <span>积分变动</span>
                <span>状态</span>
              </div>
              {pageRows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_150px_110px_90px] px-3 py-3 text-[12.5px] border-b border-line-soft last:border-0">
                  <span className="text-ink">{r.detail}</span>
                  <span className="text-ink-3">{r.date}</span>
                  <span className="text-ink">{r.amount.toFixed(2)}</span>
                  <span className="text-mut">{r.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-4 text-[12px] text-mut">
            <span className="mr-1">共 {billTab === 'orders' ? 0 : CREDIT_LOGS.length} 条</span>
            <button
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="w-7 h-7 rounded-md border border-line flex items-center justify-center hover:bg-fill disabled:opacity-40"
              disabled={page === 1}
            >
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                  page === i + 1 ? 'bg-acc text-white' : 'border border-line hover:bg-fill'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((v) => Math.min(pageCount, v + 1))}
              className="w-7 h-7 rounded-md border border-line flex items-center justify-center hover:bg-fill disabled:opacity-40"
              disabled={page === pageCount}
            >
              ›
            </button>
          </div>
        </div>
      )}
      {/* 充值积分 */}
      {tab === 'recharge' && (
        <div>
          <div className="text-[16px] font-semibold text-ink">充值积分</div>
          <div className="text-[12px] text-mut mt-1">购买积分包，增加可用积分</div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {CREDIT_PACKS.map((c) => (
              <button
                key={c}
                onClick={() => setPack(c)}
                className={`rounded-xl border p-4 text-left transition-colors ${pack === c ? 'border-acc bg-acc-soft/40' : 'border-line hover:border-acc/40'}`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[24px] font-bold text-ink leading-none">{c.toLocaleString()}</span>
                  <span className="text-[11.5px] text-mut">Credits</span>
                  <span className="ml-auto text-[10.5px] px-1.5 py-0.5 rounded bg-acc-soft text-acc">-67%</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-acc-soft/60 border border-acc-line px-4 py-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-acc shrink-0 mt-px" />
            <div>
              <div className="text-[13px] font-medium text-ink">仅限付费订阅用户购买</div>
              <div className="text-[12px] text-mut mt-0.5">免费版暂不支持直接购买积分包，请先升级至 Standard 或 Pro 订阅套餐</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div>
              <span className="text-[22px] font-bold text-acc">${((pack / 1000) * 20).toFixed(2)}</span>
              <div className="text-[11px] text-mut-2">$1=100 Credit</div>
            </div>
            <button disabled className="h-9 px-5 rounded-full bg-fill text-mut-2 text-[13px] cursor-not-allowed">
              免费版暂不支持购买
            </button>
          </div>
          <div className="mt-6 space-y-1.5 text-[11.5px] text-mut-2">
            <div>购买积分有效期为三个月</div>
            <div>消耗优先级以过期时间为准，越早过期的越先消耗</div>
            <div>购买后 7 天内且未使用可申请退款（联系客服）</div>
          </div>
        </div>
      )}
      {/* 订阅套餐 */}
      {tab === 'plan' && <PlanCards onSubscribe={() => showToast('原型演示：支付能力即将上线')} />}
      {/* 支付方式 */}
      {tab === 'pay' && (
        <div>
          <div className="text-[16px] font-semibold text-ink">支付方式</div>
          <div className="h-72 flex items-center justify-center text-[13px] text-mut-2">暂无绑定的支付方式</div>
        </div>
      )}
      {/* 个人信息 */}
      {tab === 'profile' && (
        <div>
          <div className="text-[16px] font-semibold text-ink">个人信息</div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-pri text-white flex items-center justify-center text-[15px] font-semibold">V</span>
              <div>
                <div className="text-[14px] font-medium text-ink">{USER.name}</div>
                <div className="text-[12px] text-mut">{USER.email}</div>
              </div>
            </div>
            {[
              ['姓名', USER.name],
              ['邮箱', USER.email],
              ['当前套餐', USER.plan],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3 border-b border-line-soft text-[13px]">
                <span className="text-mut">{k}</span>
                <span className="text-ink">{v}</span>
                <button onClick={() => showToast('原型演示：编辑能力即将上线')} className="text-pri text-[12px] hover:underline">
                  修改
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 通知公告 */}
      {tab === 'notice' && (
        <div>
          <div className="text-[16px] font-semibold text-ink">通知公告</div>
          <div className="mt-4 space-y-2.5">
            {[
              ['积分变动记录上线', '账单记录新增「积分变动」页签，消耗明细一目了然。', '2026-08-07'],
              ['画衣衣 Image 2.0 发布', '生图模型升级，服装材质与光影表现大幅提升。', '2026-08-01'],
            ].map(([t, d, dt]) => (
              <div key={t} className="rounded-xl border border-line p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">{t}</span>
                  <span className="text-[11px] text-mut-2">{dt}</span>
                </div>
                <div className="text-[12px] text-mut mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
