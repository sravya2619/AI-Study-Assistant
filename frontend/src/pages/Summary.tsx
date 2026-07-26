import { useEffect, useState } from "react";
import API from "../services/api";

interface Document {
    document_id: string;
    filename: string;
    chunks: number;
}

function Summary() {

    const [summary, setSummary] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState("");

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

            } catch (err) {

                console.error(err);

                setError(
                    "Could not load study materials."
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

            setSummary("");

            setError("");

        } catch (err) {

            console.error(err);

            setError(
                "Could not select this study material."
            );

        }

    };


    // =====================================================
    // GENERATE SUMMARY
    // =====================================================

    const generateSummary = async () => {

        if (!selectedDocumentId) {

            setError(
                "Please select a study material first."
            );

            return;

        }


        setLoading(true);
        setError("");
        setSummary("");


        try {

            const response = await API.post(
                "/summarize",
                {
                    document_id:
                        selectedDocumentId
                }
            );


            if (response.data.error) {

                setError(
                    response.data.error
                );

                return;

            }


            if (!response.data.summary) {

                setError(
                    "The AI did not return a summary."
                );

                return;

            }


            setSummary(
                response.data.summary
            );


        } catch (err) {

            console.error(err);

            setError(
                "Unable to generate summary. Please make sure the backend is running and a study material is selected."
            );

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // SELECTED DOCUMENT
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

        <div className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-5xl mx-auto">


                {/* HEADER */}

                <div className="mb-8">

                    <h1 className="text-4xl font-bold text-blue-700">

                        AI Summary

                    </h1>

                    <p className="text-gray-600 mt-2">

                        Generate an easy-to-understand summary
                        from your selected study material.

                    </p>

                </div>


                {/* STUDY MATERIAL SELECTOR */}

                <div className="bg-white rounded-xl shadow-md p-6 mb-6">

                    <label className="block font-semibold text-gray-700 mb-2">

                        📚 Select Study Material

                    </label>


                    {documentsLoading ? (

                        <p className="text-gray-500">

                            Loading study materials...

                        </p>

                    ) : documents.length === 0 ? (

                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">

                            No study materials found.
                            Please upload a PDF first.

                        </div>

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

                        <p className="text-sm text-gray-600 mt-3">

                            Currently selected:

                            {" "}

                            <span className="font-semibold">

                                {selectedDocument.filename}

                            </span>

                        </p>

                    )}

                </div>


                {/* GENERATE BUTTON */}

                <div className="bg-white rounded-xl shadow-md p-6">

                    <button
                        onClick={generateSummary}
                        disabled={
                            loading ||
                            !selectedDocumentId
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >

                        {loading
                            ? "Generating Summary..."
                            : "Generate Summary"
                        }

                    </button>


                    {error && (

                        <div className="mt-6 p-4 rounded-lg bg-red-100 text-red-700">

                            {error}

                        </div>

                    )}

                </div>


                {/* SUMMARY */}

                {summary && (

                    <div className="mt-8 bg-white rounded-xl shadow-md p-8">

                        <div className="flex items-center justify-between mb-6">

                            <div>

                                <h2 className="text-2xl font-bold text-gray-800">

                                    Study Summary

                                </h2>

                                {selectedDocument && (

                                    <p className="text-sm text-gray-500 mt-1">

                                        Based on:
                                        {" "}
                                        {selectedDocument.filename}

                                    </p>

                                )}

                            </div>

                        </div>


                        <div className="whitespace-pre-wrap leading-8 text-gray-700">

                            {summary}

                        </div>

                    </div>

                )}

            </div>

        </div>

    );

}

export default Summary;