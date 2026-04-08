import os
from dotenv import load_dotenv

load_dotenv()

# Safe optional import
try:
    from groq import Groq
    GROQ_PACKAGE_AVAILABLE = True
except Exception:
    GROQ_PACKAGE_AVAILABLE = False


class GroqService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GroqService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = None
        self.model_name = "llama-3.3-70b-versatile"

        if not GROQ_PACKAGE_AVAILABLE:
            print("Groq package not installed. Running without Groq.")
            self._initialized = True
            return

        if not self.api_key:
            print("Groq API key not found. Running without Groq.")
            self._initialized = True
            return

        try:
            self.client = Groq(api_key=self.api_key)
            print("Groq initialized successfully.")
        except Exception as e:
            print(f"Groq Init Error: {e}")
            self.client = None
        self._initialized = True

    # -----------------------------------------------------
    # Availability
    # -----------------------------------------------------

    def is_available(self):
        return self.client is not None

    # -----------------------------------------------------
    # Safe LLM Call
    # -----------------------------------------------------

    def generate_content(self, prompt):
        if not self.is_available():
            return None

        try:
            completion = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=600,
                timeout=10
            )

            return completion.choices[0].message.content.strip()

        except Exception as e:
            print(f"Groq API Error: {e}")
            return None