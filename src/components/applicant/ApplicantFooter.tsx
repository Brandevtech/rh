import { useComplianceSettings } from '@/hooks/useSystemConfig';
import { safeExternalUrl } from '@/lib/utils';
import brandevLogo from '@/assets/brandev.png';

export function ApplicantFooter() {
  const { compliance } = useComplianceSettings();

  return (
    <footer className="hidden md:block border-t bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
          <span>© {new Date().getFullYear()} RIA.</span>
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
          {compliance.privacy_policy_url && safeExternalUrl(compliance.privacy_policy_url) && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <a
                href={safeExternalUrl(compliance.privacy_policy_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Privacidade
              </a>
            </>
          )}
        </div>
        {compliance.grievance_officer_name && compliance.grievance_officer_email && (
          <span className="text-center">
            Encarregado de DPO / Reclamações: {compliance.grievance_officer_name} (
            <a
              href={`mailto:${compliance.grievance_officer_email}`}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {compliance.grievance_officer_email}
            </a>
            )
          </span>
        )}
      </div>
    </footer>
  );
}
