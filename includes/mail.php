<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function smtp_is_configured(array $config): bool
{
    return $config['smtp_host'] !== ''
        && $config['smtp_user'] !== ''
        && $config['smtp_pass'] !== ''
        && $config['smtp_from'] !== '';
}

/**
 * @return array{ok: bool, error?: string}
 */
function send_otp_email(array $config, string $toEmail, string $otpCode): array
{
    if (!smtp_is_configured($config)) {
        return ['ok' => false, 'error' => 'Email OTP is not configured on server.'];
    }

    $autoload = dirname(__DIR__) . '/vendor/autoload.php';
    if (!is_readable($autoload)) {
        return ['ok' => false, 'error' => 'PHPMailer is not installed. Run composer install.'];
    }
    require_once $autoload;

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp_user'];
        $mail->Password = $config['smtp_pass'];
        $mail->SMTPSecure = ((int) $config['smtp_port'] === 465)
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int) $config['smtp_port'];

        $mail->setFrom($config['smtp_user'], 'Loveria');
        if (preg_match('/^(.+?)\s*<(.+?)>$/', $config['smtp_from'], $m)) {
            $mail->setFrom($m[2], trim($m[1]));
        } elseif (filter_var($config['smtp_from'], FILTER_VALIDATE_EMAIL)) {
            $mail->setFrom($config['smtp_from'], 'Loveria');
        }

        $mail->addAddress($toEmail);
        $mail->Subject = 'Your Loveria verification code';
        $mail->isHTML(true);
        $mail->Body = '<p>Your verification code is:</p><h2>' . htmlspecialchars($otpCode)
            . '</h2><p>This code expires in 10 minutes.</p>';
        $mail->AltBody = "Your verification code is {$otpCode}. It expires in 10 minutes.";
        $mail->send();
        return ['ok' => true];
    } catch (Exception $e) {
        return ['ok' => false, 'error' => 'Failed to send verification code.'];
    }
}
