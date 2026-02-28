import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { socket } from "../helpers/socket"; // ✅ Import your socket

interface Message {
  sender: "user" | "bot";
  text: string;
}

const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "👋 **Hi! I'm CodeGenie — your AI coding assistant.**\n\nI can generate, debug, and explain your code." },
  ]);
  const [input, setInput] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // ✅ Socket setup
  useEffect(() => {
    socket.on("connect", () => console.log("✅ Connected to backend"));
    socket.on("bot_response", (data) => {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "bot", text: data.text }]);
        setIsTyping(false);
      }, 800);
    });

    socket.on("error", (err) => console.error("Socket error:", err));

    return () => {
      socket.off("bot_response");
      socket.off("error");
    };
  }, []);

  // 🎙️ Voice input
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // 📩 Send message
  const handleSend = () => {
    if (!input.trim() && !fileName) return;
    setIsTyping(true);

    const userMessage = input || `📎 Uploaded: ${fileName}`;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);

    socket.emit("user_message", { message: userMessage });
    setInput("");
    setFileName("");
  };

  // 📁 File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    fetch("http://localhost:5001/upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          socket.emit("user_message", { message: `📄 File uploaded: ${data.filename}` });
        } else {
          alert("File upload failed: " + data.error);
        }
      })
      .catch((err) => console.error("Upload error:", err));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-white/60 backdrop-blur-lg shadow-2xl rounded-3xl flex flex-col h-[80vh] border border-white/40"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-3xl text-lg font-semibold shadow-md">
          🧠 CodeGenie — AI Code Assistant
        </div>

        {/* Chat Area */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-indigo-300"
        >
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: msg.sender === "user" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`p-3 md:p-4 rounded-2xl max-w-[80%] leading-relaxed ${
                msg.sender === "user"
                  ? "bg-indigo-100 text-gray-800 self-end ml-auto shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 shadow-sm"
              }`}
            >
              <ReactMarkdown
                children={msg.text}
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return !inline ? (
                      <pre className="bg-gray-800 text-white p-2 rounded-md text-sm overflow-x-auto">
                        <code {...props}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-gray-200 text-sm px-1 rounded">{children}</code>
                    );
                  },
                }}
              />
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              className="bg-white/80 text-gray-600 p-3 rounded-xl w-fit"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              ✨ CodeGenie is typing...
            </motion.div>
          )}
        </div>

        {/* Input Section */}
        <div className="p-3 border-t border-gray-200 bg-white/60 backdrop-blur-md flex items-center gap-3 rounded-b-3xl">
          {/* Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
            title="Upload File"
          >
            <Upload className="w-5 h-5 text-gray-700" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Input box */}
          <input
            type="text"
            placeholder={fileName ? fileName : "Type a message..."}
            value={fileName ? "" : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                e.preventDefault();
                handleSend(); // 🚀 Send message on Enter
                }
            }}
            className="flex-1 p-2 rounded-xl border border-gray-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            disabled={!!fileName}
            />


          {/* Voice */}
          <button
            onClick={handleVoiceInput}
            className={`p-2 rounded-full ${
              isListening ? "bg-red-400" : "bg-indigo-500 hover:bg-indigo-600"
            } text-white transition`}
            title="Voice Input"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatUI;
