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
  var BAR_COUNT = 64;
  var circleBarCount = 72;
  var horizontalBarCount = 64;
  var TRANSITION_DURATION = 5000;
  var visualizerEnabled = true;
  var visualizerMode = 'horizontal';
  var targetFrameRate = 240;
  var renderQuality = 100;
  var visualizerX = 84;
  var visualizerY = 79;
  var visualizerSize = 27;
  var visualizerRadius = 46;
  var visualizerBarWidth = 58;
  var visualizerAmplitude = 62;
  var visualizerOpacity = 92;
  var visualizerGlow = 72;
  var visualizerRotationAngle = -90;
  var visualizerRotationSpeed = 4;
  var gradientRotation = 0;
  var gradientSpeed = 5;
  var audioSensitivity = 2.1;
  var spectrumAttack = 70;
  var spectrumRelease = 47;
  var visualizerColors = [
    { r: 255, g: 91, b: 202 },
    { r: 185, g: 102, b: 255 },
    { r: 86, g: 234, b: 255 },
    { r: 255, g: 184, b: 115 }
  ];
  var horizontalX = 50;
  var horizontalY = 90;
  var horizontalWidth = 67;
  var horizontalAmplitude = 14;
  var horizontalBarWidth = 7;
  var horizontalBarGap = 5;
  var horizontalDirection = 'up';
  var horizontalOpacity = 92;
  var horizontalGlow = 67;
  var horizontalColorCount = 4;
  var horizontalGradientSpeed = 31;
  var horizontalColors = [
    { r: 255, g: 91, b: 202 },
    { r: 185, g: 102, b: 255 },
    { r: 86, g: 234, b: 255 },
    { r: 255, g: 184, b: 115 }
  ];
  var centerImageMode = '1';
  var customCenterImage = '';
  var centerSize = 68;
  var centerImageZoom = 106;
  var centerOpacity = 94;
  var centerGlow = 72;
  var centerRotationSpeed = 12;
  var bassBandEnd = 4;
  var beatThreshold = 25;
  var beatDynamicThreshold = 164;
  var beatImpactStrength = 14;
  var beatDamping = 76;
  var beatCooldown = 64;
  var clockEnabled = true;
  var clockScale = 180;
  var clockVerticalPosition = 7;
  var clockShowDate = true;
  var clockShowSeconds = true;
  var clockCustomColorEnabled = false;
  var customClockColor = { r: 112, g: 252, b: 255 };
  var baseLayer = document.getElementById('base-layer');
  var blendLayer = document.getElementById('blend-layer');
  var audioCanvas = document.getElementById('audio-visualizer');
  var audioContext = audioCanvas.getContext('2d');
  var spectrumBuffer = document.createElement('canvas');
  var spectrumContext = spectrumBuffer.getContext('2d');
  var glowBuffer = document.createElement('canvas');
  var glowContext = glowBuffer.getContext('2d');
  var audioOrbit = document.getElementById('audio-orbit');
  var audioDisc = document.getElementById('audio-disc');
  var audioDiscImage = document.getElementById('audio-disc-image');
  var activeSegment = -1;
  var transitionTarget = -1;
  var transitionStartedAt = 0;
  var ready = false;
  var lastFrame = 0;
  var lastSceneFrame = 0;
  var lastSyntheticAudioAt = 0;
  var viewportWidth = 0;
  var viewportHeight = 0;
  var canvasWidth = 0;
  var canvasHeight = 0;
  var canvasPixelRatio = 1;
  var measuredFrameRate = 0;
  var fpsWindowStartedAt = 0;
  var fpsWindowFrames = 0;
  var lastGlowFrameAt = 0;
  var targetBars = [];
  var renderedBars = [];
  var targetBass = 0;
  var renderedBass = 0;
  var targetEnergy = 0;
  var renderedEnergy = 0;
  var bassFloor = 0.025;
  var previousBass = 0;
  var beatLatched = false;
  var lastBeatAt = -Infinity;
  var discImpact = 0;
  var discImpactVelocity = 0;
  var visualizerRotation = 0;
  var gradientPhase = 0;
  var horizontalGradientPhase = 0;
  var centerRotation = 0;
  var previousAnimationTimestamp = 0;
  var hasWallpaperAudio = typeof window.wallpaperRegisterAudioListener === 'function';
  var clockElement = document.getElementById('clock');
  var clockTimeElement = document.getElementById('clock-time');
  var clockDateElement = document.getElementById('clock-date');
  var lastClockText = '';
  var clockTimeLayout = '';

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
    viewportWidth = Math.max(1, window.innerWidth);
    viewportHeight = Math.max(1, window.innerHeight);
    updateVisualizerLayout();
  }

  function visualizerGeometry() {
    var shortSide = Math.min(viewportWidth, viewportHeight);
    var groupWidth;
    var maximumBarLength;
    var horizontalMetrics;
    var horizontalPadding;
    var verticalExtent;
    var surfaceHeight;
    var baseline;
    var ringDiameter = shortSide * visualizerSize / 100;
    var baseRadius = ringDiameter * 0.5 * visualizerRadius / 50;
    var barWidth = Math.max(1.4, Math.min(18, (Math.PI * 2 * baseRadius / BAR_COUNT) * visualizerBarWidth / 100));
    maximumBarLength = baseRadius * visualizerAmplitude / 100;
    var glowPadding = 18 + visualizerGlow * 0.24 + barWidth;
    var surfaceRadius = baseRadius + maximumBarLength + glowPadding;

    if (visualizerMode === 'horizontal') {
      groupWidth = viewportWidth * horizontalWidth / 100;
      maximumBarLength = shortSide * horizontalAmplitude / 100;
      horizontalMetrics = horizontalBarMetrics(groupWidth);
      horizontalPadding = 14 + horizontalGlow * 0.22 + horizontalMetrics.barWidth;
      verticalExtent = horizontalDirection === 'both' ? maximumBarLength * 2 : maximumBarLength;
      surfaceHeight = Math.max(48, Math.ceil(verticalExtent + horizontalPadding * 2));
      if (horizontalDirection === 'down') {
        baseline = horizontalPadding;
      } else if (horizontalDirection === 'both') {
        baseline = surfaceHeight * 0.5;
      } else {
        baseline = surfaceHeight - horizontalPadding;
      }
      return {
        mode: 'horizontal',
        groupWidth: groupWidth,
        maximumBarLength: maximumBarLength,
        barWidth: horizontalMetrics.barWidth,
        barGap: horizontalMetrics.barGap,
        padding: horizontalPadding,
        baseline: baseline,
        surfaceWidth: Math.max(64, Math.ceil(groupWidth + horizontalPadding * 2)),
        surfaceHeight: surfaceHeight
      };
    }
    return {
      mode: 'circle',
      ringDiameter: ringDiameter,
      baseRadius: baseRadius,
      barWidth: barWidth,
      surfaceWidth: Math.max(64, Math.ceil(surfaceRadius * 2)),
      surfaceHeight: Math.max(64, Math.ceil(surfaceRadius * 2))
    };
  }

  function horizontalBarMetrics(groupWidth) {
    var totalWeight = horizontalBarCount * horizontalBarWidth + Math.max(0, horizontalBarCount - 1) * horizontalBarGap;

    if (totalWeight <= 0) {
      totalWeight = horizontalBarCount;
    }
    return {
      barWidth: groupWidth * horizontalBarWidth / totalWeight,
      barGap: groupWidth * horizontalBarGap / totalWeight
    };
  }

  function ensureVisualizerSurface(geometry) {
    var logicalWidth = geometry.surfaceWidth;
    var logicalHeight = geometry.surfaceHeight;
    var qualityScale = renderQuality / 100;
    var pixelRatio = Math.max(0.5, Math.min(1.25, window.devicePixelRatio || 1) * qualityScale);
    var pixelWidth = Math.max(1, Math.round(logicalWidth * pixelRatio));
    var pixelHeight = Math.max(1, Math.round(logicalHeight * pixelRatio));
    var positionX = visualizerMode === 'horizontal' ? horizontalX : visualizerX;
    var positionY;

    if (visualizerMode === 'horizontal') {
      positionY = viewportHeight * horizontalY / 100 + logicalHeight * 0.5 - geometry.baseline;
    } else {
      positionY = visualizerY;
    }

    audioCanvas.style.left = positionX + '%';
    audioCanvas.style.top = visualizerMode === 'horizontal' ? positionY + 'px' : positionY + '%';
    audioCanvas.style.width = logicalWidth + 'px';
    audioCanvas.style.height = logicalHeight + 'px';
    if (canvasWidth === logicalWidth && canvasHeight === logicalHeight && canvasPixelRatio === pixelRatio && audioCanvas.width === pixelWidth && audioCanvas.height === pixelHeight) {
      return;
    }

    canvasWidth = logicalWidth;
    canvasHeight = logicalHeight;
    canvasPixelRatio = pixelRatio;
    audioCanvas.width = pixelWidth;
    audioCanvas.height = pixelHeight;
    spectrumBuffer.width = pixelWidth;
    spectrumBuffer.height = pixelHeight;
    glowBuffer.width = pixelWidth;
    glowBuffer.height = pixelHeight;
    audioContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    spectrumContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    glowContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lastGlowFrameAt = 0;
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

  function stereoBand(audioArray, position) {
    var lower = Math.max(0, Math.min(63, Math.floor(position)));
    var upper = Math.max(0, Math.min(63, Math.ceil(position)));
    var blend = position - lower;
    var lowValue = (clampAudio(audioArray[lower]) + clampAudio(audioArray[lower + 64])) * 0.5;
    var highValue = (clampAudio(audioArray[upper]) + clampAudio(audioArray[upper + 64])) * 0.5;

    return lowValue + (highValue - lowValue) * blend;
  }

  function triggerBeat(timestamp, bass) {
    var absoluteGate = beatThreshold / 100;
    var relativeGate = bassFloor * beatDynamicThreshold / 100 + 0.018;
    var gate = Math.max(absoluteGate, relativeGate);
    var risingFast = bass - previousBass > 0.018;

    if (!beatLatched && risingFast && bass >= gate && timestamp - lastBeatAt >= beatCooldown) {
      lastBeatAt = timestamp;
      beatLatched = true;
      discImpact = Math.max(discImpact, beatImpactStrength / 100);
      discImpactVelocity += beatImpactStrength / 100 * 1.5;
      discImpactVelocity = Math.min(discImpactVelocity, 3.8);
    }
    if (bass < gate * 0.72) {
      beatLatched = false;
    }
    previousBass = bass;
  }

  // Wallpaper Engine 每次传入 128 个值：前 64 个为左声道，后 64 个为右声道。
  function wallpaperAudioListener(audioArray) {
    var index;
    var phase;
    var frequencyPosition;
    var bass;
    var now = window.performance.now();

    for (index = 0; index < BAR_COUNT; index += 1) {
      phase = index / BAR_COUNT * 2;
      frequencyPosition = (phase <= 1 ? phase : 2 - phase) * 63;
      targetBars[index] = Math.min(1, stereoBand(audioArray, frequencyPosition) * audioSensitivity);
    }

    bass = Math.min(1, averageBand(audioArray, 0, bassBandEnd) * audioSensitivity);
    bassFloor += (bass - bassFloor) * (bass > bassFloor ? 0.012 : 0.075);
    bassFloor = Math.max(0.012, Math.min(0.72, bassFloor));
    triggerBeat(now, bass);
    targetBass = bass;
    targetEnergy = Math.min(1, averageBand(audioArray, 0, 40) * audioSensitivity);

    if (window.auraSyncBridge) {
      window.auraSyncBridge.publish(targetBass, targetEnergy);
    }
  }

  function paletteColorAt(colors, colorCount, progress) {
    var count = Math.max(1, Math.min(colors.length, Math.round(colorCount)));
    var wrapped = ((progress % 1) + 1) % 1;
    var scaled;
    var index;
    var nextIndex;
    var blend;
    var from;
    var to;

    if (count === 1) {
      return colors[0];
    }
    scaled = wrapped * count;
    index = Math.floor(scaled) % count;
    nextIndex = (index + 1) % count;
    blend = scaled - Math.floor(scaled);
    from = colors[index];
    to = colors[nextIndex];

    return {
      r: Math.round(from.r + (to.r - from.r) * blend),
      g: Math.round(from.g + (to.g - from.g) * blend),
      b: Math.round(from.b + (to.b - from.b) * blend)
    };
  }

  function colorAt(progress) {
    return paletteColorAt(visualizerColors, visualizerColors.length, progress);
  }

  function horizontalColorAt(progress) {
    return paletteColorAt(horizontalColors, horizontalColorCount, progress);
  }

  function updateImpactPhysics(deltaSeconds) {
    var spring = 168;
    var damping = 8 + beatDamping * 0.22;
    var acceleration = -spring * discImpact - damping * discImpactVelocity;

    discImpactVelocity += acceleration * deltaSeconds;
    discImpact += discImpactVelocity * deltaSeconds;
    if (discImpact < -0.022) {
      discImpact = -0.022;
      discImpactVelocity *= -0.28;
    }
    if (Math.abs(discImpact) < 0.0002 && Math.abs(discImpactVelocity) < 0.002) {
      discImpact = 0;
      discImpactVelocity = 0;
    }
    discImpact = Math.min(discImpact, 0.34);
  }

  function timeCorrectSmoothing(rateAtThirtyFps, deltaSeconds) {
    var rate = Math.max(0.001, Math.min(0.999, rateAtThirtyFps));

    return 1 - Math.pow(1 - rate, Math.max(0, deltaSeconds) * 30);
  }

  function updateVisualizerLayout() {
    var geometry = visualizerGeometry();
    var ringDiameter = geometry.ringDiameter || 0;
    var centerDiameter = ringDiameter * centerSize / 100;

    ensureVisualizerSurface(geometry);
    audioOrbit.classList.toggle('is-hidden', !visualizerEnabled || visualizerMode !== 'circle');
    audioOrbit.style.setProperty('--orbit-x', visualizerX + '%');
    audioOrbit.style.setProperty('--orbit-y', visualizerY + '%');
    audioOrbit.style.setProperty('--disc-size', centerDiameter + 'px');
    audioOrbit.style.setProperty('--disc-opacity', String(centerOpacity / 100));
    audioOrbit.style.setProperty('--disc-glow', String(centerGlow / 100));
    audioOrbit.style.setProperty('--disc-glow-blur', (2 + centerGlow * 0.1) + 'px');
    audioOrbit.style.setProperty('--disc-outer-glow', (8 + centerGlow * 0.28) + 'px');
    audioOrbit.style.setProperty('--disc-near-glow', (4 + centerGlow * 0.12) + 'px');
    audioDiscImage.style.transform = 'scale(' + centerImageZoom / 100 + ')';
  }

  function updateVisualizerMotion(timestamp) {
    var deltaSeconds = previousAnimationTimestamp ? Math.min(0.05, (timestamp - previousAnimationTimestamp) / 1000) : 1 / targetFrameRate;
    previousAnimationTimestamp = timestamp;
    visualizerRotation += visualizerRotationSpeed * Math.PI / 180 * deltaSeconds;
    gradientPhase += gradientSpeed / 360 * deltaSeconds;
    horizontalGradientPhase += horizontalGradientSpeed / 360 * deltaSeconds;
    centerRotation += centerRotationSpeed * deltaSeconds;
    updateImpactPhysics(deltaSeconds);
    audioDisc.style.setProperty('--disc-impact-scale', String(1 + discImpact));
    audioDisc.style.transform = 'rotate(' + centerRotation + 'deg) scale(' + (1 + discImpact) + ')';
    return deltaSeconds;
  }

  function drawCircularSpectrum(geometry) {
    var centerX = canvasWidth * 0.5;
    var centerY = canvasHeight * 0.5;
    var index;
    var barLength;
    var color;
    var angle;
    var startX;
    var startY;
    var endX;
    var endY;

    spectrumContext.save();
    spectrumContext.globalCompositeOperation = 'source-over';
    spectrumContext.lineCap = 'round';
    spectrumContext.lineWidth = Math.max(1, geometry.barWidth * 0.22);
    spectrumContext.strokeStyle = 'rgba(142, 244, 255, ' + visualizerOpacity / 350 + ')';
    spectrumContext.beginPath();
    spectrumContext.arc(centerX, centerY, geometry.baseRadius - 3, 0, Math.PI * 2);
    spectrumContext.stroke();

    spectrumContext.lineWidth = geometry.barWidth;
    for (index = 0; index < BAR_COUNT; index += 1) {
      barLength = Math.max(2.4, geometry.baseRadius * visualizerAmplitude / 100 * renderedBars[index]);
      color = colorAt(index / BAR_COUNT + gradientRotation / 360 + gradientPhase);
      angle = -Math.PI / 2 + visualizerRotationAngle * Math.PI / 180 + visualizerRotation + index / BAR_COUNT * Math.PI * 2;
      startX = centerX + Math.cos(angle) * geometry.baseRadius;
      startY = centerY + Math.sin(angle) * geometry.baseRadius;
      endX = centerX + Math.cos(angle) * (geometry.baseRadius + barLength);
      endY = centerY + Math.sin(angle) * (geometry.baseRadius + barLength);
      spectrumContext.strokeStyle = rgbColor(color, visualizerOpacity / 100);
      spectrumContext.beginPath();
      spectrumContext.moveTo(startX, startY);
      spectrumContext.lineTo(endX, endY);
      spectrumContext.stroke();
    }
    spectrumContext.restore();
  }

  function drawHorizontalSpectrum(geometry) {
    var startGroupX = (canvasWidth - geometry.groupWidth) * 0.5;
    var baseline;
    var sourceIndex;
    var index;
    var x;
    var startY;
    var endY;
    var barLength;
    var color;

    baseline = geometry.baseline;

    spectrumContext.save();
    spectrumContext.globalCompositeOperation = 'source-over';
    spectrumContext.lineCap = 'round';
    spectrumContext.lineWidth = Math.max(1, geometry.barWidth);
    for (index = 0; index < BAR_COUNT; index += 1) {
      sourceIndex = (index + Math.floor(BAR_COUNT * 0.5)) % BAR_COUNT;
      barLength = Math.max(2.4, geometry.maximumBarLength * renderedBars[sourceIndex]);
      x = startGroupX + geometry.barWidth * 0.5 + index * (geometry.barWidth + geometry.barGap);
      if (horizontalDirection === 'down') {
        startY = baseline;
        endY = baseline + barLength;
      } else if (horizontalDirection === 'both') {
        startY = baseline - barLength * 0.5;
        endY = baseline + barLength * 0.5;
      } else {
        startY = baseline;
        endY = baseline - barLength;
      }
      color = horizontalColorAt(index / Math.max(1, BAR_COUNT - 1) + horizontalGradientPhase);
      spectrumContext.strokeStyle = rgbColor(color, horizontalOpacity / 100);
      spectrumContext.beginPath();
      spectrumContext.moveTo(x, startY);
      spectrumContext.lineTo(x, endY);
      spectrumContext.stroke();
    }
    spectrumContext.restore();
  }

  function drawVisualizer(timestamp) {
    var index;
    var geometry;
    var activeGlow;
    var deltaSeconds = updateVisualizerMotion(timestamp);
    var attack = timeCorrectSmoothing(spectrumAttack / 100, deltaSeconds);
    var release = timeCorrectSmoothing(spectrumRelease / 100, deltaSeconds);

    for (index = 0; index < BAR_COUNT; index += 1) {
      renderedBars[index] += (targetBars[index] - renderedBars[index]) * (targetBars[index] > renderedBars[index] ? attack : release);
    }
    renderedBass += (targetBass - renderedBass) * timeCorrectSmoothing(targetBass > renderedBass ? 0.52 : 0.18, deltaSeconds);
    renderedEnergy += (targetEnergy - renderedEnergy) * timeCorrectSmoothing(targetEnergy > renderedEnergy ? 0.4 : 0.16, deltaSeconds);

    updateVisualizerLayout();
    audioContext.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!visualizerEnabled) {
      return;
    }

    geometry = visualizerGeometry();
    spectrumContext.clearRect(0, 0, canvasWidth, canvasHeight);
    if (visualizerMode === 'horizontal') {
      drawHorizontalSpectrum(geometry);
      activeGlow = horizontalGlow;
    } else {
      drawCircularSpectrum(geometry);
      activeGlow = visualizerGlow;
    }

    if (activeGlow > 0) {
      if (!lastGlowFrameAt || timestamp - lastGlowFrameAt >= 1000 / 30) {
        glowContext.clearRect(0, 0, canvasWidth, canvasHeight);
        glowContext.save();
        glowContext.globalAlpha = 0.18 + activeGlow / 160;
        glowContext.filter = 'blur(' + (1.5 + activeGlow * 0.105) + 'px)';
        glowContext.drawImage(spectrumBuffer, 0, 0, canvasWidth, canvasHeight);
        glowContext.restore();
        lastGlowFrameAt = timestamp;
      }
    }

    audioContext.save();
    audioContext.globalCompositeOperation = 'lighter';
    if (activeGlow > 0) {
      audioContext.drawImage(glowBuffer, 0, 0, canvasWidth, canvasHeight);
    }
    audioContext.globalAlpha = 1;
    audioContext.drawImage(spectrumBuffer, 0, 0, canvasWidth, canvasHeight);
    audioContext.restore();
  }

  function padTime(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function clockTheme(minute) {
    var sceneIndex = currentSegment(minute);
    var themes = ['dawn', 'morning', 'day', 'day', 'day', 'dusk', 'night'];

    return themes[sceneIndex];
  }

  function createClockDigit(value) {
    var digit = document.createElement('span');

    digit.className = 'clock-digit-current';
    digit.textContent = value;
    return digit;
  }

  function buildClockDigits(timeText) {
    var index;
    var character;
    var slot;
    var separator;

    clockTimeElement.textContent = '';
    for (index = 0; index < timeText.length; index += 1) {
      character = timeText.charAt(index);
      if (character === ':') {
        separator = document.createElement('span');
        separator.className = 'clock-separator';
        separator.textContent = character;
        clockTimeElement.appendChild(separator);
      } else {
        slot = document.createElement('span');
        slot.className = 'clock-digit';
        slot.setAttribute('data-digit', character);
        slot.appendChild(createClockDigit(character));
        clockTimeElement.appendChild(slot);
      }
    }
    clockTimeLayout = timeText;
  }

  function animateClockDigit(slot, value) {
    var incoming;

    if (slot.getAttribute('data-digit') === value) {
      return;
    }
    slot.textContent = '';
    incoming = createClockDigit(value);
    incoming.className += ' clock-digit-entering';
    incoming.addEventListener('animationend', function () {
      incoming.className = 'clock-digit-current';
    });
    slot.appendChild(incoming);
    slot.setAttribute('data-digit', value);
  }

  function updateClockDigits(timeText) {
    var slots;
    var timeIndex;
    var slotIndex = 0;
    var character;

    if (clockTimeLayout.length !== timeText.length) {
      buildClockDigits(timeText);
      return;
    }
    slots = clockTimeElement.querySelectorAll('.clock-digit');
    for (timeIndex = 0; timeIndex < timeText.length; timeIndex += 1) {
      character = timeText.charAt(timeIndex);
      if (character !== ':') {
        animateClockDigit(slots[slotIndex], character);
        slotIndex += 1;
      }
    }
    clockTimeLayout = timeText;
  }

  function updateClock(now) {
    var timeText = padTime(now.getHours()) + ':' + padTime(now.getMinutes());
    var dateText;
    var theme;
    var stateKey;

    if (clockShowSeconds) {
      timeText += ':' + padTime(now.getSeconds());
    }
    theme = clockTheme(localMinuteOfDay(now));
    stateKey = timeText + '|' + theme;

    clockElement.classList.toggle('is-hidden', !clockEnabled);
    clockElement.style.setProperty('--clock-scale', String(clockScale / 100));
    clockElement.style.top = clockVerticalPosition + '%';
    clockDateElement.style.display = clockShowDate ? '' : 'none';
    if (stateKey === lastClockText) {
      return;
    }
    dateText = now.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
    lastClockText = stateKey;
    updateClockDigits(timeText);
    clockDateElement.textContent = dateText;
    clockElement.setAttribute('data-theme', theme);
  }

  function propertyBoolean(value, fallback) {
    if (typeof value === 'undefined') {
      return fallback;
    }
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function imageFileUrl(filePath) {
    var value = String(filePath || '');

    if (!value) {
      return '';
    }
    if (/^(?:file|https?|data):/i.test(value)) {
      return value;
    }
    return 'file:///' + value.replace(/\\/g, '/');
  }

  function applyCenterImage() {
    var fallback = centerImageMode === '2' ? 'assets/visualizer/miku-record.png' : 'assets/visualizer/miku-singer.png';
    var source = fallback;
    var usesSingerCutout = centerImageMode !== '2';

    if (centerImageMode === '3' && customCenterImage) {
      source = imageFileUrl(customCenterImage);
      usesSingerCutout = false;
    }
    audioDiscImage.classList.toggle('is-cutout', usesSingerCutout);
    audioDiscImage.onerror = function () {
      audioDiscImage.onerror = null;
      audioDiscImage.classList.add('is-cutout');
      audioDiscImage.src = 'assets/visualizer/miku-singer.png';
    };
    if (audioDiscImage.getAttribute('src') !== source) {
      audioDiscImage.src = source;
    }
  }

  function applyUserProperties(properties) {
    var value;
    var parsedColor;

    value = propertyValue(properties, 'visualizerenabled');
    visualizerEnabled = propertyBoolean(value, visualizerEnabled);
    value = propertyValue(properties, 'visualizermode');
    if (typeof value !== 'undefined') {
      visualizerMode = String(value) === '2' ? 'horizontal' : 'circle';
      resetBars(visualizerMode === 'horizontal' ? horizontalBarCount : circleBarCount);
      lastGlowFrameAt = 0;
    }
    value = propertyValue(properties, 'visualizerfps');
    if (typeof value !== 'undefined') {
      targetFrameRate = Math.round(clampSetting(value, 30, 240, targetFrameRate));
      lastFrame = 0;
      previousAnimationTimestamp = 0;
      fpsWindowStartedAt = 0;
      fpsWindowFrames = 0;
    }
    value = propertyValue(properties, 'renderquality');
    renderQuality = clampSetting(value, 50, 100, renderQuality);
    value = propertyValue(properties, 'barcount');
    if (typeof value !== 'undefined') {
      circleBarCount = Math.max(24, Math.min(128, Math.round(Number(value) || circleBarCount)));
      if (visualizerMode === 'circle') {
        resetBars(circleBarCount);
      }
    }
    value = propertyValue(properties, 'visualizerx');
    visualizerX = clampSetting(value, 0, 100, visualizerX);
    value = propertyValue(properties, 'visualizery');
    visualizerY = clampSetting(value, 0, 100, visualizerY);
    value = propertyValue(properties, 'visualizersize');
    visualizerSize = clampSetting(value, 12, 75, visualizerSize);
    value = propertyValue(properties, 'visualizerradius');
    visualizerRadius = clampSetting(value, 30, 85, visualizerRadius);
    value = propertyValue(properties, 'barwidth');
    visualizerBarWidth = clampSetting(value, 10, 100, visualizerBarWidth);
    value = propertyValue(properties, 'visualizeramplitude');
    visualizerAmplitude = clampSetting(value, 10, 160, visualizerAmplitude);
    value = propertyValue(properties, 'visualizeropacity');
    visualizerOpacity = clampSetting(value, 10, 100, visualizerOpacity);
    value = propertyValue(properties, 'visualizerglow');
    visualizerGlow = clampSetting(value, 0, 100, visualizerGlow);
    value = propertyValue(properties, 'rotationangle');
    visualizerRotationAngle = clampSetting(value, -180, 180, visualizerRotationAngle);
    value = propertyValue(properties, 'rotationspeed');
    visualizerRotationSpeed = clampSetting(value, -60, 60, visualizerRotationSpeed);
    value = propertyValue(properties, 'gradientrotation');
    gradientRotation = clampSetting(value, 0, 360, gradientRotation);
    value = propertyValue(properties, 'gradientspeed');
    gradientSpeed = clampSetting(value, -90, 90, gradientSpeed);

    value = propertyValue(properties, 'horizontalbarcount');
    if (typeof value !== 'undefined') {
      horizontalBarCount = Math.max(24, Math.min(128, Math.round(Number(value) || horizontalBarCount)));
      if (visualizerMode === 'horizontal') {
        resetBars(horizontalBarCount);
      }
    }
    value = propertyValue(properties, 'horizontalx');
    horizontalX = clampSetting(value, 0, 100, horizontalX);
    value = propertyValue(properties, 'horizontaly');
    horizontalY = clampSetting(value, 0, 100, horizontalY);
    value = propertyValue(properties, 'horizontalwidth');
    horizontalWidth = clampSetting(value, 10, 100, horizontalWidth);
    value = propertyValue(properties, 'horizontalamplitude');
    horizontalAmplitude = clampSetting(value, 1, 30, horizontalAmplitude);
    value = propertyValue(properties, 'horizontalbarwidth');
    horizontalBarWidth = clampSetting(value, 1, 20, horizontalBarWidth);
    value = propertyValue(properties, 'horizontalbargap');
    horizontalBarGap = clampSetting(value, 0, 20, horizontalBarGap);
    value = propertyValue(properties, 'horizontaldirection');
    if (typeof value !== 'undefined') {
      horizontalDirection = ['up', 'both', 'down'].indexOf(String(value)) >= 0 ? String(value) : horizontalDirection;
    }
    value = propertyValue(properties, 'horizontalopacity');
    horizontalOpacity = clampSetting(value, 10, 100, horizontalOpacity);
    value = propertyValue(properties, 'horizontalglow');
    horizontalGlow = clampSetting(value, 0, 100, horizontalGlow);
    value = propertyValue(properties, 'horizontalcolorcount');
    horizontalColorCount = Math.round(clampSetting(value, 1, 4, horizontalColorCount));
    value = propertyValue(properties, 'horizontalgradientspeed');
    horizontalGradientSpeed = clampSetting(value, -90, 90, horizontalGradientSpeed);
    value = propertyValue(properties, 'audiosensitivity');
    audioSensitivity = clampSetting(value, 25, 300, audioSensitivity * 100) / 100;
    value = propertyValue(properties, 'spectrumattack');
    spectrumAttack = clampSetting(value, 15, 100, spectrumAttack);
    value = propertyValue(properties, 'spectrumrelease');
    spectrumRelease = clampSetting(value, 3, 70, spectrumRelease);

    ['visualizercolor1', 'visualizercolor2', 'visualizercolor3', 'visualizercolor4'].forEach(function (propertyName, index) {
      value = propertyValue(properties, propertyName);
      if (typeof value !== 'undefined') {
        parsedColor = parseClockColor(value);
        if (parsedColor) {
          visualizerColors[index] = parsedColor;
        }
      }
    });
    ['horizontalcolor1', 'horizontalcolor2', 'horizontalcolor3', 'horizontalcolor4'].forEach(function (propertyName, index) {
      value = propertyValue(properties, propertyName);
      if (typeof value !== 'undefined') {
        parsedColor = parseClockColor(value);
        if (parsedColor) {
          horizontalColors[index] = parsedColor;
        }
      }
    });

    value = propertyValue(properties, 'centerimage');
    if (typeof value !== 'undefined') {
      centerImageMode = String(value);
    }
    value = propertyValue(properties, 'customcenterimage');
    if (typeof value !== 'undefined') {
      customCenterImage = String(value || '');
    }
    value = propertyValue(properties, 'centersize');
    centerSize = clampSetting(value, 35, 96, centerSize);
    value = propertyValue(properties, 'centerimagezoom');
    centerImageZoom = clampSetting(value, 80, 160, centerImageZoom);
    value = propertyValue(properties, 'centeropacity');
    centerOpacity = clampSetting(value, 10, 100, centerOpacity);
    value = propertyValue(properties, 'centerglow');
    centerGlow = clampSetting(value, 0, 100, centerGlow);
    value = propertyValue(properties, 'centerrotationspeed');
    centerRotationSpeed = clampSetting(value, -60, 60, centerRotationSpeed);

    value = propertyValue(properties, 'bassband');
    bassBandEnd = Math.round(clampSetting(value, 2, 18, bassBandEnd));
    value = propertyValue(properties, 'beatthreshold');
    beatThreshold = clampSetting(value, 5, 80, beatThreshold);
    value = propertyValue(properties, 'beatdynamicthreshold');
    beatDynamicThreshold = clampSetting(value, 110, 300, beatDynamicThreshold);
    value = propertyValue(properties, 'beatimpact');
    beatImpactStrength = clampSetting(value, 0, 30, beatImpactStrength);
    value = propertyValue(properties, 'beatdamping');
    beatDamping = clampSetting(value, 15, 100, beatDamping);
    value = propertyValue(properties, 'beatcooldown');
    beatCooldown = clampSetting(value, 10, 600, beatCooldown);

    applyCenterImage();
    updateVisualizerLayout();

    value = propertyValue(properties, 'clockenabled');
    clockEnabled = propertyBoolean(value, clockEnabled);
    value = propertyValue(properties, 'clockscale');
    clockScale = clampSetting(value, 50, 180, clockScale);
    value = propertyValue(properties, 'clocky');
    clockVerticalPosition = clampSetting(value, 1, 35, clockVerticalPosition);
    value = propertyValue(properties, 'clockdate');
    clockShowDate = propertyBoolean(value, clockShowDate);
    value = propertyValue(properties, 'clockseconds');
    clockShowSeconds = propertyBoolean(value, clockShowSeconds);
    value = propertyValue(properties, 'clockcustomcolor');
    clockCustomColorEnabled = propertyBoolean(value, clockCustomColorEnabled);
    value = propertyValue(properties, 'clockcolor');
    if (typeof value !== 'undefined') {
      customClockColor = parseClockColor(value) || customClockColor;
    }
    applyCustomClockColor();
    lastClockText = '';
    updateClock(new Date());
  }

  function setSegment(index) {
    var nextIndex = (index + 1) % scenes.length;
    activeSegment = index;

    // 浏览器只保留当前与下一张为可见层；其余只做轻量预读，避免高分辨率贴图堆积。
    baseLayer.src = scenes[index].file;
    baseLayer.style.opacity = '1';
    blendLayer.removeAttribute('src');
    blendLayer.style.opacity = '0';
    document.title = '时光锁屏场景 - ' + scenes[index].name;
    preload(scenes[nextIndex].file);
  }

  function resetBars(count) {
    var index;

    BAR_COUNT = Math.max(24, Math.min(128, Math.round(Number(count) || 72)));
    targetBars = new Array(BAR_COUNT);
    renderedBars = new Array(BAR_COUNT);
    for (index = 0; index < BAR_COUNT; index += 1) {
      targetBars[index] = 0;
      renderedBars[index] = 0;
    }
  }

  function clampSetting(value, minimum, maximum, fallback) {
    var number = Number(value);

    if (!isFinite(number)) {
      return fallback;
    }
    return Math.max(minimum, Math.min(maximum, number));
  }

  function propertyValue(properties, name) {
    if (!properties[name] || typeof properties[name].value === 'undefined') {
      return undefined;
    }
    return properties[name].value;
  }

  function colorComponent(value) {
    var component = Number(value);

    if (!isFinite(component)) {
      return 0;
    }
    if (component <= 1) {
      component *= 255;
    }
    return Math.max(0, Math.min(255, Math.round(component)));
  }

  function parseClockColor(value) {
    var components;
    var hex;

    if (typeof value === 'string' && value.charAt(0) === '#') {
      hex = value.slice(1);
      if (hex.length === 3) {
        hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
      }
      if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }
    }
    if (Array.isArray(value)) {
      components = value;
    } else if (value && typeof value === 'object') {
      components = [value.r, value.g, value.b];
    } else {
      components = String(value).match(/(?:\d*\.)?\d+/g);
    }
    if (!components || components.length < 3) {
      return null;
    }
    return {
      r: colorComponent(components[0]),
      g: colorComponent(components[1]),
      b: colorComponent(components[2])
    };
  }

  function rgbColor(color, alpha) {
    if (typeof alpha === 'number') {
      return 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + alpha + ')';
    }
    return 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
  }

  function applyCustomClockColor() {
    var outline;

    clockElement.classList.toggle('has-custom-color', clockCustomColorEnabled);
    if (!clockCustomColorEnabled) {
      return;
    }
    outline = {
      r: Math.round(customClockColor.r * 0.24),
      g: Math.round(customClockColor.g * 0.24),
      b: Math.round(customClockColor.b * 0.24)
    };
    clockElement.style.setProperty('--custom-clock-color', rgbColor(customClockColor));
    clockElement.style.setProperty('--custom-clock-secondary-color', rgbColor(customClockColor, 0.86));
    clockElement.style.setProperty('--custom-clock-glow-color', rgbColor(customClockColor, 0.26));
    clockElement.style.setProperty('--custom-clock-near-glow-color', rgbColor(customClockColor, 0.68));
    clockElement.style.setProperty('--custom-clock-outline-color', rgbColor(outline, 0.42));
  }

  function beginTransition(index, timestamp) {
    var nextIndex = (index + 1) % scenes.length;

    transitionTarget = index;
    transitionStartedAt = timestamp;
    blendLayer.src = scenes[index].file;
    blendLayer.style.opacity = '0';
    preload(scenes[nextIndex].file);
  }

  function render(now, timestamp) {
    var minute = localMinuteOfDay(now);
    var index = currentSegment(minute);
    var progress;

    updateClock(now);

    if (transitionTarget === -1 && index !== activeSegment) {
      beginTransition(index, timestamp);
    }

    if (transitionTarget === -1) {
      return;
    }

    progress = Math.min(1, (timestamp - transitionStartedAt) / TRANSITION_DURATION);
    progress = smootherstep(progress);
    baseLayer.style.opacity = String(1 - progress);
    blendLayer.style.opacity = String(progress);

    if (progress === 1) {
      setSegment(transitionTarget);
      transitionTarget = -1;
    }
  }

  function simulateBrowserAudio(timestamp) {
    var audioArray = new Array(128);
    var seconds = timestamp / 1000;
    var pulse = Math.pow(Math.max(0, Math.sin(seconds * Math.PI * 2 * 1.72)), 14);
    var index;
    var frequency;
    var value;

    for (index = 0; index < 64; index += 1) {
      frequency = index / 63;
      value = 0.055 + Math.max(0, Math.sin(seconds * (2.1 + frequency * 7.5) + index * 0.41)) * 0.12;
      value += pulse * Math.exp(-frequency * 7.5) * 0.78;
      audioArray[index] = Math.min(1, value);
      audioArray[index + 64] = Math.min(1, value * (0.88 + 0.12 * Math.sin(seconds + index)));
    }
    wallpaperAudioListener(audioArray);
  }

  function recordRenderedFrame(timestamp) {
    if (!fpsWindowStartedAt) {
      fpsWindowStartedAt = timestamp;
      fpsWindowFrames = 0;
    }
    fpsWindowFrames += 1;
    if (timestamp - fpsWindowStartedAt >= 1000) {
      measuredFrameRate = fpsWindowFrames * 1000 / (timestamp - fpsWindowStartedAt);
      fpsWindowFrames = 0;
      fpsWindowStartedAt = timestamp;
    }
  }

  function frame(timestamp) {
    var visualizerInterval = 1000 / targetFrameRate;
    var sceneInterval = 1000 / Math.min(60, targetFrameRate);

    if (!lastSceneFrame || timestamp - lastSceneFrame >= sceneInterval) {
      render(new Date(), timestamp);
      lastSceneFrame = timestamp - ((timestamp - lastSceneFrame) % sceneInterval || 0);
    }
    if (!hasWallpaperAudio && (!lastSyntheticAudioAt || timestamp - lastSyntheticAudioAt >= 1000 / 30)) {
      simulateBrowserAudio(timestamp);
      lastSyntheticAudioAt = timestamp;
    }
    if (!lastFrame || timestamp - lastFrame >= visualizerInterval) {
      drawVisualizer(timestamp);
      recordRenderedFrame(timestamp);
      lastFrame = timestamp - ((timestamp - lastFrame) % visualizerInterval || 0);
    }
    window.requestAnimationFrame(frame);
  }

  function start() {
    if (ready) {
      return;
    }
    ready = true;
    render(new Date(), window.performance.now());
    window.requestAnimationFrame(frame);
  }

  // 等首张图可显示后再启动，避免导入 Wallpaper Engine 时闪黑。
  baseLayer.addEventListener('load', start, { once: true });
  baseLayer.addEventListener('error', start, { once: true });
  resetBars(BAR_COUNT);
  resizeVisualizer();
  applyCenterImage();
  updateVisualizerLayout();
  window.addEventListener('resize', resizeVisualizer);
  window.wallpaperPropertyListener = {
    applyUserProperties: applyUserProperties
  };
  window.mikuVisualizerStats = {
    getMeasuredFps: function () {
      return Math.round(measuredFrameRate * 10) / 10;
    },
    getTargetFps: function () {
      return targetFrameRate;
    },
    getSurface: function () {
      var geometry = visualizerGeometry();

      return {
        mode: visualizerMode,
        barCount: BAR_COUNT,
        baselineInCanvas: visualizerMode === 'horizontal' ? geometry.baseline : null,
        configuredBaselineY: visualizerMode === 'horizontal' ? viewportHeight * horizontalY / 100 : null,
        cssWidth: canvasWidth,
        cssHeight: canvasHeight,
        pixelWidth: audioCanvas.width,
        pixelHeight: audioCanvas.height,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        quality: renderQuality
      };
    }
  };
  applyCustomClockColor();
  if (typeof window.wallpaperRegisterAudioListener === 'function') {
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
  }
  setSegment(currentSegment(localMinuteOfDay(new Date())));
}());
