import React, { useState, useEffect } from "react";
import { Search, CheckCircle2, Circle, BookOpen, ExternalLink, ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { generateRoadmap } from "./services/geminiService";
import { Roadmap, RoadmapStep } from "./types";
import { cn } from "./lib/utils";

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const newRoadmap = await generateRoadmap(query);
      setRoadmap(newRoadmap);
      setSelectedStepId(null);
    } catch (error) {
      console.error("Error generating roadmap:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
      {/* Header */}
      <header className="border-b border-[#E5E5E0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => { setRoadmap(null); setSelectedStepId(null); setQuery(""); }}
          >
            <div className="w-10 h-10 bg-[#008751] rounded-xl flex items-center justify-center text-white shadow-sm">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#008751]">LearnPath <span className="text-[#1A1A1A]">Nigeria</span></h1>
          </div>
          {roadmap && (
            <button 
              onClick={() => { setRoadmap(null); setSelectedStepId(null); }}
              className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              New Search
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {!roadmap ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 py-12"
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A]">
                  What do you want to <span className="text-[#008751]">learn today?</span>
                </h2>
                <p className="text-lg text-[#666] max-w-xl mx-auto">
                  Type any topic (like Algebra, Photosynthesis, or Economics) and we'll build a simple roadmap just for you.
                </p>
              </div>

              <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. How to solve Quadratic Equations"
                  className="w-full h-16 pl-6 pr-32 bg-white border-2 border-[#E5E5E0] rounded-2xl text-lg focus:outline-none focus:border-[#008751] transition-all shadow-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-[#008751] text-white rounded-xl font-semibold hover:bg-[#007043] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  <span>{loading ? "Building..." : "Search"}</span>
                </button>
              </form>

              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {["Photosynthesis", "Algebra", "Civic Education", "Economics", "Literature"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setQuery(tag); }}
                    className="px-4 py-2 bg-[#F0F0EB] hover:bg-[#E5E5E0] rounded-full text-sm font-medium text-[#666] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
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
