import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot,
  User,
  Trash2,
  Plus,
  BookOpen
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
}

interface ChatPageProps {
  sourceId?: string
  sourceTitle?: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function ChatPage({ sourceId, sourceTitle, onNavigate }: ChatPageProps) {
  const { user } = useBlinkAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sourceContent, setSourceContent] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (user?.id) {
      fetchSessions()
      if (sourceId) {
        fetchSourceContent()
      }
    }
  }, [user?.id, sourceId])
  
  const fetchSessions = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.chatSessions.list({
        where: { userId: user.id, ...(sourceId && { sourceId }) },
        orderBy: { updatedAt: 'desc' },
        limit: 20
      })
      setSessions(data as ChatSession[])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }
  
  const fetchSourceContent = async () => {
    if (!sourceId) return
    try {
      const source = await blink.db.sources.get(sourceId)
      setSourceContent(source?.content || '')
    } catch (error) {
      console.error('Failed to fetch source:', error)
    }
  }
  
  const fetchMessages = async (sessionId: string) => {
    try {
      const data = await blink.db.chatMessages.list({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      })
      setMessages(data as ChatMessage[])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }
  
  const createNewSession = async () => {
    if (!user?.id || !sourceId) return
    
    const sessionId = `chat_${Date.now()}`
    try {
      await blink.db.chatSessions.create({
        id: sessionId,
        userId: user.id,
        sourceId,
        title: 'New Conversation'
      })
      
      const newSession: ChatSession = {
        id: sessionId,
        title: 'New Conversation',
        createdAt: new Date().toISOString()
      }
      
      setCurrentSession(newSession)
      setMessages([])
      fetchSessions()
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }
  
  const selectSession = (session: ChatSession) => {
    setCurrentSession(session)
    fetchMessages(session.id)
  }
  
  const deleteSession = async (sessionId: string) => {
    try {
      await blink.db.chatSessions.delete(sessionId)
      toast.success('Chat deleted')
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
      
      fetchSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
      toast.error('Failed to delete chat')
    }
  }
  
  const sendMessage = async () => {
    if (!input.trim() || !currentSession || !sourceContent) return
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      // Save user message
      await blink.db.chatMessages.create({
        id: userMessage.id,
        sessionId: currentSession.id,
        role: 'user',
        content: userMessage.content
      })
      
      // Get AI response
      const context = sourceContent.slice(0, 4000)
      const prompt = `You are a helpful study assistant. Answer the user's question based on the provided source material. 
If the answer is not in the source, say so honestly. Be clear, concise, and educational.

Source Material:
${context}

User Question: ${input}

Provide a helpful, accurate answer based on the source material.`

      const { text } = await blink.ai.generateText({
        model: 'google/gemini-3-flash',
        prompt,
        maxTokens: 500
      })
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: text,
        createdAt: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save assistant message
      await blink.db.chatMessages.create({
        id: assistantMessage.id,
        sessionId: currentSession.id,
        role: 'assistant',
        content: assistantMessage.content
      })
      
      // Update session title if first message
      if (messages.length === 0) {
        const title = input.slice(0, 30) + (input.length > 30 ? '...' : '')
        await blink.db.chatSessions.update(currentSession.id, { title })
        setCurrentSession({ ...currentSession, title })
        fetchSessions()
      }
    } catch (error) {
      console.error('Failed to get response:', error)
      toast.error('Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  if (!sourceId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <h1 className="text-3xl font-bold">Chat with Sources</h1>
          <p className="text-muted-foreground">Select a source to start chatting</p>
        </div>
        
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No source selected</h3>
          <p className="text-muted-foreground mb-4">Go to a source and click "Chat with Source"</p>
          <Button onClick={() => onNavigate('dashboard')}>
            <BookOpen className="w-4 h-4 mr-2" />View Sources
          </Button>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="mb-4 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <h1 className="text-2xl font-bold">Chat with {sourceTitle || 'Source'}</h1>
          <p className="text-muted-foreground text-sm">Ask questions about your study material</p>
        </div>
        
        <Button onClick={createNewSession} variant="outline">
          <Plus className="w-4 h-4 mr-2" />New Chat
        </Button>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-4 h-[calc(100vh-220px)]">
        {/* Sessions sidebar */}
        <div className="lg:col-span-1 border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Conversations</h3>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No conversations yet</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                      currentSession?.id === session.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => selectSession(session)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Chat area */}
        <div className="lg:col-span-3 flex flex-col border rounded-xl overflow-hidden">
          {!currentSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-muted-foreground mb-4">Select a chat or start a new one</p>
                <Button onClick={createNewSession}>
                  <Plus className="w-4 h-4 mr-2" />New Chat
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">Ask me anything about this source!</p>
                    </div>
                  )}
                  
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' ? 'bg-primary' : 'bg-muted'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-muted rounded-2xl p-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t bg-muted/30">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Ask a question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
