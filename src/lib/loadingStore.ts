// Estado global de loading simples (sem dependências extras)
type LoadingState = {
    isLoading: boolean;
    message: string;
};

const state: LoadingState = {
    isLoading: true,
    message: 'Carregando dados...',
};

const listeners = new Set<(state: LoadingState) => void>();

export function setLoading(loading: boolean, message = 'Carregando...') {
    state.isLoading = loading;
    state.message = message;
    listeners.forEach((listener) => listener({ ...state }));
}

export function getLoadingState() {
    return { ...state };
}

export function subscribeToLoading(listener: (state: LoadingState) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
