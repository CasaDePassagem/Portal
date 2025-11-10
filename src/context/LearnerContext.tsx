import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAllProgressForParticipant, subscribeToProgress, type LearningProgress, hydrateProgressFromCache } from '../lib/progress';

export interface Learner {
    id: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    age?: number | null;
    gender?: string;
    fatherName?: string;
    motherName?: string;
    careHouse?: string;
    email?: string;
    createdAt: Date;
    lastActiveAt: Date;
}

interface LearnerContextType {
    learner: Learner | null;
    setLearner: (learner: Learner | null) => void;
    progress: LearningProgress[];
    isLoadingProgress: boolean;
    refreshProgress: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

interface LearnerProviderProps {
    children: ReactNode;
}

export function LearnerProvider({ children }: LearnerProviderProps) {
    // SEM LOCALSTORAGE - mais seguro para PCs compartilhados
    const [learner, setLearner] = useState<Learner | null>(null);
    const [progress, setProgress] = useState<LearningProgress[]>([]);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);

    useEffect(() => {
        if (!learner) {
            setProgress([]);
            return;
        }

        hydrateProgressFromCache();

        let isMounted = true;
        setIsLoadingProgress(true);

        // ✅ Fetch inicial para dados imediatos (melhor UX)
        getAllProgressForParticipant(learner.id)
            .then((initialProgress) => {
                if (isMounted) {
                    setProgress(initialProgress);
                    setIsLoadingProgress(false);
                }
            })
            .catch((error) => {
                console.error('Error loading initial progress:', error);
                if (isMounted) {
                    setIsLoadingProgress(false);
                }
            });

        // ✅ Listener para sincronização em tempo real (não mexe no loading)
        const unsubscribe = subscribeToProgress(learner.id, (newProgress) => {
            if (isMounted) {
                setProgress(newProgress);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [learner]);

    const refreshProgress = async () => {
        if (!learner) return;

        setIsLoadingProgress(true);
        try {
            const newProgress = await getAllProgressForParticipant(learner.id);
            setProgress(newProgress);
        } catch (error) {
            console.error('Error refreshing progress:', error);
        } finally {
            setIsLoadingProgress(false);
        }
    };

    const value: LearnerContextType = {
        learner,
        setLearner,
        progress,
        isLoadingProgress,
        refreshProgress
    };

    return (
        <LearnerContext.Provider value={value}>
            {children}
        </LearnerContext.Provider>
    );
}

export function useLearner() {
    const context = useContext(LearnerContext);
    if (context === undefined) {
        throw new Error('useLearner must be used within a LearnerProvider');
    }
    return context;
}

export function useLessonProgress(lessonId: string) {
    const { progress } = useLearner();
    return progress.find(p => p.lessonId === lessonId) || null;
}

export function useContentProgress(contentId: string) {
    const { progress } = useLearner();
    return progress.filter(p => p.contentId === contentId);
}

export function useTopicProgress(topicId: string) {
    const { progress } = useLearner();
    return progress.filter(p => p.topicId === topicId);
}
