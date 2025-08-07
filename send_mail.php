<?php
$email = isset($_POST['email']) ? $_POST['email'] : '';
$subject = 'TRAMANN PROJECTS CNC HELPER - new design';
$body = "Hi, the new design is attached.";
$recipients = ['hi@tnxapi.com'];
if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $recipients[] = $email;
}
foreach ($recipients as $to) {
    $boundary = md5(uniqid(time()));
    $headers  = "From: hi@tnxapi.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
    $message  = "--{$boundary}\r\n";
    $message .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $message .= $body . "\r\n";
    if (!empty($_FILES['files']['tmp_name']) && is_array($_FILES['files']['tmp_name'])) {
        for ($i = 0; $i < count($_FILES['files']['tmp_name']); $i++) {
            $tmp  = $_FILES['files']['tmp_name'][$i];
            $name = $_FILES['files']['name'][$i];
            if (is_uploaded_file($tmp)) {
                $data = chunk_split(base64_encode(file_get_contents($tmp)));
                $message .= "--{$boundary}\r\n";
                $message .= "Content-Type: image/svg+xml; name=\"{$name}\"\r\n";
                $message .= "Content-Transfer-Encoding: base64\r\n";
                $message .= "Content-Disposition: attachment; filename=\"{$name}\"\r\n\r\n";
                $message .= $data . "\r\n";
            }
        }
    }
    $message .= "--{$boundary}--";
    @mail($to, $subject, $message, $headers);
}
echo 'OK';
?>
