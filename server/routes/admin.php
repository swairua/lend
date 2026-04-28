<?php
$method = $_SERVER['REQUEST_METHOD'];
$user = auth();

if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit;
}

// Dashboard
if (strpos($uri, 'admin/dashboard') !== false || strpos($uri, 'dashboard') !== false) {
    $borrowers = one("SELECT COUNT(*) as total FROM users WHERE role = 'borrower'");
    $loans = all("SELECT status, principal_amount, total_amount, created_at FROM loans");
    $totalLoans = count($loans);
    $activeLoans = $pendingLoans = $approvedLoans = $totalDisbursed = 0;
    foreach ($loans as $l) {
        if ($l['status'] === 'active') $activeLoans++;
        if ($l['status'] === 'pending') $pendingLoans++;
        if ($l['status'] === 'approved') $approvedLoans++;
        if ($l['status'] === 'active' || $l['status'] === 'completed') $totalDisbursed += floatval($l['principal_amount']);
    }
    
    $collected = one("SELECT COALESCE(SUM(amount), 0) as total FROM repayments");
    $defaulted = 0;
    foreach ($loans as $l) {
        if ($l['status'] === 'defaulted') $defaulted++;
    }
    $defaultRate = $totalLoans > 0 ? ($defaulted / $totalLoans * 100) : 0;
    
    // Approval rate
    $totalProcessed = $totalLoans - $pendingLoans;
    $approvalRate = $totalProcessed > 0 ? ($approvedLoans / $totalProcessed * 100) : 0;
    
    // Monthly disbursements (last 6 months)
    $monthlyDisbursements = all("
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(principal_amount), 0) as total
        FROM loans
        WHERE status IN ('active', 'completed') AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
    ");
    
    // Loan purpose distribution by category
    $categoryDistribution = all("
        SELECT lc.name as category, COUNT(*) as count, (COUNT(*) / $totalLoans * 100) as percentage
        FROM loans l
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        LEFT JOIN loan_categories lc ON lp.category_id = lc.id
        GROUP BY lc.id, lc.name
    ");
    
    $recentLoans = all("
        SELECT l.*, u.name as borrower_name, lp.name as product_name, lc.name as category_name
        FROM loans l
        LEFT JOIN borrowers b ON l.borrower_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        LEFT JOIN loan_categories lc ON lp.category_id = lc.id
        ORDER BY l.created_at DESC LIMIT 5
    ");
    
    $recentRepayments = all("
        SELECT r.*, u.name as borrower_name
        FROM repayments r
        LEFT JOIN loans l ON r.loan_id = l.id
        LEFT JOIN borrowers b ON l.borrower_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        ORDER BY r.paid_at DESC LIMIT 5
    ");
    
    echo json_encode([
        'success' => true,
        'data' => [
            'total_borrowers' => $borrowers['total'],
            'total_loans' => $totalLoans,
            'active_loans' => $activeLoans,
            'pending_loans' => $pendingLoans,
            'total_disbursed' => $totalDisbursed,
            'total_collected' => $collected['total'],
            'default_rate' => $defaultRate,
            'approval_rate' => $approvalRate,
            'monthly_disbursements' => $monthlyDisbursements,
            'category_distribution' => $categoryDistribution,
            'recent_loans' => $recentLoans,
            'recent_repayments' => $recentRepayments,
            'changes' => ['borrowers' => 0, 'loans' => 0, 'active_loans' => 0, 'disbursed' => 0, 'collected' => 0]
        ]
    ]);
    exit;
}

// All loans (admin)
if (strpos($uri, 'admin/loans') !== false && strpos($uri, 'loans/') === false) {
    $status = $_GET['status'] ?? null;
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = "
        SELECT l.*, u.name as borrower_name, u.email as borrower_email, lp.name as product_name, lc.name as category_name
        FROM loans l
        LEFT JOIN borrowers b ON l.borrower_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        LEFT JOIN loan_categories lc ON lp.category_id = lc.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($status && $status !== 'all') {
        $sql .= " AND l.status = ?";
        $params[] = $status;
    }
    
    $sql .= " ORDER BY l.created_at DESC LIMIT $limit OFFSET $offset";
    
    $loans = all($sql, $params);
    
    foreach ($loans as &$loan) {
        $paid = one("SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?", [$loan['id']]);
        $loan['total_paid'] = $paid['total'];
        $loan['balance'] = floatval($loan['total_amount']) - floatval($paid['total']);
    }
    
    $countSql = $status && $status !== 'all' ? "SELECT COUNT(*) as total FROM loans WHERE status = ?" : "SELECT COUNT(*) as total FROM loans";
    $countParams = $status && $status !== 'all' ? [$status] : [];
    $total = one($countSql, $countParams);
    
    echo json_encode([
        'success' => true,
        'data' => ['loans' => $loans, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total['total']]]
    ]);
    exit;
}

// Single loan (admin)
if (preg_match('#^(admin/)?loans/(\d+)$#', $uri, $m)) {
    $loan = one("
        SELECT l.*, u.name as borrower_name, u.email as borrower_email, u.phone as borrower_phone,
               lp.name as product_name, lp.description as product_description
        FROM loans l
        LEFT JOIN borrowers b ON l.borrower_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        WHERE l.id = ?
    ", [$m[1]]);
    
    if (!$loan) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Loan not found']);
        exit;
    }
    
    $repayments = all("SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC", [$loan['id']]);
    $payments = all("SELECT * FROM payments WHERE loan_id = ? ORDER BY created_at DESC", [$loan['id']]);
    $totalPaid = 0;
    foreach ($repayments as $r) $totalPaid += floatval($r['amount']);
    
    $loan['repayments'] = $repayments;
    $loan['payments'] = $payments;
    $loan['total_paid'] = $totalPaid;
    $loan['balance'] = floatval($loan['total_amount']) - $totalPaid;
    
    echo json_encode(['success' => true, 'data' => $loan]);
    exit;
}

// Approve loan
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/approve$#', $uri, $m)) {
    $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
    
    if (!$loan) {
        echo json_encode(['success' => false, 'error' => 'Loan not found']);
        exit;
    }
    
    if ($loan['status'] !== 'pending') {
        echo json_encode(['success' => false, 'error' => 'Loan is not pending']);
        exit;
    }
    
    $data = input();
    $approve = $data['approve'] ?? true;
    $newStatus = $approve ? 'approved' : 'rejected';
    
    $stmt = pdo()->prepare("UPDATE loans SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?");
    $stmt->execute([$newStatus, $user['id'], $m[1]]);
    
    $borrower = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
    
    $stmt = pdo()->prepare("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $user['id'],
        $borrower['user_id'],
        $m[1],
        $approve ? 'Loan Approved' : 'Loan Rejected',
        $approve ? "Your loan #{$m[1]} has been approved." : "Your loan #{$m[1]} has been rejected.",
        $approve ? 'approval' : 'rejection'
    ]);
    
    echo json_encode(['success' => true, 'message' => "Loan $newStatus"]);
    exit;
}

