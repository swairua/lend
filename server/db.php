<?php
$host = '127.0.0.1';
$port = 3307;
$dbname = 'lending_db';
$user = 'root';
$pass = '';

$pdo = null;

function pdo() {
    global $host, $port, $dbname, $user, $pass, $pdo;
    if ($pdo === null) {
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    }
    return $pdo;
}

function q($sql, $params = []) {
    $stmt = pdo()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function one($sql, $params = []) {
    return q($sql, $params)->fetch();
}

function all($sql, $params = []) {
    return q($sql, $params)->fetchAll();
}