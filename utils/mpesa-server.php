<?php
/**
 * M-Pesa Daraja Server Helper
 * Handles OAuth token generation, API calls, and request signature verification
 * Security: credentials never touch frontend; all Daraja interactions server-side only
 */

// Daraja API endpoints
const DARAJA_OAUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const DARAJA_OAUTH_PROD = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const DARAJA_STK_URL_SANDBOX = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const DARAJA_STK_URL_PROD = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const DARAJA_B2C_URL_SANDBOX = 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';
const DARAJA_B2C_URL_PROD = 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

class MpesaDaraja {
    private $consumer_key;
    private $consumer_secret;
    private $environment;
    private $cache_dir;

    public function __construct($consumer_key, $consumer_secret, $environment = 'sandbox') {
        $this->consumer_key = $consumer_key;
        $this->consumer_secret = $consumer_secret;
        $this->environment = $environment;
        $this->cache_dir = __DIR__ . '/../cache';
        if (!is_dir($this->cache_dir)) {
            @mkdir($this->cache_dir, 0755, true);
        }
    }

    private function getOAuthUrl() {
        return $this->environment === 'production' ? DARAJA_OAUTH_PROD : DARAJA_OAUTH_URL;
    }

    private function getStkUrl() {
        return $this->environment === 'production' ? DARAJA_STK_URL_PROD : DARAJA_STK_URL_SANDBOX;
    }

    private function getB2cUrl() {
        return $this->environment === 'production' ? DARAJA_B2C_URL_PROD : DARAJA_B2C_URL_SANDBOX;
    }

    public function getAccessToken($force_refresh = false) {
        $cache_file = $this->cache_dir . '/mpesa_token_' . md5($this->consumer_key) . '.json';
        
        // Check cache
        if (!$force_refresh && file_exists($cache_file)) {
            $cached = json_decode(file_get_contents($cache_file), true);
            if ($cached && isset($cached['expires_at']) && time() < $cached['expires_at']) {
                return $cached['access_token'] ?? null;
            }
        }

        // Request new token
        $auth = base64_encode($this->consumer_key . ':' . $this->consumer_secret);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->getOAuthUrl(),
            CURLOPT_HTTPHEADER => ['Authorization: Basic ' . $auth],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($http_code !== 200) {
            error_log("Daraja OAuth failed ($http_code): " . ($curl_error ?: $response));
            return null;
        }

        $data = json_decode($response, true);
        if (!isset($data['access_token'])) {
            error_log("Daraja OAuth response missing access_token: " . $response);
            return null;
        }

        // Cache token (expires_in is typically 3600 seconds)
        $expires_in = $data['expires_in'] ?? 3600;
        file_put_contents($cache_file, json_encode([
            'access_token' => $data['access_token'],
            'expires_at' => time() + ($expires_in - 60), // Refresh 60s before expiry
        ]));

        return $data['access_token'];
    }

