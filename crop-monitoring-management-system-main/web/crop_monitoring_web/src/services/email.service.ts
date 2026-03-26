/**
 * Email Service
 * 
 * Handles sending email notifications for account events.
 * Note: In a production environment, this would call a Supabase Edge Function
 * or an external service like SendGrid / Resend via an API.
 */

interface EmailData {
    to: string;
    subject: string;
    body: string;
}

export const emailService = {
    /**
     * Send a notification for a new sign-up request
     */
    async sendSignUpNotification(data: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    }) {
        const payload: EmailData = {
            to: 'murerwanelson31@gmail.com',
            subject: '🚀 New Account Request - Cane Pulse',
            body: `
                A new account request has been submitted.
                
                Name: ${data.firstName} ${data.lastName}
                Email: ${data.email}
                Requested Role: ${data.role}
                Date: ${new Date().toLocaleString()}
                
                Please log in to the system to approve or reject this request.
            `.trim(),
        }

        return this._send(payload)
    },

    /**
     * Send a notification when a user is approved
     */
    async sendApprovalNotification(email: string, role: string) {
        const payload: EmailData = {
            to: email,
            subject: '✅ Account Approved - Cane Pulse',
            body: `
                Congratulations! Your account request as a ${role} has been approved.
                
                You can now log in to the dashboard using your credentials.
                
                Dashboard URL: ${window.location.origin}/login
            `.trim(),
        }

        return this._send(payload)
    },

    /**
     * Send a notification when a user is rejected
     */
    async sendRejectionNotification(email: string) {
        const payload: EmailData = {
            to: email,
            subject: '❌ Account Request Update - Cane Pulse',
            body: `
                We regret to inform you that your account request for Cane Pulse, the sugarcane management system, has been rejected at this time.
                
                If you believe this is an error, please contact your administrator.
            `.trim(),
        }

        return this._send(payload)
    },

    /**
     * Internal generic send method (Conceptual)
     */
    async _send(data: EmailData) {
        // Conceptual: In a real app, this would be an actual API call.
        console.log('%c [Email Service Triggered] ', 'background: #000000; color: #43a047', {
            to: data.to,
            subject: data.subject,
            body: data.body,
        })

        // Simulating network delay
        return new Promise((resolve) => setTimeout(resolve, 800))
    }
}
