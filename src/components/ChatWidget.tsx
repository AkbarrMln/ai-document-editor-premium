'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Copy, Check, Send, Bot, User, X, MessageSquare, ImageIcon, Download, Share2, Maximize2, Grid3X3, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Updated interface dengan support gambar
interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    image?: string;       // Base64 image data
    imagePrompt?: string; // Prompt yang digunakan untuk generate
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [copySuccess, setCopySuccess] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Enhanced Image Features States
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxPrompt, setLightboxPrompt] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<Array<{ image: string, prompt: string, timestamp: number }>>([]);
    const [imageCopySuccess, setImageCopySuccess] = useState(false);

    // Audio: context & fungsi notif hp
    const audioCtxRef = useRef<AudioContext | null>(null);

    const ensureAudioContext = async () => {
        if (!audioCtxRef.current) {
            const AC = (window as unknown as Record<string, typeof AudioContext>).AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
            audioCtxRef.current = new AC();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
    };

    const playMobileNotif = async () => {
        try {
            await ensureAudioContext();
            const ctx = audioCtxRef.current!;
            const beep = (freq: number, start: number, duration: number, peak: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.connect(gain).connect(ctx.destination);
                osc.start(start);
                osc.stop(start + duration + 0.02);
            };

            const now = ctx.currentTime;
            beep(1200, now, 0.12, 0.12);
            beep(1600, now + 0.18, 0.14, 0.12);
        } catch {
            console.log('Audio notification unavailable');
        }
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Cleanup audio context saat unmount
    useEffect(() => {
        return () => {
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
        };
    }, []);

    // 1. Load chat history from localStorage on mount
    useEffect(() => {
        if (!isMounted) return;

        const savedMessages = localStorage.getItem('chatbot-history');
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages) as Array<Omit<Message, 'timestamp'> & { timestamp: number | string }>;
                setMessages(parsed.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        } else {
            // Welcome message if no history
            setMessages([{
                id: 1,
                text: "Hello! 👋 I'm Akbar Maulana Bot. How can I help you today? I can also generate images for you! 🎨",
                sender: 'bot',
                timestamp: new Date()
            }]);
        }

        // Load gallery from localStorage
        const savedGallery = localStorage.getItem('chatbot-image-gallery');
        if (savedGallery) {
            try {
                setGeneratedImages(JSON.parse(savedGallery));
            } catch (e) {
                console.error("Failed to parse gallery", e);
            }
        }
    }, [isMounted]);

    // 1. Save messages to localStorage
    useEffect(() => {
        if (!isMounted || messages.length === 0) return;

        const historyToSave = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.getTime()
        }));
        localStorage.setItem('chatbot-history', JSON.stringify(historyToSave));
    }, [messages, isMounted]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isOpen]);

    // Fungsi untuk mengirim pesan ke API - updated untuk handle gambar
    const sendMessageToAI = async (userMessage: string) => {
        try {
            // Siapkan history untuk context (10 pesan terakhir)
            const history = messages
                .filter(msg => msg.id !== 1)
                .slice(-10)
                .map((msg) => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text,
                }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, history }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            const data = await response.json();

            // Return object dengan message dan optional image
            return {
                message: data.message,
                image: data.image || null,
                imagePrompt: data.imagePrompt || null,
            };
        } catch (error) {
            console.error('Error calling AI:', error);
            throw error;
        }
    };

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isTyping) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        const userMsg: Message = {
            id: Date.now(),
            text: userMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const aiResponse = await sendMessageToAI(userMessage);
            setIsTyping(false);

            // Tambah response AI (dengan atau tanpa gambar)
            const botMessage: Message = {
                id: Date.now() + 1,
                text: aiResponse.message,
                sender: 'bot',
                timestamp: new Date(),
                image: aiResponse.image || undefined,
                imagePrompt: aiResponse.imagePrompt || undefined,
            };

            setMessages(prev => [...prev, botMessage]);

            // Save to gallery if image was generated
            if (aiResponse.image && aiResponse.imagePrompt) {
                saveToGallery(aiResponse.image, aiResponse.imagePrompt);
            }

            playMobileNotif();
        } catch {
            setIsTyping(false);
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: 'Maaf, terjadi kesalahan. Coba lagi ya! 😅',
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    // 3. Clear Chat Button logic
    const handleClearChat = () => {
        if (window.confirm('Hapus semua riwayat chat?')) {
            localStorage.removeItem('chatbot-history');
            setMessages([{
                id: 1,
                text: "Hello! 👋 I'm Akbar Maulana Bot. How can I help you today? I can also generate images for you! 🎨",
                sender: 'bot',
                timestamp: new Date()
            }]);
        }
    };

    // 4. Copy Response Button logic with fallback
    const handleCopyResponse = (text: string, id: number) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopySuccess(id);
                setTimeout(() => setCopySuccess(null), 2000);
            }).catch(err => {
                console.error("Clipboard write failed", err);
                fallbackCopy(text, id);
            });
        } else {
            fallbackCopy(text, id);
        }
    };

    const fallbackCopy = (text: string, id: number) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            // Ensure the textarea is not visible
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                setCopySuccess(id);
                setTimeout(() => setCopySuccess(null), 2000);
            }
        } catch (err) {
            console.error("Fallback copy failed", err);
        }
    };

    // Handler untuk buka lightbox (bukan tab baru)
    const handleImageClick = (imageData: string, prompt?: string) => {
        setLightboxImage(imageData);
        setLightboxPrompt(prompt || null);
    };

    // Handler download gambar
    const handleDownloadImage = (imageData: string) => {
        try {
            // Convert base64 to blob
            const byteString = atob(imageData.split(',')[1]);
            const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    // Handler copy gambar ke clipboard
    const handleCopyImage = async (imageData: string) => {
        try {
            // Try using Clipboard API with blob
            const response = await fetch(imageData);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            setImageCopySuccess(true);
            setTimeout(() => setImageCopySuccess(false), 2000);
        } catch {
            // Fallback: copy base64 URL
            try {
                await navigator.clipboard.writeText(imageData);
                setImageCopySuccess(true);
                setTimeout(() => setImageCopySuccess(false), 2000);
            } catch (e) {
                console.error('Copy failed:', e);
            }
        }
    };

    // Save image to gallery
    const saveToGallery = (image: string, prompt: string) => {
        const newImage = { image, prompt, timestamp: Date.now() };
        const updatedGallery = [...generatedImages, newImage];
        setGeneratedImages(updatedGallery);
        localStorage.setItem('chatbot-image-gallery', JSON.stringify(updatedGallery));
    };

    // Delete from gallery
    const deleteFromGallery = (timestamp: number) => {
        const updatedGallery = generatedImages.filter(img => img.timestamp !== timestamp);
        setGeneratedImages(updatedGallery);
        localStorage.setItem('chatbot-image-gallery', JSON.stringify(updatedGallery));
    };

    // Clear all gallery
    const clearGallery = () => {
        if (window.confirm('Hapus semua gambar di galeri?')) {
            setGeneratedImages([]);
            localStorage.removeItem('chatbot-image-gallery');
        }
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const toggleChat = () => setIsOpen(!isOpen);

    if (!isMounted) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Chat Window */}
            <div
                className={`absolute bottom-16 right-0 w-[280px] sm:w-[320px] md:w-[350px] h-[420px] sm:h-[480px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out origin-bottom-right flex flex-col border border-gray-200 dark:border-zinc-800 ${isOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="bg-black dark:bg-zinc-800 rounded-t-2xl p-3 sm:p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner group">
                            <Bot className="text-white w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-12" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-base sm:text-lg leading-tight">Akbar Maulana Bot</h3>
                            <p className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${isTyping ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                                {isTyping ? 'Sedang memproses...' : 'Online'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        {/* Gallery Button */}
                        <button
                            onClick={() => setShowGallery(!showGallery)}
                            className={`text-white/40 hover:text-indigo-400 hover:bg-white/10 rounded-lg p-1.5 sm:p-2 transition-all relative ${generatedImages.length > 0 ? 'text-white/60' : ''}`}
                            title="Galeri Gambar"
                        >
                            <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {generatedImages.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                                    {generatedImages.length > 9 ? '9+' : generatedImages.length}
                                </span>
                            )}
                        </button>
                        {/* Clear Chat Button */}
                        <button
                            onClick={handleClearChat}
                            className="text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg p-1.5 sm:p-2 transition-all group"
                            title="Hapus Chat"
                        >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                            onClick={toggleChat}
                            className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg p-1.5 sm:p-2 transition-all"
                            aria-label="Close chat"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-zinc-950/40 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}
                        >
                            {message.sender === 'bot' && (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-1.5 sm:mr-2 shrink-0 shadow-sm">
                                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            )}
                            <div className={`max-w-[85%] flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`relative px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm transition-all duration-200 ${message.sender === 'user'
                                        ? 'bg-black dark:bg-zinc-100 text-white dark:text-black rounded-2xl rounded-tr-sm'
                                        : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-zinc-700'
                                        }`}
                                >
                                    {/* 2. Markdown Rendering - Lightweight version without heavy syntax highlighter */}
                                    {message.sender === 'bot' ? (
                                        <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-a:text-indigo-500 dark:prose-a:text-indigo-400">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code(props: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
                                                        const { inline, className, children, ...rest } = props;
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <div className="rounded-xl overflow-hidden my-2 sm:my-3 border border-zinc-200 dark:border-zinc-700">
                                                                <div className="bg-zinc-900 text-gray-100 p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm font-mono">
                                                                    <pre className="whitespace-pre-wrap break-words">
                                                                        <code>{String(children).replace(/\n$/, '')}</code>
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <code className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-md text-pink-500 text-[12px] sm:text-[13px] font-mono" {...rest}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {message.text}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                                    )}

                                    {/* Generated Image Display with Action Buttons */}
                                    {message.image && (
                                        <div className="mt-3 space-y-2">
                                            <div className="relative group/image overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-600 shadow-lg">
                                                <img
                                                    src={message.image}
                                                    alt="Generated image"
                                                    className="w-full max-w-full rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                                    onClick={() => handleImageClick(message.image!, message.imagePrompt)}
                                                />
                                                {/* Action Buttons Overlay */}
                                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleImageClick(message.image!, message.imagePrompt); }}
                                                        className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                                        title="Perbesar"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-200" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadImage(message.image!); }}
                                                        className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-gray-700 dark:text-gray-200" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopyImage(message.image!); }}
                                                        className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                                        title="Copy Gambar"
                                                    >
                                                        {imageCopySuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-200" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {message.imagePrompt && (
                                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 italic px-1">
                                                    Prompt: {message.imagePrompt}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 4. Copy Response Button */}
                                    {message.sender === 'bot' && (
                                        <button
                                            onClick={() => handleCopyResponse(message.text, message.id)}
                                            className="absolute -right-8 sm:-right-10 top-0 p-1.5 sm:p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-xl hover:scale-110 active:scale-95"
                                            title="Copy Response"
                                        >
                                            {copySuccess === message.id ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 animate-in zoom-in" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                            {copySuccess === message.id && (
                                                <span className="absolute -top-9 sm:-top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] sm:text-[10px] py-0.5 sm:py-1 px-1.5 sm:px-2 rounded-lg animate-in fade-in slide-in-from-bottom-1 blur-0">Copied!</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1 sm:mt-1.5 px-1 font-medium">
                                    {formatTime(message.timestamp)}
                                </span>
                            </div>
                            {message.sender === 'user' && (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center ml-1.5 sm:ml-2 shrink-0 shadow-sm border border-white dark:border-zinc-600">
                                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-300" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Enhanced Typing/Loading Indicator */}
                    {isTyping && (
                        <div className="flex justify-start animate-fade-in-up">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-1.5 sm:mr-2 shrink-0 shadow-sm">
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            </div>
                            <div className="bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-sm px-4 sm:px-5 py-2.5 sm:py-3.5 shadow-sm border border-gray-100 dark:border-zinc-700">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex space-x-1 sm:space-x-1.5">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-[11px] sm:text-xs text-gray-400 font-medium italic">Sedang memproses...</span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <div className="h-1 flex-1 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-b-2xl border-t border-gray-100 dark:border-zinc-800 shrink-0 shadow-lg">
                    <div className="flex items-end space-x-2 bg-gray-100 dark:bg-zinc-800 rounded-2xl pr-1.5 sm:pr-2 py-1.5 sm:py-2 focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all border border-transparent focus-within:border-black/20 dark:focus-within:border-zinc-700">
                        <textarea
                            rows={1}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Tulis pesan atau minta gambar..."
                            disabled={isTyping}
                            className="flex-1 bg-transparent text-gray-800 dark:text-gray-100 px-3 sm:px-4 py-1 sm:py-1.5 focus:outline-none text-[13px] sm:text-sm placeholder-gray-500 disabled:opacity-50 resize-none overflow-y-auto"
                            style={{ height: '34px' }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center shadow-md ${!inputValue.trim() || isTyping
                                ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 cursor-not-allowed'
                                : 'bg-black dark:bg-indigo-600 text-white hover:scale-105 active:scale-95 hover:shadow-indigo-500/20'
                                }`}
                            aria-label="Send message"
                        >
                            <Send className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inputValue.trim() && !isTyping ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Button */}
            <button
                onClick={toggleChat}
                className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-90 z-50 ${isOpen
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black rotate-90 scale-100'
                    : 'bg-black dark:bg-zinc-800 text-white hover:bg-zinc-900 dark:hover:bg-zinc-700'
                    }`}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                {isOpen ? (
                    <X className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                    <>
                        <div className="absolute inset-0 rounded-full bg-black/20 animate-ping group-hover:block hidden"></div>
                        <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-0 transition-transform duration-300" />
                        <Bot className="w-6 h-6 sm:w-7 sm:h-7 absolute scale-0 group-hover:scale-100 transition-transform duration-300 animate-bounce" />
                    </>
                )}
            </button>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => { setLightboxImage(null); setLightboxPrompt(null); }}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <img
                            src={lightboxImage}
                            alt="Generated image"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
                        />
                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button
                                onClick={() => handleDownloadImage(lightboxImage)}
                                className="p-2 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                title="Download"
                            >
                                <Download className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                            <button
                                onClick={() => handleCopyImage(lightboxImage)}
                                className="p-2 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                title="Copy"
                            >
                                {imageCopySuccess ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-200" />}
                            </button>
                            <button
                                onClick={() => { setLightboxImage(null); setLightboxPrompt(null); }}
                                className="p-2 bg-white/90 dark:bg-zinc-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                                title="Tutup"
                            >
                                <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                        {/* Prompt display */}
                        {lightboxPrompt && (
                            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
                                <p className="text-white text-sm"><span className="font-semibold">Prompt:</span> {lightboxPrompt}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Gallery Panel */}
            {showGallery && (
                <div className="absolute bottom-16 right-0 w-[280px] sm:w-[320px] md:w-[350px] max-h-[420px] sm:max-h-[480px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-50">
                    <div className="bg-black dark:bg-zinc-800 rounded-t-2xl p-3 sm:p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Grid3X3 className="w-5 h-5 text-white" />
                            <h3 className="text-white font-semibold text-sm sm:text-base">Galeri Gambar ({generatedImages.length})</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {generatedImages.length > 0 && (
                                <button
                                    onClick={clearGallery}
                                    className="text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg p-1.5 transition-all"
                                    title="Hapus Semua"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowGallery(false)}
                                className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="p-3 overflow-y-auto max-h-[340px] sm:max-h-[400px]">
                        {generatedImages.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Belum ada gambar</p>
                                <p className="text-xs mt-1">Minta saya generate gambar untuk mulai!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {generatedImages.map((img) => (
                                    <div key={img.timestamp} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                                        <img
                                            src={img.image}
                                            alt="Generated"
                                            className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => handleImageClick(img.image, img.prompt)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                            <button
                                                onClick={() => handleDownloadImage(img.image)}
                                                className="p-1.5 bg-white/90 rounded-lg shadow-lg hover:bg-white transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-3.5 h-3.5 text-gray-700" />
                                            </button>
                                            <button
                                                onClick={() => deleteFromGallery(img.timestamp)}
                                                className="p-1.5 bg-red-500/90 rounded-lg shadow-lg hover:bg-red-500 transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}