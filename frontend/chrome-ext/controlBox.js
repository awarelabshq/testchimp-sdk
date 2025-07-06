// Inject a top-centered control box overlay into the main page
(function() {
  if (window.__tcControlBoxInjected) return;
  window.__tcControlBoxInjected = true;

  let overlay = null;

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'tc-control-box-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999999,
      background: '#222',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      padding: '8px 16px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    });

    // Select Element button
    const selectBtn = document.createElement('button');
    selectBtn.title = 'Select Element';
    selectBtn.innerHTML = '<svg width="18" height="18" fill="#fff"><rect x="2" y="2" width="14" height="14" stroke="#72BDA3" stroke-width="2" fill="none"/></svg>';
    Object.assign(selectBtn.style, {
      background: 'none',
      border: 'none',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    selectBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.postMessage({ type: 'startElementSelect' }, '*');
      hideOverlay();
    };

    // Draw Bounding Box button
    const boxBtn = document.createElement('button');
    boxBtn.title = 'Draw Bounding Box';
    boxBtn.innerHTML = '<svg width="18" height="18" fill="#fff"><rect x="4" y="4" width="10" height="10" stroke="#ff6b65" stroke-width="2" fill="none"/><rect x="2" y="2" width="14" height="14" stroke="#fff" stroke-width="1" fill="none"/></svg>';
    Object.assign(boxBtn.style, {
      background: 'none',
      border: 'none',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    boxBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.postMessage({ type: 'startBoxDraw' }, '*');
      hideOverlay();
    };

    overlay.appendChild(selectBtn);
    overlay.appendChild(boxBtn);
    document.body.appendChild(overlay);
  }

  function showOverlay() {
    if (!overlay) createOverlay();
    overlay.style.display = 'flex';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  // Listen for sidebar messages to show/hide overlay
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data.type !== 'string') return;
    if (event.data.type === 'showControlBox') showOverlay();
    if (event.data.type === 'hideControlBox') hideOverlay();
  });
})(); 