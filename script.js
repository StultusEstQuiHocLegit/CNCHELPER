// CNC Helper interactive editor
// This script sets up a Fabric.js canvas with grid lines, axis labels,
// upload/text tools, undo/redo, multi-selection, snapping, and SVG export.

// Note: The editor uses mm as base units internally. Inch units are
// converted from mm for display only. 1 mm corresponds to 1 pixel on
// the base canvas. Zooming scales objects and grid accordingly.

(function() {
  // Global variables
  let canvas;
  let unit = 'mm';
  let workWidth = 1000;  // width in mm
  let workHeight = 1000; // height in mm
  const gridLines = []; // store grid line objects for easy removal
  const axisNumbersX = [];
  const axisNumbersY = [];
  let zoom = 1;
  let history = [];
  let historyIndex = -1;
  let isSavingHistory = false;
  let hasUnsavedChanges = false;
  const MAX_HISTORY = 100;

  // Variables for panning the canvas
  let isDragging = false;
  let lastPosX = 0;
  let lastPosY = 0;

  // Track whether an object is currently being transformed (move/scale/rotate)
  let isTransforming = false;

  // List of fonts to display in the dropdown. These are common fonts
  // available on most systems. If a font is not installed on the user’s
  // system it will fall back to the default sans-serif font.
  const fontList = [
    'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS', 'Times New Roman',
    'Georgia', 'Palatino Linotype', 'Bookman', 'Comic Sans MS', 'Courier New',
    'Lucida Console', 'Lucida Sans Unicode', 'Segoe UI', 'Impact', 'Garamond',
    'Baskerville', 'Futura', 'Gill Sans', 'Franklin Gothic', 'Century Gothic',
    'Candara', 'Calibri', 'Optima', 'Didot', 'Rockwell', 'Copperplate',
    'Brush Script MT', 'Monaco', 'Consolas'
  ];

  // ---------------------------------------------------------------------------
  // Helper functions for constructing various shapes used by the Add Form
  // menu.  These helpers return Fabric.js objects with reasonable default
  // dimensions and positioning based on a supplied centre point.  Each shape
  // sets a custom 'operation' property defaulting to 'engrave' and uses a
  // black stroke/fill.  The menu itself is defined later via a single
  // shapeDefinitions object rather than pushing into an array.  See
  // the bottom of this file for the full definitions.

  // Helper: create a line shape centred at given point
  function createLineShape(center) {
    // horizontal line 200 mm long
    const half = 100;
    const line = new fabric.Line([center.x - half, center.y, center.x + half, center.y], {
      stroke: '#000000',
      strokeWidth: 1,
      selectable: true,
      evented: true,
      operation: 'engrave'
    });
    return line;
  }

  // Helper: create rectangle shape
  function createRectangleShape(center, filled) {
    const rect = new fabric.Rect({
      left: center.x,
      top: center.y,
      width: 200,
      height: 120,
      fill: filled ? '#000000' : 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return rect;
  }

  // Helper: create triangle shape
  function createTriangleShape(center, filled) {
    const tri = new fabric.Triangle({
      left: center.x,
      top: center.y,
      width: 180,
      height: 160,
      fill: filled ? '#000000' : 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return tri;
  }

  // Helper: create circle shape
  function createCircleShape(center, filled) {
    const circ = new fabric.Circle({
      left: center.x,
      top: center.y,
      radius: 80,
      fill: filled ? '#000000' : 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return circ;
  }

  // Helper: create regular polygon points
  function regularPolygonPoints(sides, radius) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  // Helper: create star points (numPoints outer + inner alternating)
  function starPoints(numPoints, outerRadius, innerRadius) {
    const pts = [];
    const step = Math.PI / numPoints;
    for (let i = 0; i < 2 * numPoints; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + i * step;
      pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
    return pts;
  }

  // Helper: create polygon shape with given points
  function createPolygonShape(center, points, filled) {
    const poly = new fabric.Polygon(points, {
      left: center.x,
      top: center.y,
      fill: filled ? '#000000' : 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return poly;
  }

  // Helper: create parallelogram shape
  function createParallelogramShape(center, filled) {
    // define four points offset from centre
    const w = 200;
    const h = 120;
    const offset = 40;
    const points = [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2 + offset, y: h / 2 },
      { x: -w / 2 + offset, y: h / 2 }
    ];
    return createPolygonShape(center, points, filled);
  }

  // Helper: create trapezoid shape
  function createTrapezoidShape(center, filled) {
    const topW = 120;
    const bottomW = 200;
    const h = 120;
    const points = [
      { x: -topW / 2, y: -h / 2 },
      { x: topW / 2, y: -h / 2 },
      { x: bottomW / 2, y: h / 2 },
      { x: -bottomW / 2, y: h / 2 }
    ];
    return createPolygonShape(center, points, filled);
  }

  // Helper: create diamond shape
  function createDiamondShape(center, filled) {
    const size = 140;
    const points = [
      { x: 0, y: -size / 2 },
      { x: size / 2, y: 0 },
      { x: 0, y: size / 2 },
      { x: -size / 2, y: 0 }
    ];
    return createPolygonShape(center, points, filled);
  }

  // Helper: create heart path shape
  function createHeartShape(center, filled) {
    // Path for a simple heart shape relative to centre
    const pathString = 'M 0 -50 C 20 -80, 50 -60, 50 -20 C 50 20, 0 40, 0 50 C 0 40, -50 20, -50 -20 C -50 -60, -20 -80, 0 -50 Z';
    const heart = new fabric.Path(pathString, {
      left: center.x,
      top: center.y,
      fill: filled ? '#000000' : 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return heart;
  }

  // Helper: create cross shape (plus sign)
  function createCrossShape(center) {
    const w = 180;
    const t = 40;
    const pts = [
      { x: -w / 2, y: -t / 2 },
      { x: -t / 2, y: -t / 2 },
      { x: -t / 2, y: -w / 2 },
      { x: t / 2, y: -w / 2 },
      { x: t / 2, y: -t / 2 },
      { x: w / 2, y: -t / 2 },
      { x: w / 2, y: t / 2 },
      { x: t / 2, y: t / 2 },
      { x: t / 2, y: w / 2 },
      { x: -t / 2, y: w / 2 },
      { x: -t / 2, y: t / 2 },
      { x: -w / 2, y: t / 2 }
    ];
    const cross = new fabric.Polygon(pts, {
      left: center.x,
      top: center.y,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      operation: 'engrave'
    });
    return cross;
  }

  // Note: previously a temporary array of shape definitions and push logic
  // was used.  Those definitions have been consolidated into a single
  // shapeDefinitions object further down in this file.  The helper
  // functions above remain to construct individual shapes on demand.

  // Measurement mode variables
  // When measurement mode is active, clicking on the canvas will create
  // consecutive measurement lines. ESC or toggling the measure button off
  // will exit measurement mode and remove all measurement graphics.
  let isMeasuring = false;
  let measureStart = null;
  const measurementObjects = [];

  // Toggle measurement mode. When active, subsequent left clicks on the
  // canvas will draw lines and distance labels. A second click starts the
  // next measurement from the end of the last line. Pressing Escape or
  // clicking the Measure button again will exit measurement mode and
  // remove all measurement graphics.
  function toggleMeasureMode() {
    const btn = document.getElementById('measureBtn');
    if (isMeasuring) {
      // turn off
      stopMeasurement();
      btn.classList.remove('active');
      // Re-enable selection
      canvas.selection = true;
    } else {
      // Activating measurement: hide any existing popovers and clear selection
      hidePopovers();
      canvas.discardActiveObject();
      isMeasuring = true;
      measureStart = null;
      btn.classList.add('active');
      // Disable selection so clicks do not select objects during measuring
      canvas.selection = false;
    }
  }

  // Stop measurement mode and remove measurement graphics
  function stopMeasurement() {
    isMeasuring = false;
    measureStart = null;
    // Remove measurement lines and labels from canvas
    measurementObjects.forEach(obj => {
      canvas.remove(obj);
    });
    measurementObjects.length = 0;
    canvas.selection = true;
    canvas.requestRenderAll();
    // Reset button state
    const btn = document.getElementById('measureBtn');
    if (btn) btn.classList.remove('active');
  }

  // Handle a click on the canvas when in measurement mode
  function handleMeasurementClick(opt) {
    if (!isMeasuring) return;
    const evt = opt.e;
    // Only handle primary button (left click). Some environments
    // report left clicks with button=0 while others use event.which===1.
    const isLeftClick = (evt.button === 0) || (evt.which === 1);
    if (!isLeftClick) return;
    // convert screen point to world coordinates
    const pointer = canvas.getPointer(evt);
    const x = pointer.x;
    const y = pointer.y;
    if (measureStart == null) {
      // First click: set start point and draw a marker
      measureStart = { x, y };
      const marker = new fabric.Circle({
        left: x,
        top: y,
        radius: 3,
        fill: '#007bff',
        stroke: '#007bff',
        strokeWidth: 0,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        isMeasurement: true
      });
      measurementObjects.push(marker);
      canvas.add(marker);
      canvas.requestRenderAll();
    } else {
      // Second click: draw line between start and this point, add markers and label
      // Create end marker
      const endMarker = new fabric.Circle({
        left: x,
        top: y,
        radius: 3,
        fill: '#007bff',
        stroke: '#007bff',
        strokeWidth: 0,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        isMeasurement: true
      });
      // Draw line
      const line = new fabric.Line([measureStart.x, measureStart.y, x, y], {
        stroke: '#007bff',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        isMeasurement: true
      });
      // Compute distance in mm and label text
      const dx = x - measureStart.x;
      const dy = y - measureStart.y;
      const distMm = Math.sqrt(dx * dx + dy * dy);
      let labelText;
      if (unit === 'inch') {
        const distInch = distMm / 25.4;
        labelText = distInch.toFixed(2) + ' inch';
      } else {
        labelText = distMm.toFixed(1) + ' mm';
      }
      const midX = (measureStart.x + x) / 2;
      const midY = (measureStart.y + y) / 2;
      const text = new fabric.Text(labelText, {
        left: midX,
        top: midY,
        fontSize: 14,
        fill: '#007bff',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        isMeasurement: true
      });
      measurementObjects.push(endMarker, line, text);
      canvas.add(line);
      canvas.add(text);
      canvas.add(endMarker);
      canvas.requestRenderAll();
      // Reset start point for a new measurement
      measureStart = null;
    }
    // prevent default click behaviour so nothing else triggers
    evt.preventDefault();
    evt.stopPropagation();
  }

  // Cookie helpers
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
  }
  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }

  // Preference helpers: store in both localStorage and cookies for persistence
  function savePref(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* ignore */
    }
    setCookie(key, value, 365 * 10);
  }
  function loadPref(key) {
    let val = null;
    try {
      val = localStorage.getItem(key);
    } catch (e) {
      val = null;
    }
    if (val === null) {
      val = getCookie(key);
    }
    return val;
  }

  // Initialize the application
  function init() {
    // Load saved cookies
    const savedUnit = loadPref('cnc_unit');
    if (savedUnit) unit = savedUnit;
    const savedWidth = parseFloat(loadPref('cnc_width'));
    const savedHeight = parseFloat(loadPref('cnc_height'));
    if (!isNaN(savedWidth) && savedWidth > 0) workWidth = savedWidth;
    if (!isNaN(savedHeight) && savedHeight > 0) workHeight = savedHeight;
    const savedFont = loadPref('cnc_font');

    // Set unit toggle text and click handler (simple toggle between mm and inch)
    const unitToggleEl = document.getElementById('unitToggle');
    unitToggleEl.textContent = unit;
    unitToggleEl.addEventListener('click', () => {
      // Exit measurement mode and hide popovers when changing units
      stopMeasurement();
      hidePopovers();
      canvas.discardActiveObject();
      unit = unit === 'mm' ? 'inch' : 'mm';
      unitToggleEl.textContent = unit;
      savePref('cnc_unit', unit);
      updateDimensionInputs();
      drawGrid();
      updateAxisLabels();
      updateUnitLabels();
    });

    // Initialize font dropdown
    const fontDropdown = document.getElementById('fontDropdown');
    fontList.forEach(font => {
      const opt = document.createElement('option');
      opt.value = font;
      opt.textContent = font;
      opt.style.fontFamily = font;
      fontDropdown.appendChild(opt);
    });
    if (savedFont) {
      fontDropdown.value = savedFont;
    }
    fontDropdown.addEventListener('change', () => {
      const obj = canvas.getActiveObject();
      if (obj && obj.type === 'i-text') {
        obj.set('fontFamily', fontDropdown.value);
        obj.set('dirty', true);
        canvas.requestRenderAll();
        savePref('cnc_font', fontDropdown.value);
        markUnsaved();
        saveHistory();
      }
    });

    // Populate dimension inputs with initial values
    updateDimensionInputs();
    updateUnitLabels();

    // Initialize Fabric canvas with width/height equal to work area (mm) at 1px per mm
    const canvasElement = document.getElementById('c');
    canvasElement.width = workWidth;
    canvasElement.height = workHeight;
    canvas = new fabric.Canvas('c', {
      preserveObjectStacking: true,
      selection: true,
      fireRightClick: true,
      stopContextMenu: true
    });

    // To handle high DPI screens, set device pixel ratio scaling on context
    resizeCanvas();

    // Draw the initial grid and axis labels
    drawGrid();
    updateAxisLabels();

    // Setup event listeners for canvas interactions
    canvas.on('mouse:wheel', handleMouseWheel);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:rotating', handleObjectRotating);
    canvas.on('object:modified', () => {
      markUnsaved();
      saveHistory();
      // transformation finished
      isTransforming = false;
      // After finishing move/scale/rotate, re-show popovers for the active object
      const active = canvas.getActiveObject();
      if (active) {
        // Delay to allow transform controls to settle
        setTimeout(() => {
          handleSelection();
        }, 0);
      }
    });
    canvas.on('object:added', () => {
      markUnsaved();
      saveHistory();
    });
    canvas.on('object:removed', () => {
      markUnsaved();
      saveHistory();
    });
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      hidePopovers();
    });

    // Enable panning with right mouse button, middle button or when holding Space key
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e;
      // Start panning on middle or right button (different browsers may report right-click as 2 or 3)
      if (evt.button === 1 || evt.button === 2 || evt.button === 3 || evt.spaceKey) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
      // Measurement handling: handle primary button clicks when measuring.
      // Some browsers use button=0 or which=1 for left clicks. We
      // deliberately handle measurement after checking for panning so that
      // right‑clicks still pan while measuring. Left clicks trigger
      // measurement and prevent dragging/selection.
      const isPrimary = (evt.button === 0) || (evt.which === 1);
      if (isMeasuring && isPrimary) {
        handleMeasurementClick(opt);
        // do not allow further handling (such as selection)
        return;
      }
    });
    canvas.on('mouse:move', function(opt) {
      if (isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    });
    canvas.on('mouse:up', function(opt) {
      isDragging = false;
      canvas.selection = true;
    });

    // Setup keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // Prevent default context menu so right-click drag can pan the canvas
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });

    // Setup buttons
    // Add Text button: clear existing selection/popovers and stop measurement
    document.getElementById('addTextBtn').addEventListener('click', () => {
      // Close any open menus/popovers and discard current selection
      hidePopovers();
      canvas.discardActiveObject();
      stopMeasurement();
      addText();
    });
    // Upload button: clear existing selection/popovers and stop measurement
    document.getElementById('uploadBtn').addEventListener('click', () => {
      hidePopovers();
      canvas.discardActiveObject();
      stopMeasurement();
      document.getElementById('fileInput').click();
    });
    // Form button: display form menu
    document.getElementById('addFormBtn').addEventListener('click', (e) => {
      // Exit measurement mode and close popovers when toggling the form menu
      stopMeasurement();
      hidePopovers();
      canvas.discardActiveObject();
      const menu = document.getElementById('formMenu');
      const btn = e.currentTarget;
      if (menu.classList.contains('hidden')) {
        // Build menu once on first open
        if (!menu.dataset.built) {
          buildFormMenu(menu);
          menu.dataset.built = 'true';
        }
        // Position the menu below the button
        const btnRect = btn.getBoundingClientRect();
        menu.style.left = btnRect.left + 'px';
        menu.style.top = (btnRect.bottom + 4) + 'px';
        menu.classList.remove('hidden');
        // Mark button as active (blue text)
        btn.classList.add('active');
      } else {
        // Hide menu and remove active state
        menu.classList.add('hidden');
        btn.classList.remove('active');
      }
    });
    // Hide form menu when clicking outside
    document.addEventListener('click', (evt) => {
      const menu = document.getElementById('formMenu');
      const btn = document.getElementById('addFormBtn');
      if (!menu) return;
      if (menu.classList.contains('hidden')) return;
      const target = evt.target;
      if (target === btn || btn.contains(target) || menu.contains(target)) {
        return;
      }
      menu.classList.add('hidden');
      // remove active state from button when menu closes
      btn.classList.remove('active');
    });
    document.getElementById('downloadBtn').addEventListener('click', () => {
      // Wrap the async function to avoid unhandled rejection
      downloadSVGs().catch(() => {});
    });

    // Measurement button toggle
    const measureBtn = document.getElementById('measureBtn');
    if (measureBtn) {
      measureBtn.addEventListener('click', () => {
        toggleMeasureMode();
      });
    }
    document.getElementById('fileInput').addEventListener('change', handleFileInput);
    document.getElementById('cutToggleBtn').addEventListener('click', () => {
      toggleCutColor();
    });

    // Fill toggle button handler: toggles between outline and filled
    const fillBtn = document.getElementById('fillToggleBtn');
    if (fillBtn) {
      fillBtn.addEventListener('click', () => {
        toggleFill();
      });
    }

    // Layer control button handlers
    document.getElementById('sendToBackBtn').addEventListener('click', () => {
      const objs = canvas.getActiveObjects();
      if (!objs || objs.length === 0) return;
      objs.forEach(obj => canvas.sendToBack(obj));
      canvas.requestRenderAll();
      markUnsaved();
      saveHistory();
      hidePopovers();
    });
    document.getElementById('sendBackwardsBtn').addEventListener('click', () => {
      const objs = canvas.getActiveObjects();
      if (!objs || objs.length === 0) return;
      objs.forEach(obj => canvas.sendBackwards(obj));
      canvas.requestRenderAll();
      markUnsaved();
      saveHistory();
      hidePopovers();
    });
    document.getElementById('bringForwardBtn').addEventListener('click', () => {
      const objs = canvas.getActiveObjects();
      if (!objs || objs.length === 0) return;
      objs.forEach(obj => canvas.bringForward(obj));
      canvas.requestRenderAll();
      markUnsaved();
      saveHistory();
      hidePopovers();
    });
    document.getElementById('bringToFrontBtn').addEventListener('click', () => {
      const objs = canvas.getActiveObjects();
      if (!objs || objs.length === 0) return;
      objs.forEach(obj => canvas.bringToFront(obj));
      canvas.requestRenderAll();
      markUnsaved();
      saveHistory();
      hidePopovers();
    });

    // Setup beforeunload to warn unsaved changes
    window.addEventListener('beforeunload', function(e) {
      if (hasUnsavedChanges && canvas.getObjects().filter(obj => !obj.isGrid).length > 0) {
        const msg = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = msg;
        return msg;
      }
    });

    // Bind change events for width and height inputs
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    function handleDimensionInputChange() {
      // Exit measurement mode and hide popovers when modifying work area dimensions
      stopMeasurement();
      hidePopovers();
      canvas.discardActiveObject();
      let wVal = parseFloat(widthInput.value);
      let hVal = parseFloat(heightInput.value);
      if (isNaN(wVal) || isNaN(hVal) || wVal <= 0 || hVal <= 0) {
        return;
      }
      // Convert input values to mm based on current unit
      if (unit === 'inch') {
        wVal = wVal * 25.4;
        hVal = hVal * 25.4;
      }
      workWidth = wVal;
      workHeight = hVal;
      savePref('cnc_width', workWidth);
      savePref('cnc_height', workHeight);
      resizeCanvas();
      drawGrid();
      updateAxisLabels();
    }
    // Use 'input' event so updates happen as soon as values change
    widthInput.addEventListener('input', handleDimensionInputChange);
    heightInput.addEventListener('input', handleDimensionInputChange);

    // Save initial empty state to history
    saveHistory();
  }

  // Update the values of the width and height inputs based on current work dimensions
  function updateDimensionInputs() {
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    let w = workWidth;
    let h = workHeight;
    if (unit === 'inch') {
      w = (workWidth / 25.4);
      h = (workHeight / 25.4);
    }
    // Round to two decimals for display
    widthInput.value = parseFloat(w.toFixed(2));
    heightInput.value = parseFloat(h.toFixed(2));
  }

  // Update the unit labels next to dimension inputs
  function updateUnitLabels() {
    const widthUnitLabel = document.getElementById('widthUnitLabel');
    const heightUnitLabel = document.getElementById('heightUnitLabel');
    widthUnitLabel.textContent = unit;
    heightUnitLabel.textContent = unit;
  }

  // Convert mm to pixels at the current zoom level
  function mmToPx(mmValue) {
    return mmValue * zoom;
  }
  // Convert pixels to mm at the current zoom level
  function pxToMm(pxValue) {
    return pxValue / zoom;
  }

  // Compute the centre of the portion of the canvas currently visible to the user.
  // Instead of averaging viewport boundaries (which can behave oddly when the
  // viewport is panned outside the plate), this function uses the DOM
  // position of the canvas container to determine the midpoint of the
  // visible area. It then converts that screen coordinate into canvas
  // world coordinates via Fabric's getPointer. The result is clamped
  // within the work area so that new objects never appear off the plate.
  function getVisibleCenter() {
    // If the canvas is not yet initialised, return the middle of the work area
    if (!canvas) {
      return { x: workWidth / 2, y: workHeight / 2 };
    }
    // Use the viewport transform to compute the current visible area in world
    // coordinates. Fabric.js provides calcViewportBoundaries(), which
    // returns the top‑left and bottom‑right points of the visible region
    // (taking zoom and panning into account). We average these to get
    // the centre of the visible region and clamp to the work area so
    // objects never spawn off the plate.
    const bounds = canvas.calcViewportBoundaries();
    let cx = (bounds.tl.x + bounds.br.x) / 2;
    let cy = (bounds.tl.y + bounds.br.y) / 2;
    // Clamp coordinates within work area
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cx > workWidth) cx = workWidth;
    if (cy > workHeight) cy = workHeight;
    return { x: cx, y: cy };
  }

  // Resize the canvas element and adjust for high DPI displays. This function
  // uses the current workWidth and workHeight (in mm) as pixel dimensions
  // (1 mm = 1 px) and applies device pixel ratio scaling. When called
  // before the canvas is initialized, it will still set the <canvas> element
  // size correctly. After initialization it will update the Fabric canvas as
  // well.
  function resizeCanvas() {
    const canvasElement = document.getElementById('c');
    if (!canvasElement) return;
    const ratio = window.devicePixelRatio || 1;
    const width = workWidth;
    const height = workHeight;
    canvasElement.width = width * ratio;
    canvasElement.height = height * ratio;
    canvasElement.style.width = width + 'px';
    canvasElement.style.height = height + 'px';
    if (canvas) {
      canvas.setWidth(width);
      canvas.setHeight(height);
      // Scale the context for high DPI
      if (canvas.contextContainer) {
        canvas.contextContainer.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      canvas.requestRenderAll();
    }
  }

  // Draw or redraw grid lines based on the current zoom level and work area
  function drawGrid() {
    // Remove existing grid lines
    gridLines.forEach(line => canvas.remove(line));
    gridLines.length = 0;
    // Determine spacing in mm; we choose spacing that results in roughly
    // 40-100 pixels between lines for clarity.
    const spacings = [5, 10, 20, 50, 100, 200, 500, 1000];
    let chosen = spacings[0];
    for (const s of spacings) {
      const px = mmToPx(s);
      if (px >= 40) { chosen = s; break; }
    }
    // Draw vertical lines
    for (let x = 0; x <= workWidth; x += chosen) {
      const pxX = mmToPx(x);
      const line = new fabric.Line([pxX, 0, pxX, mmToPx(workHeight)], {
        stroke: 'rgba(0,0,0,0.3)',
        selectable: false,
        evented: false,
        strokeWidth: 1,
        isGrid: true
      });
      gridLines.push(line);
      canvas.add(line);
    }
    // Draw horizontal lines
    for (let y = 0; y <= workHeight; y += chosen) {
      const pxY = mmToPx(y);
      const line = new fabric.Line([0, pxY, mmToPx(workWidth), pxY], {
        stroke: 'rgba(0,0,0,0.3)',
        selectable: false,
        evented: false,
        strokeWidth: 1,
        isGrid: true
      });
      gridLines.push(line);
      canvas.add(line);
    }
    canvas.sendToBack(...gridLines);
    canvas.requestRenderAll();
  }

  // Update axis labels for X and Y axes
  function updateAxisLabels() {
    const xAxis = document.getElementById('xAxisLabels');
    const yAxis = document.getElementById('yAxisLabels');
    xAxis.innerHTML = '';
    yAxis.innerHTML = '';
    // Choose same spacing used for grid lines
    const spacings = [5, 10, 20, 50, 100, 200, 500, 1000];
    let chosen = spacings[0];
    for (const s of spacings) {
      const px = mmToPx(s);
      if (px >= 40) { chosen = s; break; }
    }
    // X axis labels
    for (let x = 0; x <= workWidth; x += chosen) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = mmToPx(x) + 'px';
      div.style.top = '0px';
      div.style.transform = 'translateX(-50%)';
      let labelValue = x;
      let unitLabel = unit;
      if (unit === 'inch') {
        labelValue = (x / 25.4).toFixed(1);
      }
      div.textContent = labelValue;
      xAxis.appendChild(div);
    }
    // Y axis labels
    for (let y = 0; y <= workHeight; y += chosen) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.right = '0px';
      div.style.top = mmToPx(y) + 'px';
      div.style.transform = 'translateY(-50%)';
      let labelValue = y;
      if (unit === 'inch') {
        labelValue = (y / 25.4).toFixed(1);
      }
      div.textContent = labelValue;
      yAxis.appendChild(div);
    }
  }

  // Handle mouse wheel for zooming in/out
  function handleMouseWheel(opt) {
    const delta = opt.e.deltaY;
    const pointer = canvas.getPointer(opt.e);
    let zoomFactor = zoom;
    zoomFactor *= 0.999 ** delta;
    // Clamp zoom factor
    if (zoomFactor < 0.2) zoomFactor = 0.2;
    if (zoomFactor > 10) zoomFactor = 10;
    // Compute point relative to canvas and adjust viewport transform
    const zoomPoint = new fabric.Point(pointer.x, pointer.y);
    canvas.zoomToPoint(zoomPoint, zoomFactor);
    zoom = zoomFactor;
    drawGrid();
    updateAxisLabels();
    opt.e.preventDefault();
    opt.e.stopPropagation();
  }

  // Snap a value (in pixels) to the nearest grid line (in mm) and convert back to px
  function snapToGrid(valuePx) {
    // Determine current grid spacing in px
    const spacings = [5, 10, 20, 50, 100, 200, 500, 1000];
    let chosen = spacings[0];
    for (const s of spacings) {
      const px = mmToPx(s);
      if (px >= 40) { chosen = s; break; }
    }
    const gridPx = mmToPx(chosen);
    return Math.round(valuePx / gridPx) * gridPx;
  }

  // Handle object moving with snapping to grid and aligning with other objects
  function handleObjectMoving(opt) {
    const obj = opt.target;
    if (!obj || obj.isGrid) return;
    // Mark as transforming and hide popovers while moving
    isTransforming = true;
    hidePopovers();
    // Snap to grid
    obj.set({
      left: snapToGrid(obj.left),
      top: snapToGrid(obj.top)
    });
    // Align relative to other objects if close (within 5 px)
    const threshold = 5;
    const objects = canvas.getObjects().filter(o => o !== obj && !o.isGrid);
    objects.forEach(o => {
      // align top
      if (Math.abs(o.top - obj.top) < threshold) {
        obj.set({ top: o.top });
      }
      // align left
      if (Math.abs(o.left - obj.left) < threshold) {
        obj.set({ left: o.left });
      }
      // align center horizontally
      const oCenterX = o.left + o.getScaledWidth() / 2;
      const objCenterX = obj.left + obj.getScaledWidth() / 2;
      if (Math.abs(oCenterX - objCenterX) < threshold) {
        obj.set({ left: oCenterX - obj.getScaledWidth() / 2 });
      }
      // align center vertically
      const oCenterY = o.top + o.getScaledHeight() / 2;
      const objCenterY = obj.top + obj.getScaledHeight() / 2;
      if (Math.abs(oCenterY - objCenterY) < threshold) {
        obj.set({ top: oCenterY - obj.getScaledHeight() / 2 });
      }
    });
  }

  // Handle object scaling with snapping to grid
  function handleObjectScaling(opt) {
    const obj = opt.target;
    if (!obj || obj.isGrid) return;
    isTransforming = true;
    hidePopovers();
    const threshold = mmToPx(1); // 1 mm threshold for scaling
    // Snap width and height to grid increments
    const newWidth = snapToGrid(obj.getScaledWidth());
    const newHeight = snapToGrid(obj.getScaledHeight());
    obj.set({ scaleX: newWidth / obj.width, scaleY: newHeight / obj.height });
  }

  // Handle object rotation snapping to nearest 5 degrees
  function handleObjectRotating(opt) {
    const obj = opt.target;
    if (!obj || obj.isGrid) return;
    isTransforming = true;
    hidePopovers();
    const snap = 5; // degrees
    obj.set('angle', Math.round(obj.angle / snap) * snap);
  }

  // Add a new text object to the canvas
  function addText() {
    // Exit measurement mode when adding new objects
    stopMeasurement();
    const defaultText = 'Text';
    const defaultFont = getCookie('cnc_font') || 'Arial';
    // Determine the center of the visible viewport so the text appears where the user is looking
    // Always insert new text at the top-left corner (0,0)
    const text = new fabric.IText(defaultText, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      fontFamily: defaultFont,
      fill: '#000000',
      operation: 'engrave'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    markUnsaved();
    saveHistory();
  }

  // Handle file input change: upload images/svg
  function handleFileInput(e) {
    // Exit measurement mode when uploading images
    stopMeasurement();
    const files = e.target.files;
    if (!files) return;
    [...files].forEach(file => {
      const reader = new FileReader();
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'svg') {
        reader.onload = function(evt) {
          const svgString = evt.target.result;
          fabric.loadSVGFromString(svgString, (objects, options) => {
            const group = fabric.util.groupSVGElements(objects, options);
            // Compute centre of visible area and clamp to work area
            const center = getVisibleCenter();
            // Determine visible viewport size using the inverse viewport transform
            const vpt = canvas.viewportTransform;
            const inv = fabric.util.invertTransform(vpt);
            // Account for device pixel ratio when computing visible world bounds
            const ratio = window.devicePixelRatio || 1;
            const tl = fabric.util.transformPoint(new fabric.Point(0, 0), inv);
            const br = fabric.util.transformPoint(new fabric.Point(canvas.getWidth() * ratio, canvas.getHeight() * ratio), inv);
            let visibleWidth = br.x - tl.x;
            let visibleHeight = br.y - tl.y;
            // Clamp visible size to work area (to avoid extremely large numbers when panned off the plate)
            if (visibleWidth > workWidth) visibleWidth = workWidth;
            if (visibleHeight > workHeight) visibleHeight = workHeight;
            const limitWidth = visibleWidth * 0.5;
            const limitHeight = visibleHeight * 0.5;
            const gW = group.width || 1;
            const gH = group.height || 1;
            const scaleFactor = Math.min(limitWidth / gW, limitHeight / gH, 1);
            group.set({
              scaleX: scaleFactor,
              scaleY: scaleFactor,
              // Place at top-left corner
              left: 0,
              top: 0,
              originX: 'left',
              originY: 'top',
              fill: '#000000',
              operation: 'engrave'
            });
            canvas.add(group);
            canvas.setActiveObject(group);
            canvas.requestRenderAll();
            markUnsaved();
            saveHistory();
          });
        };
        reader.readAsText(file);
      } else {
        // Raster image: convert to SVG using ImageTracer
        reader.onload = function(evt) {
          const dataURL = evt.target.result;
          // Options for ImageTracer: 2 colors (black and white)
          const options = {
            corsenabled: true,
            colorsampling: 0,
            numberofcolors: 2,
            mincolorratio: 0,
            colorquantcycles: 3,
            layering: 0,
            strokewidth: 0,
            linefilter: false,
            roundcoords: 1,
            desc: false,
            viewbox: false,
            blurradius: 0,
            blurdelta: 20,
            pal: [[0, 0, 0], [255, 255, 255]]
          };
            ImageTracer.imageToSVG(dataURL, function(svgString) {
            fabric.loadSVGFromString(svgString, (objects, options) => {
              const group = fabric.util.groupSVGElements(objects, options);
              // Compute centre of visible area and clamp to work area
              const center = getVisibleCenter();
              // Determine visible viewport size using inverse viewport transform
              const vpt = canvas.viewportTransform;
              const inv = fabric.util.invertTransform(vpt);
              const dpr = window.devicePixelRatio || 1;
              const tl = fabric.util.transformPoint(new fabric.Point(0, 0), inv);
              const br = fabric.util.transformPoint(new fabric.Point(canvas.getWidth() * dpr, canvas.getHeight() * dpr), inv);
              let visibleWidth = br.x - tl.x;
              let visibleHeight = br.y - tl.y;
              if (visibleWidth > workWidth) visibleWidth = workWidth;
              if (visibleHeight > workHeight) visibleHeight = workHeight;
              const limitWidth = visibleWidth * 0.5;
              const limitHeight = visibleHeight * 0.5;
              const gW = group.width || 1;
              const gH = group.height || 1;
              const scaleFactor = Math.min(limitWidth / gW, limitHeight / gH, 1);
              group.set({
                scaleX: scaleFactor,
                scaleY: scaleFactor,
                // Place at top-left corner
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top',
                fill: '#000000',
                operation: 'engrave'
              });
              canvas.add(group);
              canvas.setActiveObject(group);
              canvas.requestRenderAll();
              markUnsaved();
              saveHistory();
            });
          }, options);
        };
        if (ext === 'png' || ext === 'jpeg' || ext === 'jpg' || ext === 'bmp') {
          reader.readAsDataURL(file);
        }
      }
    });
    // reset file input so same file can be uploaded again
    e.target.value = '';
  }

  // Handle selection events to show popovers
  function handleSelection(opt) {
    // Do not show popovers while an object is being transformed
    if (isTransforming) {
      hidePopovers();
      return;
    }
    hidePopovers();
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    // Compute bounding rectangle in viewport coordinates
    const bounds = activeObject.getBoundingRect();
    const canvasOffset = canvas.upperCanvasEl.getBoundingClientRect();
    const zoomFactor = canvas.getZoom();
    // Screen center of the object
    const cx = canvasOffset.left + (bounds.left + bounds.width / 2) * zoomFactor;
    const top = canvasOffset.top + bounds.top * zoomFactor;
    // Determine visibility of font selector
    const fontSelector = document.getElementById('fontSelector');
    if (activeObject.type === 'i-text') {
      fontSelector.classList.remove('hidden');
      // set dropdown value to object's font
      const dropdown = document.getElementById('fontDropdown');
      dropdown.value = activeObject.fontFamily;
    } else {
      fontSelector.classList.add('hidden');
    }
    // Always show cut toggle and layer controls for selected objects
    const cutToggle = document.getElementById('cutToggle');
    const layerControls = document.getElementById('layerControls');
    cutToggle.classList.remove('hidden');
    layerControls.classList.remove('hidden');
    // Determine if fill toggle should be visible: it applies to shapes
    const fillToggle = document.getElementById('fillToggle');
    function supportsFill(target) {
      if (!target) return false;
      // Groups: if any child supports fill
      if (target._objects && Array.isArray(target._objects)) {
        return target._objects.some(child => supportsFill(child));
      }
      // Text, images and measurement objects do not support fill toggle
      if (target.type === 'i-text' || target.type === 'image' || target.isMeasurement) {
        return false;
      }
      // Lines have no meaningful fill
      if (target.type === 'line' || target instanceof fabric.Line) {
        return false;
      }
      // Objects with a fill property support fill toggle
      return typeof target.get === 'function' && 'fill' in target;
    }
    const showFillToggle = supportsFill(activeObject);
    if (showFillToggle) {
      fillToggle.classList.remove('hidden');
    } else {
      fillToggle.classList.add('hidden');
    }
    // After making them visible, measure widths to center them
    const fontRect = fontSelector.getBoundingClientRect();
    const cutRect = cutToggle.getBoundingClientRect();
    const fillRect = fillToggle.getBoundingClientRect();
    const layerRect = layerControls.getBoundingClientRect();
    const margin = 8;
    // Calculate total width based on which popovers are visible
    let totalWidth = 0;
    let visibleCount = 0;
    // Font selector
    if (!fontSelector.classList.contains('hidden')) {
      totalWidth += fontRect.width;
      visibleCount++;
    }
    // Cut toggle always visible
    totalWidth += cutRect.width;
    visibleCount++;
    // Fill toggle if visible
    if (!fillToggle.classList.contains('hidden')) {
      totalWidth += fillRect.width;
      visibleCount++;
    }
    // Layer controls always visible
    totalWidth += layerRect.width;
    visibleCount++;
    // Add margins between visible elements
    totalWidth += margin * (visibleCount - 1);
    let left = cx - totalWidth / 2;
    // Vertical position: above the object by 30px
    const popoverTop = top - 30;
    // Position font selector if visible
    if (!fontSelector.classList.contains('hidden')) {
      fontSelector.style.left = left + 'px';
      fontSelector.style.top = popoverTop + 'px';
      left += fontRect.width + margin;
    }
    // Position cut toggle
    cutToggle.style.left = left + 'px';
    cutToggle.style.top = popoverTop + 'px';
    left += cutRect.width + margin;
    // Position fill toggle if visible
    if (!fillToggle.classList.contains('hidden')) {
      fillToggle.style.left = left + 'px';
      fillToggle.style.top = popoverTop + 'px';
      left += fillRect.width + margin;
    }
    // Position layer controls
    layerControls.style.left = left + 'px';
    layerControls.style.top = popoverTop + 'px';
  }

  // Hide both popovers
  function hidePopovers() {
    document.getElementById('fontSelector').classList.add('hidden');
    document.getElementById('cutToggle').classList.add('hidden');
    document.getElementById('layerControls').classList.add('hidden');
    document.getElementById('fillToggle').classList.add('hidden');
  }

  // Toggle cut/engrave color on selected objects
  function toggleCutColor() {
    const objs = canvas.getActiveObjects();
    if (!objs || objs.length === 0) return;
    // Helper to apply color recursively for groups or selections
    function applyColor(target, color, operationType) {
      // Recursively apply to group children
      if (target._objects && Array.isArray(target._objects)) {
        target._objects.forEach(child => applyColor(child, color, operationType));
      }
      if (typeof target.set === 'function') {
        // Preserve outline shapes: if the current fill is transparent (i.e. no
        // fill), do not change it to the color.  Otherwise set the fill.
        if ('fill' in target) {
          const currentFill = target.get('fill');
          // Some objects may have null/undefined fill; treat those as filled
          if (currentFill && currentFill !== 'transparent') {
            target.set('fill', color);
          }
        }
        // Always update stroke if present; even outline shapes should change
        // the stroke colour for cut vs. engrave.
        if ('stroke' in target) {
          target.set('stroke', color);
        }
      }
      // Assign operation on the top-level object
      target.operation = operationType;
    }
    objs.forEach(obj => {
      if (obj.operation === 'cut') {
        applyColor(obj, '#000000', 'engrave');
      } else {
        applyColor(obj, '#ffa500', 'cut');
      }
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    markUnsaved();
    saveHistory();
    hidePopovers();
    // Ensure grid lines remain behind objects after colour change
    if (gridLines && gridLines.length) {
      canvas.sendToBack(...gridLines);
    }
  }

  // Toggle between outline and filled style for selected shapes. When toggling
  // from outline to filled, the fill colour matches the current operation
  // (black for engrave, orange for cut). When toggling from filled to
  // outline, the fill is set to transparent. Lines (fabric.Line) are
  // unaffected as they do not have a meaningful fill.
  function toggleFill() {
    const objs = canvas.getActiveObjects();
    if (!objs || objs.length === 0) return;
    function applyFillToggle(target) {
      // Recurse through groups
      if (target._objects && Array.isArray(target._objects)) {
        target._objects.forEach(child => applyFillToggle(child));
        return;
      }
      // Skip lines which have no fill
      if (target.type === 'line' || target instanceof fabric.Line) {
        return;
      }
      // Only toggle objects that support fill
      if (typeof target.get === 'function' && typeof target.set === 'function') {
        const currentFill = target.get('fill');
        // Determine whether we currently consider this filled. A value of
        // null/undefined/""/"transparent" counts as outline.
        const isFilled = currentFill && currentFill !== 'transparent';
        if (isFilled) {
          // Make outline
          target.set('fill', 'transparent');
        } else {
          // Make filled; colour depends on operation (cut or engrave)
          const op = target.operation || 'engrave';
          const fillColor = op === 'cut' ? '#ffa500' : '#000000';
          target.set('fill', fillColor);
        }
      }
    }
    objs.forEach(obj => applyFillToggle(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    markUnsaved();
    saveHistory();
    hidePopovers();
    // Ensure grid lines remain behind objects after fill change
    if (gridLines && gridLines.length) {
      canvas.sendToBack(...gridLines);
    }
  }

  // Keyboard handling: undo/redo/delete/save
  function handleKeyDown(e) {
    // Undo: Ctrl+Z (without Shift). Some browsers report uppercase letters or use e.code.
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && ((e.key && e.key.toLowerCase() === 'z') || e.code === 'KeyZ')) {
      e.preventDefault();
      undoHistory();
      return;
    }
    // Redo: Ctrl+Shift+Z or Ctrl+Y. Support both options and uppercase letters
    if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && ((e.key && e.key.toLowerCase() === 'z') || e.code === 'KeyZ')) || ((e.key && e.key.toLowerCase() === 'y') || e.code === 'KeyY'))) {
      e.preventDefault();
      redoHistory();
      return;
    }
    // Ctrl+S (save/download)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      // Trigger download asynchronously and suppress any errors
      downloadSVGs().catch(() => {});
      return;
    }
    // Delete or backspace to remove object
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const objs = canvas.getActiveObjects();
      if (objs && objs.length > 0) {
        objs.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        markUnsaved();
        saveHistory();
      }
    }
    // Escape key exits measurement mode
    if (e.key === 'Escape') {
      if (isMeasuring) {
        stopMeasurement();
        e.preventDefault();
      }
    }
  }

  // Mark unsaved changes
  function markUnsaved() {
    hasUnsavedChanges = true;
  }

  // Shape definitions: each returns a Fabric.js object representing the shape.
  const shapeDefinitions = {
    'line': () => {
      // horizontal line centered at origin
      return new fabric.Line([-50, 0, 50, 0], {
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'rectangleFilled': () => {
      return new fabric.Rect({
        width: 100,
        height: 60,
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'rectangleOutline': () => {
      return new fabric.Rect({
        width: 100,
        height: 60,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'triangleFilled': () => {
      return new fabric.Triangle({
        width: 100,
        height: 80,
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'triangleOutline': () => {
      return new fabric.Triangle({
        width: 100,
        height: 80,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'circleFilled': () => {
      return new fabric.Circle({
        radius: 50,
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'circleOutline': () => {
      return new fabric.Circle({
        radius: 50,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'starFilled': () => {
      // 5-point star
      const points = [];
      const spikes = 5;
      const outerRadius = 50;
      const innerRadius = 20;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = i * Math.PI / spikes;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'starOutline': () => {
      const points = [];
      const spikes = 5;
      const outerRadius = 50;
      const innerRadius = 20;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = i * Math.PI / spikes;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'ellipseFilled': () => {
      return new fabric.Ellipse({
        rx: 60,
        ry: 40,
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'ellipseOutline': () => {
      return new fabric.Ellipse({
        rx: 60,
        ry: 40,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'pentagonFilled': () => {
      const points = [];
      const sides = 5;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'pentagonOutline': () => {
      const points = [];
      const sides = 5;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'hexagonFilled': () => {
      const points = [];
      const sides = 6;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'hexagonOutline': () => {
      const points = [];
      const sides = 6;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'octagonFilled': () => {
      const points = [];
      const sides = 8;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'octagonOutline': () => {
      const points = [];
      const sides = 8;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'diamondFilled': () => {
      const points = [
        { x: 0, y: -60 },
        { x: 50, y: 0 },
        { x: 0, y: 60 },
        { x: -50, y: 0 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'diamondOutline': () => {
      const points = [
        { x: 0, y: -60 },
        { x: 50, y: 0 },
        { x: 0, y: 60 },
        { x: -50, y: 0 }
      ];
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'parallelogramFilled': () => {
      const points = [
        { x: -60, y: -40 },
        { x: 40, y: -40 },
        { x: 60, y: 40 },
        { x: -40, y: 40 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'parallelogramOutline': () => {
      const points = [
        { x: -60, y: -40 },
        { x: 40, y: -40 },
        { x: 60, y: 40 },
        { x: -40, y: 40 }
      ];
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'trapezoidFilled': () => {
      const points = [
        { x: -50, y: -40 },
        { x: 50, y: -40 },
        { x: 70, y: 40 },
        { x: -70, y: 40 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'trapezoidOutline': () => {
      const points = [
        { x: -50, y: -40 },
        { x: 50, y: -40 },
        { x: 70, y: 40 },
        { x: -70, y: 40 }
      ];
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'plusFilled': () => {
      // Cross shape from two rectangles grouped together
      const vRect = new fabric.Rect({ width: 20, height: 80, fill: '#000000', originX: 'center', originY: 'center' });
      const hRect = new fabric.Rect({ width: 80, height: 20, fill: '#000000', originX: 'center', originY: 'center' });
      return new fabric.Group([vRect, hRect], { originX: 'center', originY: 'center' });
    },
    'plusOutline': () => {
      const vRect = new fabric.Rect({ width: 20, height: 80, fill: 'transparent', stroke: '#000000', strokeWidth: 1, originX: 'center', originY: 'center' });
      const hRect = new fabric.Rect({ width: 80, height: 20, fill: 'transparent', stroke: '#000000', strokeWidth: 1, originX: 'center', originY: 'center' });
      return new fabric.Group([vRect, hRect], { originX: 'center', originY: 'center' });
    },
    'arrowRight': () => {
      const points = [
        { x: -50, y: -25 },
        { x: 50, y: 0 },
        { x: -50, y: 25 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'arrowLeft': () => {
      const points = [
        { x: 50, y: -25 },
        { x: -50, y: 0 },
        { x: 50, y: 25 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'arrowUp': () => {
      const points = [
        { x: -25, y: 50 },
        { x: 0, y: -50 },
        { x: 25, y: 50 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'arrowDown': () => {
      const points = [
        { x: -25, y: -50 },
        { x: 0, y: 50 },
        { x: 25, y: -50 }
      ];
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    }
    ,
    // Additional regular polygons beyond octagon
    'heptagonFilled': () => {
      const points = [];
      const sides = 7;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'heptagonOutline': () => {
      const points = [];
      const sides = 7;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'nonagonFilled': () => {
      const points = [];
      const sides = 9;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'nonagonOutline': () => {
      const points = [];
      const sides = 9;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    'decagonFilled': () => {
      const points = [];
      const sides = 10;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'decagonOutline': () => {
      const points = [];
      const sides = 10;
      const r = 50;
      for (let i = 0; i < sides; i++) {
        const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    // Six-pointed star (hexagram)
    'hexStarFilled': () => {
      const points = [];
      const spikes = 6;
      const outerRadius = 50;
      const innerRadius = 20;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = i * Math.PI / spikes;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'hexStarOutline': () => {
      const points = [];
      const spikes = 6;
      const outerRadius = 50;
      const innerRadius = 20;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = i * Math.PI / spikes;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return new fabric.Polygon(points, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    // Heart shapes (filled and outline)
    'heartFilled': () => {
      const pathString = 'M 0 -50 C 20 -80, 50 -60, 50 -20 C 50 20, 0 40, 0 50 C 0 40, -50 20, -50 -20 C -50 -60, -20 -80, 0 -50 Z';
      return new fabric.Path(pathString, {
        fill: '#000000',
        stroke: null,
        originX: 'center',
        originY: 'center'
      });
    },
    'heartOutline': () => {
      const pathString = 'M 0 -50 C 20 -80, 50 -60, 50 -20 C 50 20, 0 40, 0 50 C 0 40, -50 20, -50 -20 C -50 -60, -20 -80, 0 -50 Z';
      return new fabric.Path(pathString, {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center'
      });
    },
    // Cross shape (outline) as an alias for a simple plus sign outline
    'crossOutline': () => {
      // Use two rectangles to form a cross
      const vRect = new fabric.Rect({ width: 20, height: 80, fill: 'transparent', stroke: '#000000', strokeWidth: 1, originX: 'center', originY: 'center' });
      const hRect = new fabric.Rect({ width: 80, height: 20, fill: 'transparent', stroke: '#000000', strokeWidth: 1, originX: 'center', originY: 'center' });
      return new fabric.Group([vRect, hRect], { originX: 'center', originY: 'center' });
    },
    'crossFilled': () => {
      const vRect = new fabric.Rect({ width: 20, height: 80, fill: '#000000', originX: 'center', originY: 'center' });
      const hRect = new fabric.Rect({ width: 80, height: 20, fill: '#000000', originX: 'center', originY: 'center' });
      return new fabric.Group([vRect, hRect], { originX: 'center', originY: 'center' });
    }
  };

  // Build the form menu by creating a button for each shape definition.
  function buildFormMenu(menuEl) {
    // Map shape keys to user-friendly labels
    const labels = {
      line: 'Line',
      rectangleFilled: 'Rectangle (filled)',
      rectangleOutline: 'Rectangle (outline)',
      triangleFilled: 'Triangle (filled)',
      triangleOutline: 'Triangle (outline)',
      circleFilled: 'Circle (filled)',
      circleOutline: 'Circle (outline)',
      starFilled: 'Star (filled)',
      starOutline: 'Star (outline)',
      ellipseFilled: 'Ellipse (filled)',
      ellipseOutline: 'Ellipse (outline)',
      pentagonFilled: 'Pentagon (filled)',
      pentagonOutline: 'Pentagon (outline)',
      hexagonFilled: 'Hexagon (filled)',
      hexagonOutline: 'Hexagon (outline)',
      octagonFilled: 'Octagon (filled)',
      octagonOutline: 'Octagon (outline)',
      diamondFilled: 'Diamond (filled)',
      diamondOutline: 'Diamond (outline)',
      parallelogramFilled: 'Parallelogram (filled)',
      parallelogramOutline: 'Parallelogram (outline)',
      trapezoidFilled: 'Trapezoid (filled)',
      trapezoidOutline: 'Trapezoid (outline)',
      plusFilled: 'Plus (filled)',
      plusOutline: 'Plus (outline)',
      // new shapes beyond the basics
      heptagonFilled: 'Heptagon (filled)',
      heptagonOutline: 'Heptagon (outline)',
      nonagonFilled: 'Nonagon (filled)',
      nonagonOutline: 'Nonagon (outline)',
      decagonFilled: 'Decagon (filled)',
      decagonOutline: 'Decagon (outline)',
      hexStarFilled: 'Hexagram (filled)',
      hexStarOutline: 'Hexagram (outline)',
      heartFilled: 'Heart (filled)',
      heartOutline: 'Heart (outline)',
      crossFilled: 'Cross (filled)',
      crossOutline: 'Cross (outline)',
      arrowRight: 'Arrow (right)',
      arrowLeft: 'Arrow (left)',
      arrowUp: 'Arrow (up)',
      arrowDown: 'Arrow (down)'
    };
    Object.keys(shapeDefinitions).forEach(key => {
      // Only show outline versions of shapes (keys ending with 'Outline'),
      // except for the plain 'line' shape which has no fill. Filled
      // variants are available via the fill toggle after insertion.
      if (key !== 'line' && !key.endsWith('Outline')) {
        return;
      }
      const btn = document.createElement('button');
      // Remove the 'Outline' suffix from labels for cleaner display
      const labelKey = labels[key] || key;
      const cleanLabel = labelKey.replace(/\s*\(outline\)/i, '').trim();
      btn.textContent = cleanLabel;
      btn.dataset.shapeKey = key;
      btn.title = 'insert ' + cleanLabel.toLowerCase();
      btn.addEventListener('click', (ev) => {
        // Prevent the click from propagating to the Add Form button or
        // other handlers which might immediately reopen the menu.
        ev.preventDefault();
        ev.stopPropagation();
        insertShape(key);
        // Hide the menu and remove active state from the Add Form button
        const menu = document.getElementById('formMenu');
        if (menu) menu.classList.add('hidden');
        const formBtn = document.getElementById('addFormBtn');
        if (formBtn) formBtn.classList.remove('active');
        // Stop measurement mode if active when inserting a shape
        stopMeasurement();
      });
      menuEl.appendChild(btn);
    });
  }

  // Insert a shape onto the canvas using the provided key
  function insertShape(key) {
    const factory = shapeDefinitions[key];
    if (!factory) return;
    const shapeObj = factory();
    // Assign operation and color (black for engraving) for groups and shapes
    function applyOperation(obj) {
      if (obj._objects && Array.isArray(obj._objects)) {
        obj._objects.forEach(child => applyOperation(child));
      }
      obj.operation = 'engrave';
      // Ensure fill and stroke are black if not transparent
      if (obj.fill && obj.fill !== 'transparent') obj.set('fill', '#000000');
      if (obj.stroke) obj.set('stroke', '#000000');
    }
    applyOperation(shapeObj);
    // Position at top-left corner (0,0) using origin left/top
    shapeObj.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
    canvas.add(shapeObj);
    canvas.setActiveObject(shapeObj);
    canvas.requestRenderAll();
    markUnsaved();
    saveHistory();
    // Close the form menu after inserting a shape and reset the Add Form button
    const menu = document.getElementById('formMenu');
    const formBtn = document.getElementById('addFormBtn');
    if (menu) menu.classList.add('hidden');
    if (formBtn) formBtn.classList.remove('active');
  }

  // Save current state to history
  function saveHistory() {
    if (isSavingHistory) return;
    isSavingHistory = true;
    // Serialize canvas excluding grid lines
    const json = canvas.toJSON(['operation', 'isGrid']);
    // If we are not at the end of history (after undo), cut off the redo states
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(json);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    historyIndex = history.length - 1;
    isSavingHistory = false;
  }

  // Undo to previous state
  function undoHistory() {
    if (historyIndex <= 0) return;
    historyIndex--;
    const state = history[historyIndex];
    canvas.loadFromJSON(state, () => {
      drawGrid();
      updateAxisLabels();
      canvas.requestRenderAll();
    }, function(obj, data) {
      // Reviver: mark grid lines as non-interactive
      if (data && data.isGrid) {
        obj.set({ selectable: false, evented: false });
      }
      return obj;
    });
  }

  // Redo to next state
  function redoHistory() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    const state = history[historyIndex];
    canvas.loadFromJSON(state, () => {
      drawGrid();
      updateAxisLabels();
      canvas.requestRenderAll();
    }, function(obj, data) {
      if (data && data.isGrid) {
        obj.set({ selectable: false, evented: false });
      }
      return obj;
    });
  }

  // Download two SVG files: one for engraving (black) and one for cutting (orange).
  // This function uses asynchronous cloning of objects to ensure the cloned
  // objects have been added to the temporary canvas before exporting.
  async function downloadSVGs() {
    // Export only user objects (exclude grid and measurement lines/labels)
    const objs = canvas.getObjects().filter(obj => !obj.isGrid && !obj.isMeasurement);
    const engraveObjects = objs.filter(obj => obj.operation !== 'cut');
    const cutObjects = objs.filter(obj => obj.operation === 'cut');
    const downloads = [];
    const date = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const timestamp = date.getFullYear() + '_' + pad(date.getMonth() + 1) + '_' + pad(date.getDate()) + '_' + pad(date.getHours()) + '_' + pad(date.getMinutes()) + '_' + pad(date.getSeconds());
    // Helper to create and download SVG from objects.  We always create a file
    // whenever there is at least one object of the given type – we no longer
    // attempt to inspect the SVG output for <path> or <text> tags because
    // some Fabric exports wrap content in <tspan> or <g>, which caused
    // legitimate engrave/cut files (such as text-only files) to be skipped.
    async function exportObjects(objects, type) {
      if (!objects || objects.length === 0) {
        return;
      }
      const tempCanvas = new fabric.StaticCanvas(null, { width: workWidth, height: workHeight });
      // Clone all objects asynchronously and add to the temporary canvas
      await Promise.all(objects.map(obj => new Promise(resolve => {
        obj.clone(function(clone) {
          clone.set({ selectable: false, evented: false });
          tempCanvas.add(clone);
          resolve();
        });
      })));
      const svgString = tempCanvas.toSVG();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const fileName = `TRAMANNPROJECTS_CNCHELPER_${type}_${workWidth}_${workHeight}_${unit}_${timestamp}.svg`;
      downloads.push({ url, fileName });
    }
    await exportObjects(engraveObjects, 'engraving');
    await exportObjects(cutObjects, 'cutting');
    // Trigger downloads
    downloads.forEach(item => {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(item.url);
    });
    // Mark as saved
    hasUnsavedChanges = false;
  }

  // Initialize after DOM is ready
  document.addEventListener('DOMContentLoaded', init);
})();