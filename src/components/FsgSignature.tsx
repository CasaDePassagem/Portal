const LOGO_URL = `${import.meta.env.BASE_URL ?? '/'}images/fsg-star.png`;

export const FSG_TEAM_MEMBERS = [
  'Pedro Bolson',
  'Lucas Risson',
  'Mateus Cosma',
  'Érick Paludo',
  'Giovani de Chaves Rigotti',
  'Leonardo Simioni',
] as const;

type FsgSignatureProps = {
  className?: string;
  showCaption?: boolean;
  orientation?: 'row' | 'column';
  gap?: 'none' | 'tight' | 'normal';
};

const LOGO_CLASS = 'h-20';

export function FsgSignature({
  className = '',
  showCaption = true,
  orientation = 'row',
  gap = 'tight',
}: FsgSignatureProps) {
  const flexDirection = orientation === 'column' ? 'flex-col' : 'flex-row';
  const gapClass =
    gap === 'none' ? 'gap-0' : gap === 'tight' ? 'gap-1' : orientation === 'column' ? 'gap-2' : 'gap-3';
  const isColumn = orientation === 'column';

  return (
    <div className={`flex ${flexDirection} ${gapClass} items-center select-none ${className}`}>
      <img
        src={LOGO_URL}
        alt="Faculdade da Serra Gaúcha"
        loading="lazy"
        decoding="async"
        className={`${LOGO_CLASS} w-auto rounded-full object-cover`}
      />
      {showCaption && (
        <div
          className={`text-xs leading-tight text-black dark:text-white/90 ${
            isColumn ? 'text-center' : '-ml-2'
          }`}
        >
          <p className="font-semibold text-black dark:text-white leading-tight">Projeto Integrador</p>
          <p className="text-gray-700 dark:text-gray-200 leading-tight">Faculdade da Serra Gaúcha</p>
        </div>
      )}
    </div>
  );
}