// Disburse loan
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/disburse$#', $uri, $m)) {
    $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
    
    if (!$loan || $loan['status'] !== 'approved') {
        echo json_encode(['success' => false, 'error' => 'Loan must be approved first']);
        exit;
    }
    
    $data = input();
    $amount = $data['disbursement_amount'] ?? $loan['principal_amount'];
    
    $stmt = pdo()->prepare("UPDATE loans SET status = 'active', disbursed_at = NOW() WHERE id = ?");
    $stmt->execute([$m[1]]);
    
    $stmt = pdo()->prepare("INSERT INTO payments (loan_id, type, amount, method, reference, status) VALUES (?, 'disbursement', ?, 'bank', ?, 'completed')");
    $stmt->execute([$m[1], $amount, $data['reference'] ?? null]);
    
    $borrower = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
    
    $stmt = pdo()->prepare("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?, ?, ?, 'Loan Disbursed', ?, 'disbursement')");
    $stmt->execute([$user['id'], $borrower['user_id'], $m[1], "Your loan #{$m[1]} has been disbursed."]);
    
    echo json_encode(['success' => true, 'message' => 'Loan disbursed']);
    exit;
}

// Reactivate loan
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/reactivate$#', $uri, $m)) {
    $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
    
    if (!$loan) {
        echo json_encode(['success' => false, 'error' => 'Loan not found']);
        exit;
    }
    
    if ($loan['status'] !== 'rejected' && $loan['status'] !== 'defaulted' && $loan['status'] !== 'pending') {
        echo json_encode(['success' => false, 'error' => 'Loan must be rejected, defaulted, or pending to reactivate']);
        exit;
    }
    
    $stmt = pdo()->prepare("UPDATE loans SET status = 'pending', approved_by = NULL, approved_at = NULL, disbursed_at = NULL WHERE id = ?");
    $stmt->execute([$m[1]]);
    
    // Get borrower user_id
    $loan = one("SELECT borrower_id FROM loans WHERE id = ?", [$m[1]]);
    $borrower = one("SELECT user_id FROM borrowers WHERE id = ?", [$loan['borrower_id']]);
    
    if ($borrower && $borrower['user_id']) {
        $stmt = pdo()->prepare("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?, ?, ?, 'Loan Reactivated', ?, 'loan_update')");
        $stmt->execute([$user['id'], $borrower['user_id'], $m[1], "Your loan #{$m[1]} has been reactivated and is pending review."]);
    }
    
    echo json_encode(['success' => true, 'message' => 'Loan reactivated successfully']);
    exit;
}

