import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

interface Document {
    document_id: string;
    filename: string;
    chunks: number;
}

function StudyMaterials() {

    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // =====================================================
    // LOAD DOCUMENTS
    // =====================================================

    const loadDocuments = async () => {

        try {

            const response = await API.get("/documents");

            setDocuments(
                response.data.documents || []
            );

            setCurrentDocumentId(
                response.data.current_document_id || null
            );

        } catch (error) {

            console.error(error);

            setMessage(
                "Could not load study materials."
            );

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // LOAD WHEN PAGE OPENS
    // =====================================================

    useEffect(() => {

        loadDocuments();

    }, []);


    // =====================================================
    // SELECT DOCUMENT
    // =====================================================

    const selectDocument = async (
        documentId: string
    ) => {

        try {

            const response = await API.post(
                "/documents/select",
                {
                    document_id: documentId
                }
            );

            setCurrentDocumentId(
                documentId
            );

            setMessage(
                `${response.data.document.filename} selected successfully.`
            );

        } catch (error) {

            console.error(error);

            setMessage(
                "Could not select document."
            );

        }

    };


    // =====================================================
    // DELETE DOCUMENT
    // =====================================================

    const deleteDocument = async (
        documentId: string
    ) => {

        const confirmed = window.confirm(
            "Are you sure you want to delete this study material?"
        );

        if (!confirmed) {
            return;
        }


        try {

            await API.delete(
                `/documents/${documentId}`
            );

            setMessage(
                "Study material deleted successfully."
            );

            await loadDocuments();

        } catch (error) {

            console.error(error);

            setMessage(
                "Could not delete study material."
            );

        }

    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="min-h-screen bg-gray-100 flex items-center justify-center">

                <div className="text-xl font-semibold text-gray-600">

                    Loading study materials...

                </div>

            </div>

        );

    }


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <div className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-6xl mx-auto">


                {/* HEADER */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

                    <div>

                        <h1 className="text-4xl font-bold text-blue-700">

                            📚 Study Materials

                        </h1>

                        <p className="text-gray-600 mt-2">

                            Manage your uploaded study PDFs.

                        </p>

                    </div>


                    <Link
                        to="/upload"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center"
                    >

                        + Upload PDF

                    </Link>

                </div>


                {/* MESSAGE */}

                {message && (

                    <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">

                        {message}

                    </div>

                )}


                {/* NO DOCUMENTS */}

                {documents.length === 0 && (

                    <div className="bg-white rounded-xl shadow-md p-10 text-center">

                        <div className="text-6xl mb-4">
                            📄
                        </div>

                        <h2 className="text-2xl font-bold text-gray-700">

                            No study materials yet

                        </h2>

                        <p className="text-gray-500 mt-2 mb-6">

                            Upload your first PDF to start studying.

                        </p>

                        <Link
                            to="/upload"
                            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                        >

                            Upload Study PDF

                        </Link>

                    </div>

                )}


                {/* DOCUMENT LIST */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {documents.map(
                        (document) => (

                            <div
                                key={document.document_id}
                                className={`bg-white rounded-xl shadow-md p-6 border-2 ${
                                    currentDocumentId === document.document_id
                                        ? "border-blue-500"
                                        : "border-transparent"
                                }`}
                            >


                                {/* FILE ICON */}

                                <div className="flex items-start justify-between">

                                    <div className="flex items-center gap-4">

                                        <div className="text-4xl">
                                            📄
                                        </div>

                                        <div>

                                            <h2 className="font-bold text-lg break-all">

                                                {document.filename}

                                            </h2>

                                            <p className="text-sm text-gray-500 mt-1">

                                                {document.chunks} chunks

                                            </p>

                                        </div>

                                    </div>


                                    {currentDocumentId === document.document_id && (

                                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full whitespace-nowrap">

                                            Selected

                                        </span>

                                    )}

                                </div>


                                {/* ACTIONS */}

                                <div className="flex flex-wrap gap-3 mt-6">

                                    <button
                                        onClick={() =>
                                            selectDocument(
                                                document.document_id
                                            )
                                        }
                                        disabled={
                                            currentDocumentId === document.document_id
                                        }
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >

                                        {currentDocumentId === document.document_id
                                            ? "Selected"
                                            : "Select"
                                        }

                                    </button>


                                    <button
                                        onClick={() =>
                                            deleteDocument(
                                                document.document_id
                                            )
                                        }
                                        className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200"
                                    >

                                        Delete

                                    </button>

                                </div>


                                {/* AI ACTIONS */}

                                {currentDocumentId === document.document_id && (

                                    <div className="border-t mt-6 pt-5">

                                        <p className="font-semibold mb-3">

                                            AI Study Tools

                                        </p>

                                        <div className="grid grid-cols-2 gap-3">

                                            <Link
                                                to="/chat"
                                                className="bg-blue-50 p-3 rounded-lg text-center hover:bg-blue-100"
                                            >

                                                💬 Chat

                                            </Link>


                                            <Link
                                                to="/summary"
                                                className="bg-blue-50 p-3 rounded-lg text-center hover:bg-blue-100"
                                            >

                                                📝 Summary

                                            </Link>


                                            <Link
                                                to="/quiz"
                                                className="bg-blue-50 p-3 rounded-lg text-center hover:bg-blue-100"
                                            >

                                                🧠 Quiz

                                            </Link>


                                            <Link
                                                to="/flashcards"
                                                className="bg-blue-50 p-3 rounded-lg text-center hover:bg-blue-100"
                                            >

                                                📚 Flashcards

                                            </Link>

                                        </div>

                                    </div>

                                )}

                            </div>

                        )
                    )}

                </div>

            </div>

        </div>

    );

}

export default StudyMaterials;