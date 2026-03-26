"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Message {
  role: "user" | "bot";
  text: string;
  products?: any[];
  quickReplies?: string[];
  time: string;
}

const GREETINGS: Record<string, string[]> = {
  "hey|hi|hello|yo|sup|what's up|hiya": [
    "Hey! 👋 I'm Pick, your shopping assistant. What are we hunting for today?",
    "Hi there! Ready to find you some amazing deals. What are you looking for?",
    "Hey! How's it going? I'm here to help you shop smarter. What do you need?",
  ],
  "how are you|how's it going|how you doing": [
    "I'm great, thanks for asking! Ready to help you find the best deals. What are you shopping for?",
  ],
  "thanks|thank you|thx|ty": [
    "You're welcome! Let me know if you need anything else!",
    "Happy to help! 🙌",
    "Anytime! Hit me up whenever you need a deal.",
  ],
  "bye|goodbye|see ya|later|peace": [
    "Later! Happy shopping! 🛍️ Come back anytime.",
    "See you! Hope you found something great!",
  ],
  "what can you do|help|what do you do": [
    "Here's what I'm great at:\n🔍 Finding any product across retailers\n💰 Comparing prices for the best deal\n👗 Finding dupes and similar items\n💬 Answering shopping questions\n\nJust type what you're looking for!",
  ],
  "who are you|what is pick": [
    "I'm Pick — your shopping assistant! I search across major retailers to help you find the best prices.",
  ],
};

const SEARCH_PATTERNS = [
  /(?:find|search|show|get|look for|looking for|i need|i want|shop for|any|got any|do you have)\s+(?:me\s+)?(.+)/i,
  /(?:cheapest|best price|best deal|compare price|price for|how much)\s+(?:on|for)?\s*(.+)/i,
  /(?:under|below|less than)\s+\$?(\d+)\s+(.+)/i,
  /(?:similar to|dupe for|alternative to|like)\s+(.+)/i,
];

