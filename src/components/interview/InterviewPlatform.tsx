import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Calendar, LogOut, CheckCircle2, Mic, MicOff, Loader2, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { CodeEditor } from "./CodeEditor";
import { InterviewProgress } from "./InterviewProgress";
import { SpeakingStatus } from "./SpeakingStatus";
import { useSimpleInterview } from '@/hooks/useSimpleInterview';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface TestCase {
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
}

interface InterviewStep {
  id: string;
  type: string;
  title: string;
  completed: boolean;
  current: boolean;
}

// Wrapper component for CodeEditor - defined OUTSIDE to prevent re-renders
const CodingStageWrapper = ({ onComplete }: { onComplete: () => void }) => {
  return <CodeEditor onComplete={onComplete} />;
};

const MemoizedCodingStage = React.memo(CodingStageWrapper);

export const InterviewPlatform = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const interviewHook = useSimpleInterview();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState("interview");
  const { user } = useAuth();

  const hasResume = true;
  const userData = null;
  const showUploadResume = false;
  const isProcessingRef = useRef(false);
  const lastProcessedTranscript = useRef<string>("");
  const elapsedTimeRef = useRef(0);

  // MCQ state
  const [currentMCQ, setCurrentMCQ] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mcqTimeLeft, setMcqTimeLeft] = useState(30);

  // Coding state
  const [aiFeedback, setAiFeedback] = useState<string>("");

  // Development mode
  const [devMode, setDevMode] = useState(true);

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mcqTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);

  // Interview steps
  const interviewSteps: InterviewStep[] = useMemo(() => [
    { id: '1', type: 'introduction', title: 'Introduction', completed: currentStep > 0, current: currentStep === 0 },
    { id: '2', type: 'technical', title: 'Technical MCQs', completed: currentStep > 1, current: currentStep === 1 },
    { id: '3', type: 'coding', title: 'Coding Challenge', completed: currentStep > 2, current: currentStep === 2 },
    { id: '4', type: 'behavioral', title: 'Behavioral', completed: currentStep > 3, current: currentStep === 3 },
    { id: '5', type: 'conclusion', title: 'Conclusion', completed: currentStep > 4, current: currentStep === 4 }
  ], [currentStep]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      elapsedTimeRef.current += 1;
      setElapsedTime(elapsedTimeRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        let finalTranscript = '';
        let silenceTimer: ReturnType<typeof setTimeout> | null = null;

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          finalTranscript = '';
          setUserTranscript('');
        };

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          const displayTranscript = finalTranscript + interimTranscript;
          setUserTranscript(displayTranscript);

          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }

          silenceTimer = setTimeout(() => {
            const fullTranscript = finalTranscript.trim();
            if (fullTranscript && !isProcessing && !isAISpeaking && !isProcessingRef.current) {
              stopListening();
              handleUserResponse(fullTranscript);
            }
            finalTranscript = '';
          }, 2000);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (finalTranscript.trim() && !isProcessing && !isAISpeaking && !isProcessingRef.current) {
            handleUserResponse(finalTranscript.trim());
          }
          finalTranscript = '';
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech error:', event.error);
          setIsListening(false);
          if (event.error === 'network') {
            setTimeout(() => {
              if (!isProcessing && !isAISpeaking && !interviewCompleted) {
                startListening();
              }
            }, 1000);
          }
        };
      }
    }

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isProcessing, isAISpeaking, interviewCompleted]);

  // Start interview
  useEffect(() => {
    if (messages.length === 0 && !interviewCompleted) {
      startInterview();
    }
  }, []);

  // MCQ timer
  useEffect(() => {
    if (currentStep === 1 && currentMCQ && !selectedOption) {
      setMcqTimeLeft(30);
      mcqTimerRef.current = setInterval(() => {
        setMcqTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(mcqTimerRef.current!);
            handleMCQTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (mcqTimerRef.current) {
        clearInterval(mcqTimerRef.current);
      }
    };
  }, [currentStep, currentMCQ, selectedOption]);

  // Auto-start listening
  useEffect(() => {
    if (!isAISpeaking && !isProcessing && !isProcessingRef.current &&
      currentStep !== 1 && currentStep !== 2 && !interviewCompleted && !isListening) {
      const timer = setTimeout(() => {
        startListening();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isProcessing, currentStep, interviewCompleted, isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        synthRef.current.cancel();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (mcqTimerRef.current) {
        clearInterval(mcqTimerRef.current);
      }
    };
  }, []);

  const startInterview = async () => {
    setIsProcessing(true);
    interviewHook.initializeInterview();

    const welcomeMessage = interviewHook.getWelcomeMessage();
    addMessage('ai', welcomeMessage);
    await speak(welcomeMessage);

    await new Promise(resolve => setTimeout(resolve, 2500));

    const firstQuestion = interviewHook.getFirstQuestion('introduction');
    if (firstQuestion) {
      addMessage('ai', firstQuestion);
      await speak(firstQuestion);
    } else {
      const fallbackQuestion = "Tell me about yourself and your background in software development.";
      addMessage('ai', fallbackQuestion);
      await speak(fallbackQuestion);
    }

    setIsProcessing(false);
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (isMuted || !synthRef.current) {
        resolve();
        return;
      }

      if (isSpeakingRef.current) {
        synthRef.current.cancel();
      }

      stopListening();

      if (utteranceRef.current) {
        synthRef.current.cancel();
      }

      utteranceRef.current = new SpeechSynthesisUtterance(text);
      utteranceRef.current.rate = 0.9;
      utteranceRef.current.pitch = 1;
      utteranceRef.current.volume = 1;

      utteranceRef.current.onstart = () => {
        isSpeakingRef.current = true;
        setIsAISpeaking(true);
      };

      utteranceRef.current.onend = () => {
        isSpeakingRef.current = false;
        setIsAISpeaking(false);
        resolve();
      };

      utteranceRef.current.onerror = () => {
        isSpeakingRef.current = false;
        setIsAISpeaking(false);
        resolve();
      };

      synthRef.current.speak(utteranceRef.current);
    });
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isAISpeaking && !isProcessing && !isProcessingRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setUserTranscript("Listening...");
      } catch (e) {
        console.error('Failed to start listening:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.log('Stop listening error:', e);
      }
    }
  };

  const addMessage = (type: 'ai' | 'user', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const generateConclusion = useCallback(async () => {
    const conclusion = interviewHook.getConclusionMessage();
    addMessage('ai', conclusion);
    await speak(conclusion);
    setIsProcessing(false);
  }, [interviewHook]);

  const finishInterview = useCallback(() => {
    setInterviewCompleted(true);
    stopListening();

    toast({
      title: "Interview Completed",
      description: "Thank you for your participation",
      duration: 3000,
    });

    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  }, [navigate, toast]);

  const loadMCQ = useCallback(async () => {
    setIsProcessing(true);

    const mcq = interviewHook.generateMCQ(0);

    if (mcq) {
      setCurrentMCQ(mcq);
      addMessage('ai', mcq.question);
      await speak(mcq.question);
    } else {
      const dummyMCQ = {
        question: "What is the difference between let and var in JavaScript?",
        options: [
          { id: "a", text: "let has block scope, var has function scope", isCorrect: true },
          { id: "b", text: "There is no difference", isCorrect: false },
          { id: "c", text: "var is newer than let", isCorrect: false },
          { id: "d", text: "let cannot be reassigned", isCorrect: false }
        ],
        explanation: "let declarations are block-scoped while var declarations are function-scoped."
      };
      setCurrentMCQ(dummyMCQ);
      addMessage('ai', dummyMCQ.question);
      await speak(dummyMCQ.question);
    }

    setIsProcessing(false);
  }, [interviewHook]);

  const handleStageComplete = useCallback(async () => {
    const currentStage = interviewSteps[currentStep].type;
    const completionMessage = interviewHook.getStageCompletionMessage(currentStage);

    addMessage('ai', completionMessage);
    await speak(completionMessage);

    if (currentStep < interviewSteps.length - 1) {
      const nextStep = currentStep + 1;

      setCurrentStep(nextStep);
      setQuestionIndex(0);
      setSelectedOption(null);
      setCurrentMCQ(null);
      setIsProcessing(false);

      await new Promise(resolve => setTimeout(resolve, 2000));

      if (nextStep === 1) {
        await loadMCQ();
      } else if (nextStep === 2) {
        setActiveTab("coding");
        setIsProcessing(false);
        const codingIntro = "Here's a coding challenge for you. Take your time to read the problem and implement your solution. You can run and test your code before submitting.";
        addMessage('ai', codingIntro);
        await speak(codingIntro);
      } else if (nextStep === 3) {
        setIsProcessing(true);
        const firstBehavioralQuestion = interviewHook.getQuestionAtIndex('behavioral', 0);
        if (firstBehavioralQuestion) {
          addMessage('ai', firstBehavioralQuestion);
          await speak(firstBehavioralQuestion);
        }
        setIsProcessing(false);
      } else if (nextStep === 4) {
        setIsProcessing(true);
        await generateConclusion();
        setIsProcessing(false);
      }
    } else {
      await finishInterview();
    }
  }, [currentStep, interviewSteps, interviewHook, loadMCQ, generateConclusion, finishInterview]);

  const askNextQuestion = useCallback(async () => {
    const stage = interviewSteps[currentStep].type as 'introduction' | 'technical' | 'behavioral';
    const totalQuestions = interviewHook.getStageQuestionCount(stage);
    const nextIndex = questionIndex + 1;

    if (nextIndex < totalQuestions) {
      setQuestionIndex(nextIndex);

      const nextQuestionText = interviewHook.getQuestionAtIndex(stage, nextIndex);

      if (nextQuestionText) {
        addMessage('ai', nextQuestionText);
        await speak(nextQuestionText);
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
        await handleStageComplete();
      }
    } else {
      await handleStageComplete();
    }
  }, [currentStep, questionIndex, interviewSteps, interviewHook, handleStageComplete]);

  const handleUserResponse = async (response: string) => {
    if (!response.trim() || isProcessing || isProcessingRef.current) {
      return;
    }

    if (response === lastProcessedTranscript.current) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    lastProcessedTranscript.current = response;

    stopListening();
    addMessage('user', response);
    setUserTranscript("");

    try {
      const currentQuestion = messages.filter(m => m.type === 'ai').pop()?.content || '';
      const stage = interviewSteps[currentStep].type as 'introduction' | 'technical' | 'behavioral';

      const feedbackResult = interviewHook.submitAnswer(currentQuestion, response, stage);

      addMessage('ai', feedbackResult.message);
      await speak(feedbackResult.message);

      if (feedbackResult.needsFollowUp) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        lastProcessedTranscript.current = "";

        setTimeout(() => {
          startListening();
        }, 1000);

        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const totalQuestions = interviewHook.getStageQuestionCount(stage);
      const nextIndex = questionIndex + 1;

      if (nextIndex < totalQuestions) {
        setQuestionIndex(nextIndex);

        const nextQuestionText = interviewHook.getQuestionAtIndex(stage, nextIndex);

        if (nextQuestionText) {
          addMessage('ai', nextQuestionText);
          await speak(nextQuestionText);
        } else {
          await handleStageComplete();
        }
      } else {
        await handleStageComplete();
      }

    } catch (error) {
      console.error('Error processing response:', error);
      toast({
        title: "Error",
        description: "Failed to process response",
        variant: "destructive"
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      lastProcessedTranscript.current = "";
      interviewHook.resetElaborationFlag();
    }
  };

  const handleMCQAnswer = (optionId: string) => {
    if (selectedOption) return;

    setSelectedOption(optionId);
    if (mcqTimerRef.current) {
      clearInterval(mcqTimerRef.current);
    }

    const option = currentMCQ.options.find((opt: any) => opt.id === optionId);

    if (option?.isCorrect) {
      toast({
        title: "Correct!",
        description: currentMCQ.explanation,
        duration: 4000,
      });
    } else {
      const correctOption = currentMCQ.options.find((opt: any) => opt.isCorrect);
      toast({
        title: "Incorrect",
        description: `The correct answer is ${correctOption.id}. ${currentMCQ.explanation}`,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleMCQNext = async () => {
    const totalQuestions = interviewHook.getStageQuestionCount('technical');

    if (questionIndex + 1 < totalQuestions) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setSelectedOption(null);

      const mcq = interviewHook.generateMCQ(nextIndex);
      if (mcq) {
        setCurrentMCQ(mcq);
        addMessage('ai', mcq.question);
        await speak(mcq.question);
      }
    } else {
      await handleStageComplete();
    }
  };

  const handleMCQTimeout = async () => {
    setSelectedOption('timeout');
    toast({
      title: "Time's up!",
      description: "Moving to next question",
      variant: "destructive",
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const totalQuestions = interviewHook.getStageQuestionCount('technical');

    if (questionIndex + 1 < totalQuestions) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setSelectedOption(null);

      const mcq = interviewHook.generateMCQ(nextIndex);
      if (mcq) {
        setCurrentMCQ(mcq);
        addMessage('ai', mcq.question);
        await speak(mcq.question);
      }
    } else {
      await handleStageComplete();
    }
  };

  // Stable callback for coding completion
  const handleCodingComplete = useCallback(() => {
    handleStageComplete();
  }, [handleStageComplete]);

  // Memoized coding stage component - created ONCE
  const codingStageComponent = useMemo(() => {
    return <MemoizedCodingStage onComplete={handleCodingComplete} />;
  }, [handleCodingComplete]);

  // Bypass function for development
  const bypassCurrentStage = async () => {
    if (interviewCompleted) return;

    stopListening();
    if (utteranceRef.current) {
      synthRef.current.cancel();
      setIsAISpeaking(false);
    }
    if (mcqTimerRef.current) {
      clearInterval(mcqTimerRef.current);
    }

    setIsProcessing(true);

    toast({
      title: "Development Mode",
      description: `Bypassing ${interviewSteps[currentStep].title} stage...`,
      duration: 2000,
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (currentStep === 1 && currentMCQ) {
      setSelectedOption(null);
      setCurrentMCQ(null);
    }

    if (currentStep < interviewSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setQuestionIndex(0);
      setSelectedOption(null);
      setCurrentMCQ(null);

      addMessage('ai', `[Development Mode] Bypassed ${interviewSteps[currentStep].title} stage. Moving to ${interviewSteps[nextStep].title}.`);

      if (nextStep === 1) {
        loadMCQ();
      } else if (nextStep === 2) {
        setActiveTab("coding");
      } else if (nextStep === 3) {
        askNextQuestion();
      } else if (nextStep === 4) {
        generateConclusion();
      }
    } else {
      await finishInterview();
    }

    setIsProcessing(false);
  };

  // Stage components
  const IntroductionStage = () => (
    <Card>
      <CardHeader>
        <CardTitle>Introduction Question {questionIndex + 1} of {interviewHook.getStageQuestionCount('introduction')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          {messages.filter(m => m.type === 'ai').pop()?.content || "Loading..."}
        </p>
        {isListening && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              🎤 Listening... (Speak clearly)
            </p>
            <p className="italic text-foreground">
              {userTranscript || "I'm listening, please speak..."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The AI will process your response after a brief pause
            </p>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing your response...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TechnicalStage = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Technical Question {questionIndex + 1} of {interviewHook.getStageQuestionCount('technical')}</CardTitle>
          <div className="text-sm font-mono">{mcqTimeLeft}s</div>
        </div>
      </CardHeader>
      <CardContent>
        {currentMCQ ? (
          <>
            <p className="text-lg mb-6">{currentMCQ.question}</p>
            <div className="space-y-3">
              {currentMCQ.options.map((option: any) => (
                <Button
                  key={option.id}
                  variant={selectedOption === option.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => handleMCQAnswer(option.id)}
                  disabled={selectedOption !== null}
                >
                  <span className="font-bold mr-3">{option.id.toUpperCase()}.</span>
                  {option.text}
                </Button>
              ))}
            </div>
            {selectedOption && selectedOption !== 'timeout' && (
              <div className="mt-6 flex justify-end">
                <Button onClick={handleMCQNext}>
                  {questionIndex < interviewHook.getStageQuestionCount('technical') - 1 ? "Next Question" : "Complete Stage"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const BehavioralStage = () => (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Question {questionIndex + 1} of {interviewHook.getStageQuestionCount('behavioral')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          {messages.filter(m => m.type === 'ai').pop()?.content || "Loading..."}
        </p>
        {isListening && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              🎤 Listening... (Speak clearly)
            </p>
            <p className="italic text-foreground">
              {userTranscript || "I'm listening, please speak..."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The AI will process your response after a brief pause
            </p>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing your response...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const getCurrentStage = () => {
    if (interviewCompleted) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Interview Completed</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4" />
          </CardContent>
        </Card>
      );
    }

    switch (currentStep) {
      case 0: return <IntroductionStage />;
      case 1: return <TechnicalStage />;
      case 2: return codingStageComponent;
      case 3: return <BehavioralStage />;
      case 4: return (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Interview Complete</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for completing the interview
            </p>
            <Button onClick={finishInterview} size="lg">
              Finish
            </Button>
          </CardContent>
        </Card>
      );
      default: return <IntroductionStage />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              AI Interview Platform
            </h1>
            <p className="text-muted-foreground mt-1">
              Powered by Intellecto
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>

            {hasResume && (
              <>
                {devMode && !interviewCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bypassCurrentStage}
                    disabled={isProcessing || isAISpeaking}
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Bypass Stage
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={interviewCompleted}>
                      <LogOut className="h-4 w-4 mr-2" />
                      End Interview
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End Interview?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to end the interview? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={finishInterview}>
                        End Interview
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <InterviewProgress
              steps={interviewSteps}
              currentStep={currentStep}
              totalTime={3600}
              elapsedTime={elapsedTime}
            />
          </div>

          {/* Main Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Voice Controls */}
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="flex gap-2">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="sm"
                  onClick={() => isListening ? stopListening() : startListening()}
                  disabled={currentStep === 1 || currentStep === 2 || interviewCompleted || isAISpeaking}
                >
                  {isListening ? (
                    <><MicOff className="h-4 w-4 mr-2" /> Stop</>
                  ) : (
                    <><Mic className="h-4 w-4 mr-2" /> Listen</>
                  )}
                </Button>
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? "Unmute AI" : "Mute AI"}
                </Button>
              </div>
              <SpeakingStatus
                isAISpeaking={isAISpeaking}
                isUserSpeaking={isListening}
              />
            </div>

            {/* Current Stage */}
            <div key="stage-container">
              {getCurrentStage()}
            </div>

            {/* Message History */}
            {messages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversation</CardTitle>
                </CardHeader>
                <CardContent className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {messages.slice(-5).map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg ${msg.type === 'ai'
                          ? 'bg-primary/10 ml-4'
                          : 'bg-muted/20 mr-4'
                          }`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {msg.type === 'ai' ? '🤖 AI' : '👤 You'} - {msg.timestamp.toLocaleTimeString()}
                        </p>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};