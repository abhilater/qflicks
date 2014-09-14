chrome.app.runtime.onLaunched.addListener(function(launchData) {
  chrome.app.window.create('../page.html', {
    id: "qflicks",
    innerBounds: {
      width: 900,
      height: 620,
      minWidth: 900,
      minHeight: 620
    },
    frame: 'none'
  });
});

chrome.runtime.onInstalled.addListener(function() {
  console.log('installed');
});

chrome.runtime.onSuspend.addListener(function() { 
  // Do some simple clean-up tasks.
});