// Mark as defaulted
if ($method === 'POST' && preg_match('#admin/loans/(\d+)/default$#', $uri, $m)) {
    $loan = one("SELECT * FROM loans WHERE id = ?", [$m[1]]);
    
    if (!$loan) {
        echo json_encode(['success' => false, 'error' => 'Loan not found']);
        exit;
    }
    
    $stmt = pdo()->prepare("UPDATE loans SET status = 'defaulted' WHERE id = ?");
    $stmt->execute([$m[1]]);
    
    echo json_encode(['success' => true, 'message' => 'Loan marked as defaulted']);
    exit;
}

// Get all borrowers
if (strpos($uri, 'borrowers') !== false && !preg_match('#^loans/(\d+)$#', $uri) && !preg_match('#borrowers/\d+#', $uri)) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $borrowers = all("
        SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
               b.id as borrower_id, b.national_id, b.address, b.business_name,
               b.business_type, b.monthly_income, b.credit_score
        FROM users u
        LEFT JOIN borrowers b ON u.id = b.user_id
        WHERE u.role = 'borrower'
        ORDER BY u.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    
    $total = one("SELECT COUNT(*) as total FROM users WHERE role = 'borrower'");
    
    echo json_encode([
        'success' => true,
        'data' => ['borrowers' => $borrowers, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total['total']]]
    ]);
    exit;
}

