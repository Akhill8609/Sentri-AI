import smtplib
import socket
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("sentriai.email")

class EmailDeliveryError(Exception):
    """Raised when email delivery fails via SMTP or configuration is missing."""
    pass

class EmailService:
    """
    Production-grade Real Email Delivery Service for SentriAI.
    Sends responsive HTML verification OTPs and password reset codes strictly via authenticated SMTP.
    """

    def _get_verification_html(self, full_name: str, otp: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your SentriAI account</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0; }}
    .logo {{ display: inline-block; width: 44px; height: 44px; background: #8b5cf6; border-radius: 12px; color: #ffffff; line-height: 44px; font-size: 20px; font-weight: bold; margin-bottom: 12px; text-align: center; }}
    .brand {{ font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; margin: 0; }}
    .tagline {{ font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }}
    .content {{ padding: 36px 28px; }}
    .headline {{ font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }}
    .lead-text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }}
    .otp-card {{ background: #f5f3ff; border: 2px dashed #8b5cf6; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }}
    .otp-label {{ font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; margin-bottom: 8px; }}
    .otp-code {{ font-family: 'SF Pro Mono', 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #5b21b6; padding-left: 10px; }}
    .otp-expiry {{ font-size: 12px; color: #6d28d9; margin-top: 10px; font-weight: 500; }}
    .warning {{ font-size: 12px; line-height: 1.6; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-top: 24px; }}
    .footer {{ background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">S</div>
      <h1 class="brand">SentriAI</h1>
      <div class="tagline">Your Intelligent Digital Security Companion</div>
    </div>
    <div class="content">
      <div class="headline">Verify Your Email Address</div>
      <p class="lead-text">
        Thank you for registering with <strong>SentriAI</strong>.
      </p>
      <div class="otp-card">
        <div class="otp-label">Your verification code is:</div>
        <div class="otp-code">{otp}</div>
        <div class="otp-expiry">This code will expire in 5 minutes.</div>
      </div>
      <div class="warning">
        <strong>Security Notice:</strong> For your security, never share this code with anyone.
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
        If you did not create a SentriAI account, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      SentriAI • Your Intelligent Digital Security Companion<br>
      This is an automated security verification message. Please do not reply directly.
    </div>
  </div>
</body>
</html>"""

    def _get_password_reset_html(self, full_name: str, otp: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentriAI Password Reset Code</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #ede9fe 0%, #e0f2fe 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #e2e8f0; }}
    .logo {{ display: inline-block; width: 44px; height: 44px; background: #8b5cf6; border-radius: 12px; color: #ffffff; line-height: 44px; font-size: 20px; font-weight: bold; margin-bottom: 12px; text-align: center; }}
    .brand {{ font-size: 22px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; margin: 0; }}
    .tagline {{ font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }}
    .content {{ padding: 36px 28px; }}
    .headline {{ font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }}
    .lead-text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }}
    .otp-card {{ background: #f5f3ff; border: 2px dashed #8b5cf6; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; }}
    .otp-label {{ font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; margin-bottom: 8px; }}
    .otp-code {{ font-family: 'SF Pro Mono', 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #5b21b6; padding-left: 10px; }}
    .otp-expiry {{ font-size: 12px; color: #6d28d9; margin-top: 10px; font-weight: 500; }}
    .warning {{ font-size: 12px; line-height: 1.6; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-top: 24px; }}
    .footer {{ background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">S</div>
      <h1 class="brand">SentriAI</h1>
      <div class="tagline">Your Intelligent Digital Security Companion</div>
    </div>
    <div class="content">
      <div class="headline">Your Password Reset Code</div>
      <p class="lead-text">
        We received a request to reset your password for your <strong>SentriAI</strong> account.
      </p>
      <div class="otp-card">
        <div class="otp-label">Your reset verification code is:</div>
        <div class="otp-code">{otp}</div>
        <div class="otp-expiry">This code will expire in 5 minutes.</div>
      </div>
      <div class="warning">
        <strong>Security Notice:</strong> For your security, never share this code with anyone.
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      SentriAI • Your Intelligent Digital Security Companion<br>
      This is an automated security verification message. Please do not reply directly.
    </div>
  </div>
</body>
</html>"""

    def send_email(self, to_email: str, subject: str, plain_text: str, html_body: str) -> bool:
        """
        Sends an email strictly via authenticated SMTP.
        Raises EmailDeliveryError if credentials are missing or sending fails.
        Never logs or leaks the OTP.
        """
        sender_email = (settings.SMTP_USERNAME or "").strip()
        if not sender_email and settings.EMAIL_FROM:
            sender_email = settings.EMAIL_FROM.split('<')[-1].rstrip('>').strip()

        smtp_password = (settings.SMTP_PASSWORD or "").strip()

        if not sender_email or not smtp_password:
            logger.warning(f"SMTP delivery skipped: credentials not configured in backend/.env for recipient {to_email}")
            raise EmailDeliveryError("Unable to send verification email. Please try again.")

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"SentriAI <{sender_email}>"
            msg["To"] = to_email

            # Attach plain text and HTML versions
            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Successfully dispatched email via SMTP to {to_email}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication Error sending to {to_email}: {e}")
            raise EmailDeliveryError("Unable to send verification email. Please try again.")
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, socket.timeout, TimeoutError, ConnectionRefusedError) as e:
            logger.error(f"SMTP Connection Error connecting to {settings.SMTP_HOST}:{settings.SMTP_PORT}: {e}")
            raise EmailDeliveryError("Unable to send verification email. Please try again.")
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP Recipient Refused for {to_email}: {e}")
            raise EmailDeliveryError("Unable to send verification email. Please try again.")
        except Exception as e:
            logger.error(f"SMTP delivery failed to {to_email}: {e}")
            raise EmailDeliveryError("Unable to send verification email. Please try again.")

    def send_verification_otp(self, to_email: str, full_name: str, otp: str) -> bool:
        subject = "Verify your SentriAI account"
        plain_text = (
            "SentriAI\n"
            "Your Intelligent Digital Security Companion\n\n"
            "Verify Your Email Address\n\n"
            "Thank you for registering with SentriAI.\n\n"
            "Your verification code is:\n\n"
            f"{otp}\n\n"
            "This code will expire in 5 minutes.\n\n"
            "For your security, never share this code with anyone.\n\n"
            "If you did not create a SentriAI account, you can safely ignore this email.\n"
        )
        html_body = self._get_verification_html(full_name, otp)
        return self.send_email(to_email, subject, plain_text, html_body)

    def send_password_reset_otp(self, to_email: str, full_name: str, otp: str) -> bool:
        subject = "SentriAI Password Reset Code"
        plain_text = (
            "SentriAI\n"
            "Your Intelligent Digital Security Companion\n\n"
            "Your Password Reset Code\n\n"
            "We received a request to reset your password for your SentriAI account.\n\n"
            "Your reset verification code is:\n\n"
            f"{otp}\n\n"
            "This code will expire in 5 minutes.\n\n"
            "For your security, never share this code with anyone.\n\n"
            "If you did not request a password reset, you can safely ignore this email.\n"
        )
        html_body = self._get_password_reset_html(full_name, otp)
        return self.send_email(to_email, subject, plain_text, html_body)

email_service = EmailService()
