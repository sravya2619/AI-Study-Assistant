import faiss
import numpy as np
from datetime import datetime
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from datetime import datetime

# ============================================================
# Lazy Loading Embedding Model
# ============================================================

model = None


def get_model():
    """
    Load the embedding model only when needed.
    This prevents Render from loading it during startup.
    """
    global model

    if model is None:
        print("Loading embedding model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded.")

    return model

# ============================================================
# DOCUMENT STORAGE
# ============================================================

# Each document gets its own FAISS index.
#
# Structure:
#
# document_id -> {
#     "index": FAISS index,
#     "chunks": [...],
#     "filename": "...",
#     "created_at": "..."
# }
#
document_stores = {}


# Currently selected document
current_document_id = None


# ============================================================
# CREATE VECTOR STORE
# ============================================================

def create_vector_store(
    chunks,
    document_id=None,
    filename="study_notes.pdf"
):

    global document_stores
    global current_document_id


    # --------------------------------------------------------
    # Validate chunks
    # --------------------------------------------------------

    if not chunks:

        return 0


    # Remove empty chunks

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


    # Add embeddings

    index.add(
        embeddings
    )


    # ========================================================
    # SAVE DOCUMENT STORE
    # ========================================================

    document_stores[
        document_id
    ] = {

        "index":
            index,

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

    current_document_id = document_id


    print(
        f"FAISS index created successfully."
    )

    print(
        f"Document ID: {document_id}"
    )

    print(
        f"Chunks: {len(cleaned_chunks)}"
    )


    return len(cleaned_chunks)


# ============================================================
# SEARCH VECTOR STORE
# ============================================================

def search_vector_store(

    query,

    k=5,

    document_id=None

):

    global current_document_id


    # --------------------------------------------------------
    # Validate query
    # --------------------------------------------------------

    if not query or not query.strip():

        return []


    # --------------------------------------------------------
    # Use currently selected document
    # --------------------------------------------------------

    if document_id is None:

        document_id = current_document_id


    if document_id is None:

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
    document_id=None
):

    global current_document_id


    if document_id is None:

        document_id = current_document_id


    if document_id is None:

        return []


    store = document_stores.get(
        document_id
    )


    if store is None:

        return []


    return store["chunks"]


# ============================================================
# GET ALL DOCUMENTS
# ============================================================

def get_all_documents():

    documents = []


    for document_id, store in document_stores.items():

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
    document_id
):

    store = document_stores.get(
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
    document_id
):

    global current_document_id


    if document_id not in document_stores:

        return False


    current_document_id = document_id


    print(
        f"Current document changed to: "
        f"{document_id}"
    )


    return True


# ============================================================
# GET CURRENT DOCUMENT
# ============================================================

def get_current_document():

    global current_document_id

    return current_document_id


# ============================================================
# DELETE DOCUMENT
# ============================================================

def delete_document(
    document_id
):

    global current_document_id


    if document_id not in document_stores:

        return False


    # Delete document

    del document_stores[
        document_id
    ]


    # --------------------------------------------------------
    # If deleted document was selected,
    # select another document automatically.
    # --------------------------------------------------------

    if current_document_id == document_id:

        current_document_id = None


        if document_stores:

            current_document_id = next(
                iter(document_stores)
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
    global current_document_id


    document_stores = {}

    current_document_id = None


    print(
        "All vector stores cleared."
    )