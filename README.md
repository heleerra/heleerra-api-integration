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

1. **Clone this repository**
   ```bash
   git clone https://github.com/heleerra/heleerra-api-integration.git
   cd heleerra-api-integration
   ```

2. **Choose your integration method**
   - Direct API integration (see [API Reference](#api-reference))
   - Framework-specific examples (see [Examples](#examples))
   - WooCommerce plugin (see [WooCommerce Integration](#woocommerce-integration))

3. **Configure your environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Heleerra credentials
   ```

## 📚 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Support](#support)

## 🔍 Overview

Heleerra API provides a secure, scalable payment processing solution with the following features:

- **Multi-Environment Support**: Sandbox and production environments
- **Multiple Payment Methods**: Wallets, cards, vouchers, and more
- **Real-time Notifications**: Webhook-based status updates
- **Bank-Grade Security**: HMAC signature verification
- **Comprehensive Documentation**: Full API reference and examples

### API Base URLs

| Environment | Base URL | Header Value |
|-------------|----------|--------------|
| Sandbox | `https://heleerra.com` | `X-Environment: sandbox` |
| Production | `https://heleerra.com` | `X-Environment: production` |

## 🔐 Authentication

Heleerra API uses API keys for authentication. All requests must include the following headers:

### Required Headers

```
X-Environment: sandbox|production
X-Merchant-Key: {your_merchant_id}
X-API-Key: {your_api_key}
Content-Type: application/json
```

### Credential Format

| Environment | Merchant ID | API Key | Format |
|-------------|-------------|---------|---------|
| Sandbox | `test_merchant_123` | `test_api_key_abc` | `test_*` prefix |
| Production | `merchant_123` | `api_key_abc` | No prefix |

### Security Notice

⚠️ **Never expose your Client Secret in client-side code.** Store all credentials securely on your server.

## 📖 API Reference

### 1. Initiate Payment

Creates a new payment request and returns a secure checkout URL.

**Endpoint**: `POST /api/v1/initiate-payment`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `payment_amount` | number | ✅ | Payment amount (minimum 1.00) |
| `currency_code` | string | ✅ | 3-letter currency code (USD, EUR, etc.) |
| `ref_trx` | string | ✅ | Your unique transaction reference |
| `description` | string | ❌ | Payment description |
| `success_redirect` | string | ✅ | Success redirect URL |
| `failure_url` | string | ✅ | Failure redirect URL |
| `cancel_redirect` | string | ✅ | Cancel redirect URL |
| `ipn_url` | string | ✅ | Webhook notification URL |

#### Example Request

```bash
curl -X POST "https://heleerra.com/api/v1/initiate-payment" \\
  -H "Content-Type: application/json" \\
  -H "X-Environment: sandbox" \\
  -H "X-Merchant-Key: test_merchant_123" \\
  -H "X-API-Key: test_api_key_abc" \\
  -d '{
    "payment_amount": 250.00,
    "currency_code": "USD",
    "ref_trx": "ORDER_12345",
    "description": "Premium Subscription",
    "success_redirect": "https://yoursite.com/success",
    "failure_url": "https://yoursite.com/failed",
    "cancel_redirect": "https://yoursite.com/cancelled",
    "ipn_url": "https://yoursite.com/webhooks/heleerra"
  }'
```

#### Success Response

```json
{
  "payment_url": "https://heleerra.com/payment/checkout?token=...",
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
```

### 2. Verify Payment

Verify the status of a payment using the Heleerra transaction ID.

**Endpoint**: `GET /api/v1/verify-payment/{trxId}`

#### Example Request

```bash
curl -X GET "https://heleerra.com/api/v1/verify-payment/TXNQ5V8K2L9N3XM1" \\
  -H "Accept: application/json" \\
  -H "X-Environment: sandbox" \\
  -H "X-Merchant-Key: test_merchant_123" \\
  -H "X-API-Key: test_api_key_abc"
```

#### Success Response

```json
{
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
```

## 💻 Examples

### PHP (Laravel)

```php
<?php
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
```

### Python

```python
import requests
import hashlib
import hmac
from typing import Dict, Any

class HeleerraAPI:
    def __init__(self, merchant_key: str, api_key: str, environment: str = 'sandbox'):
        self.base_url = 'https://heleerra.com'
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
    'success_redirect': 'https://yoursite.com/success',
    'failure_url': 'https://yoursite.com/failed',
    'cancel_redirect': 'https://yoursite.com/cancelled',
    'ipn_url': 'https://yoursite.com/webhooks/heleerra'
}

try:
    result = api.initiate_payment(payment_data)
    print(f"Payment URL: {result['payment_url']}")
except Exception as e:
    print(f"Error: {e}")
```

### Node.js

```javascript
const axios = require('axios');
const crypto = require('crypto');

class HeleerraAPI {
    constructor(merchantKey, apiKey, environment = 'sandbox') {
        this.baseUrl = 'https://heleerra.com';
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
    success_redirect: 'https://yoursite.com/success',
    failure_url: 'https://yoursite.com/failed',
    cancel_redirect: 'https://yoursite.com/cancelled',
    ipn_url: 'https://yoursite.com/webhooks/heleerra'
};

api.initiatePayment(paymentData)
    .then(result => {
        console.log('Payment URL:', result.payment_url);
        // Redirect user to payment URL
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
```

## 🎣 Webhooks

Heleerra sends real-time notifications to your specified IPN URL when payment status changes.

### Webhook Payload

```json
{
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
```

### Webhook Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Content-Type` | Always `application/json` | `application/json` |
| `X-Signature` | HMAC-SHA256 signature | `a8b9c2d1e5f3...` |
| `X-Environment` | Environment context | `sandbox` or `production` |

### Signature Verification

Always verify webhook signatures to ensure authenticity:

#### PHP Example

```php
private function verifySignature(string $payload, string $signature, string $secret): bool
{
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expectedSignature, $signature);
}
```

#### Python Example

```python
import hmac
import hashlib

def verify_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)
```

### Payment Status Values

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `pending` | Payment is still processing | Wait for webhook notification |
| `completed` | Payment was successful | Fulfill order/service |
| `failed` | Payment failed | Handle failed payment |
| `cancelled` | Payment was cancelled by user | Handle cancellation |
| `expired` | Payment session expired | Create new payment request |

## ❌ Error Handling

Heleerra API uses conventional HTTP response codes and provides detailed error information.

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### API Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_CREDENTIALS` | Invalid API credentials provided | Check your Merchant ID and API Key |
| `INSUFFICIENT_FUNDS` | Customer has insufficient funds | Customer needs to add funds to their wallet |
| `PAYMENT_DECLINED` | Payment was declined by payment processor | Customer should try a different payment method |
| `INVALID_AMOUNT` | Payment amount is invalid | Check minimum and maximum amount limits |
| `INVALID_CURRENCY` | Unsupported currency code | Use a supported currency code |
| `DUPLICATE_REFERENCE` | Transaction reference already exists | Use a unique transaction reference |
| `EXPIRED_SESSION` | Payment session has expired | Create a new payment request |
| `MERCHANT_SUSPENDED` | Merchant account is suspended | Contact Heleerra support |

### Error Response Format

```json
{
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
```

## 🧪 Testing

### Demo Credentials (Sandbox Only)

Use these demo credentials for testing in the sandbox environment:

#### Demo Wallet
- **Wallet ID**: `123456789`
- **Password**: `demo123`
- **Behavior**: Auto-approved in sandbox

#### Demo Voucher
- **Voucher Code**: `TESTVOUCHER`
- **Behavior**: Instant redemption

#### Gateway Payment
- **Behavior**: Auto Success (no external redirection)

### Testing Guidelines

1. **Environment Header**: Always include `X-ENVIRONMENT: sandbox` in your API requests
2. **Demo Credentials**: Use the provided demo wallet/voucher codes for testing
3. **Sandbox Behavior**: All payments auto-complete successfully without real money processing
4. **Transaction Status**: Sandbox transactions are marked with "SANDBOX_TRANSACTION"
5. **IPN Notifications**: Webhook notifications work normally in sandbox mode

### Testing Checklist

- [ ] API credentials configured correctly
- [ ] Webhook endpoints configured
- [ ] Sandbox transactions working
- [ ] Webhook signature verification implemented
- [ ] Error handling implemented
- [ ] Payment flow tested end-to-end

## 🛡️ Best Practices

### Security

1. **Credential Storage**: Store API credentials in environment variables, never in code
2. **HTTPS Only**: Always use HTTPS for production environments
3. **Webhook Verification**: Always verify webhook signatures
4. **Input Validation**: Validate all user inputs before sending to the API
5. **Error Logging**: Log errors but don't expose sensitive information

### Performance

1. **Rate Limiting**: Respect the 60 requests per minute rate limit
2. **Webhook Response**: Respond to webhooks quickly (within 5 seconds)
3. **Caching**: Cache API responses appropriately
4. **Connection Pooling**: Use connection pooling for better performance

### Reliability

1. **Retry Logic**: Implement retry logic for failed requests
2. **Webhook Retries**: Handle webhook retries gracefully
3. **Idempotency**: Ensure webhook processing is idempotent
4. **Monitoring**: Monitor API health and webhook delivery

### Environment Management

1. **Separate Environments**: Use different credentials for sandbox and production
2. **Configuration**: Use environment-specific configuration files
3. **Testing**: Always test in sandbox before production
4. **Deployment**: Use proper deployment pipelines

## 🛠️ WooCommerce Integration

For WooCommerce users, Heleerra provides a ready-to-use plugin.

### Requirements

- WordPress 5.0+
- WooCommerce 4.0+
- PHP 7.4+
- SSL Certificate
- Heleerra Merchant Account

### Installation

1. **Download Plugin**: Download the Heleerra WooCommerce plugin ZIP file
2. **Upload to WordPress**: Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. **Activate Plugin**: Click "Activate Plugin" to enable Heleerra payment gateway

### Configuration

1. Go to WooCommerce → Settings → Payments
2. Find "Heleerra" in the payment methods list
3. Click "Manage" to configure the plugin
4. Enter your Heleerra credentials
5. Configure webhook URL in your Heleerra dashboard

## 📞 Support

Need help with integration? Our technical team is here to assist you.

### Resources

- 📚 [Official API Documentation](https://heleerra.com/api-docs)
- 🐛 [Issue Tracker](https://github.com/yourusername/heleerra-api-integration/issues)
- 💬 [Community Forum](https://community.heleerra.com)
- 📧 [Support Email](mailto:support@heleerra.com)

### Getting Help

1. **Check Documentation**: Review this guide and the official API docs
2. **Search Issues**: Look for similar issues in the issue tracker
3. **Create Issue**: Create a new issue with detailed information
4. **Contact Support**: Reach out to our support team for urgent issues

### When Creating Issues

Include the following information:

- Environment (sandbox/production)
- API endpoint being used
- Request/response details (remove sensitive data)
- Error messages
- Steps to reproduce

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Add tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Heleerra API team for the excellent payment gateway
- Contributors who helped improve this guide
- Community feedback and suggestions

---

**Made with ❤️ for the developer community**

*This README was last updated on October 19, 2025. For the most up-to-date information, please refer to the [official API documentation](https://heleerra.com/api-docs).*
