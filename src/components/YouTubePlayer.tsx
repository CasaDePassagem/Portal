import { useEffect, useRef, useState, useCallback } from 'react';
import { useLearner } from '../context/LearnerContext';
import { saveLessonProgress, getLessonProgress, isLessonCompleted } from '../lib/progress';

const YT_API_SRC = 'https://www.youtube.com/iframe_api';
const PROGRESS_POLL_INTERVAL = 2000;
const SAVE_INTERVAL_SECONDS = 10;

declare global {
  interface Window {
    YT: {
      Player: new (element: string | HTMLElement, options: any) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
    _ytScriptLoadingPromise?: Promise<void>;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const byParam = parsed.searchParams.get('v');
      if (byParam) return byParam;
      const match = parsed.pathname.match(/\/embed\/([\w-]+)/);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

function loadYouTubeAPI(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (!window._ytScriptLoadingPromise) {
    window._ytScriptLoadingPromise = new Promise<void>((resolve) => {
      const existingScript = document.querySelector(`script[src="${YT_API_SRC}"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = YT_API_SRC;
        script.async = true;
        document.head.appendChild(script);
      }

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve();
      };
    });
  }

  return window._ytScriptLoadingPromise;
}

export type PlayerProgressUpdate = {
  currentTime: number;
  duration: number;
  completed: boolean;
};

type Props = {
  url: string;
  title?: string;
  className?: string;
  lessonId?: string;
  contentId?: string;
  topicId?: string;
  contentTitle?: string;
  topicTitle?: string;
  onProgressUpdate?: (data: PlayerProgressUpdate) => void;
};

export function YouTubePlayer({
  url,
  title: _title,
  className,
  lessonId,
  contentId,
  topicId,
  contentTitle: _contentTitle,
  topicTitle: _topicTitle,
  onProgressUpdate,
}: Props) {
  const { learner } = useLearner();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const lastSavedSecondRef = useRef(-1);
  const completedPersistedRef = useRef(false);
  const updateProgressRef = useRef<(forceSave?: boolean) => Promise<void> | undefined>(undefined);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const videoId = extractYouTubeId(url);

  useEffect(() => {
    lastSavedSecondRef.current = -1;
    completedPersistedRef.current = false;
  }, [lessonId, learner?.id]);

  const persistProgress = useCallback(async (currentTime: number, duration: number, completed: boolean) => {
    if (!learner || !lessonId) return;

    await saveLessonProgress({
      participantId: learner.id,
      lessonId,
      lastPosition: currentTime,
      duration,
      completed,
      contentId,
      topicId,
    });
  }, [learner, lessonId, contentId, topicId]);

  const updateProgress = useCallback(async (forceSave = false) => {
    if (!playerRef.current || !learner || !lessonId) return;

    const duration = playerRef.current.getDuration();
    if (duration <= 0) return;

    const currentTime = playerRef.current.getCurrentTime();
    const completed = isLessonCompleted(currentTime, duration);

    onProgressUpdate?.({ currentTime, duration, completed });

    if (completed) {
      if (!completedPersistedRef.current) {
        await persistProgress(duration, duration, true);
        completedPersistedRef.current = true;
        lastSavedSecondRef.current = Math.floor(duration);
      }
      return;
    }

    if (completedPersistedRef.current) return;

    const flooredTime = Math.floor(currentTime);
    if (forceSave || (flooredTime % SAVE_INTERVAL_SECONDS === 0 && flooredTime !== lastSavedSecondRef.current)) {
      await persistProgress(currentTime, duration, false);
      lastSavedSecondRef.current = flooredTime;
    }
  }, [learner, lessonId, onProgressUpdate, persistProgress]);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    let cancelled = false;
    let currentPlayer: YTPlayer | null = null;

    if (!videoId || !containerRef.current) {
      setIsPlayerReady(false);
      return undefined;
    }

    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        currentPlayer = new window.YT.Player(containerRef.current, {
          videoId,
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            enablejsapi: 1,
            fs: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: async (event: any) => {
              if (cancelled) return;
              setIsPlayerReady(true);

              if (learner && lessonId) {
                try {
                  const saved = await getLessonProgress(learner.id, lessonId);
                  if (saved) {
                    lastSavedSecondRef.current = Math.floor(saved.lastPosition || 0);
                    completedPersistedRef.current = saved.completed;
                    if (saved.lastPosition > 10 && event?.target) {
                      event.target.seekTo(saved.lastPosition, true);
                    }
                  }
                } catch (err) {
                  console.error('Error loading saved progress:', err);
                }
              }
            },
            onStateChange: (event: any) => {
              if (cancelled) return;
              const state = event?.data;

              if (progressTimerRef.current !== null && state !== window.YT.PlayerState.PLAYING) {
                window.clearInterval(progressTimerRef.current);
                progressTimerRef.current = null;
              }

              if (state === window.YT.PlayerState.PLAYING) {
                if (progressTimerRef.current === null) {
                  progressTimerRef.current = window.setInterval(() => {
                    void updateProgressRef.current?.();
                  }, PROGRESS_POLL_INTERVAL);
                }
              } else if (state === window.YT.PlayerState.PAUSED) {
                void updateProgressRef.current?.(true);
              } else if (state === window.YT.PlayerState.ENDED) {
                void updateProgressRef.current?.(true);
              }
            },
            onError: (error: any) => {
              console.error('YouTube Player Error:', error?.data);
            },
          },
        });

        playerRef.current = currentPlayer;
      })
      .catch((error) => {
        console.error('Failed to load YouTube Iframe API:', error);
      });

    return () => {
      cancelled = true;
      setIsPlayerReady(false);

      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      currentPlayer?.destroy();
      playerRef.current = null;
    };
  }, [videoId, learner?.id, lessonId]);

  if (!videoId) {
    return (
      <div className={"grid place-items-center border border-theme rounded-xl bg-theme-base text-theme-secondary " + (className || '')}>
        URL inválida do YouTube
      </div>
    );
  }

  return (
    <div className={"relative w-full overflow-hidden rounded-xl border border-theme bg-black " + (className || '')}>
      <div className="aspect-video w-full">
        <div ref={containerRef} className="w-full h-full">
          {!isPlayerReady && (
            <div className="w-full h-full bg-gray-900 grid place-items-center text-white">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <div>Carregando player...</div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
