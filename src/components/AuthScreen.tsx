import { useState } from 'react'
import { blink } from '../lib/blink'
import { BookOpen, Sparkles, Brain, FileText, Headphones, MessageSquare, ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export function AuthScreen() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleLogin = async () => {
    setIsLoading(true)
    try {
      blink.auth.login(window.location.href)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
    }
  }
  
  const features = [
    { icon: FileText, title: 'Upload Sources', desc: 'PDFs, YouTube, websites' },
    { icon: Brain, title: 'AI Notes', desc: 'Smart summaries & notes' },
    { icon: BookOpen, title: 'Flashcards', desc: 'Auto-generated for studying' },
    { icon: MessageSquare, title: 'Chat with Sources', desc: 'Ask questions, get answers' },
    { icon: Headphones, title: 'Audio Overview', desc: 'Podcast-style summaries' },
    { icon: Sparkles, title: 'Quizzes', desc: 'Test your knowledge' },
  ]
  
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">StudySync</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Your AI-Powered
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-amber-400 bg-clip-text text-transparent">
              Study Companion
            </span>
          </h1>
          
          <p className="text-lg text-slate-300 max-w-md mb-12">
            Combine the best of Study Fetch and Google Notebook LM — 
            all in one free, powerful study app.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{feature.title}</h3>
                  <p className="text-slate-400 text-xs">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        <div className="relative z-10 flex items-center gap-2 text-slate-400 text-sm">
          <Check className="w-4 h-4 text-green-400" />
          <span>Free forever • No credit card required</span>
        </div>
      </div>
      
      {/* Right Panel - Auth */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">StudySync</span>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to continue your studies</p>
          </div>
          
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-primary text-primary-foreground font-medium text-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          
          {/* Features preview for mobile */}
          <div className="lg:hidden mt-12">
            <p className="text-center text-sm font-medium mb-4">What you get:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {features.slice(0, 4).map((feature) => (
                <span key={feature.title} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                  <feature.icon className="w-3 h-3" />
                  {feature.title}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
