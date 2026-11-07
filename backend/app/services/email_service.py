"""Brevo SMTP Email Service for PennyPilot.

Handles transactional email dispatch via Brevo SMTP relay (smtp-relay.brevo.com:587)
with STARTTLS, multipart HTML/plain-text templates, partial email masking,
and zero-crash resilient error handling.
"""
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
import smtplib
from typing import Optional
from app.core.config import settings
from app.core.logging import logger


def mask_email(email: str) -> str:
    """Mask email address for privacy display (e.g., 'j***m@gmail.com')."""
    if not email or "@" not in email:
        return "***"
    local_part, domain = email.split("@", 1)
    if len(local_part) <= 2:
        masked_local = local_part[0] + "***"
    else:
        masked_local = local_part[0] + "***" + local_part[-1]
    return f"{masked_local}@{domain}"


def is_smtp_configured() -> bool:
    """Check whether real SMTP credentials are fully configured in the environment."""
    username = (settings.SMTP_USERNAME or "").strip()
    password = (settings.SMTP_PASSWORD or "").strip()
    if not username or not password:
        return False
    # Guard against accidental placeholder values from template/example files
    placeholders = ["your_brevo", "example.com", "your_smtp", "master_key_here", "changeme", "<your"]
    if any(p in username.lower() for p in placeholders) or any(p in password.lower() for p in placeholders):
        return False
    return True


def send_email_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str,
) -> bool:
    """
    Dispatch an email via Brevo SMTP relay.
    Uses STARTTLS on port 587.
    Strictly refuses to operate silently in dry-run mode in production.
    In development mode with missing credentials, returns False and logs clear dry-run diagnostic.
    """
    is_production = settings.ENVIRONMENT.lower() == "production"

    if not is_smtp_configured():
        if is_production:
            logger.critical(
                f"[SMTP CONFIG ERROR] In production, SMTP_USERNAME and SMTP_PASSWORD must be configured. "
                f"Cannot deliver '{subject}' to {mask_email(to_email)}."
            )
            return False
        logger.warning(
            f"[SMTP DRY-RUN] Development mode: SMTP credentials are not configured in environment. "
            f"Email '{subject}' to {mask_email(to_email)} was NOT sent to inbox."
        )
        return False

    msg = MIMEMultipart("alternative")
    msg_id = make_msgid(domain="pennypilot.in")
    msg["Message-ID"] = msg_id
    msg["Date"] = formatdate(localtime=True)
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Reply-To"] = settings.SMTP_FROM_EMAIL

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            logger.info(f"[SMTP SUCCESS] Dispatched '{subject}' ({msg_id}) to {mask_email(to_email)}")
            return True
    except smtplib.SMTPAuthenticationError as e:
        err_msg = str(e)
        if "525" in err_msg or "Unauthorized IP" in err_msg:
            logger.error(
                f"[BREVO IP RESTRICTION] Brevo rejected connection with 525 Unauthorized IP address. "
                f"Action required: Authorize outbound IP in Brevo Dashboard (Settings -> Security -> Authorized IPs) "
                f"or deactivate unauthorized IP blocking."
            )
        else:
            logger.error(f"[SMTP AUTH ERROR] Brevo rejected SMTP credentials: {type(e).__name__}")
        return False
    except Exception as e:
        logger.error(f"[SMTP ERROR] Failed to send email to {mask_email(to_email)}: {type(e).__name__}")
        return False


def build_verification_email_html(recipient_name: str, verification_url: str) -> str:
    """Quiet Ledger styled HTML template for email verification."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your PennyPilot account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F5F0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F766E; padding: 24px 32px; text-align: left;">
              <span style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">PennyPilot</span>
              <span style="font-size: 11px; color: #99F6E4; margin-left: 8px; text-transform: uppercase; letter-spacing: 1px;">Quiet Ledger</span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0F172A;">Verify your email address</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Hello {recipient_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Thank you for joining PennyPilot. To activate your account and start managing your financial ledger with zero hallucination, please verify your email address by clicking the button below:
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0F766E; border-radius: 8px;">
                    <a href="{verification_url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px;">
                      Verify Email Address &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                This link is single-use and will expire in <strong>30 minutes</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.5; color: #64748B; word-break: break-all;">
                Or paste this link into your browser:<br>
                <a href="{verification_url}" style="color: #0F766E; text-decoration: underline;">{verification_url}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94A3B8;">
                If you did not register for a PennyPilot account, no action is needed. You can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                &copy; 2026 PennyPilot &bull; Strict $0 Budget &bull; Integer-Paise Precision
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_verification_email_text(recipient_name: str, verification_url: str) -> str:
    """Plain text template for email verification."""
    return f"""Hello {recipient_name},

Thank you for joining PennyPilot. Please verify your email address to activate your account.

Click the link below or copy and paste it into your browser:
{verification_url}

This link is single-use and will expire in 30 minutes.

If you did not create a PennyPilot account, you can safely ignore this email.

— PennyPilot Engineering Team
"""


def build_password_reset_email_html(recipient_name: str, reset_url: str) -> str:
    """Quiet Ledger styled HTML template for password reset."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your PennyPilot password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F5F0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="background-color: #0F766E; padding: 24px 32px; text-align: left;">
              <span style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">PennyPilot</span>
              <span style="font-size: 11px; color: #99F6E4; margin-left: 8px; text-transform: uppercase; letter-spacing: 1px;">Security</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0F172A;">Reset your password</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Hello {recipient_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                We received a request to reset your PennyPilot password. Click the button below to choose a new password:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0F766E; border-radius: 8px;">
                    <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                This link is single-use and will expire in <strong>15 minutes</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 1.5; color: #64748B; word-break: break-all;">
                Or paste this link into your browser:<br>
                <a href="{reset_url}" style="color: #0F766E; text-decoration: underline;">{reset_url}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94A3B8;">
                If you did not request a password reset, please ignore this email or review your account security. Your current password remains safe.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                &copy; 2026 PennyPilot &bull; Strict $0 Budget &bull; Integer-Paise Precision
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_password_reset_email_text(recipient_name: str, reset_url: str) -> str:
    """Plain text template for password reset."""
    return f"""Hello {recipient_name},

We received a request to reset your PennyPilot password.

Click the link below or copy and paste it into your browser to choose a new password:
{reset_url}

This link is single-use and will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.

— PennyPilot Engineering Team
"""


def send_verification_email(to_email: str, recipient_name: str, verification_url: str) -> bool:
    """Build and dispatch verification email."""
    subject = "Verify your PennyPilot account"
    html = build_verification_email_html(recipient_name, verification_url)
    text = build_verification_email_text(recipient_name, verification_url)
    return send_email_smtp(to_email, subject, html, text)


def send_password_reset_email(to_email: str, recipient_name: str, reset_url: str) -> bool:
    """Build and dispatch password reset email."""
    subject = "Reset your PennyPilot password"
    html = build_password_reset_email_html(recipient_name, reset_url)
    text = build_password_reset_email_text(recipient_name, reset_url)
    return send_email_smtp(to_email, subject, html, text)
