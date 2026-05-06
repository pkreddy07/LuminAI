import smtplib
import random
import os
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def generate_otp() -> str:
    """Generates a random 6-digit string."""
    return str(random.randint(100000, 999999))

def send_otp_email(receiver_email: str, otp_code: str):
    """Sends the OTP via Gmail's SMTP server."""
    sender_email = os.getenv("SMTP_EMAIL")
    password = os.getenv("SMTP_PASSWORD")

    if not sender_email or not password:
        raise ValueError("SMTP credentials are not configured in .env")

    # Format the email
    msg = MIMEText(f"Hello,\n\nYour secure verification code for the Lumin AI Interview is: {otp_code}\n\nThis code will expire in 5 minutes.\n\nGood luck!")
    msg['Subject'] = 'Your Interview Verification Code'
    msg['From'] = sender_email
    msg['To'] = receiver_email

    # Connect to Gmail and send
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls() # Secure the connection
        server.login(sender_email, password)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")