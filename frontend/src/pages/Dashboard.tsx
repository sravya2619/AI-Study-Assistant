import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface QuizResult {
    score: number;
    total: number;
    percentage: number;
    date: string;
}

function Dashboard() {
    const [quizCount, setQuizCount] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [averageScore, setAverageScore] = useState(0);

    useEffect(() => {
        const storedResults = localStorage.getItem("quizResults");

        if (!storedResults) {
            return;
        }

        try {
            const results: QuizResult[] = JSON.parse(storedResults);

            if (!Array.isArray(results) || results.length === 0) {
                return;
            }

            setQuizCount(results.length);

            const scores = results.map(
                (result) => Number(result.percentage) || 0
            );

            const highestScore = Math.max(...scores);

            setBestScore(highestScore);

            const totalScore = scores.reduce(
                (total, score) => total + score,
                0
            );

            const average = totalScore / scores.length;

            setAverageScore(Math.round(average));
        } catch (error) {
            console.error(
                "Unable to read quiz results:",
                error
            );
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-6xl mx-auto">

                {/* Header */}

                <div className="mb-8">

                    <h1 className="text-4xl font-bold text-blue-700">
                        AI Study Dashboard
                    </h1>

                    <p className="text-gray-600 mt-2">
                        Learn, revise and test yourself using your
                        study material.
                    </p>

                </div>


                {/* Statistics */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                    {/* Notes */}

                    <div className="bg-white rounded-xl shadow-md p-6">

                        <div className="text-3xl mb-3">
                            📄
                        </div>

                        <p className="text-gray-500">
                            Notes Uploaded
                        </p>

                        <h2 className="text-3xl font-bold mt-2">
                            1
                        </h2>

                    </div>


                    {/* Quiz Count */}

                    <div className="bg-white rounded-xl shadow-md p-6">

                        <div className="text-3xl mb-3">
                            🧠
                        </div>

                        <p className="text-gray-500">
                            Quizzes Completed
                        </p>

                        <h2 className="text-3xl font-bold mt-2">
                            {quizCount}
                        </h2>

                    </div>


                    {/* Best Score */}

                    <div className="bg-white rounded-xl shadow-md p-6">

                        <div className="text-3xl mb-3">
                            🎯
                        </div>

                        <p className="text-gray-500">
                            Best Score
                        </p>

                        <h2 className="text-3xl font-bold mt-2">
                            {bestScore}%
                        </h2>

                    </div>


                    {/* Average Score */}

                    <div className="bg-white rounded-xl shadow-md p-6">

                        <div className="text-3xl mb-3">
                            📈
                        </div>

                        <p className="text-gray-500">
                            Average Score
                        </p>

                        <h2 className="text-3xl font-bold mt-2">
                            {averageScore}%
                        </h2>

                    </div>

                </div>


                {/* Quick Actions */}

                <div className="bg-white rounded-xl shadow-md p-8 mb-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Chat */}

                        <Link
                            to="/chat"
                            className="p-5 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                        >

                            <div className="text-3xl mb-3">
                                💬
                            </div>

                            <h3 className="font-bold">
                                AI Chat
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                                Ask questions from your notes.
                            </p>

                        </Link>


                        {/* Summary */}

                        <Link
                            to="/summary"
                            className="p-5 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                        >

                            <div className="text-3xl mb-3">
                                📝
                            </div>

                            <h3 className="font-bold">
                                AI Summary
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                                Summarize your study material.
                            </p>

                        </Link>


                        {/* Quiz */}

                        <Link
                            to="/quiz"
                            className="p-5 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                        >

                            <div className="text-3xl mb-3">
                                🧠
                            </div>

                            <h3 className="font-bold">
                                AI Quiz
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                                Test your knowledge.
                            </p>

                        </Link>


                        {/* Flashcards */}

                        <Link
                            to="/flashcards"
                            className="p-5 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                        >

                            <div className="text-3xl mb-3">
                                📚
                            </div>

                            <h3 className="font-bold">
                                Flashcards
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                                Revise important concepts.
                            </p>

                        </Link>

                    </div>

                </div>


                {/* Progress Section */}

                <div className="bg-white rounded-xl shadow-md p-8 mb-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Your Progress
                    </h2>

                    {quizCount === 0 ? (

                        <div className="text-center py-8">

                            <div className="text-5xl mb-4">
                                📊
                            </div>

                            <h3 className="text-xl font-semibold">
                                No quiz results yet
                            </h3>

                            <p className="text-gray-500 mt-2">
                                Complete an AI quiz to start tracking
                                your progress.
                            </p>

                            <Link
                                to="/quiz"
                                className="inline-block mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                            >
                                Take a Quiz
                            </Link>

                        </div>

                    ) : (

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            <div className="text-center p-5 bg-blue-50 rounded-xl">

                                <p className="text-gray-500">
                                    Quizzes Completed
                                </p>

                                <p className="text-3xl font-bold text-blue-700 mt-2">
                                    {quizCount}
                                </p>

                            </div>


                            <div className="text-center p-5 bg-green-50 rounded-xl">

                                <p className="text-gray-500">
                                    Best Score
                                </p>

                                <p className="text-3xl font-bold text-green-700 mt-2">
                                    {bestScore}%
                                </p>

                            </div>


                            <div className="text-center p-5 bg-purple-50 rounded-xl">

                                <p className="text-gray-500">
                                    Average Score
                                </p>

                                <p className="text-3xl font-bold text-purple-700 mt-2">
                                    {averageScore}%
                                </p>

                            </div>

                        </div>

                    )}

                </div>


                {/* Recent Activity */}

                <div className="bg-white rounded-xl shadow-md p-8">

                    <h2 className="text-2xl font-bold mb-6">
                        Recent Activity
                    </h2>

                    <div className="space-y-4">

                        {/* Upload */}

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">

                            <span className="text-2xl">
                                📄
                            </span>

                            <div>

                                <p className="font-semibold">
                                    Study notes uploaded
                                </p>

                                <p className="text-sm text-gray-500">
                                    Your PDF is ready for AI study
                                    tools.
                                </p>

                            </div>

                        </div>


                        {/* Summary */}

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">

                            <span className="text-2xl">
                                📝
                            </span>

                            <div>

                                <p className="font-semibold">
                                    AI Summary available
                                </p>

                                <p className="text-sm text-gray-500">
                                    Generate a summary from your notes.
                                </p>

                            </div>

                        </div>


                        {/* Quiz */}

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">

                            <span className="text-2xl">
                                🧠
                            </span>

                            <div>

                                <p className="font-semibold">
                                    AI Quiz ready
                                </p>

                                <p className="text-sm text-gray-500">
                                    Test your understanding.
                                </p>

                            </div>

                        </div>


                        {/* Flashcards */}

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">

                            <span className="text-2xl">
                                📚
                            </span>

                            <div>

                                <p className="font-semibold">
                                    AI Flashcards ready
                                </p>

                                <p className="text-sm text-gray-500">
                                    Revise important concepts quickly.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;