function getTime(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Chatbot({ onSearch }: { onSearch?: (q: string) => void }) {
  const { isAuthenticated, user, searchesRemaining, incrementSearchCount, getFeatureLimit } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hey! I'm Pick, your shopping assistant. I can help you search for products across major retailers. What are you looking for today?",
      quickReplies: ["Find a deal", "Compare prices", "Help me decide"],
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [searchContext, setSearchContext] = useState<{ lastQuery: string; lastResults: any[] }>({ lastQuery: "", lastResults: [] });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function searchProducts(query: string): Promise<{ products: any[]; retailerLinks: any[] }> {
    try {
      const res = await fetch(`/api/search-live?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      // Limit results based on plan
      const resultLimit = isAuthenticated && user ? Number(getFeatureLimit('resultsPerSearch')) : 10;
      const maxChatResults = user?.plan === 'premium' ? 5 : 3;

      return {
        products: data.results?.slice(0, Math.min(maxChatResults, resultLimit)) || [],
        retailerLinks: data.retailerSearchLinks || [],
      };
    } catch {
      return { products: [], retailerLinks: [] };
    }
  }

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;

    // Check if user has searches remaining (if authenticated and on free plan)
    if (isAuthenticated && user?.plan === 'free' && searchesRemaining <= 0) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: msg, time: getTime() },
        {
          role: "bot",
          text: "You've reached your daily search limit of 5 searches. Upgrade to Premium for unlimited searches!",
          time: getTime(),
        },
      ]);
      return;
    }

    setInput("");

    const userMsg: Message = { role: "user", text: msg, time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    // Small delay for natural feel
    await new Promise((r) => setTimeout(r, 600));

    const lower = msg.toLowerCase().trim();

    // Check greetings
    for (const [patterns, responses] of Object.entries(GREETINGS)) {
      const regex = new RegExp(`^(${patterns})[!?.\\s]*$`, "i");
      if (regex.test(lower)) {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: pickRandom(responses), time: getTime(), quickReplies: ["Find a deal 🔍", "What's trending 🔥"] },
        ]);
        return;
      }
    }

    // Check for follow-ups
    if (searchContext.lastResults.length > 0) {
      if (/^(cheaper|less expensive|budget)/i.test(lower)) {
        const { products: results } = await searchProducts(`cheap ${searchContext.lastQuery}`);
        setSearchContext({ lastQuery: searchContext.lastQuery, lastResults: results });
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: results.length > 0
              ? `Here are some more affordable options for "${searchContext.lastQuery}":`
              : `I couldn't find cheaper options right now. Try broadening your search!`,
            products: results,
            time: getTime(),
            quickReplies: ["Show more", "Different style", "See all results"],
          },
        ]);
        return;
      }
      if (/^(more|show more|load more)/i.test(lower)) {
        const { products: results } = await searchProducts(searchContext.lastQuery);
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: `Here are more results for "${searchContext.lastQuery}":`, products: results, time: getTime() },
        ]);
        return;
      }
    }

    // Check search intent
    let searchQuery = "";
    for (const pattern of SEARCH_PATTERNS) {
      const match = lower.match(pattern);
      if (match) {
        searchQuery = match[match.length - 1].trim();
        break;
      }
    }

    // If no pattern matched but it looks like a product, search anyway
    if (!searchQuery && lower.length > 2 && !/^(yes|no|ok|sure|nah|nope|maybe|idk|lol|haha)$/i.test(lower)) {
      searchQuery = msg;
    }

    if (searchQuery) {
      const { products: results, retailerLinks } = await searchProducts(searchQuery);
      setSearchContext({ lastQuery: searchQuery, lastResults: results });
      setTyping(false);

      // Increment search count for authenticated free users
      if (isAuthenticated && user?.plan === 'free') {
        incrementSearchCount();
      }

      if (results.length > 0) {
        onSearch?.(searchQuery);

        const isPremium = user?.plan === 'premium';
        const upgradeHint = isPremium ? "" : "\n\n💎 Upgrade to Premium for more results and unlimited searches!";

        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `🔍 Found ${results.length}+ results for "${searchQuery}" — here are the top deals:${upgradeHint}`,
            products: results,
            time: getTime(),
            quickReplies: isPremium
              ? ["Cheaper options", "Different style", "See all results"]
              : ["Cheaper options", "Upgrade to Premium 💎"],
          },
        ]);
      } else {
        // No products found - show retailer search links
        const retailerLinksText = retailerLinks.length > 0
          ? `\n\nTry searching directly:\n${retailerLinks.map((link: any) => `• ${link.retailer}`).join('\n')}`
          : '';

        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `I searched for "${searchQuery}" but didn't find exact matches in our database.${retailerLinksText}\n\nTry different keywords or check the main search page for retailer search links!`,
            time: getTime(),
            quickReplies: ["Try something else", "Browse categories"],
          },
        ]);
      }
      return;
    }

    // Fallback — never error
    setTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text: "I'd love to help! Try telling me what you're shopping for, like:\n• \"Find me running shoes under $100\"\n• \"Compare prices on AirPods\"\n• \"Best laptop for school\"\n\nWhat are you looking for? 🛍️",
        time: getTime(),
        quickReplies: ["Find a deal 🔍", "Compare prices 💰", "Gift ideas 🎁"],
      },
    ]);
  }

  return (
    <>
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-pick-teal text-white rounded-full shadow-lg hover:scale-105 transition flex items-center justify-center"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-pick-border flex flex-col overflow-hidden slide-in">
          {/* Header */}
          <div className="bg-pick-teal text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-heading font-bold text-sm">P</div>
            <div>
              <p className="font-heading font-semibold text-sm">Pick</p>
              <p className="text-[10px] opacity-80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block" /> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} slide-in`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "bg-pick-teal text-white" : "bg-gray-100 text-pick-text"} rounded-2xl px-3.5 py-2.5 text-sm`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.products.map((p: any, j: number) => (
                        <a
                          key={j}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="flex gap-2 bg-white rounded-lg p-2 border border-pick-border hover:border-pick-teal transition"
                        >
                          <div className="relative w-12 h-12 rounded bg-pick-bg flex-shrink-0">
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/48x48/2A9D8F/fff?text=P"; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-pick-text line-clamp-2 leading-tight">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-pick-teal">${p.price?.toFixed(2)}</span>
                              <span className="text-[10px] text-pick-muted">{p.retailer}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] mt-1 opacity-50 text-right">{msg.time}</p>
                </div>
              </div>
            ))}

            {/* Quick replies */}
            {messages.length > 0 && messages[messages.length - 1].quickReplies && !typing && (
              <div className="flex gap-1.5 flex-wrap pl-1">
                {messages[messages.length - 1].quickReplies!.map((qr) => {
                  // Handle upgrade button specially
                  if (qr.includes('Upgrade to Premium')) {
                    return (
                      <Link
                        key={qr}
                        href="/pricing"
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition"
                      >
                        {qr}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={qr}
                      onClick={() => handleSend(qr)}
                      className="text-xs px-3 py-1.5 bg-white border border-pick-teal text-pick-teal rounded-full hover:bg-pick-teal hover:text-white transition"
                    >
                      {qr}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                  <span className="typing-dot w-2 h-2 bg-pick-muted rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-pick-muted rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-pick-muted rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-pick-border px-3 py-2">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything — 'Find me sneakers under $80'"
                disabled={typing}
                className="flex-1 text-sm px-3 py-2 bg-pick-bg rounded-full border border-pick-border focus:outline-none focus:ring-1 focus:ring-pick-teal disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={typing || !input.trim()}
                className="bg-pick-teal text-white p-2 rounded-full disabled:opacity-40 hover:bg-opacity-90 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
