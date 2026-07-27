from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Depends,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import uuid


# ============================================================
# AUTHENTICATION
# ============================================================

from app.auth import (
    users,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)


# ============================================================
# PROJECT MODULES
# ============================================================

from app.pdf_processor import (
    extract_text_from_pdf,
    clean_text
)

from app.chunking import split_text

from app.vector_store import (
    create_vector_store,
    search_vector_store,
    get_all_chunks,
    get_all_documents,
    get_document,
    set_current_document,
    get_current_document,
    delete_document
)

from app.ai_service import (
    answer_question,
    summarize_text,
    generate_quiz,
    generate_flashcards
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Study Assistant API",
    version="2.0.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
]


frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    origins.append(
        frontend_url.rstrip("/")
    )


origins = list(
    set(origins)
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# AUTHENTICATION REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ============================================================
# REQUEST MODELS
# ============================================================

class ChatRequest(BaseModel):
    question: str
    document_id: str | None = None


class DocumentRequest(BaseModel):
    document_id: str


# ============================================================
# TEMPORARY TEXT STORAGE
# ============================================================

uploaded_texts = {}


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "AI Study Assistant Backend Running",
        "version": "2.0.0"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "success",
        "message": "Backend is healthy"
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(request: RegisterRequest):

    if request.username in users:

        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    users[request.username] = hash_password(
        request.password
    )

    return {
        "message": "User registered successfully"
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login(request: LoginRequest):

    if request.username not in users:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        request.password,
        users[request.username]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token(
        request.username
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# ============================================================
# UPLOAD PDF
# ============================================================
# ============================================================
# UPLOAD PDF
# ============================================================

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Check filename
    # --------------------------------------------------------

    if not file.filename:

        return {
            "error": "No filename provided."
        }

    # --------------------------------------------------------
    # Check PDF
    # --------------------------------------------------------

    if not file.filename.lower().endswith(".pdf"):

        return {
            "error": "Only PDF files are allowed."
        }

    # --------------------------------------------------------
    # Create uploads directory
    # --------------------------------------------------------

    os.makedirs(
        "uploads",
        exist_ok=True
    )

    # --------------------------------------------------------
    # Generate unique document ID
    # --------------------------------------------------------

    document_id = str(
        uuid.uuid4()
    )

    # --------------------------------------------------------
    # Make safe filename
    # --------------------------------------------------------

    original_filename = file.filename

    safe_filename = os.path.basename(
        original_filename
    )

    # --------------------------------------------------------
    # Add document ID to filename
    # --------------------------------------------------------

    saved_filename = (
        f"{document_id}_{safe_filename}"
    )

    file_path = os.path.join(
        "uploads",
        saved_filename
    )

    # --------------------------------------------------------
    # Read uploaded file
    # --------------------------------------------------------

    file_content = await file.read()

    if not file_content:

        return {
            "error": "Uploaded file is empty."
        }

    # --------------------------------------------------------
    # Save PDF
    # --------------------------------------------------------

    with open(
        file_path,
        "wb"
    ) as f:

        f.write(file_content)

    # --------------------------------------------------------
    # Extract text
    # --------------------------------------------------------

    try:

        text = extract_text_from_pdf(
            file_path
        )

    except Exception as e:

        return {
            "error": "Failed to extract text from PDF.",
            "details": str(e)
        }

    # --------------------------------------------------------
    # Clean text
    # --------------------------------------------------------

    text = clean_text(
        text
    )

    if not text.strip():

        return {
            "error": "Could not extract readable text from this PDF."
        }

    # --------------------------------------------------------
    # Save complete text
    # --------------------------------------------------------

    uploaded_texts[
        document_id
    ] = text

    # --------------------------------------------------------
    # Split into chunks
    # --------------------------------------------------------

    chunks = split_text(
        text
    )

    if not chunks:

        return {
            "error": "Could not create chunks from this PDF."
        }

    # --------------------------------------------------------
    # Create FAISS vector store
    # --------------------------------------------------------

    total_chunks = create_vector_store(
        chunks,
        document_id=document_id,
        filename=safe_filename,
        owner=current_user
    )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "message": "PDF processed successfully",
        "document_id": document_id,
        "filename": safe_filename,
        "chunks_created": total_chunks,
        "text_length": len(text)
    }


# ============================================================
# GET ALL DOCUMENTS
# ============================================================

@app.get("/documents")
def documents(
    current_user: str = Depends(get_current_user)
):

    all_documents = get_all_documents(
        current_user
    )

    return {
        "documents": all_documents,
        "current_document_id": get_current_document(
            current_user
        )
    }


# ============================================================
# GET CURRENT DOCUMENT
# ============================================================

@app.get("/documents/current")
def current_document(
    current_user: str = Depends(get_current_user)
):

    current_id = get_current_document(
        current_user
    )

    if current_id is None:

        return {
            "document": None
        }

    document = get_document(
        current_id,
        current_user
    )

    if document is None:

        return {
            "document": None
        }

    return {
        "document": document
    }


# ============================================================
# SELECT DOCUMENT
# ============================================================

@app.post("/documents/select")
def select_document(
    request: DocumentRequest,
    current_user: str = Depends(get_current_user)
):

    success = set_current_document(
        request.document_id,
        current_user
    )

    if not success:

        return {
            "error": "Document not found."
        }

    document = get_document(
        request.document_id,
        current_user
    )

    if document is None:

        return {
            "error": "Document not found."
        }

    return {
        "message": "Document selected successfully.",
        "document": document
    }


# ============================================================
# DELETE DOCUMENT
# ============================================================

@app.delete("/documents/{document_id}")
def remove_document(
    document_id: str,
    current_user: str = Depends(get_current_user)
):

    document = get_document(
        document_id,
        current_user
    )

    if document is None:

        return {
            "error": "Document not found."
        }

    # --------------------------------------------------------
    # Remove from FAISS memory
    # --------------------------------------------------------

    success = delete_document(
        document_id,
        current_user
    )

    if not success:

        return {
            "error": "Could not delete document."
        }

    # --------------------------------------------------------
    # Remove text from memory
    # --------------------------------------------------------

    if document_id in uploaded_texts:

        del uploaded_texts[
            document_id
        ]

    # --------------------------------------------------------
    # Try to remove physical PDF
    # --------------------------------------------------------

    filename = document.get(
        "filename",
        ""
    )

    if filename:

        uploads_directory = "uploads"

        possible_filename = (
            f"{document_id}_{filename}"
        )

        file_path = os.path.join(
            uploads_directory,
            possible_filename
        )

        if os.path.exists(file_path):

            try:

                os.remove(
                    file_path
                )

            except Exception as e:

                print(
                    f"Could not delete file: {e}"
                )

    return {
        "message": "Document deleted successfully.",
        "document_id": document_id
    }


# ============================================================
# CHAT / RAG
# ============================================================
# ============================================================
# CHAT / RAG
# ============================================================

@app.post("/chat")
def chat(
    request: ChatRequest,
    current_user: str = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Validate question
    # --------------------------------------------------------

    if not request.question.strip():

        return {
            "answer": "Please enter a question."
        }

    # --------------------------------------------------------
    # Determine selected document
    # --------------------------------------------------------

    document_id = request.document_id

    if document_id is None:

        document_id = get_current_document(
            current_user
        )

    # --------------------------------------------------------
    # Check document
    # --------------------------------------------------------

    if document_id is None:

        return {
            "answer": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Search selected document
    # --------------------------------------------------------

    results = search_vector_store(
        query=request.question,
        k=5,
        document_id=document_id,
        owner=current_user
    )

    # --------------------------------------------------------
    # Check search results
    # --------------------------------------------------------

    if not results:

        return {
            "answer": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Build context
    # --------------------------------------------------------

    context_parts = []

    for result in results:

        context_parts.append(
            result["text"]
        )

    context = "\n\n---\n\n".join(
        context_parts
    )

    # --------------------------------------------------------
    # Ask AI
    # --------------------------------------------------------

    try:

        answer = answer_question(
            request.question,
            context
        )

    except Exception as e:

        return {
            "answer": "Failed to generate an answer.",
            "details": str(e)
        }

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "answer": answer,

        "document_id": document_id,

        "sources": [
            {
                "score": result["score"]
            }
            for result in results
        ]
    }


# ============================================================
# CONTROLLED CONTEXT
# ============================================================

def build_controlled_context(
    chunks,
    max_chunks=12
):
    """
    Select a limited number of chunks spread across
    the document.
    """

    if not chunks:

        return ""

    # --------------------------------------------------------
    # If document is already small, use everything
    # --------------------------------------------------------

    if len(chunks) <= max_chunks:

        selected_chunks = chunks

    else:

        # ----------------------------------------------------
        # Select chunks evenly throughout the document
        # ----------------------------------------------------

        step = (
            (len(chunks) - 1)
            / (max_chunks - 1)
        )

        indexes = [
            round(i * step)
            for i in range(max_chunks)
        ]

        selected_chunks = [
            chunks[index]
            for index in indexes
        ]

    return "\n\n".join(
        selected_chunks
    )


# ============================================================
# RETRIEVED CONTEXT
# ============================================================

def build_retrieved_context(
    queries,
    document_id,
    owner,
    max_chunks=12,
    k_each=5
):
    """
    Retrieve relevant chunks for multiple queries
    and combine them without duplicates.
    """

    selected_chunks = []

    seen = set()

    # --------------------------------------------------------
    # Search using each query
    # --------------------------------------------------------

    for query in queries:

        results = search_vector_store(
            query=query,
            k=k_each,
            document_id=document_id,
            owner=owner
        )

        for result in results:

            text = result["text"].strip()

            if not text:

                continue

            if text in seen:

                continue

            seen.add(text)

            selected_chunks.append(
                text
            )

            if len(selected_chunks) >= max_chunks:

                return "\n\n".join(
                    selected_chunks
                )

    return "\n\n".join(
        selected_chunks
    )


# ============================================================
# SUMMARY
# ============================================================

@app.post("/summarize")
def summarize(
    request: DocumentRequest | None = None,
    current_user: str = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Determine selected document
    # --------------------------------------------------------

    document_id = None

    if request is not None:

        document_id = request.document_id

    if document_id is None:

        document_id = get_current_document(
            current_user
        )

    # --------------------------------------------------------
    # Check document
    # --------------------------------------------------------

    if document_id is None:

        return {
            "error": "Please upload a PDF first."
        }

    # --------------------------------------------------------
    # Get chunks
    # --------------------------------------------------------

    chunks = get_all_chunks(
        document_id,
        current_user
    )

    if not chunks:

        return {
            "error": "Document chunks are not available."
        }

    # --------------------------------------------------------
    # Build retrieved context
    # --------------------------------------------------------

    context = build_retrieved_context(
        queries=[
            "main topics and important concepts",
            "key facts and important information",
            "definitions and explanations",
            "important conclusions and findings"
        ],
        document_id=document_id,
        owner=current_user,
        max_chunks=15,
        k_each=5
    )

    # --------------------------------------------------------
    # Check context
    # --------------------------------------------------------

    if not context.strip():

        return {
            "error": "Could not retrieve relevant content from the document."
        }

    # --------------------------------------------------------
    # Generate summary
    # --------------------------------------------------------

    try:

        summary = summarize_text(
            context
        )

        return {
            "summary": summary,
            "document_id": document_id
        }

    except Exception as e:

        return {
            "error": "Failed to generate summary.",
            "details": str(e)
        }


# ============================================================
# QUIZ
# ============================================================

# ============================================================
# QUIZ
# ============================================================

@app.post("/quiz")
def quiz(
    request: DocumentRequest | None = None,
    current_user: str = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Determine selected document
    # --------------------------------------------------------

    document_id = None

    if request is not None:

        document_id = request.document_id

    if document_id is None:

        document_id = get_current_document(
            current_user
        )

    # --------------------------------------------------------
    # Check document
    # --------------------------------------------------------

    if document_id is None:

        return {
            "error": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Get chunks
    # --------------------------------------------------------

    chunks = get_all_chunks(
        document_id,
        current_user
    )

    if not chunks:

        return {
            "error": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Build retrieved context
    # --------------------------------------------------------

    context = build_retrieved_context(
        queries=[
            "important concepts that can be tested",
            "key facts and definitions",
            "important principles and explanations",
            "important examples and applications"
        ],
        document_id=document_id,
        owner=current_user,
        max_chunks=10,
        k_each=5
    )

    # --------------------------------------------------------
    # Check context
    # --------------------------------------------------------

    if not context.strip():

        return {
            "error": "Could not retrieve relevant content from the document."
        }

    # --------------------------------------------------------
    # Generate quiz
    # --------------------------------------------------------

    try:

        quiz_data = generate_quiz(
            context
        )

        return {
            "quiz": quiz_data,
            "document_id": document_id
        }

    except Exception as e:

        return {
            "error": "Failed to generate quiz.",
            "details": str(e)
        }


# ============================================================
# FLASHCARDS
# ============================================================

@app.post("/flashcards")
def flashcards(
    request: DocumentRequest | None = None,
    current_user: str = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Determine selected document
    # --------------------------------------------------------

    document_id = None

    if request is not None:

        document_id = request.document_id

    if document_id is None:

        document_id = get_current_document(
            current_user
        )

    # --------------------------------------------------------
    # Check document
    # --------------------------------------------------------

    if document_id is None:

        return {
            "error": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Get chunks
    # --------------------------------------------------------

    chunks = get_all_chunks(
        document_id,
        current_user
    )

    if not chunks:

        return {
            "error": "Please upload and select a PDF first."
        }

    # --------------------------------------------------------
    # Build retrieved context
    # --------------------------------------------------------

    context = build_retrieved_context(
        queries=[
            "important concepts and definitions",
            "key facts to remember",
            "important terms and explanations",
            "important formulas principles and facts"
        ],
        document_id=document_id,
        owner=current_user,
        max_chunks=10,
        k_each=5
    )

    # --------------------------------------------------------
    # Check context
    # --------------------------------------------------------

    if not context.strip():

        return {
            "error": "Could not retrieve relevant content from the document."
        }

    # --------------------------------------------------------
    # Generate flashcards
    # --------------------------------------------------------

    try:

        flashcard_data = generate_flashcards(
            context
        )

        return {
            "flashcards": flashcard_data,
            "document_id": document_id
        }

    except Exception as e:

        return {
            "error": "Failed to generate flashcards.",
            "details": str(e)
        }