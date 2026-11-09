import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { buildMailtoReferralLink, copyJobLink, incrementReferralShareCount, shareJob } from '@/lib/jobShare';
import { useApplicantAuth } from '@/hooks/useApplicantAuth';
import type { Job } from '@/types/jobs';
import { Copy, Mail, Share2, UserPlus } from 'lucide-react';

interface JobShareButtonProps {
  job: Pick<Job, 'title' | 'id'>;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onReferralShared?: () => void;
}

export function JobShareButton({
  job,
  variant = 'outline',
  size = 'sm',
  className,
  onReferralShared,
}: JobShareButtonProps) {
  const { toast } = useToast();
  const { user } = useApplicantAuth();
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const trackReferral = () => {
    if (user?.id) {
      incrementReferralShareCount(user.id);
      onReferralShared?.();
    }
  };

  const handleCopy = async () => {
    const copied = await copyJobLink(job.id);
    if (copied) {
      trackReferral();
      toast({ title: 'Link copiado', description: 'Link da vaga copiado para a área de transferência.' });
    } else {
      toast({ title: 'Falha ao copiar', description: 'Não foi possível copiar o link.', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const result = await shareJob(job);
    if (result === 'shared' || result === 'copied') {
      trackReferral();
    }
    if (result === 'copied') {
      toast({ title: 'Link copiado', description: 'Compartilhamento indisponível — o link foi copiado.' });
    } else if (result === 'unsupported') {
      toast({ title: 'Compartilhamento indisponível', description: 'Tente copiar o link ou enviar por e-mail.', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} type="button">
          <UserPlus className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Indicar Amigo</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canNativeShare && (
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={buildMailtoReferralLink(job)} onClick={trackReferral}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar por e-mail
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
