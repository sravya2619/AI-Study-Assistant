import axios from "axios";

const API = axios.create({
    baseURL: "https://ai-study-assistant-urph.onrender.com",
    headers: {
        Accept: "application/json",
    },
});

export default API;