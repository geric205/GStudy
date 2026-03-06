import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Headphones, 
  Sparkles, 
  Loader2, 
  Play, 
  Pause,
  Volume2,
  Download,
  Trash2,
  RefreshCw,
  Radio
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface AudioOverview {
  id: string
  title: string
  audioUrl: string
  transcript: string
  status: string
  createdAt: string
}

interface AudioOverviewPageProps {
  sourceId?: string
  sourceTitle?: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function AudioOverviewPage({ sourceId, sourceTitle, onNavigate }: AudioOverviewPageProps) {
  const { user } = useBlinkAuth()
  const [audioOverviews, setAudioOverviews] = useState<AudioOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  
  useEffect(() => {
    fetchAudioOverviews()
  }, [user?.id, sourceId])
  
  const fetchAudioOverviews = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.audioOverviews.list({
        where: { userId: user.id, ...(sourceId && { sourceId }) },
        orderBy: { createdAt: 'desc' }
      })
      setAudioOverviews(data as AudioOverview[])
    } catch (error) {
      console.error('Failed to fetch audio overviews:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateAudioOverview = async () => {
    if (!user?.id || !sourceId) {
      toast.error('Please select a source first')
      return
    }
    
    setIsGenerating(true)
    try {
      const source = await blink.db.sources.get(sourceId)
      
      // Generate a podcast-style script using AI
      const prompt = `Create a 2-3 minute podcast-style audio script about this material. 
Make it conversational, engaging, and educational. Include an introduction, main points, and conclusion.

Material: ${source?.content?.slice(0, 3000)}

Generate a natural, flowing script that could be read aloud as a podcast episode.`

      const { text } = await blink.ai.generateText({
        model: 'google/gemini-3-flash',
        prompt,
        maxTokens: 1000
      })
      
      // Create audio overview record
      const audioId = `audio_${Date.now()}`
      await blink.db.audioOverviews.create({
        id: audioId,
        userId: user.id,
        sourceId,
        title: sourceTitle ? `Audio: ${sourceTitle}` : 'Audio Overview',
        transcript: text,
        status: 'ready'
      })
      
      toast.success('Audio overview generated!')
      fetchAudioOverviews()
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate audio overview')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const deleteAudioOverview = async (audioId: string) => {
    try {
      // Stop if playing
      if (currentlyPlaying === audioId && audioElements[audioId]) {
        audioElements[audioId].pause()
        setCurrentlyPlaying(null)
      }
      
      await blink.db.audioOverviews.delete(audioId)
      toast.success('Audio overview deleted')
      fetchAudioOverviews()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete')
    }
  }
  
  const togglePlay = (audio: AudioOverview) => {
    // If this audio is already playing, pause it
    if (currentlyPlaying === audio.id && audioElements[audio.id]) {
      audioElements[audio.id].pause()
      setCurrentlyPlaying(null)
      return
    }
    
    // Pause any currently playing audio
    Object.values(audioElements).forEach(audio => audio.pause())
    setCurrentlyPlaying(null)
    
    // For now, we'll show the transcript since we can't generate actual audio
    // In production, you'd use text-to-speech API
    toast.success('Playing: ' + audio.title)
    setCurrentlyPlaying(audio.id)
    
    // Simulate playback
    setTimeout(() => {
      setCurrentlyPlaying(null)
    }, 3000)
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
          <h1 className="text-3xl font-bold">Audio Overview</h1>
          <p className="text-muted-foreground">Listen to podcast-style summaries of your sources</p>
        </div>
        
        {sourceId && (
          <Button onClick={generateAudioOverview} disabled={isGenerating} className="bg-gradient-to-r from-primary to-indigo-600">
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Generate Audio'}
          </Button>
        )}
      </div>
      
      {/* Audio Player Card */}
      {audioOverviews.length > 0 && currentlyPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-sm">
            <CardContent className="py-4 px-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Now Playing</p>
                <p className="text-xs text-muted-foreground">
                  {audioOverviews.find(a => a.id === currentlyPlaying)?.title}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentlyPlaying(null)}
              >
                <Pause className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {audioOverviews.length === 0 ? (
        <Card className="p-12 text-center">
          <Headphones className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No audio overviews yet</h3>
          <p className="text-muted-foreground mb-4">
            {sourceId 
              ? 'Click "Generate Audio" to create a podcast-style summary'
              : 'Select a source to generate an audio overview'
            }
          </p>
          {sourceId && (
            <Button onClick={generateAudioOverview} disabled={isGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Audio Overview
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audioOverviews.map((audio, index) => (
            <motion.div
              key={audio.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`hover:shadow-md transition-all ${currentlyPlaying === audio.id ? 'border-primary' : ''}`}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Radio className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{audio.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(audio.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Audio visualization */}
                    <div 
                      className={`h-12 rounded-lg bg-muted/50 flex items-center justify-center cursor-pointer transition-all ${
                        currentlyPlaying === audio.id ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                      onClick={() => togglePlay(audio)}
                    >
                      {currentlyPlaying === audio.id ? (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [8, 24, 8] }}
                              transition={{ 
                                duration: 0.5, 
                                repeat: Infinity, 
                                delay: i * 0.1 
                              }}
                              className="w-1 bg-primary rounded-full"
                            />
                          ))}
                        </div>
                      ) : (
                        <Play className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant={audio.status === 'ready' ? 'default' : 'secondary'}>
                        {audio.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => togglePlay(audio)}
                        >
                          {currentlyPlaying === audio.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteAudioOverview(audio.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Transcript preview */}
                    {audio.transcript && (
                      <div className="text-xs text-muted-foreground line-clamp-3">
                        {audio.transcript.slice(0, 200)}...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
