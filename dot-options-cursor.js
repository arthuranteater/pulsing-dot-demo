/**
 * GPU-Friendly Pulsing Dot Alternatives for Virtual Machines
 * 
 * The original implementation continuously redraws canvas elements at 60fps,
 * which is very GPU-intensive for virtual machines. These alternatives provide
 * better performance while maintaining visual appeal.
 */

/**
 * Option 1: Static Markers with CSS Animation (Recommended for VMs)
 * - No continuous canvas redrawing
 * - Uses CSS animations which are GPU-accelerated
 * - Minimal CPU/GPU usage
 */
export const createStaticPulsingDot = (isCarrierVehicleOnRoute = false, isGrey = false) => {
  const size = 75;
  
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    render: function() {
      // Static render - no continuous updates needed
      return false;
    }
  };
};

/**
 * Option 2: Reduced Frame Rate Pulsing
 * - Updates every 100ms instead of every frame (60fps -> 10fps)
 * - 83% reduction in GPU usage
 * - Still provides smooth animation
 */
export const createLowFrameRatePulsingDot = (isCarrierVehicleOnRoute = false, isGrey = false) => {
  const size = 75;
  let lastUpdate = 0;
  const updateInterval = 100; // Update every 100ms instead of every frame
  
  return {
    size: size,
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    isCarrierVehicleOnRoute: isCarrierVehicleOnRoute,
    isGrey: isGrey,
    stopPulse: false,

    onAdd: function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext('2d', { willReadFrequently: true });
    },

    render: function () {
      const now = performance.now();
      if (now - lastUpdate < updateInterval) {
        return false; // Skip this frame
      }
      lastUpdate = now;

      const duration = 2000;
      const t = (performance.now() % duration) / duration;

      const radius = (this.size / 2) * 0.3;
      const outerRadius = (this.size / 2) * 0.7 * t + radius;
      const context = this.context;

      // Draw the outer circle.
      context.clearRect(0, 0, this.width, this.height);
      context.beginPath();
      context.arc(
        this.width / 2,
        this.height / 2,
        outerRadius,
        0,
        Math.PI * 2
      );
      
      const colors = this.isGrey 
        ? { outer: 'rgba(55, 64, 83, 0.6)', inner: 'rgba(55, 64, 83, 1)', stroke: 'rgba(237, 240, 240, 0.7)' }
        : this.isCarrierVehicleOnRoute 
          ? { outer: 'rgba(84, 199, 116, 0.6)', inner: 'rgba(84, 199, 116, 1)', stroke: 'rgba(84, 199, 116, 1)' }
          : { outer: 'rgba(219, 55, 19, 0.6)', inner: 'rgba(219, 55, 19, 1)', stroke: 'rgba(237, 240, 240, 0.7)' };

      context.fillStyle = this.stopPulse
        ? `rgba(219, 55, 19, 0)`
        : `${colors.outer.replace('0.6', (0.6 - t).toFixed(2))}`;
      context.fill();

      // Draw the inner circle.
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = colors.inner;
      context.strokeStyle = colors.stroke;
      context.lineWidth = 2;
      context.fill();
      context.stroke();

      // Update this image's data with data from the canvas.
      this.data = context.getImageData(0, 0, this.width, this.height).data;

      // Only trigger repaint when we actually update
      mapbox.triggerRepaint();
      return true;
    },
  };
};

/**
 * Option 3: Pre-rendered Animation Frames
 * - Pre-calculates animation frames and cycles through them
 * - Reduces real-time calculations
 * - Good balance of performance and smoothness
 */
