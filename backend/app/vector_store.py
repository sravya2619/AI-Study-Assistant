from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


# ============================================================
# DOCUMENT STORAGE
# ============================================================

# Structure:
#
# document_stores = {
#     "user1": {
#         "document_id_1": {
#             "vectorizer": ...,
#             "matrix": ...,
#             "chunks": [...],
#             "filename": "...",
#             "created_at": "...",
#             "chunk_count": ...
#         }
#     }
# }

document_stores = {}

# Currently selected document for each user
current_document_ids = {}


# ============================================================
# GET USER STORE
# ============================================================

def get_user_store(owner):

    if not owner:
        return None

    if owner not in document_stores:
        document_stores[owner] = {}

    return document_stores[owner]


# ============================================================
# CREATE VECTOR STORE
# ============================================================

def create_vector_store(
    chunks,
    document_id=None,
    filename="study_notes.pdf",
    owner=None
):

    if not owner:
        return 0

    if not chunks:
        return 0

    # --------------------------------------------------------
    # Clean chunks
    # --------------------------------------------------------

    cleaned_chunks = [
        chunk.strip()
        for chunk in chunks
        if chunk and chunk.strip()
    ]

    if not cleaned_chunks:
        return 0

    # --------------------------------------------------------
    # Generate document ID
    # --------------------------------------------------------

    if document_id is None:

        user_store = get_user_store(owner)

        document_id = (
            f"document_{len(user_store) + 1}"
        )

    # --------------------------------------------------------
    # Create TF-IDF vectorizer
    # --------------------------------------------------------

    print(
        f"Creating TF-IDF vectors for "
        f"{len(cleaned_chunks)} chunks..."
    )

    vectorizer = TfidfVectorizer(
    max_features=5000,
    stop_words="english",
    ngram_range=(1, 2),
    sublinear_tf=True,
    dtype=np.float32
)
    # --------------------------------------------------------
    # Convert chunks into sparse TF-IDF matrix
    # --------------------------------------------------------

    matrix = vectorizer.fit_transform(
        cleaned_chunks
    )

    # --------------------------------------------------------
    # Save document
    # --------------------------------------------------------

    user_store = get_user_store(owner)

    user_store[document_id] = {

        "vectorizer": vectorizer,

        "matrix": matrix,

        "chunks": cleaned_chunks,

        "filename": filename,

        "created_at":
            datetime.now().isoformat(),

        "chunk_count":
            len(cleaned_chunks)
    }

    # Automatically select newly uploaded document

    current_document_ids[owner] = document_id

    print(
        "TF-IDF vector store created successfully."
    )

    print(
        f"Owner: {owner}"
    )

    print(
        f"Document ID: {document_id}"
    )

    print(
        f"Chunks: {len(cleaned_chunks)}"
    )

    print(
        f"Vocabulary size: "
        f"{len(vectorizer.vocabulary_)}"
    )

    return len(cleaned_chunks)


# ============================================================
# SEARCH VECTOR STORE
# ============================================================

def search_vector_store(
    query,
    k=5,
    document_id=None,
    owner=None
):

    if not owner:
        return []

    if not query or not query.strip():
        return []

    # --------------------------------------------------------
    # Get user's documents
    # --------------------------------------------------------

    user_store = get_user_store(owner)

    if not user_store:
        return []

    # --------------------------------------------------------
    # Use selected document
    # --------------------------------------------------------

    if document_id is None:

        document_id = current_document_ids.get(
            owner
        )

    if document_id is None:
        return []

    # --------------------------------------------------------
    # Get document
    # --------------------------------------------------------

    store = user_store.get(
        document_id
    )

    if store is None:
        return []

    vectorizer = store["vectorizer"]
    matrix = store["matrix"]
    chunks = store["chunks"]

    if matrix is None or not chunks:
        return []

    # --------------------------------------------------------
    # Limit k
    # --------------------------------------------------------

    k = min(
        k,
        len(chunks)
    )

    # --------------------------------------------------------
    # Convert query into TF-IDF
    # --------------------------------------------------------

    query_vector = vectorizer.transform(
        [query.strip()]
    )

        # --------------------------------------------------------
    # Calculate similarity
    # --------------------------------------------------------

    # TF-IDF vectors are L2-normalized by default,
    # so dot product gives cosine similarity.

    scores = (
        query_vector @ matrix.T
    ).toarray().ravel()


    # --------------------------------------------------------
    # Get highest scoring chunks
    # --------------------------------------------------------

    if len(scores) > k:

        top_indices = np.argpartition(
            scores,
            -k
        )[-k:]

        top_indices = top_indices[
            np.argsort(
                scores[top_indices]
            )[::-1]
        ]

    else:

        top_indices = np.argsort(
            scores
        )[::-1]


    # --------------------------------------------------------
    # Build results
    # --------------------------------------------------------

    results = []

    for index in top_indices:

        score = float(
            scores[index]
        )

        # Ignore completely unrelated chunks

        if score <= 0:
            continue

        results.append({

            "text":
                chunks[index],

            "score":
                score
        })


    return results

def get_all_documents(
    owner=None
):

    if not owner:
        return []

    user_store = get_user_store(
        owner
    )

    if not user_store:
        return []

    documents = []

    for document_id, store in user_store.items():

        documents.append({

            "document_id":
                document_id,

            "filename":
                store["filename"],

            "created_at":
                store["created_at"],

            "chunk_count":
                store["chunk_count"]
        })

    # Newest first

    documents.reverse()

    return documents


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

def get_document(
    document_id,
    owner=None
):

    if not owner:
        return None

    user_store = get_user_store(
        owner
    )

    if not user_store:
        return None

    store = user_store.get(
        document_id
    )

    if store is None:
        return None

    return {

        "document_id":
            document_id,

        "filename":
            store["filename"],

        "created_at":
            store["created_at"],

        "chunk_count":
            store["chunk_count"]
    }


# ============================================================
# SET CURRENT DOCUMENT
# ============================================================

def set_current_document(
    document_id,
    owner=None
):

    if not owner:
        return False

    user_store = get_user_store(
        owner
    )

    if document_id not in user_store:
        return False

    current_document_ids[owner] = document_id

    print(
        f"Current document changed to: "
        f"{document_id}"
    )

    return True


# ============================================================
# GET CURRENT DOCUMENT
# ============================================================

def get_current_document(
    owner=None
):

    if not owner:
        return None

    return current_document_ids.get(
        owner
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

def delete_document(
    document_id,
    owner=None
):

    if not owner:
        return False

    user_store = get_user_store(
        owner
    )

    if document_id not in user_store:
        return False

    # Delete document

    del user_store[
        document_id
    ]

    # --------------------------------------------------------
    # If deleted document was selected
    # --------------------------------------------------------

    if current_document_ids.get(owner) == document_id:

        current_document_ids[owner] = None

        if user_store:

            current_document_ids[owner] = next(
                iter(user_store)
            )

    print(
        f"Deleted document: {document_id}"
    )

    return True


# ============================================================
# CLEAR USER VECTOR STORE
# ============================================================

def clear_vector_store(
    owner=None
):

    if not owner:
        return

    document_stores.pop(
        owner,
        None
    )

    current_document_ids.pop(
        owner,
        None
    )

    print(
        f"Vector stores cleared for: {owner}"
    )