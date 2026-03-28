import React, { useState, useEffect, useRef } from "react";
import { Search, CheckCircle2, Circle, BookOpen, ExternalLink, ArrowLeft, Loader2, GraduationCap, MessageCircle, X, Send, HelpCircle, ChevronRight, Globe, Newspaper, History, ArrowRight, Zap, School, Video, Play, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { generateRoadmap, generateQuestions, chatWithAssistant, fetchDailyPortal, fetchCountries, generateWaecQuestions, fetchUniversities, fetchSubjectTopics, getProfessorTip, generateStudentVideo } from "./services/geminiService";
import { Roadmap, RoadmapStep, Question, ChatMessage, NewsItem, HistoricalEvent, Country, WaecQuestion, University, HistoryItem } from "./types";
import { cn } from "./lib/utils";

export default function App() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"Secondary" | "University">("Secondary");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  // AI Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizSubject, setQuizSubject] = useState<string | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  // News State
  const [newsData, setNewsData] = useState<{ news: NewsItem[], history: HistoricalEvent[] } | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showNews, setShowNews] = useState(false);

  // Atlas State
  const [countries, setCountries] = useState<Country[]>([]);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [showAtlas, setShowAtlas] = useState(false);
  const [atlasSearch, setAtlasSearch] = useState("");

  // WAEC State
  const [showWaec, setShowWaec] = useState(false);
  const [waecQuestions, setWaecQuestions] = useState<WaecQuestion[]>([]);
  const [waecAnswers, setWaecAnswers] = useState<Record<string, string>>({});
  const [showWaecResults, setShowWaecResults] = useState(false);
  const [waecLoading, setWaecLoading] = useState(false);
  const [waecSubject, setWaecSubject] = useState("");

  // University Portal State
  const [showUni, setShowUni] = useState(false);
  const [universities, setUniversities] = useState<University[]>([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [uniSearch, setUniSearch] = useState("");
  const [uniCountrySearch, setUniCountrySearch] = useState("");

  // Video Portal State
  const [showVideoPortal, setShowVideoPortal] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // Topic Suggestions State
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Professor Tip State
  const [professorTip, setProfessorTip] = useState<string>("");
  const [tipLoading, setTipLoading] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load History on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("learn_global_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save History to LocalStorage
  useEffect(() => {
    localStorage.setItem("learn_global_history", JSON.stringify(history));
  }, [history]);

  const saveToHistory = (type: "roadmap" | "quiz", title: string, data: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      type,
      title,
      timestamp: new Date().toISOString(),
      data,
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your learning history?")) {
      setHistory([]);
    }
  };

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem("learnpath_progress");
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
      localStorage.setItem("learnpath_progress", JSON.stringify(progress));
    }
  }, [progress]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Professor Tip
  useEffect(() => {
    const fetchTip = async () => {
      setTipLoading(true);
      try {
        const tip = await getProfessorTip();
        setProfessorTip(tip);
      } catch (error) {
        console.error("Error fetching tip:", error);
      } finally {
        setTipLoading(false);
      }
    };
    fetchTip();
  }, []);

  // Proactive Assistant Greeting
  useEffect(() => {
    if (isChatOpen && chatMessages.length === 0) {
      setChatMessages([{ role: "model", text: "Hello there! I am Prof. Global, your lead educator. I'm here to make your learning journey fast, fun, and incredibly simple. What can I help you master today?" }]);
    }
  }, [isChatOpen, chatMessages.length]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setShowVideoPortal(false);
    try {
      const newRoadmap = await generateRoadmap(query, level);
      setRoadmap(newRoadmap);
      saveToHistory("roadmap", query, newRoadmap);
      setSelectedStepId(null);
      setQuestions([]);
      setQuizSubject(null);
    } catch (error) {
      console.error("Error generating roadmap:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (subject: string) => {
    setQuizLoading(true);
    setQuizSubject(subject);
    setShowVideoPortal(false);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setScore(0);
    setSelectedOption(null);
    setShowExplanation(false);
    try {
      const newQuestions = await generateQuestions(subject, level);
      setQuestions(newQuestions);
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("Failed to load questions. Try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleOpenNews = async () => {
    setShowNews(true);
    setShowAtlas(false);
    setShowWaec(false);
    setShowUni(false);
    setShowVideoPortal(false);
    setRoadmap(null);
    setQuizSubject(null);
    if (newsData) return;
    
    setNewsLoading(true);
    try {
      const data = await fetchDailyPortal();
      setNewsData(data);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleOpenAtlas = async () => {
    setShowAtlas(true);
    setShowNews(false);
    setShowWaec(false);
    setShowUni(false);
    setShowVideoPortal(false);
    setRoadmap(null);
    setQuizSubject(null);
    if (countries.length > 0) return;

    setAtlasLoading(true);
    try {
      const data = await fetchCountries();
      setCountries(data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setAtlasLoading(false);
    }
  };

  const handleOpenWaec = async (subject?: string) => {
    setShowWaec(true);
    setShowNews(false);
    setShowAtlas(false);
    setShowUni(false);
    setShowVideoPortal(false);
    setRoadmap(null);
    setQuizSubject(null);
    if (!subject) return;

    setWaecSubject(subject);
    setWaecLoading(true);
    setWaecAnswers({});
    setShowWaecResults(false);
    try {
      const data = await generateWaecQuestions(subject);
      setWaecQuestions(data);
    } catch (error) {
      console.error("Error fetching WAEC questions:", error);
    } finally {
      setWaecLoading(false);
    }
  };

  const handleOpenUni = async (name: string = "", country: string = "") => {
    setShowUni(true);
    setShowWaec(false);
    setShowVideoPortal(false);
    setShowNews(false);
    setShowAtlas(false);
    setRoadmap(null);
    setQuizSubject(null);

    setUniSearch(name);
    setUniCountrySearch(country);
    setUniLoading(true);
    try {
      // If both are empty, fetch some featured ones (e.g. USA, UK, Canada, Nigeria)
      if (!name && !country) {
        const featuredCountries = ["United States", "United Kingdom", "Canada", "Nigeria"];
        const results = await Promise.all(featuredCountries.map(c => fetchUniversities("", c)));
        setUniversities(results.flat().slice(0, 50)); // Show top 50
      } else {
        const data = await fetchUniversities(name, country);
        setUniversities(data);
      }
    } catch (error) {
      console.error("Error fetching universities:", error);
    } finally {
      setUniLoading(false);
    }
  };

  const handleOpenVideoPortal = async () => {
    setShowVideoPortal(true);
    setShowUni(false);
    setShowWaec(false);
    setShowNews(false);
    setShowAtlas(false);
    setRoadmap(null);
    setQuizSubject(null);

    if (videoUrl) return;

    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }

    setVideoLoading(true);
    try {
      const url = await generateStudentVideo("A diverse group of students in a modern classroom, some using tablets and laptops with the LEARN GLOBAL logo, smiling and collaborating on a global studies project. High quality, cinematic lighting, 4k.");
      setVideoUrl(url);
    } catch (error: any) {
      console.error("Error generating video:", error);
      let errorMsg = "Failed to generate video.";
      
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error?.code === 403) {
          errorMsg = "Permission Denied: Please ensure you have selected a valid PAID API key from a Google Cloud project with billing enabled. Veo requires a paid tier key.";
          // Re-open key selector on 403
          await (window as any).aistudio.openSelectKey();
        } else if (parsedError.error?.message?.includes("Requested entity was not found")) {
          await (window as any).aistudio.openSelectKey();
        }
      } catch (e) {
        // Not a JSON error message
        if (error.message?.includes("403")) {
           errorMsg = "Permission Denied: Please ensure you have selected a valid PAID API key from a Google Cloud project with billing enabled. Veo requires a paid tier key.";
           await (window as any).aistudio.openSelectKey();
        }
      }
      
      alert(errorMsg);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleSuggestTopics = async () => {
    if (!query.trim()) return;
    setSuggestionsLoading(true);
    try {
      const topics = await fetchSubjectTopics(query, level);
      setSuggestedTopics(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = { role: "user", text: userInput };
    setChatMessages(prev => [...prev, newMessage]);
    setUserInput("");
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(userInput, chatMessages);
      setChatMessages(prev => [...prev, { role: "model", text: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: "model", text: "Sorry, I'm having trouble connecting. Try again soon!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showExplanation) return;
    setSelectedOption(option);
    setShowExplanation(true);
    if (option === questions[currentQuestionIdx].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const toggleStep = (stepId: string) => {
    setProgress((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const currentStep = roadmap?.steps.find((s) => s.id === selectedStepId);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-sans selection:bg-[#E6F4EA]">
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#FDFCF8] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 1.2, 
                ease: [0, 0.71, 0.2, 1.01],
                scale: {
                  type: "spring",
                  damping: 12,
                  stiffness: 100,
                  restDelta: 0.001
                }
              }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-[#008751] rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-[#008751]/20">
                <GraduationCap size={56} />
              </div>
              <div className="text-center">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="text-5xl font-black tracking-tighter text-[#008751]"
                >
                  LEARN <span className="text-[#1A1A1A]">GLOBAL</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="text-[#666] font-medium mt-2 tracking-widest uppercase text-xs"
                >
                  Global Studies Made Simple
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-[#E5E5E0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setRoadmap(null); setSelectedStepId(null); setQuery(""); setQuizSubject(null); setShowNews(false); setShowAtlas(false); setShowWaec(false); setShowUni(false); setShowVideoPortal(false); }}
          >
            <div className="w-10 h-10 bg-[#008751] rounded-xl flex items-center justify-center text-white shadow-sm">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#008751]">LEARN <span className="text-[#1A1A1A]">GLOBAL</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleOpenUni()}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#E5E5E0] transition-all"
            >
              <GraduationCap size={16} />
              <span>Uni Portal</span>
            </button>
            <button 
              onClick={() => handleOpenWaec()}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#E5E5E0] transition-all"
            >
              <BookOpen size={16} />
              <span>WAEC Portal</span>
            </button>
            <button 
              onClick={handleOpenAtlas}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#E5E5E0] transition-all"
            >
              <Globe size={16} />
              <span>World Atlas</span>
            </button>
            <button 
              onClick={handleOpenNews}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#E5E5E0] transition-all"
            >
              <Newspaper size={16} />
              <span>World News</span>
            </button>
            <button 
              onClick={handleOpenVideoPortal}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#E5E5E0] transition-all"
            >
              <Video size={16} />
              <span>Video Portal</span>
            </button>
            <button 
              onClick={() => {
                setShowHistory(true);
                setShowUni(false);
                setShowWaec(false);
                setShowNews(false);
                setShowAtlas(false);
                setRoadmap(null);
                setQuizSubject(null);
                setShowVideoPortal(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all"
            >
              <Clock size={16} />
              <span>History</span>
            </button>
            {(roadmap || quizSubject || showNews || showAtlas || showWaec || showUni || showVideoPortal || showHistory) && (
              <button 
                onClick={() => { setRoadmap(null); setSelectedStepId(null); setQuizSubject(null); setShowNews(false); setShowAtlas(false); setShowWaec(false); setShowUni(false); setShowVideoPortal(false); setShowHistory(false); }}
                className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Home
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1A]">Learning History</h2>
                    <p className="text-[#666]">Your previous searches, roadmaps, and quiz results.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
                  >
                    <Trash2 size={18} />
                    <span>Clear All</span>
                  </button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft size={24} />
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-white border border-[#E5E5E0] rounded-[2.5rem] space-y-4">
                  <div className="w-20 h-20 bg-amber-50 text-amber-200 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#1A1A1A]">No history yet</h3>
                    <p className="text-[#666] max-w-xs mx-auto">Start exploring topics or taking quizzes to see your history here!</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group bg-white border border-[#E5E5E0] p-6 rounded-3xl hover:border-[#008751] transition-all cursor-pointer shadow-sm flex items-center justify-between"
                      onClick={() => {
                        if (item.type === "roadmap") {
                          setRoadmap(item.data);
                          setQuery(item.title);
                          setShowHistory(false);
                        } else if (item.type === "quiz") {
                          setQuizSubject(item.data.subject);
                          setQuestions([]); // Will trigger re-fetch or I could store questions too
                          // For now, just re-trigger the quiz start
                          handleStartQuiz(item.data.subject);
                          setShowHistory(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          item.type === "roadmap" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                        )}>
                          {item.type === "roadmap" ? <BookOpen size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] group-hover:text-[#008751] transition-colors">{item.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-[#999] mt-1">
                            <span className="uppercase font-black tracking-widest">{item.type}</span>
                            <span>•</span>
                            <span>{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.type === "quiz" && (
                          <div className="text-right">
                            <div className="text-sm font-black text-[#008751]">{item.data.score}/{item.data.total}</div>
                            <div className="text-[10px] uppercase font-bold text-[#999]">Score</div>
                          </div>
                        )}
                        <ArrowRight size={20} className="text-[#CCC] group-hover:text-[#008751] group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : showUni ? (
            <motion.div
              key="uni"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-[#1A1A1A]">Global University Portal</h2>
                  <p className="text-[#666]">Find and explore universities from all around the world.</p>
                </div>
                <button
                  onClick={() => setShowUni(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-[2]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={20} />
                  <input
                    type="text"
                    value={uniSearch}
                    onChange={(e) => setUniSearch(e.target.value)}
                    placeholder="Search by university name..."
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#E5E5E0] rounded-2xl focus:outline-none focus:border-[#008751] transition-all"
                  />
                </div>
                <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={20} />
                  <select
                    value={uniCountrySearch}
                    onChange={(e) => {
                      setUniCountrySearch(e.target.value);
                      handleOpenUni("", e.target.value);
                    }}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#E5E5E0] rounded-2xl focus:outline-none focus:border-[#008751] transition-all appearance-none text-[#666]"
                  >
                    <option value="">All Countries</option>
                    {countries.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleOpenUni(uniSearch, uniCountrySearch)}
                  className="px-8 h-14 bg-[#008751] text-white rounded-2xl font-bold hover:bg-[#007043] transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Search size={20} />
                  <span>Search</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-[#999] uppercase tracking-widest mr-2 py-2">Quick Browse:</span>
                {["Nigeria", "United States", "United Kingdom", "Canada", "Ghana", "South Africa", "India", "Australia"].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setUniCountrySearch(c);
                      handleOpenUni("", c);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                      uniCountrySearch === c ? "bg-[#008751] text-white border-[#008751]" : "bg-white text-[#666] border-[#E5E5E0] hover:border-[#008751]"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {uniLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-[#008751]" size={40} />
                  <p className="text-[#666] font-medium">Searching universities...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {universities.length > 0 ? (
                    universities.map((uni, i) => (
                      <motion.div
                        key={`${uni.name}-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-white border border-[#E5E5E0] rounded-3xl hover:border-[#008751] hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <h4 className="font-bold text-lg text-[#1A1A1A] group-hover:text-[#008751] transition-colors">
                              {uni.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-[#666]">
                              <Globe size={14} className="text-[#008751]" />
                              <span>{uni.country}</span>
                              {uni["state-province"] && (
                                <>
                                  <span>•</span>
                                  <span>{uni["state-province"]}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {uni.web_pages?.[0] && (
                            <a
                              href={uni.web_pages[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl hover:bg-[#008751] hover:text-white transition-all"
                            >
                              <ExternalLink size={18} />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-[#666]">No universities found. Try a different search term.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : showWaec ? (
            <motion.div
              key="waec"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-[#1A1A1A]">WAEC Past Questions</h2>
                  <p className="text-[#666]">Practice with authentic West African Examination Council questions.</p>
                </div>
                <button
                  onClick={() => setShowWaec(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              </div>

              {!waecSubject ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["Mathematics", "English Language", "Biology", "Physics", "Chemistry", "Economics", "Government", "Literature"].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => handleOpenWaec(sub)}
                      className="p-6 bg-white border border-[#E5E5E0] rounded-3xl text-center hover:border-[#008751] hover:shadow-md transition-all group"
                    >
                      <h4 className="font-bold text-[#1A1A1A] group-hover:text-[#008751]">{sub}</h4>
                    </button>
                  ))}
                </div>
              ) : waecLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-[#008751]" size={40} />
                  <p className="text-[#666] font-medium">Generating {waecSubject} questions...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#008751]">{waecSubject} Past Questions</h3>
                    <button 
                      onClick={() => setWaecSubject("")}
                      className="text-sm font-bold text-[#666] hover:text-[#1A1A1A]"
                    >
                      Change Subject
                    </button>
                  </div>
                  <div className="space-y-6">
                    {waecQuestions.map((q, i) => (
                      <div key={q.id} className="bg-white border border-[#E5E5E0] rounded-3xl p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-[#666] uppercase tracking-widest">Question {i + 1}</span>
                            <span className="px-3 py-1 bg-[#F0F0EB] rounded-lg text-[10px] font-bold text-[#008751] uppercase tracking-widest">{q.type}</span>
                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-[#666]">{q.year}</span>
                          </div>
                        </div>
                        <p className="text-lg font-medium text-[#1A1A1A] leading-relaxed">{q.question}</p>
                        
                        {q.type === "objective" ? (
                          <div className="grid gap-3">
                            {q.options?.map((opt) => (
                              <button 
                                key={opt}
                                onClick={() => !showWaecResults && setWaecAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={cn(
                                  "p-4 rounded-xl border-2 transition-all text-left",
                                  waecAnswers[q.id] === opt 
                                    ? (showWaecResults 
                                        ? (opt === q.correctAnswer ? "border-[#008751] bg-[#E6F4EA]" : "border-red-500 bg-red-50")
                                        : "border-[#008751] bg-[#F8FDF9]")
                                    : (showWaecResults && opt === q.correctAnswer ? "border-[#008751] bg-[#E6F4EA]" : "border-[#F0F0EB] bg-[#FDFCF8] hover:border-[#008751]/30")
                                )}
                              >
                                <span className="font-medium">{opt}</span>
                                {showWaecResults && opt === q.correctAnswer && <span className="ml-2 text-xs font-bold text-[#008751] uppercase">(Correct)</span>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {!showWaecResults ? (
                              <div className="p-6 border-2 border-dashed border-[#E5E5E0] rounded-2xl text-center">
                                <p className="text-[#666] text-sm italic">Think about your answer or write it down, then click "Submit All" at the bottom to see the sample answer.</p>
                              </div>
                            ) : (
                              <div className="p-6 bg-[#F8FDF9] border border-[#C6E9D1] rounded-2xl space-y-3">
                                <h5 className="text-sm font-bold text-[#008751] uppercase tracking-wider">Sample Answer / Solution:</h5>
                                <p className="text-[#333] leading-relaxed whitespace-pre-wrap">{q.sampleAnswer}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {showWaecResults && (
                          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <h5 className="text-sm font-bold text-blue-700 mb-1 flex items-center gap-2">
                              <HelpCircle size={14} />
                              Explanation
                            </h5>
                            <p className="text-sm text-blue-800 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!showWaecResults && (
                    <div className="flex justify-center pt-8">
                      <button
                        onClick={() => setShowWaecResults(true)}
                        className="px-12 py-4 bg-[#008751] text-white rounded-2xl font-bold hover:bg-[#007043] shadow-lg transition-all hover:scale-105"
                      >
                        Submit Practice & Show Answers
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : showAtlas ? (
            <motion.div
              key="atlas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-[#1A1A1A]">World Atlas</h2>
                  <p className="text-[#666]">Learn about countries, their capitals, and locations.</p>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={atlasSearch}
                    onChange={(e) => setAtlasSearch(e.target.value)}
                    placeholder="Search countries..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E0] rounded-xl focus:outline-none focus:border-[#008751] transition-all"
                  />
                </div>
              </div>

              {atlasLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-[#008751]" size={40} />
                  <p className="text-[#666] font-medium">Loading the world map...</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {countries
                    .filter(c => c.name.toLowerCase().includes(atlasSearch.toLowerCase()) || c.capital.toLowerCase().includes(atlasSearch.toLowerCase()))
                    .map((country, i) => (
                      <motion.div
                        key={country.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className="bg-white border border-[#E5E5E0] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <img 
                            src={country.flag} 
                            alt={`${country.name} flag`}
                            className="w-16 h-10 object-cover rounded-md shadow-sm border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={country.mapUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                            title="View on Google Maps"
                          >
                            <Globe size={18} />
                          </a>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#008751] transition-colors">
                            {country.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-[#666]">
                            <span className="font-bold text-[#008751]">Capital:</span>
                            <span>{country.capital}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#999] mt-2">
                            <span>{country.region}</span>
                            <span>•</span>
                            <span>{country.population.toLocaleString()} people</span>
                          </div>
                          <button
                            onClick={() => handleOpenUni("", country.name)}
                            className="w-full mt-4 py-2 bg-[#F0F0EB] text-[#1A1A1A] rounded-xl text-xs font-bold hover:bg-[#008751] hover:text-white transition-all flex items-center justify-center gap-2"
                          >
                            <School size={14} />
                            <span>View Universities</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          ) : showVideoPortal ? (
            <motion.div
              key="video-portal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <h2 className="text-4xl font-black text-[#1A1A1A] tracking-tighter">Video Portal</h2>
                  <p className="text-[#666] font-medium uppercase tracking-widest text-xs">Students using LEARN GLOBAL worldwide</p>
                </div>
                <button
                  onClick={() => setShowVideoPortal(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-all"
                >
                  <ArrowLeft size={28} />
                </button>
              </div>

              <div className="max-w-5xl mx-auto">
                {videoLoading ? (
                  <div className="aspect-video bg-white border-2 border-dashed border-[#E5E5E0] rounded-[3rem] flex flex-col items-center justify-center gap-6 p-12 text-center">
                    <div className="relative">
                      <Loader2 className="animate-spin text-[#008751]" size={64} />
                      <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#008751]" size={24} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-[#1A1A1A]">Prof. Global is generating your video...</h3>
                      <p className="text-[#666] max-w-md mx-auto">This takes about 30-60 seconds. We're creating a cinematic look at students learning worldwide with our app!</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-[#008751] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-[#008751] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-[#008751] rounded-full animate-bounce" />
                    </div>
                  </div>
                ) : videoUrl ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-black"
                  >
                    <video 
                      controls 
                      autoPlay 
                      className="w-full aspect-video object-cover"
                    >
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-6 right-6 z-10">
                      <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Generated with Veo</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="aspect-video bg-white border-2 border-[#E5E5E0] rounded-[3rem] flex flex-col items-center justify-center gap-8 p-12 text-center">
                    <div className="w-24 h-24 bg-[#E6F4EA] rounded-full flex items-center justify-center text-[#008751]">
                      <Play size={48} className="ml-2" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-[#1A1A1A] tracking-tight">Ready to see the community?</h3>
                      <p className="text-[#666] max-w-md mx-auto">Click below to generate a cinematic video of students across the globe using LEARN GLOBAL to master their studies.</p>
                      <button
                        onClick={handleOpenVideoPortal}
                        className="px-10 py-4 bg-[#008751] text-white rounded-2xl font-black text-lg hover:bg-[#007043] transition-all shadow-xl shadow-[#008751]/20 flex items-center gap-3 mx-auto"
                      >
                        <Video size={24} />
                        <span>Generate Student Video</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-12 grid md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E5E0] space-y-4 text-left">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Globe size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-[#1A1A1A]">Global Reach</h4>
                    <p className="text-sm text-[#666] leading-relaxed">Students from over 150 countries use LEARN GLOBAL to simplify their complex subjects.</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E5E0] space-y-4 text-left">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#008751]">
                      <GraduationCap size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-[#1A1A1A]">Academic Success</h4>
                    <p className="text-sm text-[#666] leading-relaxed">92% of our students report better grades after using our AI-powered study roadmaps.</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E5E0] space-y-4 text-left">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                      <Zap size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-[#1A1A1A]">Fast Learning</h4>
                    <p className="text-sm text-[#666] leading-relaxed">Master any topic 3x faster with Prof. Global's simple, child-friendly explanations.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : showNews ? (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-[#1A1A1A]">World News</h2>
                  <p className="text-[#666]">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <button
                  onClick={() => setShowNews(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              </div>

              {newsLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-[#008751]" size={40} />
                  <p className="text-[#666] font-medium">Fetching today's highlights...</p>
                </div>
              ) : newsData ? (
                <div className="grid gap-12">
                  {/* News Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Newspaper className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#1A1A1A]">Current Affairs</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {newsData.news.map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group bg-white border border-[#E5E5E0] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                              item.category === "Nigeria" ? "bg-[#008751]/10 text-[#008751]" : "bg-gray-100 text-[#666]"
                            )}>
                              {item.category}
                            </span>
                            <span className="text-xs text-[#999]">{item.source}</span>
                          </div>
                          <h4 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#008751] transition-colors mb-2">
                            {item.title}
                          </h4>
                          <p className="text-sm text-[#666] leading-relaxed line-clamp-3">
                            {item.summary}
                          </p>
                        </a>
                      ))}
                    </div>
                  </section>

                  {/* History Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <History className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#1A1A1A]">This Day in History</h3>
                    </div>
                    <div className="space-y-4">
                      {newsData.history.map((event, i) => (
                        <div key={i} className="flex gap-6 p-6 bg-white border border-[#E5E5E0] rounded-3xl shadow-sm">
                          <div className="text-2xl font-black text-[#008751] opacity-20 tabular-nums">
                            {event.year}
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-[#1A1A1A]">{event.event}</h4>
                            <p className="text-sm text-[#666] leading-relaxed italic">
                              "{event.significance}"
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-[#666]">Failed to load news data. Please try again.</p>
                  <button onClick={handleOpenNews} className="mt-4 text-[#008751] font-bold">Retry</button>
                </div>
              )}
            </motion.div>
          ) : !roadmap && !quizSubject ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-12 py-12"
            >
              <div className="space-y-12">
                {/* Professor's Proactive Tip */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto bg-white border-2 border-[#008751]/20 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:border-[#008751]/40 transition-all"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <GraduationCap size={80} className="text-[#008751]" />
                  </div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 bg-[#E6F4EA] rounded-2xl flex items-center justify-center text-[#008751] shrink-0">
                      <Zap size={24} className="animate-pulse" />
                    </div>
                    <div className="text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#008751] bg-[#E6F4EA] px-2 py-0.5 rounded-full">Prof. Global's Tip</span>
                        <span className="text-[10px] font-bold text-[#999] uppercase tracking-widest">Proactive Mode Active</span>
                      </div>
                      <h4 className="text-lg font-bold text-[#1A1A1A]">
                        {tipLoading ? "Prof. Global is thinking..." : professorTip || "Always start with the basics to build a strong foundation!"}
                      </h4>
                    </div>
                  </div>
                </motion.div>

                {/* Hero Video Section */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                  className="max-w-3xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white relative group"
                >
                  {/* Live Badge */}
                  <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live</span>
                  </div>

                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-cover aspect-video"
                  >
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-students-walking-in-a-university-campus-4437-large.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 text-left">
                    <motion.h3 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.5 }}
                      className="text-white font-black text-3xl md:text-4xl tracking-tighter mb-1"
                    >
                      LEARN THE WORLD HERE
                    </motion.h3>
                    <motion.p 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 1.8 }}
                      className="text-white/90 font-bold text-sm md:text-base"
                    >
                      Students worldwide achieving more with LEARN GLOBAL
                    </motion.p>
                  </div>
                </motion.div>

                <div className="space-y-6">
                  <div className="overflow-hidden py-2">
                    <motion.h2 
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      transition={{ 
                        duration: 1.2, 
                        ease: "easeOut",
                        type: "spring",
                        damping: 20
                      }}
                      className="text-4xl md:text-6xl font-black tracking-tighter text-[#1A1A1A]"
                    >
                      What do you want to <span className="text-[#008751]">learn today?</span>
                    </motion.h2>
                  </div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-lg md:text-xl text-[#666] max-w-2xl mx-auto font-medium"
                  >
                    Global studies made simple. From Secondary School to University standards, explained so simply even a child can understand.
                  </motion.p>
                </div>
              </div>

              <div className="flex justify-center mb-6">
                <div className="bg-[#F0F0EB] p-1 rounded-2xl flex gap-1">
                  <button
                    onClick={() => setLevel("Secondary")}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      level === "Secondary" ? "bg-white text-[#008751] shadow-sm" : "text-[#666] hover:text-[#1A1A1A]"
                    )}
                  >
                    Secondary School
                  </button>
                  <button
                    onClick={() => setLevel("University")}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      level === "University" ? "bg-white text-[#008751] shadow-sm" : "text-[#666] hover:text-[#1A1A1A]"
                    )}
                  >
                    University / International
                  </button>
                </div>
              </div>

              <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (suggestedTopics.length > 0) setSuggestedTopics([]);
                    }}
                    placeholder={level === "Secondary" ? "Enter a subject (e.g. Biology, History)..." : "Enter a subject (e.g. Quantum Physics, Sociology)..."}
                    className="w-full h-16 pl-6 pr-32 bg-white border-2 border-[#E5E5E0] rounded-2xl text-lg focus:outline-none focus:border-[#008751] transition-all shadow-sm"
                    disabled={loading}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F4EA] rounded-xl border border-[#008751]/10 mr-2">
                      <Zap size={14} className="text-[#008751]" />
                      <span className="text-[10px] font-bold text-[#008751] uppercase tracking-wider">Fast Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSuggestTopics}
                      disabled={suggestionsLoading || !query.trim()}
                      className="p-3 bg-[#F0F0EB] text-[#008751] rounded-xl hover:bg-[#E5E5E0] transition-all disabled:opacity-50"
                      title="Suggest Topics"
                    >
                      {suggestionsLoading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="p-3 bg-[#008751] text-white rounded-xl font-semibold hover:bg-[#007043] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    </button>
                  </div>
                </div>

                {suggestedTopics.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 w-full mt-2 bg-white border border-[#E5E5E0] rounded-2xl shadow-xl overflow-hidden"
                  >
                    <div className="p-3 bg-gray-50 border-b border-[#E5E5E0] flex justify-between items-center">
                      <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Suggested Topics for "{query}"</span>
                      <button onClick={() => setSuggestedTopics([])} className="text-[#999] hover:text-[#1A1A1A]"><X size={14} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                      {suggestedTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            setQuery(topic);
                            setSuggestedTopics([]);
                          }}
                          className="flex items-center gap-2 px-4 py-3 text-left hover:bg-[#E6F4EA] hover:text-[#008751] rounded-xl transition-colors group"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#008751] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="font-medium">{topic}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </form>

              {history.length > 0 && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#999]">Recent Activity</h3>
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="text-xs font-bold text-[#008751] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {history.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.type === "roadmap") {
                            setRoadmap(item.data);
                            setQuery(item.title);
                          } else if (item.type === "quiz") {
                            setQuizSubject(item.data.subject);
                            handleStartQuiz(item.data.subject);
                          }
                        }}
                        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border border-[#E5E5E0] rounded-2xl hover:border-[#008751] transition-all shadow-sm group"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          item.type === "roadmap" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                        )}>
                          {item.type === "roadmap" ? <BookOpen size={16} /> : <CheckCircle2 size={16} />}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#008751] transition-colors truncate max-w-[120px]">{item.title}</div>
                          <div className="text-[10px] text-[#999]">{new Date(item.timestamp).toLocaleDateString()}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-[#666] uppercase tracking-widest">Or try a Practice Quiz ({level})</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { name: "Biology", color: "bg-green-100 text-green-700 border-green-200" },
                    { name: "Physics", color: "bg-blue-100 text-blue-700 border-blue-200" },
                    { name: "Chemistry", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                    { name: "Computer Science", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
                    { name: "Literature", color: "bg-purple-100 text-purple-700 border-purple-200" },
                    { name: "Government", color: "bg-red-100 text-red-700 border-red-200" },
                    { name: "Economics", color: "bg-amber-100 text-amber-700 border-amber-200" },
                    { name: "History", color: "bg-stone-100 text-stone-700 border-stone-200" }
                  ].map((subject) => (
                    <button
                      key={subject.name}
                      onClick={() => handleStartQuiz(subject.name)}
                      className={cn("px-5 py-3 rounded-2xl border font-bold transition-all hover:scale-105", subject.color)}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : quizSubject ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <button
                onClick={() => setQuizSubject(null)}
                className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Home</span>
              </button>

              <div className="bg-white border border-[#E5E5E0] rounded-3xl p-8 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{quizSubject} Quiz</h2>
                  <div className="text-sm font-bold text-[#008751]">Score: {score}/{questions.length}</div>
                </div>

                {quizLoading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[#008751]" size={40} />
                    <p className="text-[#666] font-medium">Preparing your questions...</p>
                  </div>
                ) : questions.length > 0 && currentQuestionIdx < questions.length ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#666] uppercase tracking-widest">Question {currentQuestionIdx + 1} of {questions.length}</div>
                      <p className="text-xl font-bold text-[#1A1A1A]">{questions[currentQuestionIdx].question}</p>
                    </div>

                    <div className="grid gap-3">
                      {questions[currentQuestionIdx].options.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleOptionSelect(option)}
                          disabled={showExplanation}
                          className={cn(
                            "w-full p-4 text-left rounded-xl border-2 font-medium transition-all",
                            selectedOption === option 
                              ? (option === questions[currentQuestionIdx].correctAnswer ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")
                              : (showExplanation && option === questions[currentQuestionIdx].correctAnswer ? "border-green-500 bg-green-50" : "border-[#E5E5E0] hover:border-[#008751]")
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {showExplanation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-[#F8FDF9] border border-[#C6E9D1] rounded-xl space-y-2"
                      >
                        <div className="font-bold text-[#008751]">
                          {selectedOption === questions[currentQuestionIdx].correctAnswer ? "Correct!" : "Incorrect"}
                        </div>
                        <p className="text-[#333] text-sm leading-relaxed">{questions[currentQuestionIdx].explanation}</p>
                        <button
                          onClick={() => {
                            if (currentQuestionIdx < questions.length - 1) {
                              setCurrentQuestionIdx(prev => prev + 1);
                              setSelectedOption(null);
                              setShowExplanation(false);
                            } else {
                              setCurrentQuestionIdx(questions.length); // End quiz
                              saveToHistory("quiz", `${quizSubject} Quiz`, { score, total: questions.length, subject: quizSubject });
                            }
                          }}
                          className="mt-2 w-full py-3 bg-[#008751] text-white rounded-xl font-bold hover:bg-[#007043] transition-all"
                        >
                          {currentQuestionIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : currentQuestionIdx >= questions.length ? (
                  <div className="py-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-[#E6F4EA] text-[#008751] rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">Quiz Completed!</h3>
                      <p className="text-[#666]">You scored <span className="text-[#008751] font-bold">{score} out of {questions.length}</span></p>
                    </div>
                    <button
                      onClick={() => setQuizSubject(null)}
                      className="px-8 py-3 bg-[#008751] text-white rounded-xl font-bold hover:bg-[#007043] transition-all"
                    >
                      Back to Home
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : !selectedStepId ? (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#008751] font-semibold text-sm uppercase tracking-wider">
                  <BookOpen size={16} />
                  <span>Learning Roadmap</span>
                </div>
                <h2 className="text-3xl font-bold text-[#1A1A1A]">{roadmap.topic}</h2>
              </div>

              <div className="grid gap-4">
                {roadmap.steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "group relative flex items-center gap-4 p-5 bg-white border border-[#E5E5E0] rounded-2xl hover:border-[#008751] transition-all cursor-pointer shadow-sm",
                      progress[step.id] && "bg-[#F8FDF9] border-[#C6E9D1]"
                    )}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStep(step.id);
                      }}
                      className="flex-shrink-0 text-[#008751] hover:scale-110 transition-transform"
                    >
                      {progress[step.id] ? (
                        <CheckCircle2 size={28} className="fill-[#008751] text-white" />
                      ) : (
                        <Circle size={28} className="text-[#E5E5E0] group-hover:text-[#008751]" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-[#666] uppercase tracking-widest mb-1">Step {index + 1}</div>
                      <h3 className={cn(
                        "text-lg font-bold text-[#1A1A1A]",
                        progress[step.id] && "text-[#666] line-through decoration-2"
                      )}>
                        {step.title}
                      </h3>
                    </div>
                    <div className="text-[#E5E5E0] group-hover:text-[#008751] transition-colors">
                      <BookOpen size={20} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button
                onClick={() => setSelectedStepId(null)}
                className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Roadmap</span>
              </button>

              <div className="bg-white border border-[#E5E5E0] rounded-3xl p-8 md:p-12 shadow-sm space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#008751] uppercase tracking-widest">
                      Step {roadmap.steps.findIndex(s => s.id === selectedStepId) + 1} of {roadmap.steps.length}
                    </div>
                    <button
                      onClick={() => toggleStep(selectedStepId)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all",
                        progress[selectedStepId] 
                          ? "bg-[#008751] text-white" 
                          : "bg-[#F0F0EB] text-[#666] hover:bg-[#E5E5E0]"
                      )}
                    >
                      {progress[selectedStepId] ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      {progress[selectedStepId] ? "Completed" : "Mark as Done"}
                    </button>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-tight">
                    {currentStep?.title}
                  </h2>
                </div>

                <div className="prose prose-lg max-w-none text-[#333] leading-relaxed">
                  <ReactMarkdown>{currentStep?.explanation || ""}</ReactMarkdown>
                </div>

                <div className="pt-8 border-t border-[#F0F0EB] space-y-6">
                  <h4 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    <ExternalLink size={20} className="text-[#008751]" />
                    Free Resources to Learn More
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {currentStep?.resources.map((resource, idx) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-[#F8FDF9] border border-[#C6E9D1] rounded-2xl hover:bg-[#E6F4EA] transition-all group"
                      >
                        <span className="font-bold text-[#008751] group-hover:underline">{resource.title}</span>
                        <ExternalLink size={16} className="text-[#008751] opacity-50 group-hover:opacity-100" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-4">
                {roadmap.steps.findIndex(s => s.id === selectedStepId) > 0 ? (
                  <button
                    onClick={() => {
                      const idx = roadmap.steps.findIndex(s => s.id === selectedStepId);
                      setSelectedStepId(roadmap.steps[idx - 1].id);
                    }}
                    className="text-[#666] hover:text-[#1A1A1A] font-bold flex items-center gap-2"
                  >
                    <ArrowLeft size={16} /> Previous Step
                  </button>
                ) : <div />}

                {roadmap.steps.findIndex(s => s.id === selectedStepId) < roadmap.steps.length - 1 ? (
                  <button
                    onClick={() => {
                      const idx = roadmap.steps.findIndex(s => s.id === selectedStepId);
                      setSelectedStepId(roadmap.steps[idx + 1].id);
                    }}
                    className="bg-[#008751] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#007043] transition-all flex items-center gap-2"
                  >
                    Next Step <ArrowLeft size={16} className="rotate-180" />
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedStepId(null)}
                    className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#333] transition-all"
                  >
                    Back to Roadmap
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Assistant Floating Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#008751] text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
      >
        {isChatOpen ? <X size={28} /> : (
          <div className="relative">
            <MessageCircle size={28} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
          </div>
        )}
        <div className="absolute right-full mr-4 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Chat with Prof. Global
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl border border-[#E5E5E0] flex flex-col z-[60] overflow-hidden"
          >
            <div className="p-4 bg-[#008751] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="font-bold">Prof. Global</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Online & Proactive</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCF8]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === "user" 
                      ? "bg-[#008751] text-white rounded-tr-none" 
                      : "bg-white border border-[#E5E5E0] text-[#1A1A1A] rounded-tl-none"
                  )}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E5E5E0] p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#008751] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#008751] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-[#008751] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#E5E5E0]">
              <div className="relative">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask Prof. Global anything..."
                  className="w-full pl-4 pr-12 py-3 bg-[#F0F0EB] border-none rounded-xl focus:ring-2 focus:ring-[#008751] transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#008751] disabled:opacity-30"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-[#E5E5E0] mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-[#008751] font-bold">
            <GraduationCap size={20} />
            <span>LearnPath Nigeria</span>
          </div>
          <p className="text-sm text-[#666]">
            Designed for Nigerian students. Free, always. 🇳🇬
          </p>
        </div>
      </footer>
    </div>
  );
}
