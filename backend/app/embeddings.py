from sentence_transformers import SentenceTransformer

model = None

def get_model():
    global model

    if model is None:
        print("Loading embedding model...")
        model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedding model loaded.")

    return model


def create_embeddings(chunks):
    embeddings = get_model().encode(
        chunks,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embeddings