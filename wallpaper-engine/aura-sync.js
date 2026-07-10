(function () {
  'use strict';

  // Aura Ready Game SDK 的本机 REST 服务。未安装时会静默重试，不影响壁纸本身。
  var endpoint = 'http://127.0.0.1:27339/AuraSDK';
  var devices = [];
  var initialized = false;
  var initializing = false;
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
        throw new Error('Aura REST request failed');
      }
      return response.json();
    });
  }

  function deviceNames(response) {
    return Object.keys(response).filter(function (name) {
      return name !== 'result' && response[name] && response[name].count;
    });
  }

  function initialize() {
    var now = Date.now();
    if (initialized || initializing || now < nextRetryAt) {
      return;
    }

    initializing = true;
    request('', {
      method: 'POST',
      body: JSON.stringify({ category: 'SDK' })
    }).then(function (result) {
      if (String(result.result) !== '0') {
        throw new Error('Aura SDK refused control');
      }
      return request('/AuraDevice', { method: 'GET' });
    }).then(function (response) {
      devices = deviceNames(response);
      if (!devices.length) {
        throw new Error('No Aura devices found');
      }
      initialized = true;
      initializing = false;
      sendFrame(true);
    }).catch(function () {
      // 允许用户在壁纸运行期间启动 Aura 服务后自动重新检测。
      initialized = false;
      initializing = false;
      nextRetryAt = Date.now() + 30000;
    });
  }

  // Aura 的 REST 接口使用 BGR 整数：0x00BBGGRR。
  function bgrColor(bass, energy) {
    var pulse = Math.min(1, bass * 1.8 + energy * 0.5);
    var brightness = Math.min(1, 0.18 + energy * 1.35 + bass * 0.45);
    var red = Math.round((58 + 197 * pulse) * brightness);
    var green = Math.round((230 - 144 * pulse) * brightness);
    var blue = Math.round((255 - 32 * pulse) * brightness);
    return (blue << 16) | (green << 8) | red;
  }

  function sendFrame(force) {
    var now = Date.now();
    var color;
    var payload;

    if (!initialized || (!force && now - lastSentAt < 80)) {
      return;
    }

    color = String(bgrColor(pendingBass, pendingEnergy));
    payload = {
      data: devices.map(function (device) {
        return {
          device: device,
          range: 'all',
          color: color,
          apply: 'true'
        };
      })
    };
    lastSentAt = now;
    request('/AuraDevice', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }).catch(function () {
      initialized = false;
      nextRetryAt = Date.now() + 30000;
    });
  }

  function release() {
    if (!initialized) {
      return;
    }
    initialized = false;
    devices = [];
    request('', { method: 'DELETE' }).catch(function () {});
  }

  window.auraSyncBridge = {
    publish: function (bass, energy) {
      var now = Date.now();
      pendingBass = Math.max(0, Math.min(Number(bass) || 0, 1));
      pendingEnergy = Math.max(0, Math.min(Number(energy) || 0, 1));

      // 静音时恢复 Armoury Crate/Aura 的原有效果；有音乐时才接管灯光。
      if (pendingEnergy < 0.008) {
        if (initialized && now - lastActiveAt > 1500) {
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