    public function initiateStk($phone, $amount, $checkout_request_id, $callback_url, $business_shortcode, $passkey) {
        $token = $this->getAccessToken();
        if (!$token) {
            return ['success' => false, 'error' => 'Failed to get Daraja token'];
        }

        // Timestamp in format YYYYMMDDHHmmss
        $timestamp = date('YYYYMMDDHHmmss');
        
        // STK password: base64(shortcode + passkey + timestamp)
        $stk_password = base64_encode($business_shortcode . $passkey . $timestamp);

        $payload = [
            'BusinessShortCode' => intval($business_shortcode),
            'Password' => $stk_password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => intval($amount),
            'PartyA' => preg_replace('/^0/', '254', $phone), // Convert 0XXXXXXXXX to 254XXXXXXXXX
            'PartyB' => intval($business_shortcode),
            'PhoneNumber' => preg_replace('/^0/', '254', $phone),
            'CallBackURL' => $callback_url,
            'AccountReference' => $checkout_request_id,
            'TransactionDesc' => 'Loan Payment',
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->getStkUrl(),
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($http_code !== 200) {
            error_log("STK Push failed ($http_code): " . ($curl_error ?: $response));
            return ['success' => false, 'error' => 'STK Push API error', 'details' => $response];
        }

        $data = json_decode($response, true);
        return ['success' => true, 'data' => $data];
    }

    public function initiateB2c($phone, $amount, $command_id, $result_url, $business_shortcode, $initiator_name, $initiator_password) {
        $token = $this->getAccessToken();
        if (!$token) {
            return ['success' => false, 'error' => 'Failed to get Daraja token'];
        }

        $payload = [
            'OriginatorConversationID' => $command_id,
            'InitiatorName' => $initiator_name,
            'InitiatorPassword' => $initiator_password,
            'CommandID' => 'BusinessPayment',
            'Amount' => intval($amount),
            'PartyA' => intval($business_shortcode),
            'PartyB' => preg_replace('/^0/', '254', $phone),
            'Remarks' => 'Loan Disbursement',
            'QueueTimeOutURL' => $result_url, // Used for timeout
            'ResultURL' => $result_url,
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->getB2cUrl(),
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($http_code !== 200) {
            error_log("B2C request failed ($http_code): " . ($curl_error ?: $response));
            return ['success' => false, 'error' => 'B2C API error', 'details' => $response];
        }

        $data = json_decode($response, true);
        return ['success' => true, 'data' => $data];
    }
}

class SafaricomSignatureValidator {
    private static $SANDBOX_PUBLIC_KEY = <<<EOK
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAiUf0m4Zt2kE+5fJ87mT2
h/IW8XCzKlPKkPW6pUWuMEVNw6gq2i8GDPzqM0KZhNKrxN1K0JC4fGUKvGWtZMKi
3GKEq2zzUCvU1wLbVmNBM9pqB5pKQn5m7LKUN5qLhHKJUgL63BFzHJqYYZOGj0fH
E0HVbVX4dNcyHr9dNmOwFvGgL1uEF8vAbwvbmQ8BRvE0qOzApSwq0k+r+3vMNMnM
qYl3qfHBcjpFcvLDpEpqLKEBqLSqVZO7hhm5LwM9hSEFKlqxcVrOUdNd1Uf9dkyO
FXMy5kHfCq5A7P6K7C9F3RH3QL5dFqvQYLHqpQpFu0jCRo8qDaWNDRGH7zHgwxfC
HnrOQSEJh9nRfHqnCqRoFhZWJh8AhzLFbvAzfXyqqGlBLdwD3DL5nD2PjDJpYBLA
CFwEL4D2ItLMfO/PzLIqL5E3b9FqD5dXLoOtahRYWMk5LSEpAqU4DMWEWJtjhMYb
p6EbvZ5Y4NmMvQbXfLGJxKhCvH8vvUQO4VL6HKFczYMJQsCqN3HVWVvAFUW8gczJ
n3RgCdDBkwA8MiBjmvUCnTKnUOTbLhYCL7o2n5E6C3T4w2ySjFKGFQVLdLhPH0iN
W/PZANm7l4hDKxPVCX7fX+dKxQCjDhRJ3BdDzZkWqRSPyH6O6VrXp3iHy7xqG5qT
PjBV7kkgPfKzxlCqULW3pY8CAwEAAQ==
-----END PUBLIC KEY-----
EOK;

    private static $PRODUCTION_PUBLIC_KEY = <<<EOK
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAyA8XgO4mJCRTp+q1h/pZ
hKKjI7s3v4wVhL3hlTnzI1Vh5KkSmUvvmv5eJhkLNLTL9NxkNMCfZxL0rZKHh2Ay
QsxIx4m0fX8D2hM1hlSwIkz7KT7T5e5PqHQvg4LWLb8xQkWLWNdaVcJH3RFePp3p
WBdGQo3VQGa7eVHFc6p3zHdl3xN3yPj6L3EGEOSaZBHQ3KeL9q0l7CfGKvN2F3Ul
K3lmACtVhbH5c2Vc7RiRDVKW9wgRzKoK7pR6VXnFbTQPTSNF7V/kZeNEVlccCmKH
KMVQ7EWP5r1B0vkdHwXpG9ioWLq1j4/w8eLq1p1qZQvMWQj7kO1zQgV4h1WM8o3a
fFmqhQjJ7aslZm+xJCVKqvUVKvGsLQh6CvvPBVHX7aQgzVJvPQqKOh+rBLBYGbpz
YFSjKKJG0/KpE8H0GxHsP8n8Zn1vPuA7mLVW/gU5VPvRLBh1IqMxXN3jkzLOqRw8
zMT3W9rYFTp6H8JZGtVCVxBh5hppZXEFSZr5gLNCQbJPV8V1eQX/FKlvAQHZfPvl
c8cQmZnV3BPPz+P8BW2hBHjrQGvQPW9fVQJXjYfjWXW2iDhTVyXGG0NfV1FN4sVU
BQ8nG7x9HJzQCxD0SpQcnhR1H8VEWJ3FVZQf4PrgNVQMJPXL3kxYXQvL9i4K8xf4
u8qJ6rKqSZrGZhHZlS3KnncCAwEAAQ==
-----END PUBLIC KEY-----
EOK;

    public static function verify($signature_b64, $message, $is_production = false) {
        $public_key = $is_production ? self::$PRODUCTION_PUBLIC_KEY : self::$SANDBOX_PUBLIC_KEY;
        
        $signature = base64_decode($signature_b64);
        if (!$signature) {
            error_log("Failed to decode signature from base64");
            return false;
        }

        $key = openssl_pkey_get_public($public_key);
        if (!$key) {
            error_log("Failed to load public key");
            return false;
        }

        $result = openssl_verify($message, $signature, $key, OPENSSL_ALGO_SHA256);
        openssl_free_key($key);

        if ($result === -1) {
            error_log("Signature verification error");
            return false;
        }

        return $result === 1;
    }
}

class MpesaXmlParser {
    public static function parseC2bXml($xml_string) {
        try {
            $xml = simplexml_load_string($xml_string);
            if (!$xml) {
                return null;
            }

            return [
                'transaction_id' => (string)$xml->TransID,
                'transaction_ref' => (string)$xml->TransRef,
                'amount' => floatval($xml->TransAmount),
                'phone' => (string)$xml->MSISDN,
                'account_ref' => (string)$xml->BillRefNumber,
                'receipt' => (string)$xml->TransID,
                'timestamp' => (string)$xml->TransTime,
            ];
        } catch (Exception $e) {
            error_log("XML parse error: " . $e->getMessage());
            return null;
        }
    }

    public static function parseStkCallbackXml($xml_string) {
        try {
            $xml = simplexml_load_string($xml_string);
            if (!$xml) {
                return null;
            }

            $body = $xml->Body->stkCallback;
            
            $result_code = intval($body->ResultCode);
            $result = [
                'result_code' => $result_code,
                'result_desc' => (string)$body->ResultDesc,
                'checkout_request_id' => (string)$body->CheckoutRequestID,
                'merchant_request_id' => (string)$body->MerchantRequestID,
            ];

            if ($result_code === 0 && isset($body->CallbackMetadata)) {
                $metadata = [];
                foreach ($body->CallbackMetadata->Item as $item) {
                    $name = (string)$item->Name;
                    $value = (string)$item->Value;
                    $metadata[$name] = $value;
                }
                $result['metadata'] = $metadata;
            }

            return $result;
        } catch (Exception $e) {
            error_log("STK XML parse error: " . $e->getMessage());
            return null;
        }
    }

    public static function parseB2cResultXml($xml_string) {
        try {
            $xml = simplexml_load_string($xml_string);
            if (!$xml) {
                return null;
            }

            return [
                'result_code' => intval($xml->Result->ResultCode),
                'result_desc' => (string)$xml->Result->ResultDesc,
                'originator_conversation_id' => (string)$xml->Result->OriginatorConversationID,
                'conversation_id' => (string)$xml->Result->ConversationID,
                'transaction_id' => (string)$xml->Result->TransactionID,
            ];
        } catch (Exception $e) {
            error_log("B2C XML parse error: " . $e->getMessage());
            return null;
        }
    }
}
