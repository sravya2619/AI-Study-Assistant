# ============================================================
# LIGHTWEIGHT VECTOR / RETRIEVAL STORE
# ============================================================
#
# This version does NOT use:
#   - SentenceTransformer
#   - PyTorch
#   - FAISS
#
# Instead it uses:
#   - scikit-learn TF-IDF
#
# This greatly reduces RAM usage and is suitable for
# Render Free's limited memory environment.
# ============================================================

from datetime import datetime

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# STORAGE
# ============================================================

# Structure:
#
# document_stores = {
#
#     "username1": {
#
#         "document_id_1": {
#             "vectorizer": ...,
#             "matrix": ...,
#             "chunks": [...],
#             "filename": "...",
#             "created_at": "...",
#             "chunk_count": ...
#         }
#
#     },
#
#     "username2": {
#         ...
#     }
# }
#
# This keeps each user's documents separate.

document_stores = {}

# Currently selected document for each user

current_document_ids = {}


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _get_owner_key(owner=None):

    if owner is None:
        return "__default_user__"

    return owner


def _get_user_store(owner=None):

    owner_key = _get_owner_key(owner)

    if owner_key not in document_stores:

        document_stores[owner_key] = {}

    return document_stores[owner_key]


# ============================================================
# CREATE VECTOR STORE
# ============================================================

def create_vector_store(
    chunks,
    document_id=None,
    filename="study_notes.pdf",
    owner=None
):

    owner_key = _get_owner_key(owner)

    user_store = _get_user_store(owner)

    # --------------------------------------------------------
    # Validate chunks
    # --------------------------------------------------------

    if not chunks:
        return 0

    # --------------------------------------------------------
    # Remove empty chunks
    # --------------------------------------------------------

    cleaned_chunks = [

        chunk.strip()

        for chunk in chunks

        if chunk
        and chunk.strip()

    ]

    if not cleaned_chunks:
        return 0

    # --------------------------------------------------------
    # Create document ID if needed
    # --------------------------------------------------------

    if document_id is None:

        document_id = (
            f"document_{len(user_store) + 1}"
        )

    print(
        f"Creating lightweight TF-IDF index "
        f"for {len(cleaned_chunks)} chunks..."
    )

    # ========================================================
    # CREATE TF-IDF VECTORIZER
    # ========================================================

    vectorizer = TfidfVectorizer(

        lowercase=True,

        stop_words="english",

        # Avoid extremely large vocabulary

        max_features=20000,

        # Ignore terms appearing in only one chunk

        min_df=1,

        # Ignore extremely common terms

        max_df=0.95,

        ngram_range=(1, 2)

    )

    # ========================================================
    # CREATE MATRIX
    # ========================================================

    try:

        matrix = vectorizer.fit_transform(
            cleaned_chunks
        )

    except ValueError:

        # This can happen if a PDF contains very little
        # usable text.

        print(
            "TF-IDF could not create a vocabulary."
        )

        return 0

    # ========================================================
    # SAVE DOCUMENT STORE
    # ========================================================

    user_store[document_id] = {

        "vectorizer":
            vectorizer,

        "matrix":
            matrix,

        "chunks":
            cleaned_chunks,

        "filename":
            filename,

        "created_at":
            datetime.now().isoformat(),

        "chunk_count":
            len(cleaned_chunks)

    }

    # Automatically select newly uploaded document

    current_document_ids[
        owner_key
    ] = document_id

    print(
        "Lightweight TF-IDF index created successfully."
    )

    print(
        f"Owner: {owner_key}"
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

    owner_key = _get_owner_key(owner)

    # --------------------------------------------------------
    # Validate query
    # --------------------------------------------------------

    if not query or not query.strip():
        return []

    # --------------------------------------------------------
    # Use currently selected document
    # --------------------------------------------------------

    if document_id is None:

        document_id = current_document_ids.get(
            owner_key
        )

    if document_id is None:
        return []

    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    user_store = document_stores.get(
        owner_key,
        {}
    )

    store = user_store.get(
        document_id
    )

    if store is None:
        return []

    # --------------------------------------------------------
    # Get TF-IDF objects
    # --------------------------------------------------------

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

    # ========================================================
    # CONVERT QUERY TO TF-IDF VECTOR
    # ========================================================

    try:

        query_vector = vectorizer.transform(
            [query.strip()]
        )

    except Exception as e:

        print(
            f"Could not vectorize query: {e}"
        )

        return []

    # ========================================================
    # CALCULATE COSINE SIMILARITY
    # ========================================================

    similarities = cosine_similarity(
        query_vector,
        matrix
    )[0]

    # ========================================================
    # GET TOP RESULTS
    # ========================================================

    ranked_indices = similarities.argsort()[::-1]

    results = []

    for chunk_index in ranked_indices[:k]:

        score = float(
            similarities[chunk_index]
        )

        # Skip completely unrelated chunks

        if score <= 0:
            continue

        results.append({

            "text":
                chunks[chunk_index],

            "score":
                score

        })

    return results


# ============================================================
# GET ALL CHUNKS
# ============================================================

def get_all_chunks(
    document_id=None,
    owner=None
):

    owner_key = _get_owner_key(owner)

    # --------------------------------------------------------
    # Use current document if none specified
    # --------------------------------------------------------

    if document_id is None:

        document_id = current_document_ids.get(
            owner_key
        )

    if document_id is None:
        return []

    user_store = document_stores.get(
        owner_key,
        {}
    )

    store = user_store.get(
        document_id
    )

    if store is None:
        return []

    return store["chunks"]


# ============================================================
# GET ALL DOCUMENTS
# ============================================================

def get_all_documents(
    owner=None
):

    owner_key = _get_owner_key(owner)

    user_store = document_stores.get(
        owner_key,
        {}
    )

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

    owner_key = _get_owner_key(owner)

    user_store = document_stores.get(
        owner_key,
        {}
    )

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

    owner_key = _get_owner_key(owner)

    user_store = document_stores.get(
        owner_key,
        {}
    )

    if document_id not in user_store:

        return False

    current_document_ids[
        owner_key
    ] = document_id

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

    owner_key = _get_owner_key(owner)

    return current_document_ids.get(
        owner_key
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

def delete_document(
    document_id,
    owner=None
):

    owner_key = _get_owner_key(owner)

    user_store = document_stores.get(
        owner_key,
        {}
    )

    if document_id not in user_store:

        return False

    # --------------------------------------------------------
    # Delete document
    # --------------------------------------------------------

    del user_store[
        document_id
    ]

    # --------------------------------------------------------
    # If deleted document was selected
    # --------------------------------------------------------

    if current_document_ids.get(
        owner_key
    ) == document_id:

        current_document_ids[
            owner_key
        ] = None

        if user_store:

            current_document_ids[
                owner_key
            ] = next(
                iter(user_store)
            )

    print(
        f"Deleted document: {document_id}"
    )

    return True


# ============================================================
# CLEAR ALL VECTOR STORES
# ============================================================

def clear_vector_store():

    global document_stores
    global current_document_ids

    document_stores = {}

    current_document_ids = {}

    print(
        "All vector stores cleared."
    )