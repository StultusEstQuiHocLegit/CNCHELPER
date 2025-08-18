# TRAMANN CNC HELPER

A web-based tool for preparing and arranging black-and-white SVGs for laser cutting or engraving.
To allow sending paths directly, add the following to the URL: https://www.tnxapi.com/CNCHELPER/index.php?email=hi@tnxapi.com&company=test+company&ms=mm&&w=600h=400

this is the base URL: https://www.tnxapi.com/CNCHELPER/index.php
and then you can add additional attributes after the "?", if you want multiple ones, combine them with "&", possible attributes are:
- email for sending paths directly: ?email=hi@tnxapi.com
- company name: &company=test+company (replace empty spaces " " with "+")
- measurement system (mm or inch): &ms=mm
- work area width &w=600
- work area height: &h=400


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

### ↗️ Export
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

---

### ⚙️ In the following, you can see the base prompts with which the main code base in this repository was created





Please create a website, where there is a page with horizontal and vertical lines with opacity 0.3 as a canva in the background, backgroudn color should be lighgrey,
in the bottom left corner there is a switch for mm and inch, mm by default, if user switches, save if as a cookie for ten years, on page onload, toggle it based on cookie if there is one,
in the top right corner there should be a small download button to download the svg-files,
in the top left corner there should be a button for text and for upload,
the user can upload svg, png, jpeg, jpg, if its svg, we just put it on the canva,
if it's another file, we have to convert it in svg first,
in both cases, make the images only black and white and keep only the black parts as paths, the white backgroudn we don't need,
the user can arrange texts and images on the canva, can scroll in and out,
in the bottom right corner there are the dimension, by default 1m x 1m widht and height, also save cookies for them too and load them if set
at the side of the canva, there should be the size written down on x- and y-axis, the horizontal and vertical should be in a regular grid,
based on scrolling level for example in distances of 5mm, 10mm, 20mm, 50mm, ...
the user can resize texts and images, turn them (locking in on for example 5°, 10°, ...), reposition them (there shoudl be locking in, so for example if it's nearly the same height, put it the same height,
if its neraly centered, center it, ..., also lock in relativ to each other and stuff),
with crtl-Z and ctrl-y he can go back and furth, with crtl-s he triggers pressing the download button
the user can click on a text and change it, while he edits a text, above the text there should be a little font icon, by clicking on it, he can select a font, please give 30 options in different styles, default shoudl be Arial, set cookie for that one too,
if the uer clicks on an image, there shoudl appear a little drill icon above, if he clicks it, the color is changed from black (default for all texts and image paths) to orange, of he clicks again, we go back,
all black is "engraving" all orange is "cutting", on download, please export two svg files:
1.) only hte blakc parts all in one file: TRAMANNPROJECTS_CNCHELPER_engraving_[InsertWidth]_[InsertHeight]_[mm or inch]_[UnsertCurrentDateAndTimeWithUnderscores]
2.) only the orange parts all in one file: TRAMANNPROJECTS_CNCHELPER_cutting_[InsertWidth]_[InsertHeight]_[mm or inch]_[UnsertCurrentDateAndTimeWithUnderscores]
(if one of the files is empty, we don't need to download that)
please also allos the user to select multiple things and move them around, turn them, ... all at once,
if user wants to leave page before downloading / has "un-downloaded" chagnes, rememebr him to save, but don't do that if he has nothign entered yet

Please also add next to "Upload Image", right next to it "Add Form" and on click a small menu open where the user can select:
line, rectangle (filled out), rectangle (just the ouline), triangle (filled out), triangle (just the ouline), circle (filled out), circle (just the ouline), star (filled out), star (just the ouline)
and also some ohter common form you find usefull, add about 20 more after these

Please also add right next to "Add Form" a distance measurement tool where the user can select two point and then a line is drawn in between and on this line there is the distance written,
then the user can click again and this third clicks is the beginnign of the second line (keep the old lines and measurement information there), the the measurement tool is activated
until ESC key on keyboard is pressed or until the user unselects the button at the top, then also all distance lines and measurement informations are gone
