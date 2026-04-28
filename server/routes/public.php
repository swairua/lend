<?php
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// Categories
if ($uri === '/api/categories' || strpos($uri, '/api/categories') !== false) {
    $cats = all("SELECT * FROM loan_categories ORDER BY name");
    echo json_encode(['success' => true, 'data' => $cats]);
    exit;
}

// Products
if (strpos($uri, '/api/products') !== false) {
    $catId = $_GET['category_id'] ?? null;
    
    $sql = "SELECT lp.*, lc.name as category_name, lc.code as category_code 
           FROM loan_products lp 
           LEFT JOIN loan_categories lc ON lp.category_id = lc.id 
           WHERE 1=1";
    $params = [];
    
    if ($catId) {
        $sql .= " AND lp.category_id = ?";
        $params[] = $catId;
    }
    
    $sql .= " ORDER BY lp.min_amount";
    
    $prods = all($sql, $params);
    echo json_encode(['success' => true, 'data' => $prods]);
    exit;
}

// Single product
if (preg_match('#/api/products/(\d+)#', $uri, $m)) {
    $prod = one("SELECT * FROM loan_products WHERE id = ?", [$m[1]]);
    echo json_encode(['success' => true, 'data' => $prod]);
    exit;
}

// Calculate loan
if ($method === 'POST' && strpos($uri, '/api/loans/calculate') !== false) {
    $data = input();
    $product = one("SELECT * FROM loan_products WHERE id = ?", [$data['product_id'] ?? 0]);
    
    if (!$product) {
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit;
    }
    
    $amount = floatval($data['amount'] ?? 0);
    $term = intval($data['term_months'] ?? 1);
    
    $rate = floatval($product['interest_rate']);
    $procFee = floatval($product['processing_fee_percent']);
    $assetFee = floatval($product['asset_transfer_fee']);
    $trackingFee = floatval($product['tracking_system_fee']);
    
    $interest = ($amount * $rate / 100) * ($term / 12);
    $processingFee = $amount * $procFee / 100;
    $total = $amount + $interest + $processingFee + $assetFee + $trackingFee;
    $monthly = $total / max($term, 1);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'principal' => $amount,
            'interest' => $interest,
            'processing_fee' => $processingFee,
            'asset_transfer_fee' => $assetFee,
            'tracking_system_fee' => $trackingFee,
            'total_amount' => $total,
            'monthly_payment' => $monthly
        ]
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Not found']);