// Categories
if (strpos($uri, 'categories') !== false) {
    if ($method === 'GET' && !preg_match('#categories/\d+#', $uri)) {
        $cats = all("SELECT * FROM loan_categories ORDER BY name");
        echo json_encode(['success' => true, 'data' => $cats]);
        exit;
    }
    
    if ($method === 'POST') {
        $data = input();
        $stmt = pdo()->prepare("INSERT INTO loan_categories (name, code, description, is_active) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['name'], $data['code'], $data['description'] ?? null, $data['is_active'] ?? 1]);
        echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]);
        exit;
    }
    
    if ($method === 'PUT' && preg_match('#categories/(\d+)#', $uri, $m)) {
        $data = input();
        $stmt = pdo()->prepare("UPDATE loan_categories SET name = ?, code = ?, description = ?, is_active = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['code'], $data['description'], $data['is_active'], $m[1]]);
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($method === 'DELETE' && preg_match('#categories/(\d+)#', $uri, $m)) {
        $stmt = pdo()->prepare("DELETE FROM loan_categories WHERE id = ?");
        $stmt->execute([$m[1]]);
        echo json_encode(['success' => true]);
        exit;
    }
}

// Products
if (strpos($uri, 'products') !== false) {
    if ($method === 'GET' && !preg_match('#products/\d+#', $uri)) {
        $prods = all("SELECT lp.*, lc.name as category_name FROM loan_products lp LEFT JOIN loan_categories lc ON lp.category_id = lc.id ORDER BY lp.name");
        echo json_encode(['success' => true, 'data' => $prods]);
        exit;
    }
    
    if ($method === 'POST') {
        $data = input();
        $stmt = pdo()->prepare("
            INSERT INTO loan_products (category_id, name, description, min_amount, max_amount, min_term_months, max_term_months,
                                interest_rate, interest_type, processing_fee_percent, asset_transfer_fee, tracking_system_fee,
                                late_fee_percent, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['category_id'], $data['name'], $data['description'], $data['min_amount'], $data['max_amount'],
            $data['min_term_months'], $data['max_term_months'], $data['interest_rate'], $data['interest_type'] ?? 'flat',
            $data['processing_fee_percent'], $data['asset_transfer_fee'] ?? 0, $data['tracking_system_fee'] ?? 0,
            $data['late_fee_percent'] ?? 0, $data['is_active'] ?? 1
        ]);
        echo json_encode(['success' => true, 'data' => ['id' => pdo()->lastInsertId()]]);
        exit;
    }
    
    if ($method === 'PUT' && preg_match('#products/(\d+)#', $uri, $m)) {
        $data = input();
        $fields = [];
        $values = [];
        foreach ($data as $k => $v) {
            $fields[] = "$k = ?";
            $values[] = $v;
        }
        $values[] = $m[1];
        
        $sql = "UPDATE loan_products SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = pdo()->prepare($sql);
        $stmt->execute($values);
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($method === 'DELETE' && preg_match('#products/(\d+)#', $uri, $m)) {
        $stmt = pdo()->prepare("DELETE FROM loan_products WHERE id = ?");
        $stmt->execute([$m[1]]);
        echo json_encode(['success' => true]);
        exit;
    }
}

// Settings
if (strpos($uri, 'settings') !== false) {
    if ($method === 'GET') {
        $settings = all("SELECT * FROM settings");
        $data = [];
        foreach ($settings as $s) {
            $data[$s['key_name']] = $s['key_value'];
        }
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    if ($method === 'PUT') {
        $data = input();
        foreach ($data as $key => $value) {
            $stmt = pdo()->prepare("INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = ?");
            $stmt->execute([$key, $value, $value]);
        }
        echo json_encode(['success' => true]);
        exit;
    }
}

// Repayments
if (strpos($uri, 'repayments') !== false) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $sql = "
        SELECT r.*, u.name as borrower_name, l.principal_amount
        FROM repayments r
        LEFT JOIN loans l ON r.loan_id = l.id
        LEFT JOIN borrowers b ON l.borrower_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        ORDER BY r.paid_at DESC
        LIMIT $limit OFFSET $offset
    ";
    
    $repayments = all($sql);
    $total = one("SELECT COUNT(*) as total FROM repayments");
    
    echo json_encode([
        'success' => true,
        'data' => ['repayments' => $repayments, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total['total']]]
    ]);
    exit;
}

// Users
if (strpos($uri, 'users') !== false && !preg_match('#users/\d+#', $uri)) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $users = all("SELECT id, email, name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
    $total = one("SELECT COUNT(*) as total FROM users");
    
    echo json_encode([
        'success' => true,
        'data' => ['users' => $users, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total['total']]]
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Not found']);