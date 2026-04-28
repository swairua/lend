<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && strpos($uri, 'auth/login') !== false) {
    $data = input();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $user = one("SELECT * FROM users WHERE email = ?", [$email]);
    
    if ($user && password_verify($password, $user['password'])) {
        $token = 't_' . bin2hex(random_bytes(32));
        
        $stmt = pdo()->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$user['id']]);
        
        // Save token
        $stmt = pdo()->prepare("INSERT INTO tokens (user_id, token) VALUES (?, ?)");
        $stmt->execute([$user['id'], $token]);
        
        $borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);
        
        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'phone' => $user['phone'],
                'role' => $user['role'],
                'borrower_id' => $borrower['id'] ?? null
            ],
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'phone' => $user['phone'],
                    'role' => $user['role'],
                    'borrower_id' => $borrower['id'] ?? null
                ]
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    }
    exit;
}

if ($method === 'GET' && strpos($uri, 'auth/me') !== false) {
    $user = auth();
    $stmt = pdo()->prepare("SELECT id, email, name, phone, role FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch();
    
    $borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);
    $u['borrower_id'] = $borrower['id'] ?? null;
    
    echo json_encode(['success' => true, 'data' => $u]);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Not found']);