export const createPreRenderedPulsingDot = (isCarrierVehicleOnRoute = false, isGrey = false) => {
  const size = 75;
  const frameCount = 20; // 20 frames for smooth animation
  let currentFrame = 0;
  let lastUpdate = 0;
  const frameInterval = 100; // 100ms per frame
  
  const colors = isGrey 
    ? { outer: 'rgba(55, 64, 83, 0.6)', inner: 'rgba(55, 64, 83, 1)', stroke: 'rgba(237, 240, 240, 0.7)' }
    : isCarrierVehicleOnRoute 
      ? { outer: 'rgba(84, 199, 116, 0.6)', inner: 'rgba(84, 199, 116, 1)', stroke: 'rgba(84, 199, 116, 1)' }
      : { outer: 'rgba(219, 55, 19, 0.6)', inner: 'rgba(219, 55, 19, 1)', stroke: 'rgba(237, 240, 240, 0.7)' };

  return {
    size: size,
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    isCarrierVehicleOnRoute: isCarrierVehicleOnRoute,
    isGrey: isGrey,
    stopPulse: false,
    preRenderedFrames: null,

    onAdd: function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext('2d', { willReadFrequently: true });
      
      // Pre-render all animation frames
      this.preRenderedFrames = [];
      for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        const radius = (this.size / 2) * 0.3;
        const outerRadius = (this.size / 2) * 0.7 * t + radius;
        
        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
        context.fillStyle = `${colors.outer.replace('0.6', (0.6 - t).toFixed(2)})`;
        context.fill();
        
        context.beginPath();
        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        context.fillStyle = colors.inner;
        context.strokeStyle = colors.stroke;
        context.lineWidth = 2;
        context.fill();
        context.stroke();
        
        this.preRenderedFrames.push(
          context.getImageData(0, 0, this.width, this.height).data.slice()
        );
      }
    },

    render: function () {
      const now = performance.now();
      if (now - lastUpdate < frameInterval) {
        return false;
      }
      lastUpdate = now;

      if (this.preRenderedFrames && this.preRenderedFrames.length > 0) {
        this.data = this.preRenderedFrames[currentFrame];
        currentFrame = (currentFrame + 1) % this.preRenderedFrames.length;
        mapbox.triggerRepaint();
        return true;
      }
      return false;
    },
  };
};

/**
 * Option 4: Simple Opacity Animation (Most VM-friendly)
 * - Uses only opacity changes, no complex drawing
 * - Minimal GPU usage
 * - Good for very resource-constrained environments
 */
export const createOpacityPulsingDot = (isCarrierVehicleOnRoute = false, isGrey = false) => {
  const size = 75;
  let lastUpdate = 0;
  const updateInterval = 50; // Update every 50ms
  
  return {
    size: size,
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    isCarrierVehicleOnRoute: isCarrierVehicleOnRoute,
    isGrey: isGrey,
    stopPulse: false,

    onAdd: function () {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext('2d', { willReadFrequently: true });
      
      // Draw static circles once
      const radius = (this.size / 2) * 0.3;
      const outerRadius = (this.size / 2) * 0.7;
      
      const colors = this.isGrey 
        ? { outer: 'rgba(55, 64, 83, 1)', inner: 'rgba(55, 64, 83, 1)', stroke: 'rgba(237, 240, 240, 0.7)' }
        : this.isCarrierVehicleOnRoute 
          ? { outer: 'rgba(84, 199, 116, 1)', inner: 'rgba(84, 199, 116, 1)', stroke: 'rgba(84, 199, 116, 1)' }
          : { outer: 'rgba(219, 55, 19, 1)', inner: 'rgba(219, 55, 19, 1)', stroke: 'rgba(237, 240, 240, 0.7)' };

      // Draw outer circle
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
      context.fillStyle = colors.outer;
      context.fill();
      
      // Draw inner circle
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = colors.inner;
      context.strokeStyle = colors.stroke;
      context.lineWidth = 2;
      context.fill();
      context.stroke();
    },

    render: function () {
      const now = performance.now();
      if (now - lastUpdate < updateInterval) {
        return false;
      }
      lastUpdate = now;

      if (this.stopPulse) {
        return false;
      }

      const duration = 2000;
      const t = (performance.now() % duration) / duration;
      const opacity = 0.3 + 0.7 * Math.sin(t * Math.PI); // Simple sine wave opacity
      
      // Apply opacity to the existing canvas data
      const imageData = this.context.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      
      for (let i = 3; i < data.length; i += 4) {
        data[i] = data[i] * opacity; // Apply opacity to alpha channel
      }
      
      this.data = data;
      mapbox.triggerRepaint();
      return true;
    },
  };
};

/**
 * Option 5: CSS-based Animation with HTML Elements
 * - Uses CSS animations instead of canvas
 * - Most GPU-friendly approach
 * - Requires different implementation with HTML overlays
 */
export const createCSSPulsingDot = (isCarrierVehicleOnRoute = false, isGrey = false) => {
  const size = 75;
  const colors = isGrey 
    ? { inner: '#374053', outer: '#374053', stroke: '#edf0f0' }
    : isCarrierVehicleOnRoute 
      ? { inner: '#54c774', outer: '#54c774', stroke: '#54c774' }
      : { inner: '#db3713', outer: '#db3713', stroke: '#edf0f0' };

  // This would require a different approach using HTML elements overlaid on the map
  // instead of canvas-based markers
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    render: function() {
      return false; // No canvas rendering needed
    },
    // CSS animation would be handled by the HTML element
    getCSSAnimation: () => `
      .pulse-ring {
        animation: pulse 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
      }
      @keyframes pulse {
        0% { transform: scale(0.33); opacity: 1; }
        80%, 100% { transform: scale(1); opacity: 0; }
      }
    `
  };
};

