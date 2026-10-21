export function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
