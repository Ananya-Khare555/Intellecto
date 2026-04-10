import { useState, useCallback, useRef } from 'react';
import { questionService, Question } from '@/services/questionService';

interface InterviewState {
    currentQuestions: {
        introduction: Question[];
        technical: Question[];
        behavioral: Question[];
    };
    answers: Array<{
        question: string;
        answer: string;
        timestamp: Date;
    }>;
}

// Random feedback responses - short ones already include elaboration prompts
const feedbackResponses = {
    short: [
        "Thank you for sharing that. Could you tell me a bit more about your experience?",
        "I see. Could you elaborate on that point?",
        "Interesting. What else can you share about that?",
        "Thanks for that response. Is there anything else you'd like to add?",
        "Please go ahead, I'm listening.",
        "Take your time, I'd like to hear more.",
        "Could you share more details about that?",
        "I'm interested in hearing more. Please continue.",
        "What else can you tell me about that?",
        "I'm still listening. Please elaborate.",
        "That's a good start. Could you expand on that?"
    ],
    medium: [
        "Good answer. I appreciate you sharing that perspective.",
        "That's helpful context. Let's move on to the next question.",
        "Thank you for explaining that. It gives me a better understanding.",
        "I appreciate the details you've provided. Let's continue."
    ],
    long: [
        "Excellent, detailed response. Thank you for providing that context. Let's continue.",
        "That was very comprehensive. I appreciate the thorough explanation.",
        "Great insights! Thank you for sharing such a detailed response.",
        "Wonderful. That gives me a very clear picture. Let's move on."
    ]
};

export interface FeedbackResult {
    message: string;
    needsFollowUp: boolean;
}

