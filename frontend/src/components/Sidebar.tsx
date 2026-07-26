import { Link } from "react-router-dom";

function Sidebar() {
    return (
        <aside className="w-72 min-h-screen bg-blue-700 text-white p-8">

            {/* Logo / Title */}

            <h1 className="text-3xl font-bold mb-12">
                🤖 AI Study
                <br />
                Assistant
            </h1>


            {/* Navigation */}

            <nav className="flex flex-col gap-4 text-lg">

                <Link
                    to="/dashboard"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    📊 Dashboard
                </Link>


                <Link
                    to="/materials"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    📚 Study Materials
                </Link>


                <Link
                    to="/upload"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    📄 Upload Notes
                </Link>


                <Link
                    to="/chat"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    💬 AI Chat
                </Link>


                <Link
                    to="/summary"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    📝 Summary
                </Link>


                <Link
                    to="/quiz"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    🧠 Quiz
                </Link>


                <Link
                    to="/flashcards"
                    className="hover:bg-blue-600 p-3 rounded-lg transition"
                >
                    📚 Flashcards
                </Link>

            </nav>

        </aside>
    );
}

export default Sidebar;