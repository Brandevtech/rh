import { useState } from 'react';
import { Link } from 'react-router';
import { hasUnseenFeatures, markFeaturesAsSeen } from '@/lib/features';
import brandevLogo from '@/assets/brandev.png';

export function Footer() {
  const [unseen, setUnseen] = useState(() => hasUnseenFeatures());

  function handleFeaturesClick() {
    markFeaturesAsSeen();
    setUnseen(false);
  }

  return (
    <footer className="hidden md:block border-t bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap">
          <span>© {new Date().getFullYear()} RIA. Todos os direitos reservados.</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="flex items-center gap-1.5">
            Desenvolvido por
            <a
              href="https://github.com/Brandevtech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors group"
            >
              <img
                src={brandevLogo}
                alt="Brandev"
                className="h-4 w-4 rounded-full object-contain inline-block group-hover:scale-110 transition-transform"
              />
              <span className="underline underline-offset-2">Brandev</span>
            </a>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/help"
            className="hover:text-foreground transition-colors"
          >
            Ajuda & Guias
          </Link>
          <Link
            to="/features"
            onClick={handleFeaturesClick}
            className="relative flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Novidades & Recursos
            {unseen && (
              <span className="absolute -top-0.5 -right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>
        </div>
      </div>
    </footer>
  );
}
