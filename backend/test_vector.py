from app.vector_store import create_vector_store


chunks = [
    "Artificial Intelligence is a branch of computer science.",
    "Machine learning learns patterns from data.",
    "Deep learning uses neural networks."
]


result = create_vector_store(chunks)


print("Chunks stored:", result)