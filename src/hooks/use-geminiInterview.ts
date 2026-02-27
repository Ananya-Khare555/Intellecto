import { useState, useCallback } from 'react';
import { geminiService, FALLBACK_QUESTIONS } from '@/services/geminiService';

interface InterviewState {
  stage: string;
  questionIndex: number;
  answers: string[];
  questions: string[];
}

export const useGeminiInterview = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    stage: 'introduction',
    questionIndex: 0,
    answers: [],
    questions: []
  });

  const startInterview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const welcomeMessage = await geminiService.startInterview();
      return welcomeMessage;
    } catch (err) {
      console.error('Error starting interview:', err);
      setError('Failed to start interview');
      return "Welcome to your interview. Please introduce yourself.";
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getNextQuestion = useCallback(async (stage: string, previousAnswers: string[] = []) => {
    setIsLoading(true);
    
    try {
      const question = await geminiService.generateQuestion(stage, previousAnswers);
      
      setInterviewState(prev => ({
        ...prev,
        stage,
        questions: [...prev.questions, question]
      }));
      
      return question;
    } catch (err) {
      console.error('Error getting next question:', err);
      
      // Use fallback question
      const stageKey = stage as keyof typeof FALLBACK_QUESTIONS;
      const questions = FALLBACK_QUESTIONS[stageKey] || FALLBACK_QUESTIONS.introduction;
      const fallbackQuestion = questions[previousAnswers.length % questions.length];
      
      return fallbackQuestion;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (question: string, answer: string) => {
    setIsLoading(true);
    
    try {
      const result = await geminiService.processAnswer(question, answer);
      
      setInterviewState(prev => ({
        ...prev,
        answers: [...prev.answers, answer]
      }));
      
      return result;
    } catch (err) {
      console.error('Error submitting answer:', err);
      return {
        feedback: "Thank you for your response.",
        shouldContinue: true
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateMCQ = useCallback(async (topic?: string) => {
    setIsLoading(true);
    
    try {
      const mcq = await geminiService.generateMCQ(topic);
      return mcq;
    } catch (err) {
      console.error('Error generating MCQ:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reviewCode = useCallback(async (problem: string, code: string, language: string) => {
    setIsLoading(true);
    
    try {
      const feedback = await geminiService.reviewCode(problem, code, language);
      return feedback;
    } catch (err) {
      console.error('Error reviewing code:', err);
      return "Unable to review code at this time.";
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetInterview = useCallback(() => {
    geminiService.clearContext();
    setInterviewState({
      stage: 'introduction',
      questionIndex: 0,
      answers: [],
      questions: []
    });
    setError(null);
  }, []);

    return {
    isLoading,
    error,
    interviewState,
    startInterview,
    getNextQuestion,
    submitAnswer,
    generateMCQ,
    reviewCode,
    resetInterview
  };
};
