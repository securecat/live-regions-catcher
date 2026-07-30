chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => {
    console.error('Live Regions Catcher: failed to set side panel behavior', error);
  });
