/**
 * Shared screenshot capture utility that hides sidebar and toggle button
 * @param {Function} captureFunction - Function that actually captures the screenshot
 * @param {Function} hideSidebar - Function to hide sidebar
 * @param {Function} showSidebar - Function to show sidebar
 * @param {Function} hideToggleButton - Function to hide toggle button
 * @param {Function} showToggleButton - Function to show toggle button
 * @returns {Promise<string|undefined>} - Base64 screenshot data
 */
export async function captureScreenshotWithSidebarHiding(
  captureFunction: () => Promise<string | undefined>,
  hideSidebar: () => void,
  showSidebar: () => void,
  hideToggleButton: () => void,
  showToggleButton: () => void
): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      // Create and show the modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff6b65;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      modal.textContent = 'Taking screenshot...';
      document.body.appendChild(modal);

      // Hide the sidebar
      hideSidebar();

      // Wait longer for the sidebar to hide and modal to be visible, then take the screenshot
      setTimeout(() => {
        // Hide the toggle button
        hideToggleButton();

        // Remove the modal first
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }

        // Wait a bit more for the modal removal to complete, then take screenshot
        setTimeout(async () => {
          const result = await captureFunction();
          
          // Show the sidebar again
          showSidebar();

          // Restore the toggle button
          showToggleButton();

          resolve(result);
        }, 100); // Wait 100ms for modal removal to complete
      }, 500); // Wait 500ms for sidebar animation to complete
    } catch (e) {
      console.error('Screenshot capture exception:', e);
      resolve(undefined);
    }
  });
} 