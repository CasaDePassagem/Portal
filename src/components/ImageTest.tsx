import { getCategoryInfo } from '../lib/courseUtils';

interface ImageTestProps {
    topics: Array<{
        id: string;
        name: string;
        coverImageUrl?: string;
        category?: string;
    }>;
}

export function ImageTest({ topics }: ImageTestProps) {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div className="fixed bottom-4 right-4 max-w-sm bg-black/90 text-white p-4 rounded-lg text-xs max-h-64 overflow-y-auto z-50">
            <div className="font-bold mb-2">🐛 Debug de Imagens</div>
            {topics.slice(0, 3).map((topic) => {
                const categoryInfo = getCategoryInfo(topic.category);
                return (
                    <div key={topic.id} className="mb-2 p-2 bg-white/10 rounded">
                        <div className="font-medium">{topic.name}</div>
                        <div className="text-gray-300">
                            URL: {topic.coverImageUrl || 'Sem URL'}
                        </div>
                        <div className="text-gray-300">
                            Categoria: {topic.category || 'Sem categoria'} ({categoryInfo.name})
                        </div>
                        {topic.coverImageUrl && (
                            <img
                                src={topic.coverImageUrl}
                                alt={topic.name}
                                className="w-16 h-9 object-cover rounded mt-1"
                                onLoad={() => console.log(`✅ OK: ${topic.name}`)}
                                onError={() => console.log(`❌ ERRO: ${topic.name} - ${topic.coverImageUrl}`)}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}