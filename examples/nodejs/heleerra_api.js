/**
 * Heleerra Payment Gateway API Client
 * 
 * This module provides a Node.js client for integrating with the Heleerra payment gateway API.
 * Supports both sandbox and production environments with comprehensive error handling.
 */

const axios = require('axios');
const crypto = require('crypto');

class HeleerraAPI {
    /**
     * Initialize Heleerra API client
     * 
     * @param {string} merchantKey - Your merchant ID from Heleerra dashboard
     * @param {string} apiKey - Your API key from Heleerra dashboard
     * @param {string} environment - 'sandbox' or 'production'
     * @param {string} webhookSecret - Webhook secret for signature verification
     * @param {number} timeout - Request timeout in milliseconds
     */
    constructor(merchantKey, apiKey, environment = 'sandbox', webhookSecret = null, timeout = 30000) {
        this.baseUrl = 'https://heleerra.com';
        this.merchantKey = merchantKey;
        this.apiKey = apiKey;
        this.environment = environment.toLowerCase();
        this.timeout = timeout;
        
        // Set appropriate webhook secret based on environment
        this.webhookSecret = webhookSecret || (this.environment === 'sandbox' ? 'test_webhook_secret' : 'webhook_secret');
        
        // Validate environment
        if (!['sandbox', 'production'].includes(this.environment)) {
            throw new Error("Environment must be either 'sandbox' or 'production'");
        }
        
        // Configure axios instance
        this.axios = axios.create({
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Add request logging
        this.axios.interceptors.request.use(
            (config) => {
                console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
                return config;
            },
            (error) => {
                console.error('Request error:', error.message);
                return Promise.reject(error);
            }
        );
        
        // Add response logging
        this.axios.interceptors.response.use(
            (response) => {
                console.log(`Response received: ${response.status} ${response.statusText}`);
                return response;
            },
            (error) => {
                console.error('Response error:', error.response?.status, error.message);
                return Promise.reject(error);
            }
        );
        
        console.log(`Heleerra API client initialized for ${this.environment} environment`);
    }

    /**
     * Initiate a new payment request
     * 
     * @param {Object} paymentData - Payment details
     * @returns {Promise<Object>} API response with payment URL and transaction details
     */
    async initiatePayment(paymentData) {
        try {
            this._validatePaymentData(paymentData);
            
            const headers = {
                'X-Environment': this.environment,
                'X-Merchant-Key': this.merchantKey,
                'X-API-Key': this.apiKey
            };
            
            console.log(`Initiating payment for ref_trx: ${paymentData.ref_trx || 'unknown'}`);
            
            const response = await this.axios.post(
                `${this.baseUrl}/api/v1/initiate-payment`,
                paymentData,
                { headers }
            );
            
            const result = response.data;
            console.log('Payment initiated successfully', {
                ref_trx: paymentData.ref_trx,
                amount: paymentData.payment_amount,
                environment: this.environment
            });
            
            return result;
            
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || 'Payment initiation failed';
                const errorCode = errorData.error_code || 'UNKNOWN_ERROR';
                
                console.error('Payment initiation failed', {
                    status: error.response.status,
                    error_code: errorCode,
                    message: errorMessage,
                    ref_trx: paymentData.ref_trx
                });
                
                throw new Error(`Payment initiation failed: ${errorMessage}`);
            } else {
                console.error('Network error during payment initiation', {
                    error: error.message,
                    ref_trx: paymentData.ref_trx
                });
                throw error;
            }
        }
    }

    /**
     * Verify payment status
     * 
     * @param {string} transactionId - Heleerra transaction ID
     * @returns {Promise<Object>} Payment details and status
     */
    async verifyPayment(transactionId) {
        try {
            const headers = {
                'Accept': 'application/json',
                'X-Environment': this.environment,
                'X-Merchant-Key': this.merchantKey,
                'X-API-Key': this.apiKey
            };
            
            console.log(`Verifying payment status for transaction: ${transactionId}`);
            
            const response = await this.axios.get(
                `${this.baseUrl}/api/v1/verify-payment/${transactionId}`,
                { headers }
            );
            
            const result = response.data;
            console.log('Payment verification successful', {
                transaction_id: transactionId,
                status: result.status
            });
            
            return result;
            
        } catch (error) {
            if (error.response) {
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || 'Payment verification failed';
                
                console.error('Payment verification failed', {
                    transaction_id: transactionId,
                    status: error.response.status,
                    message: errorMessage
                });
                
                throw new Error(`Payment verification failed: ${errorMessage}`);
            } else {
                console.error('Network error during payment verification', {
                    transaction_id: transactionId,
                    error: error.message
                });
                throw error;
            }
        }
    }

    /**
     * Verify webhook signature authenticity
     * 
     * @param {string} payload - Raw webhook payload
     * @param {string} signature - Signature from X-Signature header
     * @returns {boolean} True if signature is valid
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            console.warn('Webhook secret not configured');
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(payload, 'utf8')
                .digest('hex');
            
            const isValid = expectedSignature === signature;
            
            if (!isValid) {
                console.warn('Webhook signature verification failed');
            }
            
            return isValid;
            
        } catch (error) {
            console.error('Error verifying webhook signature', error);
            return false;
        }
    }

    /**
     * Handle webhook notification
     * 
     * @param {Object} payload - Webhook payload
     * @param {Object} headers - Request headers
     * @returns {Object} Response data
     */
    handleWebhook(payload, headers) {
        const signature = headers['x-signature'] || headers['X-Signature'] || '';
        const environment = headers['x-environment'] || headers['X-Environment'] || 'production';
        const webhookId = headers['x-webhook-id'] || headers['X-Webhook-ID'] || '';

        // Verify signature
        if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
            console.warn('Webhook signature verification failed', {
                webhook_id: webhookId,
                environment: environment
            });
            
            return {
                status: 'error',
                message: 'Invalid signature'
            };
        }

        // Handle based on environment
        if (environment === 'sandbox') {
            return this._handleSandboxWebhook(payload);
        } else {
            return this._handleProductionWebhook(payload);
        }
    }

