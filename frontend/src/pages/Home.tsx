import { useEffect, useState } from "react";
import api from "../services/api";
function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    api
      .get("/health")
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch(() => {
        setMessage("Failed to connect to backend.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold text-blue-600 mb-6">
        AI Study Assistant
      </h1>

      <p className="text-xl text-gray-700">
        Backend Status:
      </p>

      <p className="text-green-600 font-bold text-2xl mt-4">
        {message}
      </p>
    </div>
  );
}

export default Home;