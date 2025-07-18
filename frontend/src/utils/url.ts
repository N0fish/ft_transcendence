export const getUrlParams = (url: string, params: string[]): string[] => {
  const sp = new URLSearchParams(url);
  return params.map((p: string): string => sp.get(p) || "");
}