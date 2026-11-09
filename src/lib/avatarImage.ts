const AVATAR_MAX_DIMENSION = 512;
const AVATAR_MAX_BYTES = 500 * 1024;
const AVATAR_OUTPUT_TYPE = 'image/jpeg';

const ALLOWED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const ALLOWED_INPUT_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function isAllowedAvatarInput(file: File): boolean {
  if (file.type && ALLOWED_INPUT_TYPES.has(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return !!ext && ALLOWED_INPUT_EXTS.has(ext);
}

export async function prepareAvatarImage(file: File): Promise<Blob> {
  if (!isAllowedAvatarInput(file)) {
    throw new Error('Por favor, envie uma imagem JPEG, PNG ou WebP');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > AVATAR_MAX_DIMENSION ? AVATAR_MAX_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem');

    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    let blob: Blob | null = null;
    while (quality >= 0.4) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, AVATAR_OUTPUT_TYPE, quality);
      });
      if (blob && blob.size <= AVATAR_MAX_BYTES) return blob;
      quality -= 0.1;
    }

    throw new Error('A imagem é muito grande mesmo após compressão. Tente uma foto menor.');
  } finally {
    bitmap.close();
  }
}

export function avatarUploadErrorMessage(err: Error & { statusCode?: string | number }): string {
  const msg = (err.message ?? '').toLowerCase();
  const status = String(err.statusCode ?? '');

  if (
    status === '413' ||
    msg.includes('413') ||
    msg.includes('entity too large') ||
    msg.includes('payload too large')
  ) {
    return 'A foto excede o limite de upload do servidor. Tente uma imagem menor ou solicite aumento do client_max_body_size.';
  }
  if (msg.includes('cors') || msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Envio bloqueado por CORS no host de armazenamento do Supabase. Um administrador deve liberar ' + window.location.origin + ' nas configurações de CORS.';
  }
  if (msg.includes('row-level security') || status === '403' || msg.includes('unauthorized')) {
    return 'Permissão negada. Certifique-se de que a migração do bucket de avatares foi executada e que você está autenticado.';
  }
  if (msg.includes('mime') || msg.includes('not allowed') || msg.includes('invalid')) {
    return 'Formato de imagem não permitido. Use JPEG, PNG ou WebP.';
  }
  if (/bucket not found/i.test(err.message)) {
    return 'O armazenamento de avatares ainda não está configurado no banco de dados.';
  }
  return err.message || 'Falha no envio';
}
