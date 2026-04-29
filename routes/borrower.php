<?php
$method = $_SERVER['REQUEST_METHOD'];
$user = auth();

$borrower = one("SELECT id FROM borrowers WHERE user_id = ?", [$user['id']]);
if (!$borrower) {
    echo json_encode(['success' => true, 'data' => []]);
    exit;
}
$bid = $borrower['id'];

// Get all loans
if (strpos($uri, 'borrower/loans') !== false && !preg_match('#borrower/loans/\d+#', $uri)) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $loans = all("
        SELECT l.*, lp.name as product_name, lp.description as product_description, lp.interest_rate,
               lc.name as category_name, lc.code as category_code
        FROM loans l
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        LEFT JOIN loan_categories lc ON lp.category_id = lc.id
        WHERE l.borrower_id = ?
        ORDER BY l.created_at DESC
        LIMIT $limit OFFSET $offset
    ", [$bid]);
    
    $totals = one("SELECT COUNT(*) as total FROM loans WHERE borrower_id = ?", [$bid]);
    
    foreach ($loans as &$loan) {
        $paid = one("SELECT COALESCE(SUM(amount), 0) as total FROM repayments WHERE loan_id = ?", [$loan['id']]);
        $loan['total_paid'] = $paid['total'];
        $loan['balance'] = floatval($loan['total_amount']) - floatval($paid['total']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => ['loans' => $loans, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $totals['total']]]
    ]);
    exit;
}

// Single loan details
if (preg_match('#borrower/loans/(\d+)#', $uri, $m)) {
    $loan = one("
        SELECT l.*, lp.name as product_name, lp.description as product_description,
               lp.min_amount, lp.max_amount, lp.min_term_months, lp.max_term_months, lp.interest_rate as product_rate
        FROM loans l
        LEFT JOIN loan_products lp ON l.product_id = lp.id
        WHERE l.id = ? AND l.borrower_id = ?
    ", [$m[1], $bid]);
    
    if (!$loan) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Loan not found']);
        exit;
    }
    
    $repayments = all("SELECT * FROM repayments WHERE loan_id = ? ORDER BY paid_at DESC", [$loan['id']]);
    $totalPaid = array_sum(array_map(fn($r) => floatval($r['amount']), $repayments));
    
    $loan['repayments'] = $repayments;
    $loan['total_paid'] = $totalPaid;
    $loan['balance'] = floatval($loan['total_amount']) - $totalPaid;
    
    echo json_encode(['success' => true, 'data' => $loan]);
    exit;
}

// Get borrower dashboard
if (strpos($uri, 'borrower/dashboard') !== false) {
    $totalLoans = one("SELECT COUNT(*) as total FROM loans WHERE borrower_id = ?", [$bid]);
    $activeLoans = one("SELECT COUNT(*) as total FROM loans WHERE borrower_id = ? AND status = 'active'", [$bid]);
    $pendingLoans = one("SELECT COUNT(*) as total FROM loans WHERE borrower_id = ? AND status = 'pending'", [$bid]);
    
    $totals = one("
        SELECT COALESCE(SUM(l.total_amount), 0) as total_disbursed
        FROM loans l WHERE l.borrower_id = ? AND l.status IN ('active', 'completed')
    ", [$bid]);
    
    $repaid = one("
        SELECT COALESCE(SUM(r.amount), 0) as total
        FROM repayments r
        JOIN loans l ON r.loan_id = l.id
        WHERE l.borrower_id = ?
    ", [$bid]);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'total_loans' => $totalLoans['total'],
            'active_loans' => $activeLoans['total'],
            'pending_loans' => $pendingLoans['total'],
            'total_disbursed' => $totals['total_disbursed'],
            'total_repaid' => $repaid['total'],
            'balance_due' => floatval($totals['total_disbursed']) - floatval($repaid['total'])
        ]
    ]);
    exit;
}

// Apply for loan
if ($method === 'POST' && strpos($uri, 'loans') !== false && !preg_match('#loans/\d+#', $uri)) {
    $data = input();
    
    $productId = $data['product_id'] ?? 0;
    $amount = floatval($data['amount'] ?? 0);
    $term = intval($data['term_months'] ?? 1);
    
    $product = one("SELECT * FROM loan_products WHERE id = ? AND is_active = 1", [$productId]);
    if (!$product) {
        echo json_encode(['success' => false, 'error' => 'Invalid loan product']);
        exit;
    }
    
    $minAmount = floatval($product['min_amount']);
    $maxAmount = floatval($product['max_amount']);
    $minTerm = intval($product['min_term_months']);
    $maxTerm = intval($product['max_term_months']);
    
    if ($amount < $minAmount || $amount > $maxAmount) {
        echo json_encode(['success' => false, 'error' => "Amount must be between $minAmount and $maxAmount"]);
        exit;
    }
    
    if ($term < $minTerm || $term > $maxTerm) {
        echo json_encode(['success' => false, 'error' => "Term must be between $minTerm and $maxTerm months"]);
        exit;
    }
    
    $rate = floatval($product['interest_rate']);
    $procFee = floatval($product['processing_fee_percent']);
    $assetFee = floatval($product['asset_transfer_fee']);
    $trackingFee = floatval($product['tracking_system_fee']);
    $lateFee = floatval($product['late_fee_percent']);
    
    $interest = ($amount * $rate / 100) * ($term / 12);
    $processingFee = $amount * $procFee / 100;
    $assetTransferFee = $assetFee;
    $trackingSystemFee = $trackingFee;
    $total = $amount + $interest + $processingFee + $assetTransferFee + $trackingSystemFee;
    
    $dueDate = date('Y-m-d', strtotime("+{$term} months"));
    
    $stmt = pdo()->prepare("
        INSERT INTO loans (borrower_id, product_id, principal_amount, interest_amount, processing_fee,
                        asset_transfer_fee, tracking_system_fee, late_fee_rate, total_amount, term_months, status,
                        security_details, guarantor_details, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    ");
    $stmt->execute([
        $bid, $productId, $amount, $interest, $processingFee,
        $assetTransferFee, $trackingSystemFee, $lateFee, $total, $term,
        $data['security_details'] ?? null,
        $data['guarantor_details'] ?? null,
        $dueDate
    ]);
    
    $loanId = pdo()->lastInsertId();
    
    if ($processingFee > 0) {
        $stmt = pdo()->prepare("INSERT INTO payments (loan_id, type, amount, method, status) VALUES (?, 'processing_fee', ?, 'bank', 'pending')");
        $stmt->execute([$loanId, $processingFee]);
    }
    
    $admins = all("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    foreach ($admins as $admin) {
        $stmt = pdo()->prepare("INSERT INTO messages (sender_id, recipient_id, loan_id, subject, message, type) VALUES (?, ?, ?, 'New Loan Application', ?, 'loan_update')");
        $stmt->execute([$user['id'], $admin['id'], $loanId, "New loan application #$loanId submitted. Amount: $amount, Term: $term months."]);
    }
    
    echo json_encode(['success' => true, 'data' => ['id' => $loanId], 'message' => 'Loan application submitted']);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Not found']);
