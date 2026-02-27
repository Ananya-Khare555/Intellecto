import { useState, useEffect, useRef } from "react";
import { Settings, Calendar, LogOut, CheckCircle2, Terminal, Mic, MicOff, ChevronRight, Loader2, Code2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { CodeEditor } from "./CodeEditor";
import { InterviewProgress } from "./InterviewProgress";
import { SpeakingStatus } from "./SpeakingStatus";
import { useGeminiInterview } from '@/hooks/use-geminiInterview';

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

export const InterviewPlatform = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const gemini = useGeminiInterview();

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
  
  // MCQ state
  const [currentMCQ, setCurrentMCQ] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [mcqTimeLeft, setMcqTimeLeft] = useState(30);
  
  // Coding state
  const [aiFeedback, setAiFeedback] = useState<string>("");

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mcqTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Interview steps
  const interviewSteps: InterviewStep[] = [
    { id: '1', type: 'introduction', title: 'Introduction', completed: currentStep > 0, current: currentStep === 0 },
    { id: '2', type: 'technical', title: 'Technical MCQs', completed: currentStep > 1, current: currentStep === 1 },
    { id: '3', type: 'coding', title: 'Coding Challenge', completed: currentStep > 2, current: currentStep === 2 },
    { id: '4', type: 'behavioral', title: 'Behavioral', completed: currentStep > 3, current: currentStep === 3 },
    { id: '5', type: 'conclusion', title: 'Conclusion', completed: currentStep > 4, current: currentStep === 4 }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          
          setUserTranscript(transcript);
          
          // Clear existing timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          // Set new timeout to process after silence
          silenceTimeoutRef.current = setTimeout(() => {
            if (transcript && !isProcessing && !isAISpeaking) {
              stopListening();
              handleUserResponse(transcript);
            }
          }, 1500);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech error:', event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Auto-start listening when AI finishes speaking
  useEffect(() => {
    if (!isAISpeaking && !isProcessing && currentStep !== 1 && currentStep !== 2 && !interviewCompleted) {
      const timer = setTimeout(() => {
        startListening();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isProcessing, currentStep, interviewCompleted]);

  const startInterview = async () => {
    setIsProcessing(true);
    const welcomeMessage = await gemini.startInterview();
    addMessage('ai', welcomeMessage);
    await speak(welcomeMessage);
    setIsProcessing(false);
  };

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (isMuted || !synthRef.current) {
        resolve();
        return;
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
        setIsAISpeaking(true);
      };
      
      utteranceRef.current.onend = () => {
        setIsAISpeaking(false);
        resolve();
      };
      
      utteranceRef.current.onerror = () => {
        setIsAISpeaking(false);
        resolve();
      };
      
      synthRef.current.speak(utteranceRef.current);
    });
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isAISpeaking && !isProcessing) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setUserTranscript("");
      } catch (e) {
        console.error('Failed to start listening:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.error('Failed to stop listening:', e);
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

  const handleUserResponse = async (response: string) => {
    if (!response.trim() || isProcessing) return;

    stopListening();
    addMessage('user', response);
    setIsProcessing(true);
    setUserTranscript("");

    try {
      // Get current question
      const currentQuestion = messages.filter(m => m.type === 'ai').pop()?.content || '';

      // Process answer
      const result = await gemini.submitAnswer(currentQuestion, response);
      
      // Show feedback
      addMessage('ai', result.feedback);
      await speak(result.feedback);

      // Move to next question
      setTimeout(() => {
        askNextQuestion();
      }, 2000);

    } catch (error) {
      console.error('Error processing response:', error);
      toast({
        title: "Error",
        description: "Failed to process response",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const askNextQuestion = async () => {
    if (questionIndex < 2) {
      // More questions in current stage
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      
      const question = await gemini.getNextQuestion(
        interviewSteps[currentStep].type,
        gemini.interviewState.answers
      );
      
      addMessage('ai', question);
      await speak(question);
      setIsProcessing(false);
    } else {
      // Stage complete
      handleStageComplete();
    }
  };

  const handleStageComplete = () => {
    if (currentStep < interviewSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setQuestionIndex(0);
      setSelectedOption(null);
      setCurrentMCQ(null);
      
      if (nextStep === 1) {
        // Technical stage - load MCQ
        loadMCQ();
      } else if (nextStep === 2) {
        // Coding stage
        setActiveTab("coding");
      } else if (nextStep === 3) {
        // Behavioral stage
        askNextQuestion();
      } else if (nextStep === 4) {
        // Conclusion
        generateConclusion();
      }
      
      setIsProcessing(false);
    } else {
      finishInterview();
    }
  };

  const loadMCQ = async () => {
    setIsProcessing(true);
    const mcq = await gemini.generateMCQ();
    if (mcq) {
      setCurrentMCQ(mcq);
    }
    setIsProcessing(false);
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

  const handleMCQNext = () => {
    if (questionIndex < 2) {
      setQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      loadMCQ();
    } else {
      handleStageComplete();
    }
  };

  const handleMCQTimeout = () => {
    setSelectedOption('timeout');
    toast({
      title: "Time's up!",
      description: "Moving to next question",
      variant: "destructive",
    });
    
    setTimeout(() => {
      if (questionIndex < 2) {
        setQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        loadMCQ();
      } else {
        handleStageComplete();
      }
    }, 2000);
  };

  const handleCodeRun = async (code: string): Promise<TestCase[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6", actual: "6", passed: true },
          { input: "[1]", expected: "1", actual: "1", passed: true },
          { input: "[-1,-2,-3]", expected: "-1", actual: "-1", passed: true },
          { input: "[5,4,-1,7,8]", expected: "23", actual: "23", passed: true },
        ]);
      }, 1500);
    });
  };

  const handleCodeSubmit = async (code: string): Promise<boolean> => {
    setIsProcessing(true);
    
    const feedback = await gemini.reviewCode(
      "Implement Kadane's Algorithm to find maximum subarray sum",
      code,
      "javascript"
    );
    
    setAiFeedback(feedback);
    
    toast({
      title: "Code Submitted",
      description: "AI feedback is ready",
      duration: 4000,
    });
    
    setIsProcessing(false);
    return true;
  };

  const generateConclusion = async () => {
    const totalAnswers = gemini.interviewState.answers.length;
    const conclusion = `Thank you for completing the interview. You've answered ${totalAnswers} questions. Our team will review your responses and get back to you soon. Do you have any questions for me?`;
    
    addMessage('ai', conclusion);
    await speak(conclusion);
    setIsProcessing(false);
  };

  const finishInterview = () => {
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
  };

  const IntroductionStage = () => (
    <Card>
      <CardHeader>
        <CardTitle>Introduction Question {questionIndex + 1} of 3</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          {messages.filter(m => m.type === 'ai').pop()?.content || "Loading..."}
        </p>
        {isListening && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary mb-2">🎤 Listening...</p>
            <p className="italic">{userTranscript || "Speak now"}</p>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TechnicalStage = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Technical Question {questionIndex + 1} of 3</CardTitle>
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
                  {questionIndex < 2 ? "Next Question" : "Complete Stage"}
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

  const CodingStage = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="problem">Problem</TabsTrigger>
        <TabsTrigger value="coding">Code Editor</TabsTrigger>
      </TabsList>
      
      <TabsContent value="problem">
        <Card>
          <CardHeader>
            <CardTitle>Kadane's Algorithm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Given an array of integers, find the contiguous subarray with the maximum sum.</p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">Example:</p>
              <p>Input: [-2, 1, -3, 4, -1, 2, 1, -5, 4]</p>
              <p>Output: 6 (subarray [4, -1, 2, 1])</p>
            </div>
            <Button onClick={() => setActiveTab("coding")}>
              Start Coding
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="coding">
        <CodeEditor
          problem="Implement Kadane's Algorithm"
          initialCode="function maxSubarraySum(nums) {\n  // Your code here\n}"
          language="javascript"
          onRun={handleCodeRun}
          onSubmit={handleCodeSubmit}
        />
        {aiFeedback && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>AI Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{aiFeedback}</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );

  const BehavioralStage = () => (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Question {questionIndex + 1} of 3</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">
          {messages.filter(m => m.type === 'ai').pop()?.content || "Loading..."}
        </p>
        {isListening && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary mb-2">🎤 Listening...</p>
            <p className="italic">{userTranscript || "Speak now"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ConclusionStage = () => (
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
      case 2: return <CodingStage />;
      case 3: return <BehavioralStage />;
      case 4: return <ConclusionStage />;
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
              Powered by Gemini AI
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
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
            {getCurrentStage()}

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
                        className={`p-2 rounded-lg ${
                          msg.type === 'ai' 
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