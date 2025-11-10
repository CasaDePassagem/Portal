import { useEffect, useState } from 'react';
import type { Topic, Content, Lesson } from '../lib/db';
import { listenTopics, listenContentsByTopic, listenLessonsByContent } from '../lib/db';

/**
 * Hook personalizado para gerenciar dados em tempo real do sistema de cursos.
 * Mantém sincronização automática usando os listeners do armazenamento em memória.
 */
export function useRealtimeData() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [contents, setContents] = useState<Content[]>([]);
    const [selectedContentId, setSelectedContentId] = useState('');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeLessonId, setActiveLessonId] = useState('');

    // Estado para feedback visual
    const [lastUpdate, setLastUpdate] = useState<Date | undefined>(undefined);

    // Listener para todos os tópicos
    useEffect(() => {
        const unsubscribe = listenTopics((newTopics) => {
            setTopics(newTopics);
            setLastUpdate(new Date());
        });

        return unsubscribe;
    }, []);

    // Listener para conteúdos do tópico selecionado
    useEffect(() => {
        if (!selectedTopicId) {
            setContents([]);
            setSelectedContentId('');
            setLessons([]);
            setActiveLessonId('');
            return;
        }

        const unsubscribe = listenContentsByTopic(selectedTopicId, (newContents) => {
            setContents(newContents);
            setLastUpdate(new Date());
        });

        return unsubscribe;
    }, [selectedTopicId]);

    // Listener para lições do conteúdo selecionado
    useEffect(() => {
        if (!selectedContentId) {
            setLessons([]);
            setActiveLessonId('');
            return;
        }

        const unsubscribe = listenLessonsByContent(selectedContentId, (items) => {
            setLessons(items);
            setLastUpdate(new Date());

            // Auto-seleciona a primeira lição se não há nenhuma ativa ou se a ativa não existe mais
            // ✅ Usando setState funcional para evitar dependência circular
            setActiveLessonId((currentId) => {
                if (items.length === 0) return '';
                // Se não há ID ativo ou o ID ativo não existe mais na lista, seleciona o primeiro
                if (!currentId || !items.find(l => l.id === currentId)) {
                    return items[0].id;
                }
                // Mantém o ID atual se ainda é válido
                return currentId;
            });
        });

        return unsubscribe;
    }, [selectedContentId]);

    // Resetar conteúdos e lições quando o tópico muda
    useEffect(() => {
        setSelectedContentId('');
        setActiveLessonId('');
    }, [selectedTopicId]);

    return {
        // Dados
        topics,
        contents,
        lessons,

        // Estados de seleção
        selectedTopicId,
        selectedContentId,
        activeLessonId,

        // Setters para navegação
        setSelectedTopicId,
        setSelectedContentId,
        setActiveLessonId,

        // Estados de sincronização
        lastUpdate,
    };
}
