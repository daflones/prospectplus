/**
 * Normaliza o nome do usuário para criar um nome de instância válido
 * Remove espaços, pontos, traços e caracteres especiais
 * Converte ç para c
 */
export function normalizeInstanceName(userName: string): string {
  return userName
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/ç/g, 'c') // Substitui ç por c
    .replace(/[^a-z0-9]/g, '') // Remove tudo que não é letra ou número
    .slice(0, 30); // Limita a 30 caracteres
}

/**
 * Valida se o nome da instância é válido
 */
export function isValidInstanceName(instanceName: string): boolean {
  return /^[a-z0-9]+$/.test(instanceName) && instanceName.length > 0 && instanceName.length <= 30;
}
