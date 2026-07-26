import { useEffect, useState } from "react";
import API from "../services/api";

interface Document {
    document_id: string;
    filename: string;
    chunks: number;
}

interface QuizQuestion {
    question: string;
    options: string[];
    answer: number;
    explanation?: string;
}

interface QuizResult {
    score: number;
    total: number;
    percentage: number;
    date: string;
}

function Quiz() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState("");
    const [documentsLoading, setDocumentsLoading] = useState(true);

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

    const [score, setScore] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [finished, setFinished] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // =====================================================
    // SELECTED DOCUMENT
    // =====================================================

    const selectedDocument = documents.find(
        (document) => document.document_id === selectedDocumentId
    );

    // =====================================================
    // LOAD STUDY MATERIALS
    // =====================================================

    useEffect(() => {
        const loadDocuments = async () => {
            try {
                const response = await API.get("/documents");

                const loadedDocuments =
                    response.data.documents || [];

                setDocuments(loadedDocuments);

                if (response.data.current_document_id) {
                    setSelectedDocumentId(
                        response.data.current_document_id
                    );
                } else if (loadedDocuments.length > 0) {
                    const firstDocument = loadedDocuments[0];

                    setSelectedDocumentId(
                        firstDocument.document_id
                    );

                    try {
                        await API.post(
                            "/documents/select",
                            {
                                document_id:
                                    firstDocument.document_id,
                            }
                        );
                    } catch (selectError) {
                        console.error(
                            "Could not select first document:",
                            selectError
                        );
                    }
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
                    document_id: documentId,
                }
            );

            setSelectedDocumentId(documentId);

            // Reset quiz
            setQuestions([]);
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setScore(0);
            setSubmitted(false);
            setFinished(false);
            setError("");
        } catch (err) {
            console.error(err);

            setError(
                "Could not select this study material."
            );
        }
    };

    // =====================================================
    // GENERATE QUIZ
    // =====================================================

    const generateQuiz = async () => {
        if (!selectedDocumentId) {
            setError(
                "Please select a study material first."
            );
            return;
        }

        setLoading(true);
        setError("");

        setQuestions([]);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setScore(0);
        setSubmitted(false);
        setFinished(false);

        try {
            const response = await API.post(
                "/quiz",
                {
                    document_id: selectedDocumentId,
                }
            );

            console.log(
                "FULL QUIZ RESPONSE:",
                response.data
            );

            let quizData: any = response.data;

            // Handle { quiz: [...] }
            if (
                quizData &&
                !Array.isArray(quizData) &&
                quizData.quiz !== undefined
            ) {
                quizData = quizData.quiz;
            }

            // Handle { questions: [...] }
            if (
                quizData &&
                !Array.isArray(quizData) &&
                quizData.questions !== undefined
            ) {
                quizData = quizData.questions;
            }

            // Handle JSON string
            if (typeof quizData === "string") {
                try {
                    quizData = JSON.parse(quizData);
                } catch (parseError) {
                    console.error(
                        "JSON parsing failed:",
                        parseError
                    );

                    setError(
                        "The AI returned an invalid quiz format."
                    );

                    return;
                }
            }

            // Handle { questions: [...] } after parsing
            if (
                quizData &&
                !Array.isArray(quizData) &&
                Array.isArray(quizData.questions)
            ) {
                quizData = quizData.questions;
            }

            // Validate quiz
            if (
                !Array.isArray(quizData) ||
                quizData.length === 0
            ) {
                console.error(
                    "Unexpected quiz response:",
                    response.data
                );

                setError(
                    "The AI response was received, but no usable questions were found."
                );

                return;
            }

            // =================================================
            // NORMALIZE QUESTIONS
            // =================================================

            const normalizedQuestions: (
                QuizQuestion | null
            )[] = quizData.map(
                (item: any): QuizQuestion | null => {
                    if (!item) {
                        return null;
                    }

                    const questionText =
                        item.question ??
                        item.question_text ??
                        item.query;

                    let options =
                        item.options ??
                        item.choices ??
                        item.answers;

                    let answer =
                        item.answer ??
                        item.correct_answer ??
                        item.correctAnswer;

                    const explanation =
                        item.explanation ??
                        item.reason ??
                        "";

                    if (!questionText) {
                        return null;
                    }

                    // Convert string options into array
                    if (typeof options === "string") {
                        options = options
                            .split("\n")
                            .map((option: string) =>
                                option
                                    .replace(
                                        /^[A-Da-d][.)]\s*/,
                                        ""
                                    )
                                    .trim()
                            )
                            .filter(Boolean);
                    }

                    if (!Array.isArray(options)) {
                        return null;
                    }

                    if (options.length < 2) {
                        return null;
                    }

                    const cleanedOptions: string[] =
                        options.map((option: any) =>
                            String(option)
                        );

                    // Convert answer to index
                    if (typeof answer === "string") {
                        const cleanedAnswer =
                            answer.trim();

                        // A / B / C / D
                        if (
                            /^[A-Da-d]$/.test(
                                cleanedAnswer
                            )
                        ) {
                            answer =
                                cleanedAnswer
                                    .toUpperCase()
                                    .charCodeAt(0) - 65;
                        } else {
                            // Full answer text
                            const answerIndex =
                                cleanedOptions.findIndex(
                                    (option) =>
                                        option
                                            .trim()
                                            .toLowerCase() ===
                                        cleanedAnswer
                                            .toLowerCase()
                                );

                            if (answerIndex !== -1) {
                                answer = answerIndex;
                            } else if (
                                !isNaN(
                                    Number(cleanedAnswer)
                                )
                            ) {
                                const numericAnswer =
                                    Number(cleanedAnswer);

                                // Convert 1-4 into 0-3
                                if (
                                    numericAnswer >= 1 &&
                                    numericAnswer <=
                                        cleanedOptions.length
                                ) {
                                    answer =
                                        numericAnswer - 1;
                                } else {
                                    answer =
                                        numericAnswer;
                                }
                            }
                        }
                    }

                    if (typeof answer !== "number") {
                        return null;
                    }

                    if (
                        answer < 0 ||
                        answer >= cleanedOptions.length
                    ) {
                        return null;
                    }

                    return {
                        question:
                            String(questionText),
                        options: cleanedOptions,
                        answer,
                        explanation:
                            String(explanation),
                    };
                }
            );

            const cleanedQuestions: QuizQuestion[] =
                normalizedQuestions.filter(
                    (
                        item
                    ): item is QuizQuestion =>
                        item !== null
                );

            if (cleanedQuestions.length === 0) {
                setError(
                    "The AI response was received, but no usable questions were found."
                );

                return;
            }

            setQuestions(cleanedQuestions);
        } catch (err: any) {
            console.error(
                "Quiz generation error:",
                err
            );

            if (err?.response?.data?.error) {
                setError(
                    err.response.data.error
                );
            } else {
                setError(
                    "Unable to generate quiz. Please make sure the backend and Ollama are running."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // SUBMIT ANSWER
    // =====================================================

    const submitAnswer = () => {
        if (selectedAnswer === null) {
            return;
        }

        const question =
            questions[currentQuestion];

        if (
            selectedAnswer ===
            Number(question.answer)
        ) {
            setScore(
                (previousScore) =>
                    previousScore + 1
            );
        }

        setSubmitted(true);
    };

    // =====================================================
    // SAVE RESULT
    // =====================================================

    const saveQuizResult = (
        finalScore: number
    ) => {
        const totalQuestions =
            questions.length;

        const percentage =
            totalQuestions > 0
                ? Math.round(
                    (finalScore /
                        totalQuestions) *
                        100
                )
                : 0;

        const newResult: QuizResult = {
            score: finalScore,
            total: totalQuestions,
            percentage,
            date: new Date().toISOString(),
        };

        const existingResults: QuizResult[] =
            JSON.parse(
                localStorage.getItem(
                    "quizResults"
                ) || "[]"
            );

        existingResults.push(newResult);

        localStorage.setItem(
            "quizResults",
            JSON.stringify(
                existingResults
            )
        );

        console.log(
            "Quiz result saved:",
            newResult
        );
    };

    // =====================================================
    // NEXT QUESTION
    // =====================================================

    const nextQuestion = () => {
        if (
            currentQuestion <
            questions.length - 1
        ) {
            setCurrentQuestion(
                (previousQuestion) =>
                    previousQuestion + 1
            );

            setSelectedAnswer(null);
            setSubmitted(false);
        } else {
            const currentQuestionData =
                questions[currentQuestion];

            const currentAnswerCorrect =
                selectedAnswer ===
                Number(
                    currentQuestionData.answer
                );

            const finalScore =
                score +
                (currentAnswerCorrect ? 1 : 0);

            setScore(finalScore);

            saveQuizResult(finalScore);

            setFinished(true);
        }
    };

    // =====================================================
    // RESTART QUIZ
    // =====================================================

    const restartQuiz = () => {
        setQuestions([]);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setScore(0);
        setSubmitted(false);
        setFinished(false);
        setError("");
    };

    // =====================================================
    // COMPLETED SCREEN
    // =====================================================

    if (finished) {
        const percentage =
            questions.length > 0
                ? Math.round(
                    (score /
                        questions.length) *
                        100
                )
                : 0;

        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-10 text-center">

                    <div className="text-6xl mb-5">
                        🎉
                    </div>

                    <h1 className="text-4xl font-bold text-blue-700 mb-6">
                        Quiz Completed!
                    </h1>

                    <div className="text-6xl font-bold text-gray-800 mb-4">
                        {score} / {questions.length}
                    </div>

                    <p className="text-2xl font-semibold text-blue-600 mb-4">
                        {percentage}%
                    </p>

                    {selectedDocument && (
                        <p className="text-gray-500 mb-4">
                            Based on:{" "}
                            <strong>
                                {selectedDocument.filename}
                            </strong>
                        </p>
                    )}

                    <p className="text-gray-600 text-lg mb-8">
                        You answered{" "}
                        <strong>{score}</strong>{" "}
                        out of{" "}
                        <strong>
                            {questions.length}
                        </strong>{" "}
                        questions correctly.
                    </p>

                    <button
                        onClick={restartQuiz}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                    >
                        Try Another Quiz
                    </button>
                </div>
            </div>
        );
    }

    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">

                {/* HEADER */}

                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-700">
                        AI Quiz
                    </h1>

                    <p className="text-gray-600 mt-2">
                        Test your understanding of your
                        selected study material.
                    </p>
                </div>

                {/* DOCUMENT SELECTOR */}

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
                            onChange={(event) =>
                                handleDocumentChange(
                                    event.target.value
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
                                        {
                                            document.filename
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    )}

                    {selectedDocument && (
                        <p className="text-sm text-gray-600 mt-3">
                            Currently selected:{" "}
                            <span className="font-semibold">
                                {
                                    selectedDocument.filename
                                }
                            </span>
                        </p>
                    )}
                </div>

                {/* GENERATE QUIZ */}

                {questions.length === 0 && (
                    <div className="bg-white rounded-xl shadow-md p-8">

                        <button
                            onClick={generateQuiz}
                            disabled={
                                loading ||
                                !selectedDocumentId
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? "Generating Quiz..."
                                : "Generate AI Quiz"}
                        </button>

                        {loading && (
                            <p className="mt-4 text-gray-500">
                                AI is creating questions
                                from:{" "}
                                <strong>
                                    {
                                        selectedDocument?.filename
                                    }
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

                {/* QUIZ */}

                {questions.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-8">

                        {/* PROGRESS */}

                        <div className="flex justify-between mb-6">
                            <span className="text-gray-500">
                                Question{" "}
                                {currentQuestion + 1}{" "}
                                of{" "}
                                {questions.length}
                            </span>

                            <span className="font-semibold text-blue-600">
                                Score: {score}
                            </span>
                        </div>

                        {/* QUESTION */}

                        <h2 className="text-2xl font-bold text-gray-800 mb-8">
                            {
                                questions[
                                    currentQuestion
                                ].question
                            }
                        </h2>

                        {/* OPTIONS */}

                        <div className="space-y-4">
                            {
                                questions[
                                    currentQuestion
                                ].options.map(
                                    (
                                        option,
                                        index
                                    ) => {
                                        const correctAnswer =
                                            Number(
                                                questions[
                                                    currentQuestion
                                                ].answer
                                            );

                                        const isCorrect =
                                            index ===
                                            correctAnswer;

                                        const isSelected =
                                            selectedAnswer ===
                                            index;

                                        let optionClass =
                                            "w-full text-left p-4 border rounded-lg transition ";

                                        if (!submitted) {
                                            optionClass +=
                                                isSelected
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-300 hover:bg-gray-50";
                                        } else if (
                                            isCorrect
                                        ) {
                                            optionClass +=
                                                "border-green-500 bg-green-50";
                                        } else if (
                                            isSelected
                                        ) {
                                            optionClass +=
                                                "border-red-500 bg-red-50";
                                        } else {
                                            optionClass +=
                                                "border-gray-300";
                                        }

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (
                                                        !submitted
                                                    ) {
                                                        setSelectedAnswer(
                                                            index
                                                        );
                                                    }
                                                }}
                                                className={
                                                    optionClass
                                                }
                                                disabled={
                                                    submitted
                                                }
                                            >
                                                <span className="font-semibold mr-3">
                                                    {String.fromCharCode(
                                                        65 + index
                                                    )}
                                                    .
                                                </span>

                                                {option}
                                            </button>
                                        );
                                    }
                                )
                            }
                        </div>

                        {/* EXPLANATION */}

                        {submitted &&
                            questions[
                                currentQuestion
                            ].explanation && (
                                <div className="mt-8 p-5 bg-blue-50 rounded-lg">
                                    <h3 className="font-bold text-blue-700 mb-2">
                                        Explanation
                                    </h3>

                                    <p className="text-gray-700">
                                        {
                                            questions[
                                                currentQuestion
                                            ].explanation
                                        }
                                    </p>
                                </div>
                            )}

                        {/* BUTTONS */}

                        <div className="mt-8">
                            {!submitted ? (
                                <button
                                    onClick={
                                        submitAnswer
                                    }
                                    disabled={
                                        selectedAnswer ===
                                        null
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400"
                                >
                                    Submit Answer
                                </button>
                            ) : (
                                <button
                                    onClick={
                                        nextQuestion
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                                >
                                    {currentQuestion ===
                                    questions.length - 1
                                        ? "Finish Quiz"
                                        : "Next Question"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Quiz;