import faiss
import numpy as np

from sentence_transformers import SentenceTransformer
from datetime import datetime


# ============================================================
# EMBEDDING MODEL
# ============================================================

model = None


def get_model():

    global model

    if model is None:

        print("Loading embedding model...")

        model = SentenceTransformer(
            "all-MiniLM-L6-v2"
        )

        print("Embedding model loaded.")

    return model


# ============================================================
# DOCUMENT STORAGE
# ============================================================

document_stores = {}


# ============================================================
# CURRENT DOCUMENT PER USER
# ============================================================

current_document_ids = {}


# ============================================================
# CREATE VECTOR STORE
# ============================================================

def create_vector_store(
    chunks,
    document_id=None,
    filename="study_notes.pdf",
    owner=None
):

    global document_stores
    global current_document_ids

    # --------------------------------------------------------
    # Validate owner
    # --------------------------------------------------------

    if not owner:

        return 0

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
    # Create document ID if not provided
    # --------------------------------------------------------

    if document_id is None:

        document_id = (
            f"document_{len(document_stores) + 1}"
        )

    print(
        f"Creating embeddings for "
        f"{len(cleaned_chunks)} chunks..."
    )

    # ========================================================
    # BATCH EMBEDDING
    # ========================================================

    embeddings = get_model().encode(
        cleaned_chunks,
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
        convert_to_tensor=False
    )

    # --------------------------------------------------------
    # Convert to FAISS-compatible format
    # --------------------------------------------------------

    embeddings = np.asarray(
        embeddings,
        dtype="float32"
    )

    # --------------------------------------------------------
    # Get embedding dimension
    # --------------------------------------------------------

    dimension = embeddings.shape[1]

    # ========================================================
    # CREATE FAISS INDEX
    # ========================================================

    index = faiss.IndexFlatIP(
        dimension
    )

    index.add(
        embeddings
    )

    # ========================================================
    # SAVE DOCUMENT STORE
    # ========================================================

    document_stores[document_id] = {

        "index":
            index,

        "chunks":
            cleaned_chunks,

        "filename":
            filename,

        "created_at":
            datetime.now().isoformat(),

        "chunk_count":
            len(cleaned_chunks),

        "owner":
            owner

    }

    # --------------------------------------------------------
    # Automatically select newly uploaded document
    # for this user only
    # --------------------------------------------------------

    current_document_ids[owner] = document_id

    print(
        "FAISS index created successfully."
    )

    print(
        f"Document ID: {document_id}"
    )

    print(
        f"Owner: {owner}"
    )

    print(
        f"Chunks: {len(cleaned_chunks)}"
    )

    return len(cleaned_chunks)


# ============================================================
# CHECK DOCUMENT OWNERSHIP
# ============================================================

def is_document_owner(
    document_id,
    owner
):

    if not document_id or not owner:

        return False

    store = document_stores.get(
        document_id
    )

    if store is None:

        return False

    return (
        store.get("owner") == owner
    )


# ============================================================
# SEARCH VECTOR STORE
# ============================================================

def search_vector_store(
    query,
    k=5,
    document_id=None,
    owner=None
):

    # --------------------------------------------------------
    # Validate query
    # --------------------------------------------------------

    if not query or not query.strip():

        return []

    # --------------------------------------------------------
    # Use current document for this user
    # --------------------------------------------------------

    if document_id is None and owner:

        document_id = (
            current_document_ids.get(owner)
        )

    if document_id is None:

        return []

    # --------------------------------------------------------
    # Security check
    # --------------------------------------------------------

    if not is_document_owner(
        document_id,
        owner
    ):

        return []

    # --------------------------------------------------------
    # Find document store
    # --------------------------------------------------------

    store = document_stores.get(
        document_id
    )

    if store is None:

        return []

    index = store["index"]

    chunks = store["chunks"]

    if index is None or not chunks:

        return []

    # --------------------------------------------------------
    # Don't request more results than available
    # --------------------------------------------------------

    k = min(
        k,
        len(chunks)
    )

    # ========================================================
    # EMBED USER QUESTION
    # ========================================================

    query_embedding = get_model().encode(
        [query.strip()],
        convert_to_numpy=True,
        normalize_embeddings=True,
        convert_to_tensor=False
    )

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    )

    # ========================================================
    # SEARCH FAISS
    # ========================================================

    distances, indices = index.search(
        query_embedding,
        k
    )

    # ========================================================
    # BUILD RESULTS
    # ========================================================

    results = []

    for position, chunk_index in enumerate(
        indices[0]
    ):

        if chunk_index == -1:

            continue

        results.append({

            "text":
                chunks[chunk_index],

            "score":
                float(
                    distances[0][position]
                )

        })

    return results


# ============================================================
# GET ALL CHUNKS
# ============================================================

def get_all_chunks(
    document_id=None,
    owner=None
):

    # --------------------------------------------------------
    # Use current document for this user
    # --------------------------------------------------------

    if document_id is None and owner:

        document_id = (
            current_document_ids.get(owner)
        )

    if document_id is None:

        return []

    # --------------------------------------------------------
    # Security check
    # --------------------------------------------------------

    if not is_document_owner(
        document_id,
        owner
    ):

        return []

    store = document_stores.get(
        document_id
    )

    if store is None:

        return []

    return store["chunks"]


# ============================================================
# GET ALL DOCUMENTS FOR USER
# ============================================================

def get_all_documents(
    owner
):

    documents = []

    for document_id, store in document_stores.items():

        # ----------------------------------------------------
        # SECURITY FILTER
        # ----------------------------------------------------

        if store.get("owner") != owner:

            continue

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

    store = document_stores.get(
        document_id
    )

    if store is None:

        return None

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------

    if owner is not None:

        if store.get("owner") != owner:

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
# SET CURRENT DOCUMENT FOR USER
# ============================================================

def set_current_document(
    document_id,
    owner
):

    if not is_document_owner(
        document_id,
        owner
    ):

        return False

    current_document_ids[owner] = (
        document_id
    )

    print(
        f"Current document changed for "
        f"{owner}: {document_id}"
    )

    return True


# ============================================================
# GET CURRENT DOCUMENT FOR USER
# ============================================================

def get_current_document(
    owner
):

    return current_document_ids.get(
        owner
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

def delete_document(
    document_id,
    owner
):

    global document_stores
    global current_document_ids

    # --------------------------------------------------------
    # Security check
    # --------------------------------------------------------

    if not is_document_owner(
        document_id,
        owner
    ):

        return False

    # --------------------------------------------------------
    # Delete document
    # --------------------------------------------------------

    del document_stores[
        document_id
    ]

    # --------------------------------------------------------
    # If deleted document was selected,
    # select another document belonging
    # to the same user.
    # --------------------------------------------------------

    if (
        current_document_ids.get(owner)
        == document_id
    ):

        current_document_ids.pop(
            owner,
            None
        )

        # Find another document owned
        # by this user

        for other_id, store in document_stores.items():

            if store.get("owner") == owner:

                current_document_ids[owner] = (
                    other_id
                )

                break

    print(
        f"Deleted document: "
        f"{document_id}"
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