// ===== 1. API KEY =====
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");
    if (API_KEY) {
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

// ===== 2. MODELS =====
const MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const sendBtn = document.getElementById("send");

// ===== 3. GEMINI API =====
async function callGemini(promptText) {
    if (!API_KEY) {
        throw new Error("Gemini API key is missing.");
    }

    let lastError;

    for (const model of MODELS) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: promptText }]
                        }]
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message || `HTTP ${response.status}`
                );
            }

            const reply =
                data.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();

            if (!reply) {
                throw new Error("Gemini returned an empty response.");
            }

            return reply;

        } catch (error) {
            lastError = error;

            // Try another model only for model-related errors.
            if (
                /not found|not supported|unavailable|temporar/i.test(
                    error.message
                )
            ) {
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

// ===== 4. CHAT FUNCTION =====
async function askGemini(promptText) {
    const message = add("J.A.R.V.I.S: Thinking...", "ai");

    try {
        const reply = await callGemini(promptText);

        message.innerText = "J.A.R.V.I.S: " + reply;

        speak(reply);

    } catch (error) {
        message.innerText =
            "J.A.R.V.I.S: ERROR - " + error.message;
    }
}

// ===== 5. SPEECH RECOGNITION =====
const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let rec = null;

if (SR) {
    rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event) => {
        const text = event.results[0][0].transcript;

        add("YOU: " + text, "user");
        askGemini(text);
    };

    rec.onerror = (event) => {
        add("Microphone error: " + event.error, "ai");
    };

    rec.onend = () => {
        micBtn.innerText = "🎙";
        micBtn.disabled = false;
    };

    micBtn.onclick = () => {
        try {
            rec.start();
            micBtn.innerText = "LISTENING...";
            micBtn.disabled = true;
        } catch (error) {
            add("Microphone: " + error.message, "ai");
        }
    };

} else {
    micBtn.disabled = true;
    micBtn.innerText = "MIC N/A";
}

// ===== 6. TEXT TO SPEECH =====
let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;

    const voice = voices.find(v =>
        v.lang.toLowerCase().startsWith("en")
    );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// ===== 7. SEND BUTTON =====
sendBtn.onclick = () => {
    const text = input.value.trim();

    if (!text) return;

    add("YOU: " + text, "user");

    input.value = "";

    askGemini(text);
};

// ===== 8. ENTER KEY =====
input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendBtn.click();
    }
});

// ===== 9. ADD CHAT MESSAGE =====
function add(text, sender) {
    const div = document.createElement("div");

    div.className = "msg " + sender;
    div.innerText = text;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    return div;
}