    /**
     * Handle sandbox webhook (testing environment)
     * 
     * @param {Object} payload 
     * @returns {Object}
     */
    _handleSandboxWebhook(payload) {
        const transactionId = payload.data?.ref_trx;
        const status = payload.status;
        const amount = payload.data?.amount;

        console.log('Processing sandbox webhook', {
            transaction_id: transactionId,
            status: status,
            amount: amount
        });

        // Sandbox-specific logic
        // Don't fulfill orders, don't send emails to real customers, etc.

        return {
            status: 'sandbox_processed',
            message: 'Webhook processed in sandbox mode'
        };
    }

    /**
     * Handle production webhook (live environment)
     * 
     * @param {Object} payload 
     * @returns {Object}
     */
    _handleProductionWebhook(payload) {
        const status = payload.status || 'unknown';
        const transactionId = payload.data?.ref_trx;
        const amount = payload.data?.amount || 0;

        console.log('Processing production webhook', {
            transaction_id: transactionId,
            status: status,
            amount: amount
        });

        // Process based on payment status
        switch (status) {
            case 'completed':
                this._processCompletedPayment(payload);
                break;
            case 'failed':
                this._processFailedPayment(payload);
                break;
            case 'cancelled':
                this._processCancelledPayment(payload);
                break;
            case 'expired':
                this._processExpiredPayment(payload);
                break;
            default:
                console.warn('Unknown payment status in webhook', {
                    status: status,
                    transaction_id: transactionId
                });
        }

        return {
            status: 'processed',
            message: 'Webhook processed successfully'
        };
    }

