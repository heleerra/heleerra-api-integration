<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Heleerra Payment Gateway Service
 * 
 * This service provides integration with the Heleerra payment gateway API.
 * Supports both sandbox and production environments.
 */
class HeleerraService
{
    private string $baseUrl;
    private string $merchantKey;
    private string $apiKey;
    private string $environment;
    private string $webhookSecret;

    public function __construct()
    {
        $this->baseUrl = config('heleerra.base_url', 'https://heleerra.com');
        $this->merchantKey = config('heleerra.merchant_key');
        $this->apiKey = config('heleerra.api_key');
        $this->environment = config('heleerra.environment', 'sandbox');
        $this->webhookSecret = $this->environment === 'sandbox' 
            ? config('heleerra.test_webhook_secret')
            : config('heleerra.webhook_secret');
    }

    /**
     * Initiate a new payment request
     *
     * @param array $paymentData Payment details
     * @return array API response
     * @throws Exception
     */
    public function initiatePayment(array $paymentData): array
    {
        $this->validatePaymentData($paymentData);

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-Environment' => $this->environment,
                'X-Merchant-Key' => $this->merchantKey,
                'X-API-Key' => $this->apiKey,
            ])->timeout(30)->post("{$this->baseUrl}/api/v1/initiate-payment", $paymentData);

            if ($response->successful()) {
                Log::info('Heleerra payment initiated successfully', [
                    'ref_trx' => $paymentData['ref_trx'] ?? null,
                    'amount' => $paymentData['payment_amount'] ?? null,
                    'environment' => $this->environment
                ]);

                return $response->json();
            }

            $errorData = $response->json();
            $errorMessage = $errorData['message'] ?? 'Payment initiation failed';
            $errorCode = $errorData['error_code'] ?? 'UNKNOWN_ERROR';

            Log::error('Heleerra payment initiation failed', [
                'status' => $response->status(),
                'error_code' => $errorCode,
                'message' => $errorMessage,
                'ref_trx' => $paymentData['ref_trx'] ?? null
            ]);

            throw new Exception("Payment initiation failed: {$errorMessage}");
        } catch (Exception $e) {
            Log::error('Heleerra API error during payment initiation', [
                'message' => $e->getMessage(),
                'ref_trx' => $paymentData['ref_trx'] ?? null
            ]);
            throw $e;
        }
    }

    /**
     * Verify payment status
     *
     * @param string $transactionId Heleerra transaction ID
     * @return array Payment details
     * @throws Exception
     */
    public function verifyPayment(string $transactionId): array
    {
        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'X-Environment' => $this->environment,
                'X-Merchant-Key' => $this->merchantKey,
                'X-API-Key' => $this->apiKey,
            ])->timeout(30)->get("{$this->baseUrl}/api/v1/verify-payment/{$transactionId}");

            if ($response->successful()) {
                return $response->json();
            }

            $errorData = $response->json();
            $errorMessage = $errorData['message'] ?? 'Payment verification failed';

            Log::error('Heleerra payment verification failed', [
                'transaction_id' => $transactionId,
                'status' => $response->status(),
                'message' => $errorMessage
            ]);

            throw new Exception("Payment verification failed: {$errorMessage}");
        } catch (Exception $e) {
            Log::error('Heleerra API error during payment verification', [
                'transaction_id' => $transactionId,
                'message' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Verify webhook signature
     *
     * @param string $payload Raw webhook payload
     * @param string $signature Signature from X-Signature header
     * @return bool
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($this->webhookSecret)) {
            Log::warning('Webhook secret not configured');
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $this->webhookSecret);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Handle webhook notification
     *
     * @param array $payload Webhook payload
     * @param array $headers Request headers
     * @return array Response
     */
    public function handleWebhook(array $payload, array $headers): array
    {
        $signature = $headers['x-signature'] ?? '';
        $environment = $headers['x-environment'] ?? 'production';
        $webhookId = $headers['x-webhook-id'] ?? '';

        // Verify signature
        if (!$this->verifyWebhookSignature(json_encode($payload), $signature)) {
            Log::warning('Heleerra webhook signature verification failed', [
                'webhook_id' => $webhookId,
                'environment' => $environment
            ]);

            return [
                'status' => 'error',
                'message' => 'Invalid signature'
            ];
        }

        // Handle based on environment
        if ($environment === 'sandbox') {
            return $this->handleSandboxWebhook($payload);
        } else {
            return $this->handleProductionWebhook($payload);
        }
    }

    /**
     * Handle sandbox webhook (testing environment)
     *
     * @param array $payload
     * @return array
     */
    private function handleSandboxWebhook(array $payload): array
    {
        Log::info('Processing sandbox webhook', [
            'transaction_id' => $payload['data']['ref_trx'] ?? null,
            'status' => $payload['status'] ?? null,
            'amount' => $payload['data']['amount'] ?? null
        ]);

        // Sandbox-specific logic
        // Don't fulfill orders, don't send emails to real customers, etc.

        return [
            'status' => 'sandbox_processed',
            'message' => 'Webhook processed in sandbox mode'
        ];
    }

    /**
     * Handle production webhook (live environment)
     *
     * @param array $payload
     * @return array
     */
    private function handleProductionWebhook(array $payload): array
    {
        $status = $payload['status'] ?? 'unknown';
        $transactionId = $payload['data']['ref_trx'] ?? null;
        $amount = $payload['data']['amount'] ?? 0;

        Log::info('Processing production webhook', [
            'transaction_id' => $transactionId,
            'status' => $status,
            'amount' => $amount
        ]);

        // Process based on payment status
        switch ($status) {
            case 'completed':
                // Fulfill order, send confirmation email, update inventory
                $this->processCompletedPayment($payload);
                break;
            case 'failed':
                // Handle failed payment
                $this->processFailedPayment($payload);
                break;
            case 'cancelled':
                // Handle cancelled payment
                $this->processCancelledPayment($payload);
                break;
            case 'expired':
                // Handle expired payment
                $this->processExpiredPayment($payload);
                break;
            default:
                Log::warning('Unknown payment status in webhook', [
                    'status' => $status,
                    'transaction_id' => $transactionId
                ]);
        }

        return [
            'status' => 'processed',
            'message' => 'Webhook processed successfully'
        ];
    }

    /**
     * Validate payment data before sending to API
     *
     * @param array $paymentData
     * @throws Exception
     */
    private function validatePaymentData(array $paymentData): void
    {
        $required = ['payment_amount', 'currency_code', 'ref_trx'];
        
        foreach ($required as $field) {
            if (empty($paymentData[$field])) {
                throw new Exception("Required field '{$field}' is missing");
            }
        }

        if (!is_numeric($paymentData['payment_amount']) || $paymentData['payment_amount'] < 1.00) {
            throw new Exception('Payment amount must be at least 1.00');
        }

        if (strlen($paymentData['currency_code']) !== 3) {
            throw new Exception('Currency code must be a 3-letter code (e.g., USD)');
        }
    }

    /**
     * Process completed payment
     *
     * @param array $payload
     */
    private function processCompletedPayment(array $payload): void
    {
        $transactionId = $payload['data']['ref_trx'];
        $amount = $payload['data']['amount'];
        $customerEmail = $payload['data']['customer_email'] ?? null;

        // Update order status to completed
        // Send confirmation email to customer
        // Update inventory
        // Trigger any additional business logic

        Log::info('Payment completed successfully', [
            'transaction_id' => $transactionId,
            'amount' => $amount,
            'customer_email' => $customerEmail
        ]);
    }

    /**
     * Process failed payment
     *
     * @param array $payload
     */
    private function processFailedPayment(array $payload): void
    {
        $transactionId = $payload['data']['ref_trx'];
        
        // Update order status to failed
        // Send failure notification to customer
        // Log the failure for analysis

        Log::warning('Payment failed', [
            'transaction_id' => $transactionId,
            'reason' => $payload['message'] ?? 'Unknown reason'
        ]);
    }

    /**
     * Process cancelled payment
     *
     * @param array $payload
     */
    private function processCancelledPayment(array $payload): void
    {
        $transactionId = $payload['data']['ref_trx'];
        
        // Update order status to cancelled
        // Release any reserved inventory
        // Send cancellation notification

        Log::info('Payment cancelled by user', [
            'transaction_id' => $transactionId
        ]);
    }

    /**
     * Process expired payment
     *
     * @param array $payload
     */
    private function processExpiredPayment(array $payload): void
    {
        $transactionId = $payload['data']['ref_trx'];
        
        // Update order status to expired
        // Release any reserved inventory
        // Optionally send reminder to customer

        Log::info('Payment session expired', [
            'transaction_id' => $transactionId
        ]);
    }

    /**
     * Get API configuration
     *
     * @return array
     */
    public function getConfig(): array
    {
        return [
            'environment' => $this->environment,
            'base_url' => $this->baseUrl,
            'merchant_key' => substr($this->merchantKey, 0, 8) . '...', // Mask for security
            'webhook_configured' => !empty($this->webhookSecret)
        ];
    }
}