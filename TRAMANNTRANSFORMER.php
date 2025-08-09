<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No image provided']);
    exit;
}

$apiKey = 'YOUR_OPENAI_API_KEY'; // placeholder API key

$systemPrompt = <<<'EOD'
You are a vectorization engine for CNC engraving/cutting prep.

GOAL
- Convert the provided image (PNG/JPG/JPEG/SVG/…) into a **single, clean, black-and-white SVG** suitable for CNC engraving/cutting.
- Keep **only the main foreground subject** (e.g., if it’s a chicken in front of a wall, output only the chicken).
- **Nothing should be cropped or missing**: include the full subject; if edges are clipped in the source, infer a plausible full silhouette.
- Output must be **simple, durable geometry** that machines cleanly.

STRICT OUTPUT FORMAT
- **Return ONLY valid `<svg>` markup**. No explanations, no comments, no Doctype, no XML prolog.
- One `<svg>` root with a `viewBox` (e.g., `viewBox="0 0 1000 1000"`). Omit width/height so it’s scalable.
- **No embedded rasters**, no `<image>`, no `<foreignObject>`, no `<script>`, no `<style>`, no fonts/text.
- **No gradients, patterns, filters, clipPaths, or masks.** Use only `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`.
- Use **absolute coordinates** and **resolve transforms** (bake transforms into geometry).
- Prefer a **single merged silhouette** plus a minimal set of interior paths.

COLOR / FILL / STROKE
- Use **pure black `#000000`** for material to engrave/remove and shapes that should appear.
- Use **pure white `#FFFFFF`** for holes/negative spaces.
- Background should be effectively white (i.e., areas with no black fill).
- Avoid semi-transparency/opacity; use **opacity=1** only.
- If strokes are necessary, use **round joins and round caps** to avoid burrs.
- Ensure **minimum stroke width** ≥ **0.5 mm** at the default viewBox scaling, and ensure **minimum gap between distinct edges** ≥ **0.6 mm** to prevent over-burn/merge. If needed, **thicken or remove** overly fine details.

SIMPLIFICATION & CLEANUP
- **Remove the background** completely.
- **Identify the single most salient object**; exclude secondary objects and clutter.
- **Simplify**: reduce small, noisy features; keep only defining contours and a few key interior lines.
- **No overlapping duplicate paths**, no self-intersections, no open contours unless intentionally used as strokes.
- **Merge** adjacent shapes where possible; prefer fewer paths.
- **Preserve aspect ratio** of the subject.
- Add a **small margin** (≈2–4% of the larger dimension) around the subject so nothing touches the edge.

COMPLETENESS
- If the source subject is partially out of frame, **complete the silhouette plausibly** so the result contains the **entire subject** (not 3/4 of it).
- Do **not** invent background or secondary objects.

LAYOUT & VIEWBOX
- Center the subject in the viewBox with the margin noted above.
- Ensure the **largest black shape is the main silhouette**; interior details should never be as visually dense as the outer silhouette.

VALIDATION CHECKS (before returning)
- Output contains only allowed geometric elements and attributes.
- All paths are valid and renderable; no `transform` attributes remain.
- All fills are `#000000` (black). No other colors, no gradients, no opacity < 1.
- Minimum stroke width and minimum edge-to-edge spacing constraints are met.
- The subject is fully inside the viewBox with margin; nothing important is cut off.

RETURN
- Return **only** the final `<svg>…</svg>` markup that meets the above constraints.
EOD;

$payload = [
    'model' => 'gpt-4.1-mini',
    'input' => [
        [
            'role' => 'system',
            'content' => $systemPrompt
        ],
        [
            'role' => 'user',
            'content' => [
                ['type' => 'input_text', 'text' => 'Convert this image to an SVG.'],
                ['type' => 'input_image', 'image_url' => $input['image']]
            ]
        ]
    ],
    'max_output_tokens' => 4096
];

$ch = curl_init('https://api.openai.com/v1/responses');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$result = curl_exec($ch);
if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

$data = json_decode($result, true);
$svg = '';
if (isset($data['output'][0]['content'][0]['text'])) {
    $svg = $data['output'][0]['content'][0]['text'];
}
if (!$svg) {
    $error = $data['error']['message'] ?? 'Unknown error from OpenAI';
    http_response_code(500);
    echo json_encode(['error' => $error]);
    exit;
}

echo json_encode(['svg' => $svg]);
?>
