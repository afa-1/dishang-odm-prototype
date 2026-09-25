// 原型用矢量服装插画素材
import { useId } from 'react'

export type CoatVariant = 'trench' | 'puffer' | 'quilted' | 'wool' | 'hooded' | 'fur'

export interface CoatSpec {
  variant: CoatVariant
  fill: string
  stroke: string
  long?: boolean
}

/** 服装平铺小图（左侧素材网格用） */
export function CoatThumb({ spec, className }: { spec: CoatSpec; className?: string }) {
  const { variant, fill: f, stroke: s, long = true } = spec
  const clipId = useId()
  const hem = long ? 216 : 158
  const body = `M64,48 C80,38 120,38 136,48 C144,56 147,84 146,110 L143,${hem} Q100,${hem + 9} 57,${hem} L54,110 C53,84 56,56 64,48 Z`
  const sleeveL = `M63,54 C45,62 35,100 33,146 L33,${long ? 188 : 132} Q33,${long ? 197 : 141} 42,${long ? 197 : 141} L52,${long ? 197 : 141} C54,148 58,100 65,72 Z`
  const sleeveR = `M137,54 C155,62 165,100 167,146 L167,${long ? 188 : 132} Q167,${long ? 197 : 141} 158,${long ? 197 : 141} L148,${long ? 197 : 141} C146,148 142,100 135,72 Z`
  const quiltY = [78, 100, 122, 144, 166, 188, 210].filter((y) => y < hem - 6)

  return (
    <svg viewBox="0 0 200 240" className={className}>
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* 袖子 */}
      <path d={sleeveL} fill={f} stroke={s} strokeWidth="2" strokeLinejoin="round" />
      <path d={sleeveR} fill={f} stroke={s} strokeWidth="2" strokeLinejoin="round" />
      {/* 衣身 */}
      <path d={body} fill={f} stroke={s} strokeWidth="2.2" strokeLinejoin="round" />

      {variant === 'puffer' && (
        <g clipPath={`url(#${clipId})`}>
          {quiltY.map((y) => (
            <path key={y} d={`M40,${y} Q100,${y + 8} 160,${y}`} fill="none" stroke={s} strokeWidth="1.8" opacity=".8" />
          ))}
        </g>
      )}
      {variant === 'puffer' && (
        <>
          <path d={`M40,110 Q48,104 56,110 M160,110 Q152,104 144,110`} fill="none" stroke={s} strokeWidth="1.6" opacity=".7" />
          <rect x="80" y="30" width="40" height="20" rx="9" fill={f} stroke={s} strokeWidth="2" />
          <line x1="100" y1="50" x2="100" y2={hem} stroke={s} strokeWidth="1.6" />
        </>
      )}

      {variant === 'quilted' && (
        <g clipPath={`url(#${clipId})`} opacity=".75">
          {[-160, -120, -80, -40, 0, 40, 80, 120, 160, 200, 240].map((o) => (
            <g key={o}>
              <line x1={o} y1="20" x2={o + 120} y2="240" stroke={s} strokeWidth="1.3" />
              <line x1={o} y1="240" x2={o + 120} y2="20" stroke={s} strokeWidth="1.3" />
            </g>
          ))}
        </g>
      )}
      {variant === 'quilted' && (
        <>
          <path d={`M56,${long ? 150 : 116} Q100,${long ? 158 : 124} 144,${long ? 150 : 116}`} fill="none" stroke={s} strokeWidth="2.4" />
          <path d={`M100,${long ? 154 : 120} l-7,16 M100,${long ? 154 : 120} l9,14`} stroke={s} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M84,42 Q100,52 116,42 L112,58 Q100,50 88,58 Z" fill={f} stroke={s} strokeWidth="1.8" />
        </>
      )}

      {variant === 'trench' && (
        <>
          <path d="M82,44 L100,86 L86,96 L70,50 Z" fill={f} stroke={s} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M118,44 L100,86 L114,96 L130,50 Z" fill={f} stroke={s} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M100,86 L100,120" stroke={s} strokeWidth="1.6" />
          <path d={`M57,${long ? 148 : 112} Q100,${long ? 156 : 120} 143,${long ? 148 : 112} L143,${long ? 163 : 126} Q100,${long ? 171 : 134} 57,${long ? 163 : 126} Z`} fill={f} stroke={s} strokeWidth="1.8" />
          <rect x="88" y={long ? 147 : 111} width="24" height="17" rx="4" fill="none" stroke={s} strokeWidth="2" />
          <path d={`M100,${long ? 164 : 128} l-5,20 M101,${long ? 164 : 128} l7,18`} stroke={s} strokeWidth="3.4" strokeLinecap="round" />
        </>
      )}

      {variant === 'wool' && (
        <>
          <path d="M82,44 L100,80 L88,88 L72,50 Z" fill={f} stroke={s} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M118,44 L100,80 L112,88 L128,50 Z" fill={f} stroke={s} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="100" y1="82" x2="100" y2={hem} stroke={s} strokeWidth="1.6" />
          {[104, 128, 152].map((y) => (
            <g key={y}>
              <circle cx="106" cy={y} r="3" fill={s} />
              <circle cx="94" cy={y} r="3" fill={s} opacity=".55" />
            </g>
          ))}
          <path d="M64,150 l20,7 M136,150 l-20,7" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </>
      )}

      {variant === 'hooded' && (
        <>
          <path d="M74,46 Q100,18 126,46 Q100,60 74,46 Z" fill={f} stroke={s} strokeWidth="2" />
          <line x1="100" y1="56" x2="100" y2={hem} stroke={s} strokeWidth="2.2" />
          <path d={`M70,${long ? 140 : 108} l18,10 M130,${long ? 140 : 108} l-18,10`} stroke={s} strokeWidth="2" strokeLinecap="round" />
          <path d={`M57,${hem - 22} Q100,${hem - 14} 143,${hem - 22}`} fill="none" stroke={s} strokeWidth="1.6" opacity=".7" />
        </>
      )}

      {variant === 'fur' && (
        <>
          <path d="M74,50 Q100,30 126,50 Q120,76 100,80 Q80,76 74,50 Z" fill={s} opacity=".92" />
          <line x1="100" y1="80" x2="100" y2={hem} stroke={s} strokeWidth="7" opacity=".92" />
          {[108, 134, 160].map((y) => (
            <circle key={y} cx="100" cy={y} r="2.6" fill={f} />
          ))}
          <path d={`M57,${hem - 4} Q100,${hem + 5} 143,${hem - 4} L143,${hem} Q100,${hem + 9} 57,${hem} Z`} fill={s} opacity=".92" />
          <path d={`M33,${long ? 185 : 129} h19 M148,${long ? 185 : 129} h19`} stroke={s} strokeWidth="9" opacity=".92" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/** 时装模特插画（画布灵感卡片用） */
export function ModelFigure({
  jacket = '#f5f3ee',
  inner = '#7a2430',
  skirt = '#c8a75f',
  pants = false,
  className,
}: {
  jacket?: string
  inner?: string
  skirt?: string
  pants?: boolean
  className?: string
}) {
  return (
    <svg viewBox="0 0 300 420" className={className}>
      {/* 头发 */}
      <path d="M128,26 Q150,4 172,26 Q184,44 178,84 L166,80 Q172,50 164,40 Q150,28 136,40 Q128,50 134,80 L122,84 Q116,44 128,26 Z" fill="#6b4a35" />
      {/* 头 */}
      <ellipse cx="150" cy="52" rx="21" ry="25" fill="#f2d5c0" />
      <path d="M132,38 Q150,22 168,38 Q166,28 150,24 Q134,28 132,38 Z" fill="#6b4a35" />
      {/* 颈 */}
      <rect x="142" y="74" width="16" height="16" fill="#f2d5c0" />
      {/* 内搭 */}
      <path d="M128,92 Q150,84 172,92 L176,150 Q150,158 124,150 Z" fill={inner} />
      {/* 外套（开衫） */}
      <path d="M124,90 C100,96 90,130 88,180 L88,238 Q88,246 96,246 L112,246 C114,200 118,150 128,112 L136,118 L128,200 L140,204 L146,124 L146,240 Q150,243 154,240 L154,124 L160,204 L172,200 L164,118 L172,112 C182,150 186,200 188,246 L204,246 Q212,246 212,238 L212,180 C210,130 200,96 176,90 Q150,82 124,90 Z" fill={jacket} stroke="#d8d4cc" strokeWidth="2" strokeLinejoin="round" />
      {/* 袖 */}
      <path d="M118,100 C98,110 90,146 89,196 L89,236 Q89,244 97,244 L108,244 C110,190 114,146 124,116 Z" fill={jacket} stroke="#d8d4cc" strokeWidth="2" />
      <path d="M182,100 C202,110 210,146 211,196 L211,236 Q211,244 203,244 L192,244 C190,190 186,146 176,116 Z" fill={jacket} stroke="#d8d4cc" strokeWidth="2" />
      {/* 手 */}
      <circle cx="98" cy="250" r="7" fill="#f2d5c0" />
      <circle cx="202" cy="250" r="7" fill="#f2d5c0" />
      {pants ? (
        <>
          {/* 阔腿裤 */}
          <path d="M118,246 Q150,254 182,246 L188,388 Q172,394 158,390 L150,300 L142,390 Q128,394 112,388 Z" fill={skirt} stroke="#b3924f" strokeWidth="2" strokeLinejoin="round" />
          <path d="M126,270 Q150,277 174,270" fill="none" stroke="#b3924f" strokeWidth="1.4" opacity=".7" />
        </>
      ) : (
        <>
          {/* 蕾丝长裙 */}
          <path d="M116,246 Q150,254 184,246 L196,392 Q150,404 104,392 Z" fill={skirt} stroke="#b3924f" strokeWidth="2" strokeLinejoin="round" />
          {[286, 318, 350].map((y) => (
            <path key={y} d={`M112,${y} Q150,${y + 9} 188,${y}`} fill="none" stroke="#b3924f" strokeWidth="1.3" opacity=".65" />
          ))}
          {[120, 140, 160, 180].map((x) => (
            <line key={x} x1={x} y1="258" x2={x - 4} y2="390" stroke="#b3924f" strokeWidth="1" opacity=".4" />
          ))}
        </>
      )}
      {/* 靴 */}
      <path d="M118,392 h30 v14 q-15,6 -32,0 Z" fill="#3a3230" />
      <path d="M152,392 h30 v14 q-15,6 -32,0 Z" fill="#3a3230" transform="translate(2,0)" />
      {/* 小包 */}
      <rect x="196" y="258" width="34" height="26" rx="6" fill="#efe9df" stroke="#c9c2b4" strokeWidth="1.8" />
      <path d="M202,258 Q213,244 224,258" fill="none" stroke="#c9c2b4" strokeWidth="1.8" />
    </svg>
  )
}

/** 平铺大衣大图（款式平铺卡片用）：米白皮毛一体 */
export function FlatCoatLarge({ className }: { className?: string }) {
  const f = '#f3efe6'
  const s = '#7a5a43'
  const hem = 300
  const body = `M86,64 C108,50 152,50 174,64 C185,74 188,110 187,142 L183,${hem} Q130,${hem + 12} 77,${hem} L73,142 C72,110 75,74 86,64 Z`
  return (
    <svg viewBox="0 0 260 340" className={className}>
      <path d="M85,72 C60,82 46,132 44,192 L44,250 Q44,262 56,262 L70,262 C73,196 78,132 88,96 Z" fill={f} stroke="#d8d2c4" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M175,72 C200,82 214,132 216,192 L216,250 Q216,262 204,262 L190,262 C187,196 182,132 172,96 Z" fill={f} stroke="#d8d2c4" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={body} fill={f} stroke="#d8d2c4" strokeWidth="2.6" strokeLinejoin="round" />
      {/* 毛领 */}
      <path d="M98,66 Q130,38 162,66 Q154,102 130,106 Q106,102 98,66 Z" fill={s} />
      <path d="M104,66 Q130,48 156,66" fill="none" stroke="#68492f" strokeWidth="2" opacity=".6" />
      {/* 门襟毛边 */}
      <line x1="130" y1="106" x2="130" y2={hem} stroke={s} strokeWidth="10" />
      {[130, 166, 202, 238].map((y) => (
        <circle key={y} cx="130" cy={y} r="3.4" fill={f} stroke="#68492f" strokeWidth="1.4" />
      ))}
      {/* 下摆毛边 */}
      <path d={`M77,${hem - 5} Q130,${hem + 7} 183,${hem - 5} L183,${hem} Q130,${hem + 12} 77,${hem} Z`} fill={s} />
      {/* 袖口毛边 */}
      <path d="M44,246 h26 M190,246 h26" stroke={s} strokeWidth="14" strokeLinecap="round" />
    </svg>
  )
}

/** 工作场景小插画（第四张卡片用） */
export function StudioScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className}>
      <rect width="320" height="220" fill="#eceae6" />
      {/* 背景板上的草图 */}
      <rect x="36" y="18" width="60" height="80" rx="3" fill="#fff" stroke="#d5d1c9" />
      <path d="M52,34 q14,-8 26,0 l-4,20 q-9,5 -18,0 Z M56,58 l-4,26 M72,58 l4,26" fill="none" stroke="#9b968c" strokeWidth="1.6" />
      <rect x="110" y="10" width="52" height="66" rx="3" fill="#fff" stroke="#d5d1c9" />
      <path d="M122,26 h28 M122,36 h28 M122,46 h18" stroke="#c7c2b8" strokeWidth="2" />
      <rect x="176" y="24" width="46" height="60" rx="3" fill="#fff" stroke="#d5d1c9" />
      <circle cx="199" cy="46" r="12" fill="none" stroke="#b7b1a5" strokeWidth="1.6" />
      <path d="M191,70 q8,-10 16,0" fill="none" stroke="#b7b1a5" strokeWidth="1.6" />
      {/* 桌子 */}
      <rect x="0" y="150" width="320" height="70" fill="#e0dcd4" />
      {/* 人物（伏案） */}
      <path d="M190,96 q26,-4 34,20 l6,34 h-58 l4,-30 q4,-20 14,-24 Z" fill="#8a6f52" />
      <circle cx="196" cy="84" r="16" fill="#f2d5c0" />
      <path d="M180,80 q4,-20 22,-16 q14,4 10,20 q-2,-10 -12,-12 q-12,-2 -20,8 Z" fill="#3a3230" />
      <path d="M232,124 q20,4 24,26 h-30 Z" fill="#6e563d" />
      {/* 电脑 */}
      <rect x="258" y="118" width="46" height="32" rx="3" fill="#4a4a4f" />
      <rect x="262" y="122" width="38" height="24" fill="#7e8fa8" />
    </svg>
  )
}

