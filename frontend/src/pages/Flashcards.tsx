import { useEffect, useState } from "react";
import API from "../services/api";


interface Document {
    document_id: string;
    filename: string;
    chunks: number;
}


interface Flashcard {
    question: string;
    answer: string;
}


function Flashcards() {

    const [documents, setDocuments] =
        useState<Document[]>([]);

    const [selectedDocumentId, setSelectedDocumentId] =
        useState("");

    const [documentsLoading, setDocumentsLoading] =
        useState(true);


    const [cards, setCards] =
        useState<Flashcard[]>([]);

    const [currentCard, setCurrentCard] =
        useState(0);

    const [showAnswer, setShowAnswer] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


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


                // Use current selected document

                if (
                    response.data.current_document_id
                ) {

                    setSelectedDocumentId(
                        response.data.current_document_id
                    );

                }

                // Otherwise select first document

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

                console.error(
                    "Could not load documents:",
                    err
                );

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
                    document_id:
                        documentId
                }
            );


            setSelectedDocumentId(
                documentId
            );


            // Reset flashcards

            setCards([]);

            setCurrentCard(0);

            setShowAnswer(false);

            setError("");

        } catch (err) {

            console.error(err);

            setError(
                "Could not select this study material."
            );

        }

    };


    // =====================================================
    // GENERATE FLASHCARDS
    // =====================================================

    const generateFlashcards = async () => {

        if (!selectedDocumentId) {

            setError(
                "Please select a study material first."
            );

            return;

        }


        setLoading(true);

        setError("");

        setCards([]);

        setCurrentCard(0);

        setShowAnswer(false);


        try {

            const response = await API.post(
                "/flashcards",
                {
                    document_id:
                        selectedDocumentId
                }
            );


            console.log(
                "FULL FLASHCARD RESPONSE:",
                response.data
            );


            let data: any =
                response.data;


            // =================================================
            // HANDLE { flashcards: [...] }
            // =================================================

            if (
                data &&
                data.flashcards !== undefined
            ) {

                data =
                    data.flashcards;

            }


            // =================================================
            // HANDLE { cards: [...] }
            // =================================================

            if (
                data &&
                data.cards !== undefined
            ) {

                data =
                    data.cards;

            }


            // =================================================
            // HANDLE JSON STRING
            // =================================================

            if (
                typeof data === "string"
            ) {

                try {

                    data =
                        JSON.parse(data);

                } catch (parseError) {

                    console.error(
                        "Flashcard JSON parsing error:",
                        parseError
                    );

                    setError(
                        "The AI returned an invalid flashcard format."
                    );

                    return;

                }

            }


            // =================================================
            // HANDLE { flashcards: [...] } AFTER PARSING
            // =================================================

            if (
                data &&
                !Array.isArray(data) &&
                Array.isArray(
                    data.flashcards
                )
            ) {

                data =
                    data.flashcards;

            }


            // =================================================
            // HANDLE { cards: [...] } AFTER PARSING
            // =================================================

            if (
                data &&
                !Array.isArray(data) &&
                Array.isArray(
                    data.cards
                )
            ) {

                data =
                    data.cards;

            }


            // =================================================
            // VALIDATE
            // =================================================

            if (
                !Array.isArray(data) ||
                data.length === 0
            ) {

                console.error(
                    "Unexpected flashcard response:",
                    response.data
                );

                setError(
                    "The AI did not return valid flashcards."
                );

                return;

            }


            // =================================================
            // CLEAN FLASHCARDS
            // =================================================

            const cleanedCards:
                Flashcard[] =

                data
                    .map((item: any) => {

                        if (!item) {
                            return null;
                        }


                        const question =
                            item.question ||
                            item.front ||
                            item.term ||
                            item.prompt ||
                            "";


                        const answer =
                            item.answer ||
                            item.back ||
                            item.definition ||
                            item.response ||
                            "";


                        if (
                            !question ||
                            !answer
                        ) {

                            return null;

                        }


                        return {

                            question:
                                String(
                                    question
                                ),

                            answer:
                                String(
                                    answer
                                )

                        };

                    })
                    .filter(
                        (
                            item:
                                Flashcard |
                                null
                        ): item is Flashcard =>
                            item !== null
                    );


            // =================================================
            // FINAL VALIDATION
            // =================================================

            if (
                cleanedCards.length === 0
            ) {

                setError(
                    "No usable flashcards were returned by the AI."
                );

                return;

            }


            setCards(
                cleanedCards
            );


        } catch (err: any) {

            console.error(
                "Flashcard error:",
                err
            );


            if (
                err?.response?.data?.error
            ) {

                setError(
                    err.response.data.error
                );

            }
            else {

                setError(
                    "Unable to generate flashcards. Please make sure the backend and Ollama are running."
                );

            }

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // NEXT CARD
    // =====================================================

    const nextCard = () => {

        if (
            currentCard <
            cards.length - 1
        ) {

            setCurrentCard(
                (previous) =>
                    previous + 1
            );

            setShowAnswer(
                false
            );

        }

    };


    // =====================================================
    // PREVIOUS CARD
    // =====================================================

    const previousCard = () => {

        if (
            currentCard > 0
        ) {

            setCurrentCard(
                (previous) =>
                    previous - 1
            );

            setShowAnswer(
                false
            );

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

            <div className="max-w-4xl mx-auto">


                {/* HEADER */}

                <div className="mb-8">

                    <h1 className="text-4xl font-bold text-blue-700">

                        AI Flashcards

                    </h1>


                    <p className="text-gray-600 mt-2">

                        Quickly revise important concepts
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
                            value={
                                selectedDocumentId
                            }
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

                {cards.length === 0 && (

                    <div className="bg-white rounded-xl shadow-md p-8">

                        <button
                            onClick={
                                generateFlashcards
                            }
                            disabled={
                                loading ||
                                !selectedDocumentId
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >

                            {loading
                                ? "Generating Flashcards..."
                                : "Generate AI Flashcards"
                            }

                        </button>


                        {loading && (

                            <p className="mt-4 text-gray-500">

                                AI is creating flashcards from:

                                {" "}

                                <strong>
                                    {selectedDocument?.filename}
                                </strong>

                            </p>

                        )}


                        {error && (

                            <div className="mt-6 bg-red-100 text-red-700 p-4 rounded-lg">

                                {error}

                            </div>

                        )}

                    </div>

                )}


                {/* FLASHCARDS */}

                {cards.length > 0 && (

                    <div>


                        {/* CARD NUMBER */}

                        <div className="text-center text-gray-500 mb-4">

                            Card {currentCard + 1}
                            {" "}of{" "}
                            {cards.length}

                        </div>


                        {/* CARD */}

                        <div
                            className="bg-white rounded-2xl shadow-lg p-10 min-h-[350px] flex flex-col justify-center items-center text-center cursor-pointer"
                            onClick={() =>
                                setShowAnswer(
                                    (previous) =>
                                        !previous
                                )
                            }
                        >

                            {!showAnswer ? (

                                <>

                                    <p className="text-sm text-blue-600 font-semibold mb-4">

                                        QUESTION

                                    </p>


                                    <h2 className="text-3xl font-bold text-gray-800">

                                        {
                                            cards[
                                                currentCard
                                            ].question
                                        }

                                    </h2>


                                    <p className="mt-8 text-gray-400">

                                        Click the card to reveal
                                        the answer

                                    </p>

                                </>

                            ) : (

                                <>

                                    <p className="text-sm text-green-600 font-semibold mb-4">

                                        ANSWER

                                    </p>


                                    <p className="text-xl leading-8 text-gray-700">

                                        {
                                            cards[
                                                currentCard
                                            ].answer
                                        }

                                    </p>


                                    <p className="mt-8 text-gray-400">

                                        Click the card to hide
                                        the answer

                                    </p>

                                </>

                            )}

                        </div>


                        {/* NAVIGATION */}

                        <div className="flex justify-between mt-6">

                            <button
                                onClick={
                                    previousCard
                                }
                                disabled={
                                    currentCard === 0
                                }
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg disabled:bg-gray-300"
                            >

                                ← Previous

                            </button>


                            <button
                                onClick={() =>
                                    setShowAnswer(
                                        (previous) =>
                                            !previous
                                    )
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                            >

                                {showAnswer
                                    ? "Hide Answer"
                                    : "Show Answer"
                                }

                            </button>


                            <button
                                onClick={
                                    nextCard
                                }
                                disabled={
                                    currentCard ===
                                    cards.length - 1
                                }
                                className="bg-gray-600 text-white px-6 py-3 rounded-lg disabled:bg-gray-300"
                            >

                                Next →

                            </button>

                        </div>


                        {/* CURRENT DOCUMENT */}

                        {selectedDocument && (

                            <p className="text-center text-sm text-gray-500 mt-6">

                                Flashcards generated from:

                                {" "}

                                <strong>

                                    {
                                        selectedDocument.filename
                                    }

                                </strong>

                            </p>

                        )}

                    </div>

                )}

            </div>

        </div>

    );

}


export default Flashcards;