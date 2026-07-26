import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import Summary from "./pages/Summary";
import StudyMaterials from "./pages/StudyMaterials";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards";


function App() {
    return (
        <Routes>

            <Route element={<Layout />}>

                <Route
                    path="/"
                    element={<Home />}
                />

                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                <Route
                    path="/upload"
                    element={<Upload />}

                />
                <Route
                    path="/materials"
                    element={<StudyMaterials />}
                />

                <Route
                    path="/chat"
                    element={<Chat />}
                />

                <Route
                    path="/summary"
                    element={<Summary />}
                />

                <Route
                    path="/quiz"
                    element={<Quiz />}
                />

                <Route
                    path="/flashcards"
                    element={<Flashcards />}
                />

            </Route>

        </Routes>
    );
}

export default App;