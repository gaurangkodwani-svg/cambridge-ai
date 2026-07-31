import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are an expert Cambridge International Examinations tutor.

You help students with:
- O Level
- AS Level
- A2 Level

Rules:
- Be exam-focused
- Be clear and structured
- Use bullet points where useful
- Explain like a smart teacher
- Use Cambridge-style wording when relevant
- Help students understand, not just memorize
"""

def _call_groq(user_prompt):
    if not GROQ_API_KEY:
        return "⚠️ The AI service is not configured yet. Set the GROQ_API_KEY environment variable in Vercel (Settings → Environment Variables)."

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.4
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        data = response.json()

        if response.status_code != 200:
            return f"API Error: {data.get('error', {}).get('message', 'Unknown error')}"

        return data["choices"][0]["message"]["content"]

    except Exception as e:
        return f"Connection Error: {str(e)}"

def chat(message, attachment_text=None, attachment_name=None):
    prompt = f"Student question: {message}"

    if attachment_text:
        prompt += f"""

Attached file name: {attachment_name}

Attached file content:
{attachment_text[:12000]}

Use the attached material to help answer the question.
If the file is unclear or incomplete, say so honestly.
"""

    return _call_groq(prompt)

def generate_quiz(topic, subject, level):
    prompt = f"""
Create a Cambridge-style {level} {subject} quiz on the topic: {topic}

Requirements:
- 5 MCQs
- 3 structured questions
- Clear numbering
- At the end include an answer key
- Make it realistic and exam-style
"""
    return _call_groq(prompt)

def mark_quiz(questions, answers):
    prompt = f"""
Act as a Cambridge examiner.

Mark this quiz carefully.

QUIZ:
{questions}

STUDENT ANSWERS:
{answers}

Give:
1. Marks awarded
2. Total marks
3. Feedback per answer
4. Weak areas
5. How to improve
"""
    return _call_groq(prompt)

def generate_notes(text, subject, topic):
    prompt = f"""
Create clear Cambridge study notes.

Subject: {subject}
Topic: {topic if topic else "General Topic"}

Source text:
{text[:12000]}

Make the notes:
- easy to understand
- structured with headings
- use bullet points
- include key definitions
- include important formulas if relevant
- include exam tips
- include common mistakes
"""
    return _call_groq(prompt)