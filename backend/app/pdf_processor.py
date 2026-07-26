import fitz


def extract_text_from_pdf(pdf_path):

    text = ""

    document = fitz.open(pdf_path)

    for page_number, page in enumerate(document):

        page_text = page.get_text()

        if page_text:
            text += page_text
            text += "\n"

    document.close()

    return text


def clean_text(text):

    # Replace line breaks
    text = text.replace(
        "\n",
        " "
    )

    # Remove extra spaces
    text = " ".join(
        text.split()
    )

    return text.strip()