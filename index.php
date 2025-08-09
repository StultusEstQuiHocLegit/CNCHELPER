<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TRAMANN CNC HELPER</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Top toolbar -->
  <div id="topBar">
    <div class="toolbar-left">
      <button id="addTextBtn" title="add text">ADD TEXT</button>
      <button id="uploadBtn" title="upload image">UPLOAD IMAGE</button>
      <button id="addFormBtn" title="add a shape/form">ADD FORM</button>
    </div>
    <div class="toolbar-right">
      <button id="downloadBtn" title="download paths">DOWNLOAD</button>
    </div>
  </div>

  <!-- Hidden file input for uploads -->
  <input type="file" id="fileInput" accept=".svg,.png,.jpg,.jpeg" multiple style="display:none">

  <!-- Canvas wrapper with axes -->
  <div id="canvasContainer">
    <!-- Horizontal axis labels -->
    <div id="xAxisLabels"></div>
    <!-- Vertical axis labels -->
    <div id="yAxisLabels"></div>
    <!-- Fabric.js canvas element -->
    <canvas id="c" width="1000" height="1000"></canvas>
  </div>

  <!-- Bottom bar -->
  <div id="bottomBar">
    <div class="bottom-left">
      <!-- Unit toggle: simple clickable text. Shows current unit (mm or inch) and toggles on click -->
      <span id="unitToggle" class="unit-toggle" title="toggle between millimetres and inches">mm</span>
      <button id="measureBtn" title="measure distances">MEASURE</button>
    </div>
    <div class="bottom-right">
      <label for="widthInput" title="work area width" style="margin-right:4px;">W:</label>
      <input type="number" id="widthInput" min="0" step="0.01" title="set the width of the work area" style="width:70px;">
      <span id="widthUnitLabel" title="current unit (mm/inch)" style="margin-right:12px;">mm</span>
      <label for="heightInput" title="work area height" style="margin-right:4px;">H:</label>
      <input type="number" id="heightInput" min="0" step="0.01" title="set the height of the work area" style="width:70px;">
      <span id="heightUnitLabel" title="current unit (mm/inch)">mm</span>
    </div>
  </div>

  <!-- Font selection dropdown (hidden by default) -->
  <div id="fontSelector" class="popover hidden">
    <label>Choose font:</label>
    <select id="fontDropdown" title="select a font for the selected text"></select>
  </div>

  <!-- Cut/engrave toggle icon (drill icon placeholder) -->
  <div id="cutToggle" class="popover hidden">
    <button id="cutToggleBtn" title="toggle between engraving (black) and cutting (orange)">TOGGLE CUT</button>
  </div>

  <!-- Fill toggle: switch between outline and filled shape -->
  <div id="fillToggle" class="popover hidden">
    <button id="fillToggleBtn" title="toggle between filled and outline shape">TOGGLE FILL</button>
  </div>

  <!-- Form selection menu: appears when Add Form is clicked -->
  <div id="formMenu" class="popover hidden">
    <!-- Buttons will be generated via script -->
  </div>

  <!-- Layer controls popover: provide ordering operations for selected object(s) -->
  <div id="layerControls" class="popover hidden">
    <button id="sendToBackBtn" title="send to back">«</button>
    <button id="sendBackwardsBtn" title="send backward one layer">←</button>
    <button id="bringForwardBtn" title="bring forward one layer">→</button>
    <button id="bringToFrontBtn" title="bring to front">»</button>
  </div>

  <!-- Info overlay shown on first load -->
  <div id="infoOverlay">
    <div id="infoBox">
      <h1>TRAMANN CNC HELPER</h1>
      <table>
        <tr>
          <td><b>↖</b> there you can add texts, images and common forms to the canvas</td>
          <td id="downloadInfoText"><b>↗</b> download the SVG paths for CNC engraving and cutting</td>
        </tr>
        <tr>
          <td><b>↙</b> change measurement system and you can take measurements</td>
          <td><b>↘</b> adjust the width and height of your workpiece</td>
        </tr>
      </table>
      <p class="hover-hint">(by hovering with your mouse, you can see explanations and help)</p>
      <button id="gotItBtn">GOT IT</button>
    </div>
  </div>

  <!-- Transformation overlay for non-SVG uploads -->
  <div id="transformOverlay">
    <div id="transformBox">
      <h1>TRAMANN TRANSFORMER</h1>
      <table>
        <tr>
          <td><img id="transformInputPreview" src="" alt="input preview"></td>
          <td class="transform-arrow"><b>&rarr;</b></td>
          <td>
            <div id="transformOutputPreview">
              <div class="orbit-dot"></div>
            </div>
          </td>
        </tr>
      </table>
      <div class="transform-buttons">
        <button id="transformCancelBtn" style="opacity:0.5;" title="cancel transformation and go back to canvas">CANCEL</button>
        <button id="transformRetryBtn" class="hidden" style="opacity:0.8;" title="retry transforming the image to SVG">RETRY</button>
        <button id="transformAcceptBtn" class="hidden" style="opacity:1;" title="accept and add to canvas">ACCEPT</button>
      </div>
    </div>
  </div>

  <!-- Libraries -->
  <script src="fabric.min.js"></script>
  <script src="imagetracer.js"></script>
  <script src="script.js"></script>
</body>
</html>
