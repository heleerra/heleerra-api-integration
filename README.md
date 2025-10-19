# Heleerra API Integration Guide

[![API Version](https://img.shields.io/badge/API-v1.0-blue.svg)](https://heleerra.com/api-docs)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-7.4+-purple.svg)](https://php.net)
[![Python](https://img.shields.io/badge/Python-3.6+-yellow.svg)](https://python.org)

A comprehensive integration guide and code examples for the Heleerra Payment Gateway API. This repository provides everything you need to integrate secure payment processing into your applications.

## 🚀 Quick Start

Heleerra API is a RESTful payment gateway that supports multiple payment methods including wallets, cards, and vouchers. Get started in minutes with our simple, secure API.

### Prerequisites

- Heleerra merchant account
- API credentials (Merchant ID, API Key, Client Secret)
- SSL certificate for production
- Programming language of choice (PHP, Python, Node.js, etc.)

### Installation

1.  **Clone this repository**
    ```bash
    git clone [https://github.com/heleerra/heleerra-api-integration.git](https://github.com/heleerra/heleerra-api-integration.git)
    cd heleerra-api-integration
    ```

2.  **Choose your integration method**
    - Direct API integration (see [API Reference](#api-reference))
    - Framework-specific examples (see [Examples](#examples))
    - WooCommerce plugin (see [WooCommerce Integration](#woocommerce-integration))

3.  **Configure your environment**
    ```bash
    cp .env.example .env
    # Edit .env with your Heleerra credentials
    ```

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [WooCommerce Integration](#woocommerce-integration)
- [Support](#support)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## 🔍 Overview

Heleerra API provides a secure, scalable payment processing solution with the following features:

- **Multi-Environment Support**: Sandbox and production environments
- **Multiple Payment Methods**: Wallets, cards, vouchers, and more
- **Real-time Notifications**: Webhook-based status updates
- **Bank-Grade Security**: HMAC signature verification
- **Comprehensive Documentation**: Full API reference and examples

### API Base URLs

| Environment | Base URL                 | Header Value              |
|-------------|--------------------------|---------------------------|
| Sandbox     | `https://heleerra.com`   | `X-Environment: sandbox`  |
| Production  | `https://heleerra.com`   | `X-Environment: production` |

## 🔐 Authentication

Heleerra API uses API keys for authentication. All requests must include the following headers:

### Required Headers

X-Environment: sandbox|productionX-Merchant-Key: {your_merchant_id}X-API-Key: {your_api_key}Content-Type: application/json
### Credential Format

| Environment | Merchant ID         | API Key              | Format        |
|-------------|---------------------|----------------------|---------------|
| Sandbox     | `test_merchant_123` | `test_api_key_abc`   | `test_*` prefix |
| Production  | `merchant_123`      | `api_key_abc`        | No prefix     |

### Security Notice

⚠️ **Never expose your Client Secret in client-side code.** Store all credentials securely on your server.

## 📖 API Reference

### 1. Initiate Payment

Creates a new payment request and returns a secure checkout URL.

**Endpoint**: `POST /api/v1/initiate-payment`

#### Request Parameters

| Parameter        | Type   | Required | Description                              |
|------------------|--------|----------|------------------------------------------|
| `payment_amount` | number | ✅       | Payment amount (minimum 1.00)            |
| `currency_code`  | string | ✅       | 3-letter currency code (USD, EUR, etc.)  |
| `ref_trx`        | string | ✅       | Your unique transaction reference        |
| `description`    | string | ❌       | Payment description                      |
| `success_redirect` | string | ✅       | Success redirect URL                     |
| `failure_url`    | string | ✅       | Failure redirect URL                     |
| `cancel_redirect`| string | ✅       | Cancel redirect URL                      |
| `ipn_url`        | string | ✅       | Webhook notification URL                 |

#### Example Request

```bash
curl -X POST "[https://heleerra.com/api/v1/initiate-payment](https://heleerra.com/api/v1/initiate-payment)" \\
  -H "Content-Type: application/json" \\
  -H "X-Environment: sandbox" \\
  -H "X-Merchant-Key: test_merchant_123" \\
  -H "X-API-Key: test_api_key_abc" \\
  -d '{
    "payment_amount": 250.00,
    "currency_code": "USD",
    "ref_trx": "ORDER_12345",
    "description": "Premium Subscription",
    "success_redirect": "[https://yoursite.com/success](https://yoursite.com/success)",
    "failure_url": "[https://yoursite.com/failed](https://yoursite.com/failed)",
    "cancel_redirect": "[https://yoursite.com/cancelled](https://yoursite.com/cancelled)",
    "ipn_url": "[https://yoursite.com/webhooks/heleerra](https://yoursite.com/webhooks/heleerra)"
  }'
Success ResponseJSON{
  "payment_url": "[https://heleerra.com/payment/checkout?token=](https://heleerra.com/payment/checkout?token=)...",
  "info": {
    "ref_trx": "TXNT4AQFESTAG4F",
    "description": "Order #1234",
    "merchant_id": 1,
    "merchant_name": "Your Store",
    "amount": 250,
    "currency_code": "USD",
    "environment": "sandbox",
    "is_sandbox": true
  }
}
2. Verify PaymentVerify the status of a payment using the Heleerra transaction ID.Endpoint: GET /api/v1/verify-payment/{trxId}Example RequestBashcurl -X GET "[https://heleerra.com/api/v1/verify-payment/TXNQ5V8K2L9N3XM1](https://heleerra.com/api/v1/verify-payment/TXNQ5V8K2L9N3XM1)" \\
  -H "Accept: application/json" \\
  -H "X-Environment: sandbox" \\
  -H "X-Merchant-Key: test_merchant_123" \\
  -H "X-API-Key: test_api_key_abc"
Success ResponseJSON{
  "status": "completed",
  "trx_id": "TXNQ5V8K2L9N3XM1",
  "amount": 237.5,
  "fee": 12.5,
  "currency": "USD",
  "net_amount": 237.5,
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "description": "Premium Subscription Payment",
  "created_at": "2024-01-15T10:30:00.000000Z",
  "updated_at": "2024-01-15T10:35:45.000000Z"
}
💻 ExamplesPHP (Laravel)PHP<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

class HeleerraService
{
    private string $baseUrl;
    private string $merchantKey;
    private string $apiKey;
    private string $environment;

    public function __construct()
    {
        $this->baseUrl = config('heleerra.base_url');
        $this->merchantKey = config('heleerra.merchant_key');
        $this->apiKey = config('heleerra.api_key');
        $this->environment = config('heleerra.environment');
    }

    public function initiatePayment(array $paymentData): array
    {
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'X-Environment' => $this->environment,
            'X-Merchant-Key' => $this->merchantKey,
            'X-API-Key' => $this->apiKey,
        ])->post("{$this->baseUrl}/api/v1/initiate-payment", $paymentData);

        if ($response->successful()) {
            return $response->json();
        }

        throw new Exception('Payment initiation failed');
    }

    public function verifyPayment(string $transactionId): array
    {
        $response = Http::withHeaders([
            'Accept' => 'application/json',
            'X-Environment' => $this->environment,
            'X-Merchant-Key' => $this->merchantKey,
            'X-API-Key' => $this->apiKey,
        ])->get("{$this->baseUrl}/api/v1/verify-payment/{$transactionId}");

        if ($response->successful()) {
            return $response->json();
        }

        throw new Exception('Payment verification failed');
    }
}
PythonPythonimport requests
import hashlib
import hmac
from typing import Dict, Any

class HeleerraAPI:
    def __init__(self, merchant_key: str, api_key: str, environment: str = 'sandbox'):
        self.base_url = '[https://heleerra.com](https://heleerra.com)'
        self.merchant_key = merchant_key
        self.api_key = api_key
        self.environment = environment
        
    def initiate_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        headers = {
            'Content-Type': 'application/json',
            'X-Environment': self.environment,
            'X-Merchant-Key': self.merchant_key,
            'X-API-Key': self.api_key
        }
        
        response = requests.post(
            f'{self.base_url}/api/v1/initiate-payment',
            json=payment_data,
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'Payment initiation failed: {response.text}')
    
    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        headers = {
            'Accept': 'application/json',
            'X-Environment': self.environment,
            'X-Merchant-Key': self.merchant_key,
            'X-API-Key': self.api_key
        }
        
        response = requests.get(
            f'{self.base_url}/api/v1/verify-payment/{transaction_id}',
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'Payment verification failed: {response.text}')

# Usage
api = HeleerraAPI('test_merchant_123', 'test_api_key_abc', 'sandbox')

payment_data = {
    'payment_amount': 250.00,
    'currency_code': 'USD',
    'ref_trx': 'ORDER_12345',
    'description': 'Premium Subscription',
    'success_redirect': '[https://yoursite.com/success](https://yoursite.com/success)',
    'failure_url': '[https://yoursite.com/failed](https://yoursite.com/failed)',
    'cancel_redirect': '[https://yoursite.com/cancelled](https://yoursite.com/cancelled)',
    'ipn_url': '[https://yoursite.com/webhooks/heleerra](https://yoursite.com/webhooks/heleerra)'
}

try:
    result = api.initiate_payment(payment_data)
    print(f"Payment URL: {result['payment_url']}")
except Exception as e:
    print(f"Error: {e}")
Node.jsJavaScriptconst axios = require('axios');
const crypto = require('crypto');

class HeleerraAPI {
    constructor(merchantKey, apiKey, environment = 'sandbox') {
        this.baseUrl = '[https://heleerra.com](https://heleerra.com)';
        this.merchantKey = merchantKey;
        this.apiKey = apiKey;
        this.environment = environment;
    }

    async initiatePayment(paymentData) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/v1/initiate-payment`,
                paymentData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Environment': this.environment,
                        'X-Merchant-Key': this.merchantKey,
                        'X-API-Key': this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            throw new Error(`Payment initiation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async verifyPayment(transactionId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/verify-payment/${transactionId}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Environment': this.environment,
                        'X-Merchant-Key': this.merchantKey,
                        'X-API-Key': this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            throw new Error(`Payment verification failed: ${error.response?.data?.message || error.message}`);
        }
    }
}

// Usage
const api = new HeleerraAPI('test_merchant_123', 'test_api_key_abc', 'sandbox');

const paymentData = {
    payment_amount: 250.00,
    currency_code: 'USD',
    ref_trx: 'ORDER_12345',
    description: 'Premium Subscription',
    success_redirect: '[https://yoursite.com/success](https://yoursite.com/success)',
    failure_url: '[https://yoursite.com/failed](https://yoursite.com/failed)',
    cancel_redirect: '[https://yoursite.com/cancelled](https://yoursite.com/cancelled)',
    ipn_url: '[https://yoursite.com/webhooks/heleerra](https://yoursite.com/webhooks/heleerra)'
};

api.initiatePayment(paymentData)
    .then(result => {
        console.log('Payment URL:', result.payment_url);
        // Redirect user to payment URL
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
🎣 WebhooksHeleerra sends real-time notifications to your specified IPN URL when payment status changes.Webhook PayloadJSON{
  "data": {
    "ref_trx": "TXNT4AQFESTAG4F",
    "description": "Order #1234",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "merchant_name": "Your Store",
    "amount": 200,
    "currency_code": "USD",
    "environment": "production",
    "is_sandbox": false
  },
  "message": "Payment Completed",
  "status": "completed",
  "timestamp": 1705747245
}
Webhook HeadersHeaderDescriptionExampleContent-TypeAlways application/jsonapplication/jsonX-SignatureHMAC-SHA256 signaturea8b9c2d1e5f3...X-EnvironmentEnvironment contextsandbox or productionSignature VerificationAlways verify webhook signatures to ensure authenticity:PHP ExamplePHPprivate function verifySignature(string $payload, string $signature, string $secret): bool
{
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expectedSignature, $signature);
}
Python ExamplePythonimport hmac
import hashlib

def verify_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)
Payment Status ValuesStatusDescriptionAction RequiredpendingPayment is still processingWait for webhook notificationcompletedPayment was successfulFulfill order/servicefailedPayment failedHandle failed paymentcancelledPayment was cancelled by userHandle cancellationexpiredPayment session expiredCreate new payment request❌ Error HandlingHeleerra API uses conventional HTTP response codes and provides detailed error information.HTTP Status CodesCodeStatusDescription200OKRequest succeeded400Bad RequestInvalid request parameters401UnauthorizedInvalid or missing API credentials403ForbiddenInsufficient permissions404Not FoundResource not found429Too Many RequestsRate limit exceeded500Internal Server ErrorServer error occurredAPI Error CodesError CodeDescriptionSolutionINVALID_CREDENTIALSInvalid API credentials providedCheck your Merchant ID and API KeyINSUFFICIENT_FUNDSCustomer has insufficient fundsCustomer needs to add funds to their walletPAYMENT_DECLINEDPayment was declined by payment processorCustomer should try a different payment methodINVALID_AMOUNTPayment amount is invalidCheck minimum and maximum amount limitsINVALID_CURRENCYUnsupported currency codeUse a supported currency codeDUPLICATE_REFERENCETransaction reference already existsUse a unique transaction referenceEXPIRED_SESSIONPayment session has expiredCreate a new payment requestMERCHANT_SUSPENDEDMerchant account is suspendedContact Heleerra supportError Response FormatJSON{
  "success": false,
  "message": "Validation failed",
  "error_code": "INVALID_AMOUNT",
  "errors": {
    "payment_amount": [
      "The payment amount must be at least 1.00"
    ]
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
🧪 TestingDemo Credentials (Sandbox Only)Use these demo credentials for testing in the sandbox environment:Demo WalletWallet ID: 123456789Password: demo123Behavior: Auto-approved in sandboxDemo VoucherVoucher Code: TESTVOUCHERBehavior: Instant redemptionGateway PaymentBehavior: Auto Success (no external redirection)Testing GuidelinesEnvironment Header: Always include X-ENVIRONMENT: sandbox in your API requestsDemo Credentials: Use the provided demo wallet/voucher codes for testingSandbox Behavior: All payments auto-complete successfully without real money processingTransaction Status: Sandbox transactions are marked with "SANDBOX_TRANSACTION"IPN Notifications: Webhook notifications work normally in sandbox modeTesting Checklist[ ] API credentials configured correctly[ ] Webhook endpoints configured[ ] Sandbox transactions working[ ] Webhook signature verification implemented[ ] Error handling implemented[ ] Payment flow tested end-to-end🛡️ Best PracticesSecurityCredential Storage: Store API credentials in environment variables, never in codeHTTPS Only: Always use HTTPS for production environmentsWebhook Verification: Always verify webhook signaturesInput Validation: Validate all user inputs before sending to the APIError Logging: Log errors but don't expose sensitive informationPerformanceRate Limiting: Respect the 60 requests per minute rate limitWebhook Response: Respond to webhooks quickly (within 5 seconds)Caching: Cache API responses appropriatelyConnection Pooling: Use connection pooling for better performanceReliabilityRetry Logic: Implement retry logic for failed requestsWebhook Retries: Handle webhook retries gracefullyIdempotency: Ensure webhook processing is idempotentMonitoring: Monitor API health and webhook deliveryEnvironment ManagementSeparate Environments: Use different credentials for sandbox and productionConfiguration: Use environment-specific configuration filesTesting: Always test in sandbox before productionDeployment: Use proper deployment pipelines🛠️ WooCommerce IntegrationFor WooCommerce users, Heleerra provides a ready-to-use plugin.RequirementsWordPress 5.0+WooCommerce 4.0+PHP 7.4+SSL CertificateHeleerra Merchant AccountInstallationDownload Plugin: Download the Heleerra WooCommerce plugin ZIP fileUpload to WordPress: Go to WordPress Admin → Plugins → Add New → Upload PluginActivate Plugin: Click "Activate Plugin" to enable Heleerra payment gatewayConfigurationGo to WooCommerce → Settings → PaymentsFind "Heleerra" in the payment methods listClick "Manage" to configure the pluginEnter your Heleerra credentialsConfigure webhook URL in your Heleerra dashboard📞 SupportNeed help with integration? Our technical team is here to assist you.Resources📚 Official API Documentation🐛 Issue Tracker💬 Community Forum📧 Support EmailGetting HelpCheck Documentation: Review this guide and the official API docsSearch Issues: Look for similar issues in the issue trackerCreate Issue: Create a new issue with detailed informationContact Support: Reach out to our support team for urgent issuesWhen Creating IssuesInclude the following information:Environment (sandbox/production)API endpoint being usedRequest/response details (remove sensitive data)Error messagesSteps to reproduce🤝 ContributingWe welcome contributions! Please see our Contributing Guide for details.Development SetupFork the repositoryClone your forkCreate a feature branchMake your changesAdd testsSubmit a pull request📄 LicenseThis project is licensed under the MIT License - see the LICENSE file for details.🙏 AcknowledgmentsHeleerra API team for the excellent payment gatewayContributors who helped improve this guideCommunity feedback and suggestionsMade with ❤️ for the developer communityThis README was last updated on October 19, 2025. For the most up-to-date information, please refer to the official API documentation.
