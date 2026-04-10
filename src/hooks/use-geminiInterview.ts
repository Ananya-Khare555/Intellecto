import { useState, useCallback } from 'react';
import { geminiService, FALLBACK_QUESTIONS } from '@/services/geminiService';

interface InterviewState {
  stage: string;
  questionIndex: number;
  answers: string[];
  questions: string[];
  userContext?: string; // Add user context to state
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

  // Modified startInterview to accept userContext parameter
  const startInterview = useCallback(async (userContext?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Store user context in state for future use
      if (userContext) {
        setInterviewState(prev => ({
          ...prev,
          userContext
        }));
      }

      const welcomeMessage = await geminiService.startInterview(userContext);
      return welcomeMessage;
    } catch (err) {
      console.error('Error starting interview:', err);
      setError('Failed to start interview');
      return "Welcome to your interview. Please introduce yourself.";
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Modified getNextQuestion to use user context
  const getNextQuestion = useCallback(async (stage: string, previousAnswers: string[] = []) => {
    setIsLoading(true);

    try {
      const question = await geminiService.generateQuestion(
        stage,
        previousAnswers,
        interviewState.userContext
      );

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
      let fallbackQuestion = questions[previousAnswers.length % questions.length];

      // Add personalization if context is available
      if (interviewState.userContext && fallbackQuestion) {
        const nameMatch = interviewState.userContext.match(/Name: ([^\n]+)/);
        if (nameMatch) {
          fallbackQuestion = `${fallbackQuestion} I see you're ${nameMatch[1]}. `;
        }
      }

      return fallbackQuestion;
    } finally {
      setIsLoading(false);
    }
  }, [interviewState.userContext]);

  // Modified submitAnswer to consider user context
  const submitAnswer = useCallback(async (question: string, answer: string) => {
    setIsLoading(true);

    try {
      const result = await geminiService.processAnswer(
        question,
        answer,
        interviewState.userContext
      );

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
  }, [interviewState.userContext]);

  // Modified generateMCQ to use user context
  const generateMCQ = useCallback(async (topic?: string) => {
    setIsLoading(true);

    try {
      // If user context exists and no specific topic provided, use skills from context
      let mcqTopic = topic;
      if (!mcqTopic && interviewState.userContext) {
        const skillsMatch = interviewState.userContext.match(/Skills:([\s\S]*?)(?=\n\n|\n[A-Z]|$)/);
        if (skillsMatch && skillsMatch[1]) {
          const skills = skillsMatch[1].trim().split('\n').slice(0, 3).join(', ');
          mcqTopic = skills;
        }
      }

      const mcq = await geminiService.generateMCQ(mcqTopic);
      return mcq;
    } catch (err) {
      console.error('Error generating MCQ:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [interviewState.userContext]);

  // Modified reviewCode to use user context
  const reviewCode = useCallback(async (problem: string, code: string, language: string) => {
    setIsLoading(true);

    try {
      const feedback = await geminiService.reviewCode(
        problem,
        code,
        language,
        interviewState.userContext
      );
      return feedback;
    } catch (err) {
      console.error('Error reviewing code:', err);
      return "Unable to review code at this time.";
    } finally {
      setIsLoading(false);
    }
  }, [interviewState.userContext]);

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

  // Helper method to update user context
  const updateUserContext = useCallback((userContext: string) => {
    setInterviewState(prev => ({
      ...prev,
      userContext
    }));
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
    resetInterview,
    updateUserContext
  };
}; 