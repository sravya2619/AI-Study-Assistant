from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_text(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=100,
        separators=[
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            " ",
            ""
        ]
    )

    chunks = splitter.split_text(text)

    # Clean and remove empty chunks
    chunks = [
        chunk.strip()
        for chunk in chunks
        if chunk.strip()
    ]

    return chunks