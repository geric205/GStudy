import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Brain, 
  Headphones, 
  MessageSquare, 
  ClipboardCheck, 
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Check
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface SourceViewProps {
  sourceId: string
  sourceTitle: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function SourceView({ sourceId, sourceTitle, onNavigate }: SourceViewProps) {
  const { user } = useBlinkAuth()
  const [source, setSource] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<{ summary?: string; keyPoints?: string[]; notes?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    fetchSource()
    fetchNotes()
  }, [sourceId])
  
  const fetchSource = async () => {
    try {
      const data = await blink.db.sources.get(sourceId)
      setSource(data)
    } catch (error) {
      console.error('Failed to fetch source:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchNotes = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.notes.list({
        where: { sourceId },
        orderBy: { createdAt: 'desc' }
      })
      setNotes(data)
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    }
  }
  
  const generateSummary = async () => {
    if (!source?.content) return
    
    setIsGenerating('summary')
    try {
      const prompt = `You are a study assistant. Analyze the following content and provide:
1. A brief summary (2-3 sentences)
2. Key points (5-7 bullet points)
3. Detailed notes

Content: ${source.content.slice(0, 5000)}

Respond in JSON format:
{
  "summary": "brief summary",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "notes": "detailed study notes"
}`

      const { object } = await blink.ai.generateObject({
        model: 'google/gemini-3-flash',
        prompt,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' }
          },
          required: ['summary', 'keyPoints', 'notes']
        }
      })
      
      setGeneratedContent(object)
      
      // Save note
      if (user?.id) {
        await blink.db.notes.create({
          id: `note_${Date.now()}`,
          userId: user.id,
          sourceId,
          title: `Summary: ${source.title}`,
          content: JSON.stringify(object),
          noteType: 'summary'
        })
        fetchNotes()
      }
      
      toast.success('Summary generated!')
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate summary')
    } finally {
      setIsGenerating(null)
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }
  
  const quickActions = [
    { icon: Brain, label: 'Generate Notes', page: 'source', color: 'from-blue-500 to-indigo-600' },
    { icon: Headphones, label: 'Audio Overview', page: 'audio', color: 'from-purple-500 to-pink-600' },
    { icon: MessageSquare, label: 'Ask Questions', page: 'chat', color: 'from-green-500 to-teal-600' },
    { icon: ClipboardCheck, label: 'Take Quiz', page: 'quiz', color: 'from-amber-500 to-orange-600' },
    { icon: BookOpen, label: 'Study Guide', page: 'study-guide', color: 'from-rose-500 to-red-600' },
  ]
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="capitalize">{source?.sourceType}</Badge>
            <Badge variant={source?.status === 'ready' ? 'default' : 'secondary'}>
              {source?.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{source?.title}</h1>
          <p className="text-muted-foreground mt-1">
            Created {new Date(source?.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <Button onClick={generateSummary} disabled={isGenerating !== null} className="bg-gradient-to-r from-primary to-indigo-600">
          {isGenerating === 'summary' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isGenerating === 'summary' ? 'Generating...' : 'Generate AI Summary'}
        </Button>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            onClick={() => onNavigate(action.page as PageType, sourceId, sourceTitle)}
            className="h-auto py-4 flex-col gap-2 hover:bg-gradient-to-r hover:shadow-md"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Source Content</TabsTrigger>
          <TabsTrigger value="summary">AI Summary</TabsTrigger>
          <TabsTrigger value="notes">Saved Notes ({notes.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Source Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose-ai max-w-none">
                {source?.content ? (
                  <p className="whitespace-pre-wrap">{source.content}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No content available. Click "Generate AI Summary" to analyze this source.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary">
          {generatedContent ? (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Summary</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.summary || '')}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed">{generatedContent.summary}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Key Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {generatedContent.keyPoints?.map((point, index) => (
                      <motion.li 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{point}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Study Notes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.notes || '')}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose-ai">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent.notes}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No summary yet</h3>
              <p className="text-muted-foreground mb-4">Click the button above to generate an AI summary</p>
              <Button onClick={generateSummary}>
                <Sparkles className="w-4 h-4 mr-2" />Generate Summary
              </Button>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="notes">
          {notes.length > 0 ? (
            <div className="grid gap-4">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No saved notes</h3>
              <p className="text-muted-foreground">Generate a summary to save notes</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
