type DesktopPlatform = 'darwin' | 'win32' | 'linux';

type DesktopWindowApi = {
  isDesktop: true;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getPlatform: () => Promise<DesktopPlatform>;
  getIsMaximized: () => Promise<boolean>;
  onMaximizedChange: (fn: (isMaximized: boolean) => void) => () => void;
};

declare global {
  interface Window {
    desktopWindow?: DesktopWindowApi;
  }
}

export {};
