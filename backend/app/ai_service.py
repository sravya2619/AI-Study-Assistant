import json
import re
import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_NAME = "llama-3.1-8b-instant"


# ============================================================
# MODEL CONFIGURATION
# ============================================================


# Maximum characters sent to the model for normal requests.
# Keeping this controlled improves response speed.
MAX_CONTEXT_CHARS = 12000

# Summary uses smaller sections so large PDFs can be handled.
SUMMARY_CHUNK_SIZE = 6000

# Maximum number of sections used for a large summary.
MAX_SUMMARY_CHUNKS = 8


# ============================================================
# BASIC OLLAMA REQUEST
# ============================================================

def ask_llama(
    prompt,
    temperature=0.2,
    num_predict=1000
):
    """
    Send a prompt to Groq.
    """

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=temperature,
        max_tokens=num_predict,
    )

    return response.choices[0].message.content.strip()


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):
    """
    Remove unnecessary whitespace from text.
    """

    if not text:
        return ""

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# LIMIT CONTEXT
# ============================================================

def limit_context(
    text,
    max_chars=MAX_CONTEXT_CHARS
):
    """
    Keep prompts within a reasonable size.
    """

    text = clean_text(text)

    if len(text) <= max_chars:
        return text

    return text[:max_chars]


# ============================================================
# SPLIT TEXT FOR SUMMARY
# ============================================================

def split_for_summary(
    text,
    chunk_size=SUMMARY_CHUNK_SIZE
):
    """
    Split large study material into manageable sections.
    """

    text = clean_text(text)

    if not text:
        return []

    chunks = []

    for start in range(
        0,
        len(text),
        chunk_size
    ):

        chunk = text[
            start:start + chunk_size
        ]

        if chunk.strip():
            chunks.append(
                chunk.strip()
            )

    return chunks


# ============================================================
# SUMMARY
# ============================================================

def summarize_text(text):

    text = clean_text(text)

    if not text:
        return "No study material was provided."

    # --------------------------------------------------------
    # SMALL DOCUMENT
    # --------------------------------------------------------

    if len(text) <= MAX_CONTEXT_CHARS:

        prompt = f"""
You are an expert AI Study Assistant.

Summarize the following study material for a college student.

Return the summary using exactly these sections:

1. Key Points
2. Important Concepts
3. Simple Explanation
4. Exam Revision Points

Keep the explanation clear, concise and easy to revise.

Do not add information that is not present in the study material.

STUDY MATERIAL:

{text}

SUMMARY:
"""

        return ask_llama(
            prompt,
            temperature=0.2,
            num_predict=1200
        )


    # --------------------------------------------------------
    # LARGE DOCUMENT
    # --------------------------------------------------------

    chunks = split_for_summary(
        text
    )

    # Avoid processing hundreds of sections.
    # Use representative sections from the document.

    if len(chunks) > MAX_SUMMARY_CHUNKS:

        step = max(
            1,
            len(chunks) //
            MAX_SUMMARY_CHUNKS
        )

        selected_chunks = [
            chunks[i]
            for i in range(
                0,
                len(chunks),
                step
            )
        ][:MAX_SUMMARY_CHUNKS]

    else:

        selected_chunks = chunks


    partial_summaries = []


    # --------------------------------------------------------
    # SUMMARIZE EACH SECTION
    # --------------------------------------------------------

    for number, chunk in enumerate(
        selected_chunks,
        start=1
    ):

        prompt = f"""
You are an expert college study assistant.

Summarize this section of study material.

Extract only:
- Key concepts
- Important definitions
- Important facts
- Important formulas if present
- Exam-relevant points

Do not add outside information.

SECTION {number}:

{chunk}

SECTION SUMMARY:
"""

        try:

            result = ask_llama(
                prompt,
                temperature=0.2,
                num_predict=600
            )

            if result:
                partial_summaries.append(
                    result
                )

        except Exception as e:

            print(
                f"Summary section {number} failed: {e}"
            )


    if not partial_summaries:

        return "Unable to generate summary."


    combined = "\n\n".join(
        partial_summaries
    )

    combined = limit_context(
        combined,
        14000
    )


    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    final_prompt = f"""
You are an expert AI Study Assistant.

Create a final study summary from the section summaries below.

Use exactly these sections:

1. Key Points
2. Important Concepts
3. Simple Explanation
4. Exam Revision Points

Remove repetition.

Keep the answer concise, clear and useful for a college student.

Do not introduce information that is not present in the supplied summaries.

SECTION SUMMARIES:

{combined}

FINAL SUMMARY:
"""

    return ask_llama(
        final_prompt,
        temperature=0.2,
        num_predict=1200
    )


# ============================================================
# CHAT / QUESTION ANSWERING
# ============================================================

def answer_question(
    question,
    context
):

    context = limit_context(
        context,
        10000
    )

    prompt = f"""
You are an AI Study Assistant.

Answer the student's question ONLY using the study material
provided below.

IMPORTANT RULES:

1. Do not use outside knowledge.
2. Do not invent information.
3. If the answer is not available in the study material,
   say exactly:

"The uploaded notes do not contain that information."

4. Explain the answer in simple student-friendly language.
5. Use short points when useful.
6. Stay focused on the student's question.

STUDY MATERIAL:

{context}

STUDENT QUESTION:

{question}

ANSWER:
"""

    return ask_llama(
        prompt,
        temperature=0.1,
        num_predict=800
    )


