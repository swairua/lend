<?php
$method = $_SERVER['REQUEST_METHOD'];
$user = auth();

if (strpos($uri, 'messages') !== false && !preg_match('#messages/\d+#', $uri) && strpos($uri, 'unread') === false) {
    $folder = $_GET['folder'] ?? 'inbox';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    if ($folder === 'sent') {
        $msgs = all("
            SELECT m.*, u.name as recipient_name, u.email as recipient_email
            FROM messages m
            LEFT JOIN users u ON m.recipient_id = u.id
            WHERE m.sender_id = ?
            ORDER BY m.created_at DESC
            LIMIT $limit OFFSET $offset
        ", [$user['id']]);
        
        $total = one("SELECT COUNT(*) as total FROM messages WHERE sender_id = ?", [$user['id']]);
    } else {
        $msgs = all("
            SELECT m.*, u.name as sender_name, u.email as sender_email
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.recipient_id = ?
            ORDER BY m.created_at DESC
            LIMIT $limit OFFSET $offset
        ", [$user['id']]);
        
        $total = one("SELECT COUNT(*) as total FROM messages WHERE recipient_id = ?", [$user['id']]);
    }
    
    $unread = one("SELECT COUNT(*) as total FROM messages WHERE recipient_id = ? AND is_read = 0", [$user['id']]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'messages' => $msgs,
            'unread_count' => $unread['total'],
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total['total']]
        ]
    ]);
    exit;
}

if (strpos($uri, 'messages/unread') !== false) {
    $unread = one("SELECT COUNT(*) as total FROM messages WHERE recipient_id = ? AND is_read = 0", [$user['id']]);
    echo json_encode(['success' => true, 'data' => ['unread' => $unread['total']]]);
    exit;
}

if (preg_match('#messages/(\d+)$#', $uri, $m)) {
    $msg = one("SELECT * FROM messages WHERE id = ?", [$m[1]]);
    
    if ($msg && $msg['recipient_id'] == $user['id'] && !$msg['is_read']) {
        $stmt = pdo()->prepare("UPDATE messages SET is_read = 1 WHERE id = ?");
        $stmt->execute([$msg['id']]);
    }
    
    echo json_encode(['success' => true, 'data' => $msg]);
    exit;
}

if ($method === 'PUT' && preg_match('#messages/(\d+)/read#', $uri, $m)) {
    $stmt = pdo()->prepare("UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?");
    $stmt->execute([$m[1], $user['id']]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'POST' && strpos($uri, 'messages') !== false && !preg_match('#messages/\d+#', $uri)) {
    $data = input();
    
    $stmt = pdo()->prepare("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?, ?, ?, ?, ?, 'general')");
    $stmt->execute([$user['id'], $data['recipient_id'], $data['loan_id'] ?? null, $data['subject'], $data['message']]);
    
    echo json_encode(['success' => true, 'message' => 'Message sent']);
    exit;
}

if ($method === 'DELETE' && preg_match('#messages/(\d+)$#', $uri, $m)) {
    $stmt = pdo()->prepare("DELETE FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)");
    $stmt->execute([$m[1], $user['id'], $user['id']]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Not found']);