    /**
     * Validate payment data before sending to API
     * 
     * @param {Object} paymentData 
     * @throws {Error}
     */
    _validatePaymentData(paymentData) {
        const required = ['payment_amount', 'currency_code', 'ref_trx'];
        
        for (const field of required) {
            if (!paymentData[field]) {
                throw new Error(`Required field '${field}' is missing or empty`);
            }
        }

        const amount = paymentData.payment_amount;
        if (typeof amount !== 'number' || amount < 1.00) {
            throw new Error('Payment amount must be a number and at least 1.00');
        }

        const currency = paymentData.currency_code;
        if (currency.length !== 3) {
            throw new Error('Currency code must be a 3-letter code (e.g., USD)');
        }

        // Validate URLs if provided
        const urlFields = ['success_redirect', 'failure_url', 'cancel_redirect', 'ipn_url'];
        for (const field of urlFields) {
            if (paymentData[field] && !paymentData[field].startsWith('http')) {
                throw new Error(`${field} must be a valid URL`);
            }
        }
    }

    /**
     * Process completed payment
     * 
     * @param {Object} payload 
     */
    _processCompletedPayment(payload) {
        const transactionId = payload.data?.ref_trx;
        const amount = payload.data?.amount;
        const customerEmail = payload.data?.customer_email;

        // Update order status to completed
        // Send confirmation email to customer
        // Update inventory
        // Trigger any additional business logic

        console.log('Payment completed successfully', {
            transaction_id: transactionId,
            amount: amount,
            customer_email: customerEmail
        });
    }

    /**
     * Process failed payment
     * 
     * @param {Object} payload 
     */
    _processFailedPayment(payload) {
        const transactionId = payload.data?.ref_trx;
        
        // Update order status to failed
        // Send failure notification to customer
        // Log the failure for analysis

        console.warn('Payment failed', {
            transaction_id: transactionId,
            reason: payload.message || 'Unknown reason'
        });
    }

    /**
     * Process cancelled payment
     * 
     * @param {Object} payload 
     */
    _processCancelledPayment(payload) {
        const transactionId = payload.data?.ref_trx;
        
        // Update order status to cancelled
        // Release any reserved inventory
        // Send cancellation notification

        console.log('Payment cancelled by user', {
            transaction_id: transactionId
        });
    }

    /**
     * Process expired payment
     * 
     * @param {Object} payload 
     */
    _processExpiredPayment(payload) {
        const transactionId = payload.data?.ref_trx;
        
        // Update order status to expired
        // Release any reserved inventory
        // Optionally send reminder to customer

        console.log('Payment session expired', {
            transaction_id: transactionId
        });
    }

    /**
     * Get API configuration (for debugging)
     * 
     * @returns {Object}
     */
    getConfig() {
        return {
            environment: this.environment,
            base_url: this.baseUrl,
            merchant_key: this.merchantKey.substring(0, 8) + '...', // Mask for security
            webhook_configured: !!this.webhookSecret
        };
    }
}

// Example usage
if (require.main === module) {
    // Initialize API client
    const api = new HeleerraAPI(
        'test_merchant_123',
        'test_api_key_abc',
        'sandbox'
    );

    // Example payment data
    const paymentData = {
        payment_amount: 250.00,
        currency_code: 'USD',
        ref_trx: `ORDER_${Date.now()}`,
        description: 'Premium Subscription',
        success_redirect: 'https://yoursite.com/success',
        failure_url: 'https://yoursite.com/failed',
        cancel_redirect: 'https://yoursite.com/cancelled',
        ipn_url: 'https://yoursite.com/webhooks/heleerra'
    };

    // Example usage
    api.initiatePayment(paymentData)
        .then(result => {
            console.log('Payment URL:', result.payment_url);
            
            // Example: Verify payment
            // return api.verifyPayment('TXNQ5V8K2L9N3XM1');
        })
        // .then(verificationResult => {
        //     console.log('Payment status:', verificationResult.status);
        // })
        .catch(error => {
            console.error('Error:', error.message);
        });
}

module.exports = HeleerraAPI;