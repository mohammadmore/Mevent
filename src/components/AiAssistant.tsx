import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, User as UserIcon } from 'lucide-react';

export default function AiAssistant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'سلام! من دستیار هوشمند Mevent هستم. دنبال چه نوع رویدادی می‌گردی؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'متاسفانه خطایی رخ داد. لطفا دوباره تلاش کنید.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-[#1f1f23] text-right" dir="rtl">
      <div className="bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black p-4 flex justify-between items-center shadow-md z-10 relative">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-bold">دستیار هوشمند</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-teal-600/10 dark:hover:bg-[#d9ff00]/10 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-white/10 text-gray-700 dark:text-gray-300' : 'bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00]'
            }`}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-white/90 dark:bg-[#18181b] text-white rounded-tl-none' 
                : 'bg-white/90 dark:bg-[#18181b] text-gray-200 border border-gray-200 dark:border-white/10 shadow-sm rounded-tr-none whitespace-pre-wrap'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600/20 dark:bg-[#d9ff00]/20 text-teal-600 dark:text-[#d9ff00] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white/90 dark:bg-[#18181b] p-3 rounded-2xl rounded-tr-none border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-teal-600 dark:bg-[#d9ff00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-teal-600 dark:bg-[#d9ff00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-teal-600 dark:bg-[#d9ff00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/90 dark:bg-[#18181b] border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1f1f23] border border-gray-300 dark:border-white/20 rounded-full px-2 py-1.5 focus-within:border-teal-600 dark:border-[#d9ff00] focus-within:ring-1 focus-within:ring-teal-600 dark:ring-[#d9ff00] transition-all">
          <input 
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-3 text-sm"
            placeholder="سوالت رو اینجا بپرس..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-9 h-9 flex items-center justify-center bg-teal-600 dark:bg-[#d9ff00] text-white dark:text-black rounded-full hover:bg-teal-700 dark:hover:bg-[#c6eb00] disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4 -ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
