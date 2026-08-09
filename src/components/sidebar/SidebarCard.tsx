import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationArrow,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

type ColorTheme = 'blue' | 'green' | 'purple' | 'gray';

const colorConfig = {
  blue: {
    iconContainer: 'bg-blue-400/15 border border-blue-300/60',
    icon: 'text-blue-300',
    arrow: 'bg-blue-400/15 text-blue-300',
  },
  green: {
    iconContainer: 'bg-emerald-400/15 border border-emerald-300/60',
    icon: 'text-emerald-300',
    arrow: 'bg-emerald-400/15 text-emerald-300',
  },
  purple: {
    iconContainer: 'bg-violet-400/15 border border-violet-300/60',
    icon: 'text-violet-300',
    arrow: 'bg-violet-400/15 text-violet-300',
  },
  gray: {
    iconContainer: 'bg-cream/10 border border-cream/30',
    icon: 'text-cream/70',
    arrow: 'bg-cream/10 text-cream/70',
  },
} as const;

interface SidebarCardProps {
  colorTheme: ColorTheme;
  icon: IconDefinition;
  title: string;
  description: React.ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  children?: React.ReactNode;
}

export function SidebarCard({
  colorTheme,
  icon,
  title,
  description,
  onClick,
  showArrow = false,
  children,
}: SidebarCardProps) {
  const colors = colorConfig[colorTheme];

  return (
    <div
      className={cn(
        // One hover for every theme: the card sits on the deep surface, so
        // lifting it a little is legible where a tinted wash was not.
        'px-3 py-2.5 -mx-1 rounded-control transition-colors cursor-pointer border-l-[3px] border-l-transparent hover:bg-cream/[0.06]',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
            colors.iconContainer,
          )}
        >
          <FontAwesomeIcon
            icon={icon}
            className={cn('w-3.5 h-3.5', colors.icon)}
          />
        </div>
        <span className="text-ui font-medium text-cream truncate">{title}</span>
      </div>
      <div
        className={cn(
          'text-meta text-cream/55 mt-1 ml-10',
          showArrow && 'flex justify-between items-center',
        )}
      >
        {showArrow ? (
          <span className="flex-1">{description}</span>
        ) : (
          description
        )}
        {showArrow && (
          <div
            className={cn(
              'flex items-center justify-center p-1.5 rounded ml-2',
              colors.arrow,
            )}
          >
            <FontAwesomeIcon icon={faLocationArrow} className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
