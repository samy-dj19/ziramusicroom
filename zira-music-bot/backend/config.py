from dotenv import load_dotenv
import os

# Load .env variables
load_dotenv()

# Required settings with proper type handling
API_ID = int(os.getenv("API_ID", "0"))
API_HASH = os.getenv("API_HASH", "")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
OWNER_ID = int(os.getenv("OWNER_ID", "0"))

# Optional settings with defaults
BOT_NAME = os.getenv("BOT_NAME", "Zira Music Bot")
BOT_USERNAME = os.getenv("BOT_USERNAME", "")
SUPPORT_GROUP = os.getenv("SUPPORT_GROUP", "")
UPDATES_CHANNEL = os.getenv("UPDATES_CHANNEL", "")

API_KEY = os.getenv('API_KEY') 

# --- Admin/Reporting ---
# Set your admin group chat ID here (as an integer, e.g. -1001234567890)
ADMIN_GROUP_ID = 4823177816
# List of admin user IDs (comma-separated in .env, or hardcode as list)
ADMINS = [int(x) for x in os.getenv("ADMINS", "").split(",") if x.strip().isdigit()] 