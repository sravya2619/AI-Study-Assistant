import { useState } from "react";
import API from "../services/api";

function Upload() {

    const [file, setFile] = useState<File | null>(null);

    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);

    const [progress, setProgress] = useState(0);


    const uploadPDF = async () => {

        if (!file) {

            setMessage(
                "Please select a PDF."
            );

            return;
        }


        if (file.type !== "application/pdf") {

            setMessage(
                "Please select a valid PDF file."
            );

            return;
        }


        const formData = new FormData();

        formData.append(
            "file",
            file
        );


        setLoading(true);

        setProgress(5);

        setMessage(
            "Uploading PDF..."
        );


        try {

            const response = await API.post(
                "/upload",
                formData
            );


            const documentId =
                response.data.document_id;


            if (!documentId) {

                setMessage(
                    "Upload failed: document ID was not returned."
                );

                return;
            }


            setMessage(
                "PDF uploaded. AI processing started..."
            );


            // ------------------------------------------------
            // Check processing status
            // ------------------------------------------------

            let completed = false;


            while (!completed) {

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            1500
                        )
                );


                const statusResponse =
                    await API.get(
                        `/upload/status/${documentId}`
                    );


                const status =
                    statusResponse.data;


                setProgress(
                    status.progress || 0
                );


                if (
                    status.status ===
                    "completed"
                ) {

                    completed = true;


                    setProgress(100);


                    setMessage(
                        `PDF processed successfully! ${status.chunks_created} study chunks created.`
                    );

                }


                if (
                    status.status ===
                    "failed"
                ) {

                    setMessage(
                        status.error ||
                        "PDF processing failed."
                    );

                    return;
                }


                if (
                    status.status ===
                    "processing"
                ) {

                    setMessage(
                        status.stage ||
                        "Processing PDF..."
                    );
                }

            }


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            setMessage(
                "Upload failed. Please check whether the backend is running."
            );

        } finally {

            setLoading(false);

        }

    };


    return (

        <div className="min-h-screen bg-gray-100 flex justify-center items-center p-8">

            <div className="bg-white shadow-lg rounded-xl w-full max-w-xl p-8">

                <h1 className="text-3xl font-bold text-blue-600 mb-6">
                    Upload Study Notes
                </h1>


                <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                        setFile(
                            e.target.files?.[0] ||
                            null
                        )
                    }
                    disabled={loading}
                    className="w-full border rounded-lg p-3"
                />


                {file && (

                    <p className="mt-3 text-gray-600">
                        Selected: {file.name}
                    </p>

                )}


                <button
                    onClick={uploadPDF}
                    disabled={loading}
                    className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >

                    {loading
                        ? "Processing..."
                        : "Upload PDF"}

                </button>


                {loading && (

                    <div className="mt-6">

                        <div className="flex justify-between text-sm mb-2">

                            <span className="text-gray-600">
                                Processing
                            </span>

                            <span className="font-semibold">
                                {progress}%
                            </span>

                        </div>


                        <div className="w-full bg-gray-200 rounded-full h-3">

                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{
                                    width:
                                        `${progress}%`
                                }}
                            />

                        </div>

                    </div>

                )}


                {message && (

                    <div className="mt-5 p-4 rounded-lg bg-gray-100">

                        {message}

                    </div>

                )}

            </div>

        </div>

    );
}

export default Upload;