# ============================================================
# QUIZ
# ============================================================

def generate_quiz(context):

    context = limit_context(
        context,
        12000
    )

    prompt = f"""
You are an expert college teacher.

Using ONLY the study material below, generate exactly
5 multiple-choice questions.

Return ONLY a JSON array.

Required format:

[
  {{
    "question": "Question",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": 0,
    "explanation": "Short explanation"
  }}
]

Rules:

- Exactly 5 questions.
- Exactly 4 options per question.
- "answer" must be an integer:
  0, 1, 2 or 3.
- Questions must be based only on the study material.
- Do not invent information.
- Each question must have one clearly correct answer.
- Keep explanations short.
- No markdown.
- No text before or after the JSON.

STUDY MATERIAL:

{context}
"""

    response = ask_llama(
        prompt,
        temperature=0.1,
        num_predict=1600
    )

    data = parse_json_response(
        response
    )

    return validate_quiz(
        data
    )


# ============================================================
# VALIDATE QUIZ
# ============================================================

def validate_quiz(data):

    if not isinstance(
        data,
        list
    ):
        raise ValueError(
            "AI quiz response is not a JSON array."
        )


    cleaned = []


    for item in data:

        if not isinstance(
            item,
            dict
        ):
            continue


        question = str(
            item.get(
                "question",
                ""
            )
        ).strip()


        options = item.get(
            "options",
            []
        )


        answer = item.get(
            "answer",
            None
        )


        explanation = str(
            item.get(
                "explanation",
                ""
            )
        ).strip()


        if not question:
            continue


        if not isinstance(
            options,
            list
        ):
            continue


        if len(options) != 4:
            continue


        try:

            answer = int(
                answer
            )

        except (
            TypeError,
            ValueError
        ):

            continue


        if answer not in [
            0,
            1,
            2,
            3
        ]:
            continue


        cleaned.append({

            "question":
                question,

            "options": [
                str(option)
                for option in options
            ],

            "answer":
                answer,

            "explanation":
                explanation

        })


    if not cleaned:

        raise ValueError(
            "No valid quiz questions were returned."
        )


    # Keep maximum 5 questions

    return cleaned[:5]


# ============================================================
# FLASHCARDS
# ============================================================

def generate_flashcards(context):

    context = limit_context(
        context,
        12000
    )

    prompt = f"""
You are an expert college study assistant.

Using ONLY the study material below, create exactly
10 useful flashcards.

Return ONLY a JSON array.

Required format:

[
  {{
    "question": "Question",
    "answer": "Answer"
  }}
]

Rules:

- Exactly 10 flashcards.
- Questions must be based only on the study material.
- Answers should be short but useful.
- Focus on important concepts, definitions and facts.
- Do not invent information.
- No markdown.
- No text before or after the JSON.

STUDY MATERIAL:

{context}
"""

    response = ask_llama(
        prompt,
        temperature=0.1,
        num_predict=1600
    )

    data = parse_json_response(
        response
    )

    return validate_flashcards(
        data
    )


# ============================================================
# VALIDATE FLASHCARDS
# ============================================================

def validate_flashcards(data):

    if not isinstance(
        data,
        list
    ):
        raise ValueError(
            "AI flashcard response is not a JSON array."
        )


    cleaned = []


    for item in data:

        if not isinstance(
            item,
            dict
        ):
            continue


        question = (
            item.get("question")
            or item.get("front")
            or item.get("term")
            or ""
        )


        answer = (
            item.get("answer")
            or item.get("back")
            or item.get("definition")
            or ""
        )


        question = str(
            question
        ).strip()


        answer = str(
            answer
        ).strip()


        if not question or not answer:
            continue


        cleaned.append({

            "question":
                question,

            "answer":
                answer

        })


    if not cleaned:

        raise ValueError(
            "No valid flashcards were returned."
        )


    # Keep maximum 10

    return cleaned[:10]


# ============================================================
# JSON PARSER
# ============================================================

def parse_json_response(
    response
):

    if not response:
        raise ValueError(
            "AI returned an empty response."
        )


    response = response.strip()


    # --------------------------------------------------------
    # Remove markdown code blocks
    # --------------------------------------------------------

    response = re.sub(
        r"^```json\s*",
        "",
        response,
        flags=re.IGNORECASE
    )

    response = re.sub(
        r"^```\s*",
        "",
        response
    )

    response = re.sub(
        r"\s*```$",
        "",
        response
    )

    response = response.strip()


    # --------------------------------------------------------
    # Direct JSON parsing
    # --------------------------------------------------------

    try:

        return json.loads(
            response
        )

    except json.JSONDecodeError:
        pass


    # --------------------------------------------------------
    # Find JSON array
    # --------------------------------------------------------

    start = response.find(
        "["
    )

    end = response.rfind(
        "]"
    )


    if (
        start != -1
        and end != -1
        and end > start
    ):

        possible_json = response[
            start:end + 1
        ]

        try:

            return json.loads(
                possible_json
            )

        except json.JSONDecodeError:
            pass


    # --------------------------------------------------------
    # Find JSON object
    # --------------------------------------------------------

    start = response.find(
        "{"
    )

    end = response.rfind(
        "}"
    )


    if (
        start != -1
        and end != -1
        and end > start
    ):

        possible_json = response[
            start:end + 1
        ]

        try:

            return json.loads(
                possible_json
            )

        except json.JSONDecodeError:
            pass


    raise ValueError(
        "AI returned invalid JSON."
    )