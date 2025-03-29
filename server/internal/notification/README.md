# Email Notification System

This package provides email notification capabilities for critical and fatal errors in the application.

## Features

- Email notifications for critical errors
- Rate limiting to prevent notification flooding
- Asynchronous processing via channels
- Integration with the logging system
- Middleware pattern for easy integration with database operations

## Configuration

Configure the email notification system through environment variables:

```
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=alerts@alertdashboard.com
EMAIL_PASSWORD=your-secure-password
EMAIL_FROM_ADDRESS=alerts@alertdashboard.com
EMAIL_TO_ADDRESSES=admin1@example.com,admin2@example.com
EMAIL_MIN_LEVEL=error
```

### SMTP Configuration

The system is configured to use SMTP for sending emails. Here's how to set up your SMTP configuration:

1. **SMTP Server**: Use `EMAIL_SMTP_HOST` to set your SMTP server address
   - For Gmail: `smtp.gmail.com`
   - For Office 365: `smtp.office365.com`
   - For Amazon SES: `email-smtp.us-east-1.amazonaws.com` (region may vary)

2. **SMTP Port**: Set `EMAIL_SMTP_PORT` based on your security needs
   - Port 587: TLS (recommended)
   - Port 465: SSL
   - Port 25: Unencrypted (not recommended)

3. **Authentication**: Set credentials via `EMAIL_USERNAME` and `EMAIL_PASSWORD`
   - For service accounts, create a dedicated email account for alerts
   - For Gmail, you may need to use an App Password instead of your regular password

### Domain Configuration (DMARC/SPF/DKIM)

When sending emails from your domain (e.g., @alertdashboard.com), you should set up proper email authentication to ensure deliverability:

1. **SPF (Sender Policy Framework)**
   - Add an SPF record to your domain's DNS to specify which mail servers can send email from your domain
   - Example: `v=spf1 include:_spf.example.com ~all`

2. **DKIM (DomainKeys Identified Mail)**
   - Set up DKIM signing for your domain through your email provider
   - Add the DKIM public key as a DNS TXT record

3. **DMARC (Domain-based Message Authentication, Reporting & Conformance)**
   - Add a DMARC record to specify how receiving servers should handle emails failing authentication
   - Example: `v=DMARC1; p=reject; rua=mailto:dmarc-reports@alertdashboard.com`

These configurations are done at the DNS level and through your email provider, not in the application code.

## Usage

### Basic Usage

```go
// Initialize notification service
notifyService := notification.NewService(cfg.Notification, logger)

// Send error notification
notifyService.NotifyError(err, "Database connection failed")

// Send fatal notification
notifyService.NotifyFatal(err, "Application startup failed")
```

### With Middleware

```go
// Create notification middleware
notifier := notification.NewStorageNotifier(notifyService)

// Wrap database operations with notifications
err := notifier.WithNotifications(ctx, "operation name", func(ctx context.Context) error {
    return store.DatabaseOperation(ctx)
})
```

## Notification Levels

- **Error**: Important but non-fatal errors that require attention
- **Fatal**: Critical errors that cause the application to terminate

## Rate Limiting

To prevent notification flooding, similar notifications are rate-limited:

- The same error context will only trigger one notification within a 5-minute window
- Fatal errors bypass normal queuing to ensure delivery

## Testing Your Email Configuration

To test your email configuration:

1. Set the required environment variables
2. Enable email notifications by setting `EMAIL_NOTIFICATIONS_ENABLED=true`
3. Restart the application
4. The application will log whether email notifications are enabled at startup
5. For an explicit test, you can trigger a non-fatal error or manually call the notification service

## Troubleshooting

Common issues:

1. **Authentication failures**: Check your username and password
2. **Connection timeouts**: Verify your SMTP host and port settings
3. **Email not being received**: Check spam folders and verify DMARC/SPF/DKIM configuration
4. **Rate limiting**: Remember notifications are rate-limited to prevent flooding

## Extending

To add new notification channels (SMS, Slack, etc.):

1. Create a new service implementation
2. Add it to the `Service` struct
3. Update the `NotifyError` and `NotifyFatal` methods to use the new channel