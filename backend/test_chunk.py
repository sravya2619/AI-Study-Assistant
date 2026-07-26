from app.chunking import split_text


text = """
Artificial intelligence is a field of computer science.
Machine learning allows computers to learn from data.
Deep learning uses neural networks.
"""


chunks = split_text(text)


print(chunks)