export const useSimpleInterview = () => {
    // Use a ref to store questions immediately without waiting for re-render
    const questionsRef = useRef<{
        introduction: Question[];
        technical: Question[];
        behavioral: Question[];
    }>({
        introduction: [],
        technical: [],
        behavioral: []
    });

    const [state, setState] = useState<InterviewState>({
        currentQuestions: {
            introduction: [],
            technical: [],
            behavioral: []
        },
        answers: []
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isWaitingForElaboration, setIsWaitingForElaboration] = useState(false);
    const [elaborationCount, setElaborationCount] = useState(0);

    // Helper to get random item from array
    const getRandomItem = <T,>(array: T[]): T => {
        return array[Math.floor(Math.random() * array.length)];
    };

    // Initialize interview with random questions
    const initializeInterview = useCallback(() => {
        questionService.resetSession();
        setIsWaitingForElaboration(false);
        setElaborationCount(0);

        // Get "Tell me about yourself" question
        const tellMeAboutYourself: Question = {
            id: "intro_first",
            question: "Tell me about yourself and your background in software development."
        };

        // Get random introduction questions (excluding the first one if it matches)
        const allIntroQuestions = questionService.getRandomQuestions('introduction', undefined, 3, 4);

        // Filter out "Tell me about yourself" if it appears in the random selection
        const filteredIntroQuestions = allIntroQuestions.filter(
            q => !q.question.toLowerCase().includes("tell me about yourself")
        );

        // Take 2-3 additional random questions
        const additionalIntroCount = Math.min(filteredIntroQuestions.length, Math.floor(Math.random() * 2) + 2); // 2-3 questions
        const additionalIntroQuestions = filteredIntroQuestions.slice(0, additionalIntroCount);

        // Combine: first question is always "Tell me about yourself"
        const introQuestions = [tellMeAboutYourself, ...additionalIntroQuestions];

        const techQuestions = questionService.getRandomQuestions('technical', undefined, 3, 4);
        const behavQuestions = questionService.getRandomQuestions('behavioral', undefined, 3, 4);

        const questions = {
            introduction: introQuestions,
            technical: techQuestions,
            behavioral: behavQuestions
        };

        // Store in ref for immediate access
        questionsRef.current = questions;

        // Update state for future renders
        setState({
            currentQuestions: questions,
            answers: []
        });

        console.log('Questions initialized:', {
            intro: introQuestions.length,
            tech: techQuestions.length,
            behav: behavQuestions.length,
            firstQuestion: introQuestions[0]?.question
        });

        return questions;
    }, []);

    // Get welcome message - use ref for immediate access
    const getWelcomeMessage = useCallback((): string => {
        const questions = questionsRef.current;
        const introCount = questions.introduction.length;
        const techCount = questions.technical.length;
        const behavCount = questions.behavioral.length;
        const totalQuestions = introCount + techCount + behavCount;

        return `Welcome to your interview! I'll be asking you ${introCount} introduction questions, ${techCount} technical questions, and ${behavCount} behavioral questions. In total, we'll cover ${totalQuestions} questions. Let's begin with the introduction phase.`;
    }, []);

    // Get first question for a stage - use ref
    const getFirstQuestion = useCallback((stage: 'introduction' | 'technical' | 'behavioral'): string | null => {
        const questions = questionsRef.current[stage];
        if (questions.length > 0) {
            return questions[0].question;
        }
        return null;
    }, []);

    // Get next question based on current stage and index - use ref
    const getQuestionAtIndex = useCallback((stage: 'introduction' | 'technical' | 'behavioral', index: number): string | null => {
        const questions = questionsRef.current[stage];
        if (index >= 0 && index < questions.length) {
            return questions[index].question;
        }
        return null;
    }, []);

    // Get MCQ for technical stage at specific index - use ref
    const getMCQForIndex = useCallback((index: number) => {
        const techQuestions = questionsRef.current.technical;

        if (index >= 0 && index < techQuestions.length) {
            const question = techQuestions[index];
            return {
                question: question.question,
                options: question.options || [],
                explanation: question.explanation || ''
            };
        }

        return null;
    }, []);

    // Submit answer - now returns FeedbackResult
    const submitAnswer = useCallback((
        question: string,
        answer: string,
        stage: string
    ): FeedbackResult => {
        setState(prev => ({
            ...prev,
            answers: [...prev.answers, {
                question,
                answer,
                timestamp: new Date()
            }]
        }));

        const feedbackResult = generateFeedback(answer);
        setIsWaitingForElaboration(feedbackResult.needsFollowUp);

        // If waiting for elaboration, increment count
        if (feedbackResult.needsFollowUp) {
            setElaborationCount(prev => prev + 1);
        } else {
            setElaborationCount(0);
        }

        return feedbackResult;
    }, []);

    // Generate random feedback based on answer length
    const generateFeedback = (answer: string): FeedbackResult => {
        const wordCount = answer.split(/\s+/).length;

        let responseArray: string[];
        let needsFollowUp = false;

        if (wordCount < 20) {
            responseArray = feedbackResponses.short;
            needsFollowUp = true; // Short answer - the short feedback IS the elaboration prompt
        } else if (wordCount < 50) {
            responseArray = feedbackResponses.medium;
            needsFollowUp = false; // Medium answer - move to next
        } else {
            responseArray = feedbackResponses.long;
            needsFollowUp = false; // Long answer - move to next
        }

        // If we've already asked for elaboration twice, force move on
        if (elaborationCount >= 2) {
            needsFollowUp = false;
            setElaborationCount(0);
        }

        return {
            message: getRandomItem(responseArray),
            needsFollowUp
        };
    };

    // Reset elaboration flag
    const resetElaborationFlag = useCallback(() => {
        setIsWaitingForElaboration(false);
    }, []);

    // Check if we should move to next question
    const shouldMoveToNextQuestion = useCallback((answer: string): boolean => {
        const wordCount = answer.split(/\s+/).length;
        // If answer is substantial or we've asked for elaboration enough times
        return wordCount >= 20 || elaborationCount >= 2;
    }, [elaborationCount]);

    // Get stage completion message
    const getStageCompletionMessage = useCallback((stage: string): string => {
        const messages: Record<string, string[]> = {
            introduction: [
                "Great! I've got a good sense of your background. Let's move on to some technical questions.",
                "Thank you for sharing that. Now I'd like to test your technical knowledge.",
                "Excellent introduction. Let's move on to the technical portion of the interview."
            ],
            technical: [
                "Well done on the technical questions! Now let's move to a coding challenge to see your problem-solving skills in action.",
                "Great job with the technical section. Next, I'd like you to work on a coding problem.",
                "Thanks for working through those technical questions. Now let's test your coding abilities with a programming challenge.",
                "Excellent! You've completed the technical MCQs. Let's move on to the coding round."
            ],
            coding: [
                "Great work on the coding challenge! Now I'd like to understand more about your work style and experiences.",
                "Well done with the coding problem. Let's switch gears and talk about your behavioral experiences.",
                "Thanks for completing the coding challenge. Now let's discuss your professional experiences.",
                "Excellent job on the code! Let's move on to some behavioral questions to understand how you work in a team."
            ],
            behavioral: [
                "Thank you for sharing those experiences. That gives me a comprehensive view of your capabilities.",
                "I appreciate you walking me through those situations. It's been very insightful.",
                "Those are great examples. Thank you for your thoughtful responses."
            ]
        };

        const stageMessages = messages[stage] || ["Thank you. Let's move to the next stage."];
        return getRandomItem(stageMessages);
    }, []);

    // Get conclusion message
    const getConclusionMessage = useCallback((): string => {
        const totalAnswers = state.answers.length;
        const messages = [
            `Thank you for completing the interview! You've answered ${totalAnswers} questions across all stages. We appreciate your time and will review your responses. Do you have any questions for me?`,
            `That concludes our interview. You've done a great job answering ${totalAnswers} questions. Do you have any questions about the role or the company?`,
            `We've reached the end of the interview. Thank you for your thoughtful responses to all ${totalAnswers} questions. Is there anything you'd like to ask me?`
        ];
        return getRandomItem(messages);
    }, [state.answers.length]);

    // Get total questions count for a stage - use ref
    const getStageQuestionCount = useCallback((stage: keyof InterviewState['currentQuestions']): number => {
        return questionsRef.current[stage]?.length || 0;
    }, []);

    // Check if stage has more questions
    const hasMoreQuestions = useCallback((stage: keyof InterviewState['currentQuestions'], currentIndex: number): boolean => {
        return currentIndex < getStageQuestionCount(stage);
    }, [getStageQuestionCount]);

    // Review code
    const reviewCode = useCallback((problem: string, code: string, language: string): string => {
        const linesOfCode = code.split('\n').filter(line => line.trim().length > 0).length;

        const feedbacks = {
            short: [
                "Your solution seems concise. Make sure to consider edge cases.",
                "Thanks for your submission. Consider adding more comments to explain your approach.",
                "Good start. You might want to test with more edge cases."
            ],
            medium: [
                "Good structure! Your code looks well-organized. Consider adding comments to explain your approach.",
                "Nice work on the implementation. The logic is clear and well-structured.",
                "Solid solution. You've handled the main cases well."
            ],
            long: [
                "Excellent implementation! Your code is well-structured and handles the problem effectively.",
                "Great solution! The code is clean, well-organized, and properly implements the algorithm.",
                "Outstanding work! Your solution demonstrates a strong understanding of the problem."
            ]
        };

        let responseArray: string[];
        if (linesOfCode < 8) {
            responseArray = feedbacks.short;
        } else if (linesOfCode < 20) {
            responseArray = feedbacks.medium;
        } else {
            responseArray = feedbacks.long;
        }

        return getRandomItem(responseArray);
    }, []);

    // Generate MCQ
    const generateMCQ = useCallback((index?: number) => {
        const idx = index ?? 0;
        return getMCQForIndex(idx);
    }, [getMCQForIndex]);

    return {
        state,
        isLoading,
        isWaitingForElaboration,
        elaborationCount,
        initializeInterview,
        getWelcomeMessage,
        getFirstQuestion,
        getQuestionAtIndex,
        getMCQForIndex,
        submitAnswer,
        generateFeedback,
        resetElaborationFlag,
        shouldMoveToNextQuestion,
        getStageCompletionMessage,
        getConclusionMessage,
        getStageQuestionCount,
        hasMoreQuestions,
        reviewCode,
        generateMCQ,
        questionService
    };
};