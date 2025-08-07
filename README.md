# TRAMANNPROJECTS CNCHELPER

A web-based tool for preparing and arranging black-and-white SVGs for laser cutting or engraving.

## 🔧 Features

### 🖼️ Canvas
- Background color: **light grey**
- Grid of **horizontal and vertical lines** with **opacity 0.3**
- X- and Y-axis markers visible on canvas borders
- Grid spacing adjusts dynamically based on zoom level (e.g., 5mm, 10mm, 20mm...)

### 📐 Units
- **Switch between millimeters and inches** in the **bottom-left corner**
  - Defaults to **mm**
  - Saved in cookies for **10 years**
  - Automatically applies saved setting on page load

### 📏 Dimensions
- **Canvas defaults to 1m x 1m**
- User can change width and height
- Settings saved via cookie
- **Displayed in bottom-right corner**

### 🖱️ Interaction
- Add and manipulate:
  - **Text elements**
  - **Images (SVG, PNG, JPEG, JPG)**
- **Drag, resize, rotate (5°/10° snap steps), move**
- **Snapping to alignment**
  - Snap to center, shared edges, etc.
  - Snap relative to other objects
- **Multi-select** and transform elements together
- **Undo/redo** with `Ctrl+Z` / `Ctrl+Y`
- **Download** trigger with `Ctrl+S`
- **Save reminder** on page leave if there are unsaved changes (ignored if canvas is still empty)

### 📝 Text Tools
- **Button in top-left** to add new text
- Click text to **edit content**
- On text edit:
  - A **font icon appears above**
  - Clicking it lets user **select from 30 font options**
  - **Arial** is default
  - Selected font saved in cookie

### 🖼️ Image Upload
- Upload via button in **top-left corner**
- Accepted formats: **SVG, PNG, JPEG, JPG**
  - If **SVG**: directly inserted into canvas
  - If **PNG/JPEG/JPG**:
    - Automatically **converted to SVG**
    - **Black and white conversion**, keeping only black as paths
    - **White background is removed**

### 🔧 Tool Modes
- All objects (texts/images) start as **black** (engraving)
- On clicking an image or text:
  - A **drill icon appears above**
  - Clicking toggles between **black (engraving)** and **orange (cutting)**
  - Toggled color is applied to all path content of the object

### ⚙️ Export
- **Download button** in **top-right corner**
- Exports **two SVG files**:
  1. **Engraving** file (black only):
     ```
     TRAMANNPROJECTS_CNCHELPER_engraving_[WIDTH]_[HEIGHT]_[UNIT]_[DATE_AND_TIME].svg
     ```
  2. **Cutting** file (orange only):
     ```
     TRAMANNPROJECTS_CNCHELPER_cutting_[WIDTH]_[HEIGHT]_[UNIT]_[DATE_AND_TIME].svg
     ```

## 🧠 Notes
- All settings (unit, font, dimensions) are saved in **cookies for 10 years**
- On page load, preferences are restored if available

## 🧪 Future Improvements (Optional Ideas)
- Add object layering controls (e.g., bring to front/back)
- Keyboard shortcuts for object transformations
- Save/load full canvas state in localStorage or file

---

### ⚙️ Setup / Deployment
This is a static HTML/JS/CSS application. You can:

- Host it on **any static web server** (e.g., GitHub Pages, Vercel, Netlify)
- Open the `index.html` in any browser

---

### 👑 Created by
**TRAMANNPROJECTS** – CNC Helper Web Edition  
