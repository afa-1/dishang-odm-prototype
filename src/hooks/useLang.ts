/**
 * 全局语言切换：简体中文 / English / 日本語 / 한국어。
 * useSyncExternalStore 实现免 Provider 的全局订阅，选择持久化到 localStorage（hyy-lang）。
 */
import { useSyncExternalStore } from 'react'

export type Lang = 'zh' | 'en' | 'ja' | 'ko'

export const LANGS: { key: Lang; name: string }[] = [
  { key: 'zh', name: '简体中文' },
  { key: 'en', name: 'English' },
  { key: 'ja', name: '日本語' },
  { key: 'ko', name: '한국어' },
]

const LS_KEY = 'hyy-lang'
let current: Lang = (() => {
  try {
    const v = localStorage.getItem(LS_KEY)
    return v === 'en' || v === 'ja' || v === 'ko' ? v : 'zh'
  } catch {
    return 'zh'
  }
})()

const listeners = new Set<() => void>()

export function setLang(l: Lang) {
  current = l
  try {
    localStorage.setItem(LS_KEY, l)
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}

export function getLang(): Lang {
  return current
}

/* ================= 词典（缺省回退简体中文） ================= */

const DICT: Record<Lang, Record<string, string>> = {
  zh: {
    'nav.projects': '项目',
    'nav.customers': '客户',
    'nav.circle': '服装圈',
    'nav.brand': '品牌库',
    'nav.assets': '资产',
    'nav.workbench': '设计工作台',
    'nav.pattern': 'AI 版师',
    'nav.inspo': '灵感',
    'nav.skills': '技能',
    'nav.orders': '订单',
    'nav.bench': '个人工作台',
    'acct.settings': '设置',
    'acct.dark': '深色模式',
    'acct.lang': '语言',
    'acct.help': '帮助',
    'acct.notice': '通知公告',
    'acct.contact': '联系我们',
    'acct.feedback': '问题反馈',
    'acct.logout': '登出账号',
    'acct.upgrade': '升级订阅套餐',
    'home.title': '画衣衣，帮你从创意到成衣',
    'home.subtitle': '服装设计、视觉营销、打版、生产都可以',
    'home.credits': '剩余额度',
    'home.upgrade': '升级套餐',
    'home.composer': '今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令',
    'inspo.title': '灵感盒',
    'inspo.search': '搜索创意关键词',
    'skills.title': '技能',
  },
  en: {
    'nav.projects': 'Projects',
    'nav.customers': 'Customers',
    'nav.circle': 'Fashion Circle',
    'nav.brand': 'Brands',
    'nav.assets': 'Assets',
    'nav.workbench': 'Design Studio',
    'nav.pattern': 'AI Master',
    'nav.inspo': 'Inspiration',
    'nav.skills': 'Skills',
    'nav.orders': 'Orders',
    'nav.bench': 'Workbench',
    'acct.settings': 'Settings',
    'acct.dark': 'Dark Mode',
    'acct.lang': 'Language',
    'acct.help': 'Help',
    'acct.notice': 'Announcements',
    'acct.contact': 'Contact Us',
    'acct.feedback': 'Feedback',
    'acct.logout': 'Sign Out',
    'acct.upgrade': 'Upgrade Plan',
    'home.title': 'Huayiyi, from idea to garment',
    'home.subtitle': 'Fashion design, visual marketing, pattern-making, production — all covered',
    'home.credits': 'Credits left',
    'home.upgrade': 'Upgrade',
    'home.composer': 'What can I do for you today? @ to reference files, / for skills & commands',
    'inspo.title': 'Inspo Box',
    'inspo.search': 'Search creative keywords',
    'skills.title': 'Skills',
  },
  ja: {
    'nav.projects': 'プロジェクト',
    'nav.customers': '顧客',
    'nav.circle': 'ファッションサークル',
    'nav.brand': 'ブランド',
    'nav.assets': 'アセット',
    'nav.workbench': 'デザインスタジオ',
    'nav.pattern': 'AI パタンナー',
    'nav.inspo': 'インスピレーション',
    'nav.skills': 'スキル',
    'nav.orders': '注文',
    'nav.bench': 'ワークベンチ',
    'acct.settings': '設定',
    'acct.dark': 'ダークモード',
    'acct.lang': '言語',
    'acct.help': 'ヘルプ',
    'acct.notice': 'お知らせ',
    'acct.contact': 'お問い合わせ',
    'acct.feedback': 'フィードバック',
    'acct.logout': 'ログアウト',
    'acct.upgrade': 'プランをアップグレード',
    'home.title': '画衣衣、アイデアから成衣までお手伝い',
    'home.subtitle': 'デザイン、ビジュアルマーケ、パターン、生産までOK',
    'home.credits': '残りクレジット',
    'home.upgrade': 'アップグレード',
    'home.composer': '今日は何をしましょうか？ @ で会話ファイルを引用、/ でスキルとコマンドを呼び出し',
    'inspo.title': 'インスピレーションボックス',
    'inspo.search': 'クリエイティブキーワードを検索',
    'skills.title': 'スキル',
  },
  ko: {
    'nav.projects': '프로젝트',
    'nav.customers': '고객',
    'nav.circle': '패션 서클',
    'nav.brand': '브랜드',
    'nav.assets': '에셋',
    'nav.workbench': '디자인 스튜디오',
    'nav.pattern': 'AI 패터너',
    'nav.inspo': '인스피레이션',
    'nav.skills': '스킬',
    'nav.orders': '주문',
    'nav.bench': '워크벤치',
    'acct.settings': '설정',
    'acct.dark': '다크 모드',
    'acct.lang': '언어',
    'acct.help': '도움말',
    'acct.notice': '공지사항',
    'acct.contact': '문의하기',
    'acct.feedback': '피드백',
    'acct.logout': '로그아웃',
    'acct.upgrade': '플랜 업그레이드',
    'home.title': '화이이, 아이디어부터 완제품까지 도와드려요',
    'home.subtitle': '의류 디자인, 비주얼 마케팅, 패턴, 생산까지 가능',
    'home.credits': '남은 크레딧',
    'home.upgrade': '업그레이드',
    'home.composer': '오늘 무엇을 도와드릴까요? @ 대화 파일 참조, / 스킬과 명령 호출',
    'inspo.title': '인스피레이션 박스',
    'inspo.search': '크리에이티브 키워드 검색',
    'skills.title': '스킬',
  },
}

export function useLang() {
  const lang = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    () => current,
  )
  return {
    lang,
    setLang,
    t: (k: string): string => DICT[lang][k] ?? DICT.zh[k] ?? k,
  }
}
