"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrainCircuit, Loader2, Mic, FileText, Bot, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { analyzeInterviewResponse } from '@/ai/flows/analyze-interview-response';
import { assessToneAndConfidence } from '@/ai/flows/assess-tone-and-confidence';
import { generatePerformanceReport } from '@/ai/flows/generate-performance-report';
import { PerformanceReportDialog } from './performance-report-dialog';

type InterviewState = 'idle' | 'configuring' | 'generating_questions' | 'in_progress' | 'listening' | 'analyzing' | 'finished';
type TranscriptItem = { speaker: 'ai' | 'user'; content: string };
type Analysis = {
  feedback: string;
  score: number;
  areasForImprovement: string;
  toneAnalysis: string;
  confidenceScore: number;
  toneFeedback: string;
};

export function InterviewContainer() {
  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [jobDescription, setJobDescription] = useState('Software Engineer');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [finalReport, setFinalReport] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(false);

  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setCurrentResponse(finalTranscript + interimTranscript);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    const checkMic = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsMicAvailable(true);
          initSpeechRecognition();
        } catch (error) {
          console.error('Microphone access denied.', error);
          setIsMicAvailable(false);
          toast({
            variant: "destructive",
            title: "Microphone Access Denied",
            description: "Voice features disabled. You can still use the app via text input.",
          });
        }
      }
    };
    checkMic();
  }, [initSpeechRecognition, toast]);

  const handleStartInterview = async () => {
    setInterviewState('generating_questions');
    try {
      const { questions: generatedQuestions } = await generateInterviewQuestions({ jobDescription, numberOfQuestions: 5 });
      setQuestions(generatedQuestions);
      setTranscript([{ speaker: 'ai', content: generatedQuestions[0] }]);
      setInterviewState('in_progress');
      speak(generatedQuestions[0]);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error generating questions',
        description: 'Could not start the interview. Please try again.',
      });
      setInterviewState('configuring');
    }
  };

  const startRecording = async () => {
    if (isMicAvailable && recognitionRef.current) {
      setCurrentResponse('');
      setAnalysis(null);
      setIsListening(true);
      recognitionRef.current.start();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
    } else {
       setCurrentResponse('');
       setAnalysis(null);
       setIsListening(true);
    }
  };

  const stopRecordingAndAnalyze = async () => {
    setIsListening(false);
    setInterviewState('analyzing');

    if (isMicAvailable && recognitionRef.current) {
        recognitionRef.current.stop();
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    await analyze(currentResponse, base64Audio);
                };
            };
        }
    } else {
        if (!currentResponse.trim()) {
            toast({ variant: 'destructive', title: 'Empty response', description: 'Please type your answer before submitting.' });
            setInterviewState('in_progress');
            return;
        }
        await analyze(currentResponse);
    }
  };

  const analyze = async (answer: string, audioDataUri?: string) => {
    try {
        const question = questions[currentQuestionIndex];
        const [responseAnalysis, toneAnalysis] = await Promise.all([
            analyzeInterviewResponse({ question, answer }),
            audioDataUri ? assessToneAndConfidence({ audioDataUri, transcript: answer }) : Promise.resolve(null),
        ]);

        setAnalysis({
            feedback: responseAnalysis.feedback,
            score: responseAnalysis.score,
            areasForImprovement: responseAnalysis.areasForImprovement,
            toneAnalysis: toneAnalysis?.toneAnalysis ?? 'N/A',
            confidenceScore: toneAnalysis?.confidenceScore ?? 0,
            toneFeedback: toneAnalysis?.feedback ?? 'Tone analysis requires microphone access.',
        });
        setTranscript(prev => [...prev, { speaker: 'user', content: answer }]);
    } catch (error) {
        console.error('Analysis error:', error);
        toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'Could not analyze the response. Please proceed to the next question.',
        });
    } finally {
        setInterviewState('in_progress');
    }
  };


  const handleNextQuestion = () => {
    setAnalysis(null);
    setCurrentResponse('');
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      const nextQuestion = questions[nextIndex];
      setTranscript(prev => [...prev, { speaker: 'ai', content: nextQuestion }]);
      speak(nextQuestion);
    } else {
      setInterviewState('finished');
    }
  };
  
  const generateFinalReport = async () => {
    setInterviewState('analyzing');
    try {
        const interviewTranscript = transcript.map(t => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.content}`).join('\n\n');
        const { summaryReport } = await generatePerformanceReport({ interviewTranscript });
        setFinalReport(summaryReport);
        setIsReportOpen(true);
    } catch (error) {
        console.error('Report generation error:', error);
        toast({
            variant: 'destructive',
            title: 'Report Generation Failed',
            description: 'Could not generate the final report. Please try again.',
        });
    } finally {
        setInterviewState('finished');
    }
  };

  const renderCurrentState = () => {
    switch (interviewState) {
      case 'idle':
      case 'configuring':
        return (
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BrainCircuit /> Start Your Mock Interview</CardTitle>
              <CardDescription>Enter a job title or description to tailor the questions to your needs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="job-description">Job Title / Description</Label>
                <Input
                  id="job-description"
                  placeholder="e.g., Senior Product Manager"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={interviewState === 'generating_questions'}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartInterview} disabled={!jobDescription.trim() || interviewState === 'generating_questions'} className="w-full">
                {interviewState === 'generating_questions' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Start Interview
              </Button>
            </CardFooter>
          </Card>
        );

      case 'generating_questions':
         return (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Generating interview questions...</p>
            </div>
          );

      case 'in_progress':
      case 'listening':
      case 'analyzing':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                <p>{questions[currentQuestionIndex]}</p>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Your Answer</CardTitle>
                </CardHeader>
                <CardContent>
                    {isMicAvailable ? (
                        <div className="space-y-4">
                            <div className="w-full p-4 border rounded-md min-h-[100px] bg-muted/50">
                                {isListening && <p className="text-primary animate-pulse">Listening...</p>}
                                <p>{currentResponse}</p>
                            </div>
                            <Button onClick={isListening ? stopRecordingAndAnalyze : startRecording} disabled={interviewState === 'analyzing'} className="w-full">
                                {interviewState === 'analyzing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                                {isListening ? 'Stop & Analyze' : 'Record Answer'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Textarea 
                                placeholder="Type your answer here..."
                                value={currentResponse}
                                onChange={(e) => setCurrentResponse(e.target.value)}
                                rows={5}
                                disabled={isListening || interviewState === 'analyzing'}
                            />
                             <Button onClick={stopRecordingAndAnalyze} disabled={isListening || interviewState === 'analyzing'} className="w-full">
                                {interviewState === 'analyzing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                Submit Answer
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {interviewState === 'analyzing' && (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">Analyzing your response...</p>
                </div>
            )}
            
            {analysis && (
              <Card className="bg-gradient-to-br from-card to-muted/30">
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>Response Quality: {analysis.score}/100</Label>
                        <Progress value={analysis.score} className="w-full mt-2" />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.feedback}</p>
                    </div>
                     <div>
                        <Label>Areas for Improvement</Label>
                        <p className="text-sm text-muted-foreground mt-2">{analysis.areasForImprovement}</p>
                    </div>
                    <hr/>
                    <div>
                        <Label>Confidence Score: {analysis.confidenceScore}/100</Label>
                        <Progress value={analysis.confidenceScore} className="w-full mt-2" />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.toneFeedback}</p>
                    </div>
                     <div>
                        <Label>Tone Analysis</Label>
                        <p className="text-sm text-muted-foreground mt-2">{analysis.toneAnalysis}</p>
                    </div>
                </CardContent>
                <CardFooter>
                   <Button onClick={handleNextQuestion} className="w-full bg-accent hover:bg-accent/90">
                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        );

      case 'finished':
         return (
             <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <CardTitle>Interview Complete!</CardTitle>
                    <CardDescription>You've completed all the questions. Generate a full performance report to review your results.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div data-ai-hint="celebration confetti" className="p-8 bg-muted rounded-lg flex justify-center items-center">
                        <FileText className="h-24 w-24 text-primary" />
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button onClick={generateFinalReport} className="w-full" disabled={interviewState === 'analyzing'}>
                         {interviewState === 'analyzing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Generate Performance Report
                    </Button>
                    <Button onClick={() => setInterviewState('idle')} variant="outline" className="w-full">
                        Start New Interview
                    </Button>
                </CardFooter>
             </Card>
         )

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
        {renderCurrentState()}
        <PerformanceReportDialog isOpen={isReportOpen} onOpenChange={setIsReportOpen} report={finalReport} />
    </div>
  );
}
