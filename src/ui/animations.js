/**
 * AEGIS CYBERSECURITY SUITE
 * Pure JavaScript Animation & Motion Engine
 */

class MotionEngine {
  constructor() {
    this.animationFrames = new Map();
  }

  /**
   * Smooth Linear Interpolation
   */
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * Animated Number Counter
   */
  animateCounter(element, targetValue, duration = 600, suffix = '') {
    if (!element) return;
    const startTime = performance.now();
    const startValue = parseInt(element.getAttribute('data-value') || '0', 10);
    const diff = targetValue - startValue;

    const frame = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * ease);

      element.textContent = current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        element.setAttribute('data-value', targetValue.toString());
      }
    };

    requestAnimationFrame(frame);
  }

  /**
   * 60 FPS Canvas Circular Scan Ring
   */
  initScanCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let angle = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let isRunning = false;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = width / 2 - 16;

      ctx.clearRect(0, 0, width, height);

      // Background Track
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Smooth progress interpolation
      currentProgress = this.lerp(currentProgress, targetProgress, 0.08);

      // Active Progress Arc
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * currentProgress);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);

      // Modern Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#10b981'); // Emerald
      gradient.addColorStop(1, '#06b6d4'); // Cyan
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Rotating Scanner Pulse Head
      angle += 0.04;
      const pulseX = centerX + radius * Math.cos(angle);
      const pulseY = centerY + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      requestAnimationFrame(render);
    };

    return {
      start() {
        isRunning = true;
        currentProgress = 0;
        targetProgress = 0;
        requestAnimationFrame(render);
      },
      setProgress(percent) {
        targetProgress = Math.min(1, Math.max(0, percent / 100));
      },
      stop() {
        isRunning = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }

  /**
   * Pulse Animation on System Health Indicator
   */
  pulseElement(element) {
    if (!element) return;
    element.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.04)', opacity: 0.9 },
      { transform: 'scale(1)', opacity: 1 }
    ], {
      duration: 1200,
      iterations: 1,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });
  }
}

// Global instance
window.motion = new MotionEngine();

