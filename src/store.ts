import { create } from 'zustand'
import type {
  AnalysisResult,
  BinaryProgress,
  BinaryStatus,
  DownloadJob,
  HistoryItem,
  ScheduledItem,
  Settings
} from './types'

export interface Toast {
  id: number
  kind: 'done' | 'error'
  title: string
  sub?: string
  filePath?: string
}

interface State {
  jobs: DownloadJob[]
  history: HistoryItem[]
  settings: Settings | null
  binaries: BinaryStatus | null
  binProgress: BinaryProgress | null
  installingBins: boolean
  scheduled: ScheduledItem[]
  analyses: AnalysisResult[]
  analyzing: boolean
  analyzeProgress: { done: number; total: number } | null
  settingsOpen: boolean
  schedulerOpen: boolean
  toasts: Toast[]

  setJobs: (j: DownloadJob[]) => void
  patchJob: (j: DownloadJob) => void
  setHistory: (h: HistoryItem[]) => void
  setSettings: (s: Settings) => void
  setBinaries: (b: BinaryStatus) => void
  setBinProgress: (p: BinaryProgress | null) => void
  setInstallingBins: (v: boolean) => void
  setScheduled: (s: ScheduledItem[]) => void
  setAnalyses: (a: AnalysisResult[]) => void
  setAnalyzing: (v: boolean) => void
  setAnalyzeProgress: (p: { done: number; total: number } | null) => void
  setSettingsOpen: (v: boolean) => void
  setSchedulerOpen: (v: boolean) => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

export const useStore = create<State>((set) => ({
  jobs: [],
  history: [],
  settings: null,
  binaries: null,
  binProgress: null,
  installingBins: false,
  scheduled: [],
  analyses: [],
  analyzing: false,
  analyzeProgress: null,
  settingsOpen: false,
  schedulerOpen: false,
  toasts: [],

  setJobs: (jobs) => set({ jobs }),
  patchJob: (job) =>
    set((s) => {
      const idx = s.jobs.findIndex((j) => j.id === job.id)
      if (idx < 0) return {}
      const jobs = s.jobs.slice()
      jobs[idx] = job
      return { jobs }
    }),
  setHistory: (history) => set({ history }),
  setSettings: (settings) => set({ settings }),
  setBinaries: (binaries) => set({ binaries }),
  setBinProgress: (binProgress) => set({ binProgress }),
  setInstallingBins: (installingBins) => set({ installingBins }),
  setScheduled: (scheduled) => set({ scheduled }),
  setAnalyses: (analyses) => set({ analyses }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  setAnalyzeProgress: (analyzeProgress) => set({ analyzeProgress }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSchedulerOpen: (schedulerOpen) => set({ schedulerOpen }),
  pushToast: (t) => set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id: Date.now() + Math.random() }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))
