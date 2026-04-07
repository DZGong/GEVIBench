/// <reference types="vite/client" />
declare const __BUILD_DATE__: string;

declare module 'virtual:gevi-git-dates' {
  const dates: Record<string, string>;
  export default dates;
}
