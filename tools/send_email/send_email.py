import smtplib
import ssl
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import yaml
import os
import sys


def load_config():
    """Load SMTP config from .bmad-core/core-config.yaml"""
    config_path = os.path.join(os.path.dirname(__file__), "..", ".bmad-core", "core-config.yaml")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def send_email(recipient, subject, body, retries=3):
    """Send email with retry policy"""
    config = load_config()

    smtp_server = config["smtp"]["host"]
    smtp_port = config["smtp"].get("port", 587)
    smtp_user = config["smtp"]["user"]
    smtp_password = config["smtp"]["password"]

    message = MIMEMultipart()
    message["From"] = smtp_user
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    context = ssl.create_default_context()

    for attempt in range(1, retries + 1):
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls(context=context)
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipient, message.as_string())
            print(f"[SUCCESS] Email sent to {recipient}")
            return True
        except Exception as e:
            print(f"[ERROR] Attempt {attempt}: Failed to send email to {recipient}. Error: {e}")
            if attempt < retries:
                sleep_time = 2 ** attempt
                print(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                print(f"[FAILURE] Could not send email to {recipient} after {retries} attempts.")
                return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python send_email.py <recipient> <subject> <body>")
        sys.exit(1)

    recipient = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]

    send_email(recipient, subject, body)