/* ================= 面料纹理（CSS 图案，面板色卡与画布卡片共用） ================= */
import type { CSSProperties } from 'react'

export const FABRIC_TEXTURES: Record<string, CSSProperties> = {
  plain: {},
  twill: { backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 7px)' },
  herringbone: {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)',
  },
  cord: { backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0 3px, transparent 3px 8px)' },
  waffle: {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 8px), repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 8px)',
  },
  rib: { backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 6px)' },
  tweed: {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 5px)',
  },
  shearling: {
    backgroundImage:
      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0 3px, transparent 4px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.05) 0 3px, transparent 4px)',
    backgroundSize: '18px 18px',
  },
  denim: { backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 6px)' },
}

/* ================= 辅料矢量插画 ================= */
export type TrimType = 'button' | 'snap' | 'toggle' | 'zipper' | 'cordlock' | 'strap' | 'velcro' | 'patch'

export function TrimThumb({ type, fill, className }: { type: TrimType; fill: string; className?: string }) {
  const dark = 'rgba(0,0,0,0.32)'
  const light = 'rgba(255,255,255,0.55)'
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {type === 'button' && (
        <>
          <circle cx="50" cy="50" r="28" fill={fill} stroke={dark} strokeWidth="2" />
          <circle cx="50" cy="50" r="21" fill="none" stroke={light} strokeWidth="1.5" />
          <circle cx="42" cy="43" r="3.2" fill={dark} />
          <circle cx="58" cy="43" r="3.2" fill={dark} />
          <circle cx="42" cy="57" r="3.2" fill={dark} />
          <circle cx="58" cy="57" r="3.2" fill={dark} />
        </>
      )}
      {type === 'snap' && (
        <>
          <circle cx="50" cy="50" r="28" fill={fill} stroke={dark} strokeWidth="2" />
          <circle cx="50" cy="50" r="17" fill="none" stroke={dark} strokeWidth="2.5" />
          <circle cx="50" cy="50" r="7" fill={light} stroke={dark} strokeWidth="1.5" />
        </>
      )}
      {type === 'toggle' && (
        <>
          <rect x="14" y="41" width="72" height="18" rx="9" fill="none" stroke={dark} strokeWidth="2.5" />
          <path d="M30,50 q12,-22 26,-4 q-4,10 -13,10 q-10,0 -13,-6 Z" fill={fill} stroke={dark} strokeWidth="2" />
          <path d="M70,50 q-12,22 -26,4 q4,-10 13,-10 q10,0 13,6 Z" fill={fill} stroke={dark} strokeWidth="2" />
        </>
      )}
      {type === 'zipper' && (
        <>
          <rect x="30" y="10" width="14" height="80" fill={fill} stroke={dark} strokeWidth="1.5" />
          <rect x="56" y="10" width="14" height="80" fill={fill} stroke={dark} strokeWidth="1.5" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="45" y={14 + i * 9} width="10" height="5" rx="1.5" fill={dark} />
          ))}
          <rect x="42" y="52" width="16" height="20" rx="3" fill={fill} stroke={dark} strokeWidth="2.5" />
          <rect x="47" y="72" width="6" height="12" rx="2" fill={dark} />
        </>
      )}
      {type === 'cordlock' && (
        <>
          <path d="M38,14 q0,-8 12,-8 q12,0 12,8" fill="none" stroke={dark} strokeWidth="3" />
          <rect x="32" y="14" width="36" height="52" rx="10" fill={fill} stroke={dark} strokeWidth="2" />
          <circle cx="50" cy="40" r="9" fill={dark} />
          <path d="M40,66 v18 M60,66 v18" stroke={dark} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {type === 'strap' && (
        <>
          <rect x="6" y="36" width="88" height="28" rx="4" fill={fill} stroke={dark} strokeWidth="2" />
          <path d="M10,44 h80 M10,56 h80" stroke={light} strokeWidth="1.5" strokeDasharray="5 4" />
          <rect x="40" y="30" width="20" height="40" rx="3" fill="none" stroke={dark} strokeWidth="3" />
        </>
      )}
      {type === 'velcro' && (
        <>
          <rect x="14" y="22" width="72" height="56" rx="8" fill={fill} stroke={dark} strokeWidth="2" />
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={26 + (i % 4) * 16} cy={34 + Math.floor(i / 4) * 16} r="2.4" fill={light} />
          ))}
        </>
      )}
      {type === 'patch' && (
        <>
          <rect x="16" y="16" width="68" height="68" rx="14" fill={fill} stroke={dark} strokeWidth="2" />
          <rect x="23" y="23" width="54" height="54" rx="10" fill="none" stroke={light} strokeWidth="2" strokeDasharray="5 4" />
          <path d="M50,34 l4.7,9.5 10.5,1.5 -7.6,7.4 1.8,10.4 -9.4,-4.9 -9.4,4.9 1.8,-10.4 -7.6,-7.4 10.5,-1.5 Z" fill={light} stroke={dark} strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}
