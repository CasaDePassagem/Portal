import { useMemo, useState } from 'react';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { CategoryIcon } from '../../components/CategoryIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Clock, ChevronRight, BookOpen, CheckCircle2, User, LogOut } from 'lucide-react';
import { useLearner } from '../../context/LearnerContext';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { LearnerAccess } from '../../components/LearnerAccess';
import { RealtimeIndicator } from '../../components/RealtimeIndicator';
import { TopicCard } from '../../components/shared/TopicCard';
import { ContentCard } from '../../components/shared/ContentCard';
import { LessonCard } from '../../components/shared/LessonCard';
import { SearchInput } from '../../components/shared/SearchInput';
import { hydrateFromRemote } from '../../lib/remoteSync';
import InstantTooltip from '../../components/InstantTooltip';

export function CoursesPage() {
  const { learner, progress, setLearner } = useLearner();
  const {
    topics,
    contents,
    lessons,
    selectedTopicId,
    selectedContentId,
    activeLessonId,
    setSelectedTopicId,
    setSelectedContentId,
    setActiveLessonId,
    lastUpdate
  } = useRealtimeData();

  const [topicQuery, setTopicQuery] = useState('');
  const [contentQuery, setContentQuery] = useState('');
  const [showLearnerAccess, setShowLearnerAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await hydrateFromRemote();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeLesson = useMemo(() => lessons.find(l => l.id === activeLessonId) || null, [lessons, activeLessonId]);
  const selectedTopicName = useMemo(() => topics.find(t => t.id === selectedTopicId)?.name || '', [topics, selectedTopicId]);
  const selectedContentTitle = useMemo(() => contents.find(c => c.id === selectedContentId)?.title || '', [contents, selectedContentId]);
  const activeLessonDescription = activeLesson?.description?.trim();
  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(t => t.name.toLowerCase().includes(q));
  }, [topics, topicQuery]);
  const filteredContents = useMemo(() => {
    const q = contentQuery.trim().toLowerCase();
    if (!q) return contents;
    return contents.filter(c => [c.title, c.description || ''].some(v => v.toLowerCase().includes(q)));
  }, [contents, contentQuery]);

  const progressByLesson = useMemo(() => {
    const map: Record<string, typeof progress[number]> = {};
    progress.forEach((entry) => {
      map[entry.lessonId] = entry;
    });
    return map;
  }, [progress]);

  const completedLessonsCount = useMemo(() => {
    return lessons.reduce((acc, lesson) => acc + (progressByLesson[lesson.id]?.completed ? 1 : 0), 0);
  }, [lessons, progressByLesson]);

  const totalWatchSeconds = useMemo(() => {
    return lessons.reduce((acc, lesson) => acc + (progressByLesson[lesson.id]?.lastPosition ?? 0), 0);
  }, [lessons, progressByLesson]);

  const formattedWatchTime = useMemo(() => {
    if (totalWatchSeconds <= 0) return '0 min';
    const hours = Math.floor(totalWatchSeconds / 3600);
    const minutes = Math.round((totalWatchSeconds % 3600) / 60);
    if (hours === 0) {
      return `${Math.max(minutes, 1)} min`;
    }
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }, [totalWatchSeconds]);

  const stage: 'topics' | 'contents' | 'lessons' = !selectedTopicId ? 'topics' : !selectedContentId ? 'contents' : 'lessons';

  return (
    <div className="min-h-[100svh] bg-theme-base text-theme-primary">
      <div className="max-w-[1200px] xl:max-w-[1400px] mx-auto px-6 pt-24 pb-10 space-y-6">
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Mini Cursos</h1>
            <p className="text-theme-secondary">Explore tópicos, conteúdos e assista aulas incorporadas do YouTube.</p>
          </div>

          {learner ? (
            <div className="flex items-center gap-3">
              {/* Botão Atualizar Dados */}
              <InstantTooltip tooltip="Atualizar conteúdos" position="bottom">
                <motion.button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-600 transition-colors duration-300 flex items-center justify-center border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={!isRefreshing ? {
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  } : {}}
                  whileTap={!isRefreshing ? {
                    scale: 0.95,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  } : {}}
                >
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                    transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </motion.svg>
                </motion.button>
              </InstantTooltip>

              <div className="px-4 py-2 bg-green-100 border border-green-300 text-green-700 rounded-xl flex items-center gap-3">
                <User size={16} />
                <div className="leading-tight">
                  <div className="font-medium">{learner.displayName}</div>
                  <div className="text-[11px] uppercase tracking-wide opacity-75">{learner.id}</div>
                </div>
              </div>
              <button
                onClick={() => setLearner(null)}
                className="px-3 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Botão Atualizar Dados */}
              <InstantTooltip tooltip="Atualizar conteúdos" position="bottom">
                <motion.button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-600 transition-colors duration-300 flex items-center justify-center border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={!isRefreshing ? {
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  } : {}}
                  whileTap={!isRefreshing ? {
                    scale: 0.95,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  } : {}}
                >
                  <motion.svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                    transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </motion.svg>
                </motion.button>
              </InstantTooltip>

              <button
                onClick={() => setShowLearnerAccess(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <User size={16} />
                Rastreio de progresso
              </button>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {stage === 'topics' && (
            <motion.section key="topics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Escolha um tópico</h2>
                  <p className="text-sm text-theme-secondary">Explore diferentes áreas de conhecimento</p>
                </div>
                <div className="w-full sm:w-auto">
                  <SearchInput
                    value={topicQuery}
                    onChange={setTopicQuery}
                    placeholder="Buscar tópicos..."
                    className="w-full sm:w-80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTopics.map((t) => (
                  <TopicCard
                    key={t.id}
                    topic={t}
                    isSelected={selectedTopicId === t.id}
                    onClick={() => { setSelectedTopicId(t.id); setTopicQuery(''); }}
                    enableMotion={true}
                  />
                ))}
                {filteredTopics.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Search size={64} className="mx-auto mb-4 text-theme-secondary opacity-50" />
                    <div className="text-lg font-medium text-theme-secondary">Nenhum tópico encontrado</div>
                    <div className="text-sm text-theme-secondary">Tente buscar com outros termos</div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {stage === 'contents' && (
            <motion.section key="contents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <nav className="flex items-center gap-2 mb-2 text-sm">
                    <button
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); }}
                    >
                      <Home size={14} />
                      <span>Tópicos</span>
                    </button>
                    <ChevronRight size={14} className="text-theme-secondary" />
                    <span className="text-theme-primary font-medium">{selectedTopicName}</span>
                  </nav>
                  <h2 className="text-xl font-semibold">Cursos disponíveis</h2>
                  <p className="text-sm text-theme-secondary">Escolha um curso para começar sua jornada de aprendizado</p>
                </div>
                <div className="w-full sm:w-auto">
                  <SearchInput
                    value={contentQuery}
                    onChange={setContentQuery}
                    placeholder="Buscar cursos..."
                    className="w-full sm:w-80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredContents.map((c) => (
                  <ContentCard
                    key={c.id}
                    content={c}
                    isSelected={selectedContentId === c.id}
                    onClick={() => setSelectedContentId(c.id)}
                    enableMotion={true}
                  />
                ))}
                {filteredContents.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <BookOpen size={64} className="mx-auto mb-4 text-theme-secondary opacity-50" />
                    <div className="text-lg font-medium text-theme-secondary">Nenhum curso encontrado</div>
                    <div className="text-sm text-theme-secondary">Tente buscar com outros termos</div>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {stage === 'lessons' && (
            <motion.section key="lessons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="space-y-3">
                <nav className="flex items-center gap-2 text-sm">
                  <button
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    onClick={() => { setSelectedTopicId(''); setSelectedContentId(''); setActiveLessonId(''); }}
                  >
                    <Home size={14} />
                    <span>Tópicos</span>
                  </button>
                  <ChevronRight size={14} className="text-theme-secondary" />
                  <button
                    className="text-blue-500 hover:text-blue-600"
                    onClick={() => { setSelectedContentId(''); setActiveLessonId(''); }}
                  >
                    {selectedTopicName}
                  </button>
                  <ChevronRight size={14} className="text-theme-secondary" />
                  <span className="text-theme-primary font-medium">{selectedContentTitle}</span>
                </nav>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Aulas do curso</h2>
                  <div className="flex items-center gap-4 text-sm text-theme-secondary">
                    <div className="flex items-center gap-2">
                      <CategoryIcon Icon={BookOpen} size={14} />
                      <span>{lessons.length} aulas</span>
                    </div>
                    {learner && (
                      <>
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                          <CheckCircle2 size={14} />
                          <span>{completedLessonsCount} de {lessons.length} concluídas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formattedWatchTime} assistidos</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-3">
                  <div className="rounded-2xl border border-theme p-1 bg-theme-surface">
                    {activeLesson ? (
                      <YouTubePlayer
                        url={activeLesson.youtubeUrl}
                        title={activeLesson.title}
                        lessonId={activeLessonId}
                        contentId={selectedContentId}
                        topicId={selectedTopicId}
                        contentTitle={selectedContentTitle}
                        topicTitle={selectedTopicName}
                      />
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-theme-base grid place-items-center text-theme-muted">Selecione uma aula</div>
                    )}
                  </div>
                  {activeLessonDescription && (
                    <div className="px-4 py-3 rounded-xl bg-theme-surface text-sm leading-relaxed text-theme-secondary">
                      {activeLessonDescription}
                    </div>
                  )}
                </div>
                <aside className="space-y-2">
                  <div className="rounded-2xl border border-theme bg-theme-surface p-3">
                    <h3 className="font-medium mb-2">Aulas</h3>
                    {lessons.length === 0 && <div className="text-sm text-theme-secondary">Nenhuma aula</div>}
                    <ul className="space-y-2">
                      {lessons.map((l, idx) => (
                        <LessonCard
                          key={l.id}
                          lesson={l}
                          index={idx}
                          isActive={l.id === activeLessonId}
                          onClick={() => setActiveLessonId(l.id)}
                          progressData={progressByLesson[l.id] ? {
                            completed: progressByLesson[l.id].completed,
                            lastPosition: progressByLesson[l.id].lastPosition,
                            duration: progressByLesson[l.id].duration
                          } : undefined}
                          showProgress={true}
                        />
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <LearnerAccess
        isOpen={showLearnerAccess}
        onClose={() => setShowLearnerAccess(false)}
      />

      <RealtimeIndicator
        lastUpdate={lastUpdate}
      />
    </div>
  );
}
