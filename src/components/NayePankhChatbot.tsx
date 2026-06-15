import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Heart, Sparkles, MessageCircleCode, CheckSquare } from 'lucide-react';
import { ChatMessage } from '../types';

export default function NayePankhChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Namaste! 🙏 I'm PankhBot, your NayePankh helper. Ready to help you make a difference! Feel free to ask about our menstrual hygiene, food distribution, education programs, or how to register.",
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "How do I volunteer for NayePankh?",
    "How can I download a milestone certificate?",
    "Tell me about the Menstrual Hygiene campaign"
  ];

  const handleQuickPromptClick = (qp: string) => {
    setInputVal(qp);
  };

  // Auto-scroll to lowest point of conversation
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isTyping) return;

    // Capture input
    const userText = inputVal.trim();
    setInputVal('');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 100% full-stack architecture: fetch from Express backend to protect key
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          // Package existing conversation list (for context retention)
          messages: [...messages, userMessage].slice(-6) 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive feedback from assistant");
      }

      const data = await response.json();
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || "I am glad to assist you. Let's make society better together!",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("AI Communication anomaly: ", error);
      const errMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I am experiencing brief static connecting to our servers. Please make sure to fill the registration form on your left! We'd love to have you.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      
      {/* Floating Button triggers chat frame */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full shadow-2xl transition-all scale-100 hover:scale-110 active:scale-95 duration-200 cursor-pointer group"
          id="btn-open-chatbot"
        >
          <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          <span className="font-semibold text-sm max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap">
            Chat with PankhBot
          </span>
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Main Chat Framework */}
      {isOpen && (
        <div className="w-[340px] h-[460px] sm:w-[380px] sm:h-[500px] bg-white rounded-2xl border border-slate-100 shadow-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">PankhBot AI Assistant</h3>
                <span className="text-[10px] text-emerald-100 font-medium tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-ping"></span>
                  Active NayePankh Rep
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Board */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isBot = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'} items-end gap-2`}
                >
                  {isBot && (
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-800 tracking-tight shrink-0">
                      NP
                    </div>
                  )}
                  <div
                    className={`p-3 max-w-[80%] rounded-2xl text-xs md:text-sm shadow-sm ${
                      isBot
                        ? 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm'
                        : 'bg-emerald-600 text-white rounded-br-sm font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    <span 
                      className={`block text-[9px] mt-1 text-right italic ${
                        isBot ? 'text-slate-400' : 'text-emerald-200'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Is Typing visualizer */}
            {isTyping && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-800 shrink-0">
                  NP
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-bl-sm border border-slate-100 text-slate-400 text-xs flex items-center gap-1.5">
                  <span>PankhBot is thinking</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions overlay */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100/80 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0 select-none">
            {quickPrompts.map((qp, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickPromptClick(qp)}
                className="text-[10px] font-mono font-bold bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-250 px-2.5 py-1 rounded-full transition-all shrink-0 cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* User Input controls */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about NGO causes or registration..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isTyping}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Simple tagline */}
          <div className="py-1 bg-slate-50 text-[10px] text-center text-slate-400 border-t border-slate-100 font-mono flex items-center justify-center gap-1">
            <Heart className="w-3 h-3 text-emerald-500 animate-pulse fill-emerald-500" />
            <span>NayePankh - Spreading Hope</span>
          </div>

        </div>
      )}

    </div>
  );
}
