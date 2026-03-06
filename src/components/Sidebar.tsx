import { 
  BookOpen, 
  FileText, 
  Brain, 
  MessageSquare, 
  Headphones,
  ClipboardCheck,
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import type { PageType } from '../App'

interface SidebarProps {
  currentPage: PageType
  onNavigate: (page: PageType) => void
  isOpen: boolean
  onToggle: () => void
}

const navItems = [
  { id: 'dashboard' as PageType, label: 'Dashboard', icon: Home },
  { id: 'source' as PageType, label: 'Sources', icon: FileText },
  { id: 'flashcards' as PageType, label: 'Flashcards', icon: Brain },
  { id: 'quiz' as PageType, label: 'Quizzes', icon: ClipboardCheck },
  { id: 'chat' as PageType, label: 'Chat', icon: MessageSquare },
  { id: 'study-guide' as PageType, label: 'Study Guides', icon: BookOpen },
  { id: 'audio' as PageType, label: 'Audio', icon: Headphones },
]

export function Sidebar({ currentPage, onNavigate, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 260 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          "fixed lg:relative z-50 h-screen flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-200"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-sidebar-foreground">StudySync</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!isOpen && (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-sidebar-accent items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        
        {/* AI Feature Button */}
        <div className="p-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl",
              "bg-gradient-to-r from-primary to-indigo-600",
              "text-white font-medium",
              "hover:shadow-lg hover:shadow-primary/25 transition-all",
              "justify-center lg:justify-start"
            )}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  New Source
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  "transition-all duration-150",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-sidebar-primary-foreground")} />
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </nav>
        
        {/* Bottom section */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              "transition-all duration-150",
              "justify-center lg:justify-start"
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden text-sm font-medium"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  )
}
