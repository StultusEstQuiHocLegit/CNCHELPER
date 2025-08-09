<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No image provided']);
    exit;
}

$apiKey = 'YOUR_OPENAI_API_KEY'; // placeholder API key

$systemPrompt = 'You are TRAMANN transformer. Convert the provided image to an SVG. Return only the SVG markup.';

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
