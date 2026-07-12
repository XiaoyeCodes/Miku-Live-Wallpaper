(function () {
  'use strict';

  var endpoint = 'http://127.0.0.1:27340';
  var available = false;
  var checking = false;
  var nextRetryAt = 0;
  var lastSentAt = 0;
  var lastActiveAt = 0;
  var pendingBass = 0;
  var pendingEnergy = 0;

  function request(path, options) {
    var requestOptions = options || {};

    requestOptions.headers = { 'Content-Type': 'application/json' };
    requestOptions.cache = 'no-store';
    return window.fetch(endpoint + path, requestOptions).then(function (response) {
      if (!response.ok) {
        throw new Error('Aura bridge request failed');
      }
      return response.json();
    });
  }

  function initialize() {
    var now = Date.now();

    if (available || checking || now < nextRetryAt) {
      return;
    }
    checking = true;
    request('/health', { method: 'GET' }).then(function () {
      available = true;
      checking = false;
      sendFrame(true);
    }).catch(function () {
      available = false;
      checking = false;
      nextRetryAt = Date.now() + 30000;
    });
  }

  function sendFrame(force) {
    var now = Date.now();

    if (!available || (!force && now - lastSentAt < 80)) {
      return;
    }
    lastSentAt = now;
    request('/frame', {
      method: 'POST',
      body: JSON.stringify({ bass: pendingBass, energy: pendingEnergy })
    }).catch(function () {
      available = false;
      nextRetryAt = Date.now() + 30000;
    });
  }

  function release() {
    available = false;
    request('/release', { method: 'POST' }).catch(function () {});
  }

  window.auraSyncBridge = {
    publish: function (bass, energy) {
      var now = Date.now();

      pendingBass = Math.max(0, Math.min(Number(bass) || 0, 1));
      pendingEnergy = Math.max(0, Math.min(Number(energy) || 0, 1));
      if (pendingEnergy < 0.008) {
        if (available && now - lastActiveAt > 1500) {
          release();
        }
        return;
      }
      lastActiveAt = now;
      initialize();
      sendFrame(false);
    },
    release: release
  };

  window.addEventListener('pagehide', release);
  window.addEventListener('beforeunload', release);
}());
