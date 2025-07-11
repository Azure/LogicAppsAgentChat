export interface PopupWindowOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export interface PopupWindowResult {
  closed: boolean;
  error?: Error;
}

/**
 * Opens a popup window and returns a promise that resolves when the window is closed
 */
export async function openPopupWindow(
  url: string,
  windowName: string = 'a2a-auth',
  options: PopupWindowOptions = {}
): Promise<PopupWindowResult> {
  const {
    width = 600,
    height = 700,
    left = window.screenX + (window.outerWidth - width) / 2,
    top = window.screenY + (window.outerHeight - height) / 2,
  } = options;

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'menubar=no',
    'scrollbars=yes',
    'resizable=yes',
    'status=no',
  ].join(',');

  const popup = window.open(url, windowName, features);

  if (!popup) {
    throw new Error('Failed to open popup window. Please check your popup blocker settings.');
  }

  // Focus the popup
  popup.focus();

  return new Promise<PopupWindowResult>((resolve) => {
    const checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkInterval);
          resolve({ closed: true });
        }
      } catch (error) {
        // Cross-origin errors are expected when checking the popup
        // We can safely ignore them and continue checking if the window is closed
      }
    }, 500);

    // Optional: Add a timeout to prevent indefinite waiting
    const timeout = setTimeout(
      () => {
        clearInterval(checkInterval);
        if (!popup.closed) {
          popup.close();
        }
        resolve({
          closed: true,
          error: new Error('Authentication timeout - window was closed automatically'),
        });
      },
      10 * 60 * 1000
    ); // 10 minutes timeout

    // Clean up timeout if window closes normally
    const originalResolve = resolve;
    resolve = (result) => {
      clearTimeout(timeout);
      originalResolve(result);
    };
  });
}

/**
 * Check if we're in a browser environment that supports popups
 */
export function isPopupSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.open === 'function';
}
