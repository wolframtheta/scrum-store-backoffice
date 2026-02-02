/**
 * Estructura de la resposta d'error del backend (NestJS HttpException).
 * El camp `message` pot ser string o string[] (validation errors).
 */
export interface HttpErrorResponseDto {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/**
 * Extreu el missatge d'error d'una HttpErrorResponse del backend.
 * Sempre retorna un string vàlid per mostrar a l'usuari.
 */
export function getErrorMessage(error: unknown, fallback = 'S\'ha produït un error'): string {
  if (!error) return fallback;

  const err = error as { error?: HttpErrorResponseDto; message?: string };
  const body = err?.error;

  if (body && typeof body === 'object' && body.message) {
    if (Array.isArray(body.message)) {
      return body.message.join('. ') || fallback;
    }
    return body.message;
  }

  if (typeof err?.message === 'string') {
    return err.message;
  }

  return fallback;
}
