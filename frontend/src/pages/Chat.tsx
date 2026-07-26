import { useEffect, useState } from "react";
import API from "../services/api";


interface Message {
    sender: "user" | "ai";
    text: string;
}


interface Document {
    document_id: string;
    filename: string;
    chunks: number;
}


function Chat() {

    const [question, setQuestion] = useState("");

    const [messages, setMessages] = useState<Message[]>([
        {
            sender: "ai",
            text: "Hello! Select a study material and ask me anything from it."
        }
    ]);

    const [loading, setLoading] = useState(false);

    const [documents, setDocuments] = useState<Document[]>([]);

    const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");

    const [documentsLoading, setDocumentsLoading] = useState(true);


    // =====================================================
    // LOAD STUDY MATERIALS
    // =====================================================

    useEffect(() => {

        const loadDocuments = async () => {

            try {

                const response = await API.get(
                    "/documents"
                );

                const loadedDocuments =
                    response.data.documents || [];

                setDocuments(
                    loadedDocuments
                );


                // Use currently selected document
                if (
                    response.data.current_document_id
                ) {

                    setSelectedDocumentId(
                        response.data.current_document_id
                    );

                }
                else if (
                    loadedDocuments.length > 0
                ) {

                    // If nothing is selected,
                    // select the first document
                    const firstDocument =
                        loadedDocuments[0];

                    setSelectedDocumentId(
                        firstDocument.document_id
                    );

                    await API.post(
                        "/documents/select",
                        {
                            document_id:
                                firstDocument.document_id
                        }
                    );

                }

            } catch (error) {

                console.error(
                    "Could not load documents:",
                    error
                );

            } finally {

                setDocumentsLoading(false);

            }

        };


        loadDocuments();

    }, []);


    // =====================================================
    // SELECT DOCUMENT
    // =====================================================

    const handleDocumentChange = async (
        documentId: string
    ) => {

        if (!documentId) {
            return;
        }


        try {

            await API.post(
                "/documents/select",
                {
                    document_id: documentId
                }
            );

            setSelectedDocumentId(
                documentId
            );


            const selectedDocument =
                documents.find(
                    (document) =>
                        document.document_id ===
                        documentId
                );


            if (selectedDocument) {

                setMessages([
                    {
                        sender: "ai",
                        text:
                            `You are now studying "${selectedDocument.filename}". Ask me anything from this document.`
                    }
                ]);

            }

        } catch (error) {

            console.error(error);

            setMessages((previous) => [
                ...previous,
                {
                    sender: "ai",
                    text:
                        "Could not select this study material."
                }
            ]);

        }

    };


    // =====================================================
    // SEND QUESTION
    // =====================================================

    const sendQuestion = async () => {

        if (
            !question.trim() ||
            loading
        ) {

            return;

        }


        if (!selectedDocumentId) {

            setMessages((previous) => [
                ...previous,
                {
                    sender: "ai",
                    text:
                        "Please upload and select a study material first."
                }
            ]);

            return;

        }


        const currentQuestion =
            question.trim();


        // Add user message

        setMessages((previous) => [
            ...previous,
            {
                sender: "user",
                text: currentQuestion
            }
        ]);


        setQuestion("");

        setLoading(true);


        try {

            const response = await API.post(
                "/chat",
                {
                    question:
                        currentQuestion,

                    document_id:
                        selectedDocumentId
                }
            );


            const aiMessage: Message = {
                sender: "ai",
                text:
                    response.data.answer ||
                    "The AI did not return an answer."
            };


            setMessages((previous) => [
                ...previous,
                aiMessage
            ]);


        } catch (error) {

            console.error(error);

            setMessages((previous) => [
                ...previous,
                {
                    sender: "ai",
                    text:
                        "Unable to connect to the backend. Please make sure FastAPI and Ollama are running."
                }
            ]);

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // CURRENT DOCUMENT NAME
    // =====================================================

    const selectedDocument =
        documents.find(
            (document) =>
                document.document_id ===
                selectedDocumentId
        );


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <div className="min-h-screen bg-gray-100 flex justify-center p-8">

            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6">


                {/* HEADER */}

                <h1 className="text-3xl font-bold text-blue-600 text-center mb-6">

                    AI Study Assistant

                </h1>


                {/* DOCUMENT SELECTOR */}

                <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg p-4">

                    <label className="block font-semibold text-gray-700 mb-2">

                        📚 Study Material

                    </label>


                    {documentsLoading ? (

                        <p className="text-gray-500">

                            Loading study materials...

                        </p>

                    ) : documents.length === 0 ? (

                        <p className="text-red-600">

                            No study materials found. Please upload a PDF first.

                        </p>

                    ) : (

                        <select
                            value={selectedDocumentId}
                            onChange={(e) =>
                                handleDocumentChange(
                                    e.target.value
                                )
                            }
                            className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                        >

                            <option value="">

                                Select a study material

                            </option>


                            {documents.map(
                                (document) => (

                                    <option
                                        key={
                                            document.document_id
                                        }
                                        value={
                                            document.document_id
                                        }
                                    >

                                        {document.filename}

                                    </option>

                                )
                            )}

                        </select>

                    )}


                    {selectedDocument && (

                        <p className="text-sm text-gray-600 mt-2">

                            Currently studying:
                            {" "}
                            <span className="font-semibold">

                                {selectedDocument.filename}

                            </span>

                        </p>

                    )}

                </div>


                {/* CHAT AREA */}

                <div className="border rounded-lg h-[500px] overflow-y-auto p-4 bg-gray-50">

                    {messages.map(
                        (message, index) => (

                            <div
                                key={index}
                                className={`mb-4 flex ${
                                    message.sender === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >

                                <div
                                    className={`max-w-[70%] p-3 rounded-xl ${
                                        message.sender === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-200 text-black"
                                    }`}
                                >

                                    {message.text}

                                </div>

                            </div>

                        )
                    )}


                    {loading && (

                        <div className="flex justify-start">

                            <div className="bg-yellow-100 px-4 py-2 rounded-lg">

                                AI is thinking...

                            </div>

                        </div>

                    )}

                </div>


                {/* QUESTION INPUT */}

                <div className="flex gap-3 mt-4">

                    <input
                        type="text"
                        value={question}
                        onChange={(e) =>
                            setQuestion(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {

                            if (
                                e.key === "Enter"
                            ) {

                                sendQuestion();

                            }

                        }}
                        placeholder={
                            selectedDocument
                                ? `Ask anything about ${selectedDocument.filename}...`
                                : "Select a study material first..."
                        }
                        disabled={
                            !selectedDocumentId ||
                            loading
                        }
                        className="flex-1 border rounded-lg p-3 disabled:bg-gray-100"
                    />


                    <button
                        onClick={sendQuestion}
                        disabled={
                            loading ||
                            !selectedDocumentId
                        }
                        className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >

                        {loading
                            ? "Thinking..."
                            : "Send"
                        }

                    </button>

                </div>

            </div>

        </div>

    );

}


export default Chat;