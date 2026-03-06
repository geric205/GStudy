import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  Loader2, 
  Download, 
  Copy, 
  Check,
  FileText,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface StudyGuide {
  id: string
  title: string
  content: string
  sourceId: string
  createdAt: string
}

interface StudyGuidePageProps {
  sourceId?: string
  sourceTitle?: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function StudyGuidePage({ sourceId, sourceTitle, onNavigate }: StudyGuidePageProps) {
  const { user } = useBlinkAuth()
  const [guides, setGuides] = useState<StudyGuide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedGuide, setGeneratedGuide] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    fetchGuides()
  }, [user?.id, sourceId])
  
  const fetchGuides = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.studyGuides.list({
        where: { userId: user.id, ...(sourceId && { sourceId }) },
        orderBy: { createdAt: 'desc' }
      })
      setGuides(data as StudyGuide[])
    } catch (error) {
      console.error('Failed to fetch guides:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateStudyGuide = async () => {
    if (!user?.id || !sourceId) {
      toast.error('Please select a source first')
      return
    }
    
    setIsGenerating(true)
    try {
      const source = await blink.db.sources.get(sourceId)
      
      const prompt = `Create a comprehensive study guide from this material. Include:

1. **Overview**: Brief summary of the main topics
2. **Key Concepts**: 5-7 important concepts to understand
3. **Important Terms**: Key vocabulary with definitions
4. **Study Tips**: How to best learn this material
5. **Practice Questions**: 3-5 questions to test understanding
6. **Summary**: Final overview

Material: ${source?.content?.slice(0, 4000)}

Format this as a well-structured study guide with clear headings and bullet points.`

      const { text } = await blink.ai.generateText({
        model: 'google/gemini-3-flash',
        prompt,
        maxTokens: 1500
      })
      
      setGeneratedGuide(text)
      
      // Save to database
      const guideId = `guide_${Date.now()}`
      await blink.db.studyGuides.create({
        id: guideId,
        userId: user.id,
        sourceId,
        title: sourceTitle ? `Study Guide: ${sourceTitle}` : 'Study Guide',
        content: text
      })
      
      toast.success('Study guide generated!')
      fetchGuides()
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate study guide')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }
  
  const downloadGuide = (content: string, title: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Downloaded!')
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-bold">Study Guides</h1>
          <p className="text-muted-foreground">Comprehensive study materials generated from your sources</p>
        </div>
        
        {sourceId && (
          <Button onClick={generateStudyGuide} disabled={isGenerating} className="bg-gradient-to-r from-primary to-indigo-600">
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Generate Study Guide'}
          </Button>
        )}
      </div>
      
      {generatedGuide && (
        <Card className="border-primary/20 shadow-lg shadow-primary/10">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {sourceTitle ? `Study Guide: ${sourceTitle}` : 'New Study Guide'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">AI-generated study guide</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedGuide)}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadGuide(generatedGuide, sourceTitle || 'study-guide')}>
                <Download className="w-4 h-4 mr-2" />Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose-ai max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm bg-transparent p-0">{generatedGuide}</pre>
            </div>
          </CardContent>
        </Card>
      )}
      
      {guides.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Saved Study Guides</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((guide, index) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {guide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(guide.createdAt).toLocaleDateString()}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setGeneratedGuide(guide.content)
                          }}
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadGuide(guide.content, guide.title)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {guides.length === 0 && !generatedGuide && (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No study guides yet</h3>
          <p className="text-muted-foreground mb-4">
            {sourceId ? 'Click "Generate Study Guide" to create comprehensive study materials' : 'Select a source to generate a study guide'}
          </p>
          {sourceId && (
            <Button onClick={generateStudyGuide} disabled={isGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Study Guide
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
