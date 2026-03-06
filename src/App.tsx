import { useEffect, useState } from 'react'
import { blink } from './lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

// Pages
import { Dashboard } from './pages/Dashboard'
import { SourceView } from './pages/SourceView'
import { FlashcardsPage } from './pages/FlashcardsPage'
import { QuizPage } from './pages/QuizPage'
import { ChatPage } from './pages/ChatPage'
import { StudyGuidePage } from './pages/StudyGuidePage'
import { AudioOverviewPage } from './pages/AudioOverviewPage'

// Components
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { AuthScreen } from './components/AuthScreen'
import { LoadingScreen } from './components/LoadingScreen'

// Types
export type PageType = 'dashboard' | 'source' | 'flashcards' | 'quiz' | 'chat' | 'study-guide' | 'audio'

export interface AppState {
  currentPage: PageType
  selectedSourceId: string | null
  selectedSourceTitle: string | null
}

function App() {
  const { isAuthenticated, isLoading } = useBlinkAuth()
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'dashboard',
    selectedSourceId: null,
    selectedSourceTitle: null,
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />
  }
  
  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <Toaster position="top-right" />
      </>
    )
  }
  
  // Navigate to a different page
  const navigate = (page: PageType, sourceId?: string, sourceTitle?: string) => {
    setAppState({
      currentPage: page,
      selectedSourceId: sourceId || null,
      selectedSourceTitle: sourceTitle || null,
    })
  }
  
  // Render current page
  const renderPage = () => {
    switch (appState.currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />
      case 'source':
        return (
          <SourceView 
            sourceId={appState.selectedSourceId!} 
            sourceTitle={appState.selectedSourceTitle!}
            onNavigate={navigate}
          />
        )
      case 'flashcards':
        return (
          <FlashcardsPage 
            sourceId={appState.selectedSourceId}
            sourceTitle={appState.selectedSourceTitle}
            onNavigate={navigate}
          />
        )
      case 'quiz':
        return (
          <QuizPage 
            sourceId={appState.selectedSourceId}
            sourceTitle={appState.selectedSourceTitle}
            onNavigate={navigate}
          />
        )
      case 'chat':
        return (
          <ChatPage 
            sourceId={appState.selectedSourceId}
            sourceTitle={appState.selectedSourceTitle}
            onNavigate={navigate}
          />
        )
      case 'study-guide':
        return (
          <StudyGuidePage 
            sourceId={appState.selectedSourceId}
            sourceTitle={appState.selectedSourceTitle}
            onNavigate={navigate}
          />
        )
      case 'audio':
        return (
          <AudioOverviewPage 
            sourceId={appState.selectedSourceId}
            sourceTitle={appState.selectedSourceTitle}
            onNavigate={navigate}
          />
        )
      default:
        return <Dashboard onNavigate={navigate} />
    }
  }
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={appState.currentPage} 
        onNavigate={(page) => navigate(page)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={appState.currentPage === 'dashboard' ? 'StudySync' : appState.selectedSourceTitle || 'StudySync'}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </main>
      </div>
      
      <Toaster position="top-right" />
    </div>
  )
}

export default App
