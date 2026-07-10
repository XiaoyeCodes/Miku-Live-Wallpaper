(function () {
  'use strict';

  // 每个场景代表该时段的视觉锚点。相邻锚点之间会持续、平滑地混合。
  // 修改 minute 即可调整图片最接近完整呈现的本地时间（24 小时制）。
  var scenes = [
    { minute: 5 * 60, name: '晨曦', file: 'gen-locked-scene-time/晨曦.png' },
    { minute: 7 * 60, name: '早晨', file: 'gen-locked-scene-time/早晨.png' },
    { minute: 9 * 60, name: '上午', file: 'gen-locked-scene-time/上午.png' },
    { minute: 12 * 60, name: '中午', file: 'gen-locked-scene-time/中午.png' },
    { minute: 14 * 60, name: '下午', file: 'gen-locked-scene-time/下午.png' },
    { minute: 17 * 60 + 30, name: '傍晚', file: 'gen-locked-scene-time/傍晚.png' },
    { minute: 20 * 60, name: '晚上', file: 'gen-locked-scene-time/晚上.png' }
  ];

  var MINUTES_PER_DAY = 24 * 60;
  var BAR_COUNT = 48;
  var baseLayer = document.getElementById('base-layer');
  var blendLayer = document.getElementById('blend-layer');
  var audioCanvas = document.getElementById('audio-visualizer');
  var audioContext = audioCanvas.getContext('2d');
  var activeSegment = -1;
  var ready = false;
  var lastFrame = 0;
  var canvasWidth = 0;
  var canvasHeight = 0;
  var targetBars = new Array(BAR_COUNT);
  var renderedBars = new Array(BAR_COUNT);
  var targetBass = 0;
  var renderedBass = 0;
  var targetEnergy = 0;
  var renderedEnergy = 0;
  var barIndex;

  for (barIndex = 0; barIndex < BAR_COUNT; barIndex += 1) {
    targetBars[barIndex] = 0;
    renderedBars[barIndex] = 0;
  }

  function localMinuteOfDay(now) {
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000;
  }

  // smootherstep 比线性淡化更自然：开始和结束都没有突然的速度变化。
  function smootherstep(value) {
    var x = Math.max(0, Math.min(1, value));
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function currentSegment(minuteOfDay) {
    var index;
    for (index = scenes.length - 1; index >= 0; index -= 1) {
      if (minuteOfDay >= scenes[index].minute) {
        return index;
      }
    }
    return scenes.length - 1;
  }

  function segmentProgress(index, minuteOfDay) {
    var start = scenes[index].minute;
    var nextIndex = (index + 1) % scenes.length;
    var end = scenes[nextIndex].minute;
    var adjustedMinute = minuteOfDay;

    if (nextIndex === 0) {
      end += MINUTES_PER_DAY;
    }
    if (adjustedMinute < start) {
      adjustedMinute += MINUTES_PER_DAY;
    }

    return (adjustedMinute - start) / (end - start);
  }

  function preload(file) {
    var image = new Image();
    image.src = file;
  }

  function clampAudio(value) {
    return Math.max(0, Math.min(Number(value) || 0, 1));
  }

  function resizeVisualizer() {
    // 限制内部分辨率，确保在高 DPI / 4K 屏幕上仍保持很低的绘制开销。
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = Math.max(1, window.innerWidth);
    canvasHeight = Math.max(1, window.innerHeight);
    audioCanvas.width = Math.round(canvasWidth * pixelRatio);
    audioCanvas.height = Math.round(canvasHeight * pixelRatio);
    audioContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function averageBand(audioArray, start, end) {
    var total = 0;
    var count = 0;
    var index;
    for (index = start; index < end; index += 1) {
      total += (clampAudio(audioArray[index]) + clampAudio(audioArray[index + 64])) * 0.5;
      count += 1;
    }
    return count ? total / count : 0;
  }

  // Wallpaper Engine 每次传入 128 个值：前 64 个为左声道，后 64 个为右声道。
  function wallpaperAudioListener(audioArray) {
    var index;
    var start;
    var end;

    for (index = 0; index < BAR_COUNT; index += 1) {
      start = Math.floor(index * 64 / BAR_COUNT);
      end = Math.max(start + 1, Math.floor((index + 1) * 64 / BAR_COUNT));
      targetBars[index] = averageBand(audioArray, start, end);
    }

    targetBass = averageBand(audioArray, 0, 9);
    targetEnergy = averageBand(audioArray, 0, 40);

    if (window.auraSyncBridge) {
      window.auraSyncBridge.publish(targetBass, targetEnergy);
    }
  }

  function drawVisualizer() {
    var index;
    var barGap;
    var barWidth;
    var barHeight;
    var x;
    var y;
    var centerX;
    var centerY;
    var radius;
    var ringAlpha;
    var minDimension;

    for (index = 0; index < BAR_COUNT; index += 1) {
      renderedBars[index] += (targetBars[index] - renderedBars[index]) * 0.24;
    }
    renderedBass += (targetBass - renderedBass) * 0.18;
    renderedEnergy += (targetEnergy - renderedEnergy) * 0.18;

    audioContext.clearRect(0, 0, canvasWidth, canvasHeight);
    if (renderedEnergy < 0.004) {
      return;
    }

    audioContext.save();
    audioContext.globalCompositeOperation = 'lighter';
    minDimension = Math.min(canvasWidth, canvasHeight);

    // 节奏光环放在天空区域，透明度由低频（鼓点）驱动。
    centerX = canvasWidth * 0.78;
    centerY = canvasHeight * 0.16;
    radius = minDimension * (0.045 + renderedBass * 0.055);
    ringAlpha = Math.min(0.45, renderedBass * 0.58 + renderedEnergy * 0.12);
    audioContext.lineWidth = 1.5 + renderedBass * 4;
    audioContext.shadowBlur = 14 + renderedBass * 28;
    audioContext.shadowColor = 'rgba(99, 235, 255, 0.8)';
    audioContext.strokeStyle = 'rgba(118, 240, 255, ' + ringAlpha + ')';
    audioContext.beginPath();
    audioContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
    audioContext.stroke();
    audioContext.strokeStyle = 'rgba(255, 121, 211, ' + (ringAlpha * 0.7) + ')';
    audioContext.beginPath();
    audioContext.arc(centerX, centerY, radius * (1.18 + renderedBass * 0.18), 0, Math.PI * 2);
    audioContext.stroke();

    // 48 条频闪柱沿底部展开，低频更高，高频更细碎。
    audioContext.shadowBlur = 0;
    barGap = Math.max(2, canvasWidth * 0.0018);
    barWidth = (canvasWidth - barGap * (BAR_COUNT + 1)) / BAR_COUNT;
    for (index = 0; index < BAR_COUNT; index += 1) {
      barHeight = Math.max(2, canvasHeight * (0.018 + renderedBars[index] * 0.17));
      x = barGap + index * (barWidth + barGap);
      y = canvasHeight - barHeight;
      audioContext.fillStyle = index % 2 ?
        'rgba(105, 231, 255, ' + (0.18 + renderedBars[index] * 0.64) + ')' :
        'rgba(255, 115, 210, ' + (0.14 + renderedBars[index] * 0.54) + ')';
      audioContext.fillRect(x, y, barWidth, barHeight);
    }
    audioContext.restore();
  }

  function setSegment(index) {
    var nextIndex = (index + 1) % scenes.length;
    activeSegment = index;

    // 浏览器只保留当前与下一张为可见层；其余只做轻量预读，避免高分辨率贴图堆积。
    baseLayer.src = scenes[index].file;
    blendLayer.src = scenes[nextIndex].file;
    blendLayer.style.opacity = '0';
    document.title = '时光锁屏场景 - ' + scenes[index].name;
    preload(scenes[(nextIndex + 1) % scenes.length].file);
  }

  function render(now) {
    var minute = localMinuteOfDay(now);
    var index = currentSegment(minute);

    if (index !== activeSegment) {
      setSegment(index);
    }

    blendLayer.style.opacity = String(smootherstep(segmentProgress(index, minute)));
  }

  function frame(timestamp) {
    // 每帧计算透明度以实现流畅过渡；静态画面不进行 Canvas/WebGL 绘制。
    if (timestamp - lastFrame >= 1000 / 30) {
      render(new Date());
      drawVisualizer();
      lastFrame = timestamp;
    }
    window.requestAnimationFrame(frame);
  }

  function start() {
    if (ready) {
      return;
    }
    ready = true;
    render(new Date());
    window.requestAnimationFrame(frame);
  }

  // 等首张图可显示后再启动，避免导入 Wallpaper Engine 时闪黑。
  baseLayer.addEventListener('load', start, { once: true });
  baseLayer.addEventListener('error', start, { once: true });
  resizeVisualizer();
  window.addEventListener('resize', resizeVisualizer);
  if (typeof window.wallpaperRegisterAudioListener === 'function') {
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
  }
  setSegment(currentSegment(localMinuteOfDay(new Date())));
}());
