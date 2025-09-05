const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.createTransporter();
    }

    createTransporter() {
        // Different transporter configurations based on environment
        if (process.env.NODE_ENV === 'production') {
            // Production configuration (e.g., using SendGrid, AWS SES, etc.)
            this.transporter = nodemailer.createTransport({
                service: 'SendGrid', // or 'gmail', 'outlook', etc.
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        } else {
            // Development configuration
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'your-email@gmail.com',
                    pass: process.env.EMAIL_PASS || 'your-app-password' // Use app password, not regular password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
        }

        // Alternative: Using SMTP configuration
        // this.transporter = nodemailer.createTransporter({
        //     host: process.env.SMTP_HOST || 'smtp.gmail.com',
        //     port: process.env.SMTP_PORT || 587,
        //     secure: false, // true for 465, false for other ports
        //     auth: {
        //         user: process.env.EMAIL_USER,
        //         pass: process.env.EMAIL_PASS
        //     }
        // });
    }

    /**
     * Send a generic email
     * @param {Object} options - Email options
     * @returns {Promise<Object>} Email send result
     */
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: `${process.env.APP_NAME || 'Blog App'} <${process.env.EMAIL_USER}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments || []
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Email sent successfully'
            };
        } catch (error) {
            console.error('Email sending failed:', error);
            
            return {
                success: false,
                error: error.message,
                message: 'Failed to send email'
            };
        }
    }

    /**
     * Send welcome email to new users
     * @param {Object} user - User object
     * @returns {Promise<Object>} Email send result
     */
    async sendWelcomeEmail(user) {
        const subject = `Welcome to ${process.env.APP_NAME || 'Blog App'}!`;
        
        const text = `
            Hi ${user.name},

            Welcome to ${process.env.APP_NAME || 'Blog App'}! 

            Thank you for joining our community. You can now:
            - Create and share your blog posts
            - Read posts from other users
            - Manage your profile

            If you have any questions, feel free to reach out to us.

            Best regards,
            The ${process.env.APP_NAME || 'Blog App'} Team
        `;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to ${process.env.APP_NAME || 'Blog App'}!</h2>
                
                <p>Hi <strong>${user.name}</strong>,</p>
                
                <p>Welcome to ${process.env.APP_NAME || 'Blog App'}! We're excited to have you join our community.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>What you can do now:</h3>
                    <ul>
                        <li>✍️ Create and share your blog posts</li>
                        <li>📖 Read posts from other users</li>
                        <li>👤 Manage your profile</li>
                    </ul>
                </div>
                
                <p>If you have any questions, feel free to reach out to us.</p>
                
                <p>Best regards,<br>
                The ${process.env.APP_NAME || 'Blog App'} Team</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    This email was sent to ${user.email}. If you didn't create an account, please ignore this email.
                </p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            text,
            html
        });
    }

    /**
     * Send password reset email
     * @param {Object} user - User object
     * @param {String} resetToken - Password reset token
     * @returns {Promise<Object>} Email send result
     */
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        const subject = 'Password Reset Request';
        
        const text = `
            Hi ${user.name},

            You requested a password reset for your ${process.env.APP_NAME || 'Blog App'} account.

            Click the link below to reset your password:
            ${resetUrl}

            This link will expire in 15 minutes.

            If you didn't request this reset, please ignore this email.

            Best regards,
            The ${process.env.APP_NAME || 'Blog App'} Team
        `;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                
                <p>Hi <strong>${user.name}</strong>,</p>
                
                <p>You requested a password reset for your ${process.env.APP_NAME || 'Blog App'} account.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p>Or copy and paste this link in your browser:</p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all;">
                    ${resetUrl}
                </p>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <strong>⚠️ Important:</strong> This link will expire in 15 minutes for security reasons.
                </div>
                
                <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
                
                <p>Best regards,<br>
                The ${process.env.APP_NAME || 'Blog App'} Team</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    This email was sent to ${user.email}. For security reasons, this link will expire in 15 minutes.
                </p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            text,
            html
        });
    }

    /**
     * Send email verification email
     * @param {Object} user - User object
     * @param {String} verificationToken - Email verification token
     * @returns {Promise<Object>} Email send result
     */
    async sendEmailVerification(user, verificationToken) {
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
        const subject = 'Please verify your email address';
        
        const text = `
            Hi ${user.name},

            Thank you for signing up for ${process.env.APP_NAME || 'Blog App'}!

            Please verify your email address by clicking the link below:
            ${verifyUrl}

            If you didn't create an account, please ignore this email.

            Best regards,
            The ${process.env.APP_NAME || 'Blog App'} Team
        `;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Verify Your Email Address</h2>
                
                <p>Hi <strong>${user.name}</strong>,</p>
                
                <p>Thank you for signing up for ${process.env.APP_NAME || 'Blog App'}!</p>
                
                <p>Please verify your email address to complete your registration:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" 
                       style="background: #28a745; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <p>Or copy and paste this link in your browser:</p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all;">
                    ${verifyUrl}
                </p>
                
                <p>If you didn't create an account, please ignore this email.</p>
                
                <p>Best regards,<br>
                The ${process.env.APP_NAME || 'Blog App'} Team</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                    This email was sent to ${user.email}.
                </p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            text,
            html
        });
    }

    /**
     * Send notification email about new blog post
     * @param {Object} user - User to notify
     * @param {Object} blog - Blog post object
     * @param {Object} author - Blog author object
     * @returns {Promise<Object>} Email send result
     */
    async sendNewBlogNotification(user, blog, author) {
        const blogUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blogs/${blog._id}`;
        const subject = `New blog post: ${blog.title}`;
        
        const text = `
            Hi ${user.name},

            ${author.name} just published a new blog post: "${blog.title}"

            Check it out: ${blogUrl}

            ${blog.description.substring(0, 200)}...

            Best regards,
            The ${process.env.APP_NAME || 'Blog App'} Team
        `;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Blog Post</h2>
                
                <p>Hi <strong>${user.name}</strong>,</p>
                
                <p><strong>${author.name}</strong> just published a new blog post:</p>
                
                <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #495057;">${blog.title}</h3>
                    <p style="color: #6c757d; margin: 0;">${blog.description.substring(0, 200)}...</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${blogUrl}" 
                       style="background: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Read Full Post
                    </a>
                </div>
                
                <p>Best regards,<br>
                The ${process.env.APP_NAME || 'Blog App'} Team</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject,
            text,
            html
        });
    }

    /**
     * Test email connection
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service connection successful');
            return { success: true, message: 'Email service is ready' };
        } catch (error) {
            console.error('Email service connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export a singleton instance
const emailService = new EmailService();

module.exports = emailService;