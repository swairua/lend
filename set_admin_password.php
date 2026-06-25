<?php
$DB_TYPE = 'mysql';
$DB_HOST = 'localhost';
$DB_NAME = 'jecrilog_bureau';
$DB_USER = 'jecrilog_jecrilog';
$DB_PASS = 'Sirgeorge.12';
$pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);
$hash = password_hash('Jecri.Admin@Bureau', PASSWORD_BCRYPT);
$stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?");
$stmt->execute([$hash, 'bureau@jecrilogistics.com']);
echo "Updated " . $stmt->rowCount() . " row(s) - bureau@jecrilogistics.com password changed to Jecri.Admin@Bureau\n";
