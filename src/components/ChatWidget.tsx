'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ShoppingBag } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Array<{
    name: string;
    price: number;
    retailer: string;
    url: string;
    image?: string;
  }>;
  timestamp: Date;
}

// Client-side chatbot logic - NO external API required
function processMessage(userInput: string): { message: string; products?: any[] } {
  const input = userInput.toLowerCase().trim();

  // Basic conversation
  if (/^(hey|hi|hello|sup|yo)/.test(input)) {
    return {
      message: "Hey! How are you doing? 😊 I'm Pick, your shopping assistant. I can help you find products, compare prices, or discover similar items. What are you looking for today?"
    };
  }

  if (/how are you|how's it going|what's up/.test(input)) {
    return {
      message: "I'm great, thanks for asking! Ready to help you find the best deals. What can I help you shop for?"
    };
  }

  if (/thanks|thank you|thx/.test(input)) {
    return {
      message: "You're welcome! Happy to help. Let me know if you need anything else! 😊"
    };
  }

  if (/bye|goodbye|see you|later/.test(input)) {
    return {
      message: "See you later! Happy shopping! 🛍️"
    };
  }

  if (/what can you do|help me|what do you do/.test(input)) {
    return {
      message: "I can help you:\n\n🔍 Search for any product across retailers\n💰 Compare prices to find the best deal\n👗 Find similar products and dupes\n📸 Analyze photos to find matching items\n📉 Track price history\n\nJust tell me what you're looking for!"
    };
  }

  // Extract search intent and query
  let searchQuery = '';
  let maxPrice: number | undefined;

  // Extract price limit
  const priceMatch = input.match(/under\s+\$?(\d+)|less\s+than\s+\$?(\d+)|below\s+\$?(\d+)/);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
  }

  // Product search patterns
  if (/find|looking for|search|show me|i want|i need|get me/.test(input)) {
    searchQuery = input
      .replace(/^(find|show|search|looking for|i want|i need|get me|recommend|what's the best)/gi, '')
      .replace(/(please|under \$?\d+|less than \$?\d+|below \$?\d+)/gi, '')
      .trim();
  } else if (/compare|cheapest|best price/.test(input)) {
    searchQuery = input.replace(/(compare|cheapest|best price|for|prices)/gi, '').trim();
  } else if (/similar|alternative|like/.test(input)) {
    searchQuery = input.replace(/(similar|alternative|like|to)/gi, '').trim();
  } else if (input.length > 2) {
    // Default: treat as product search
    searchQuery = input;
  }

  // If we have a search query, make the API call
  if (searchQuery && searchQuery.length > 2) {
    return searchProducts(searchQuery, maxPrice);
  }

  // Fallback response
  return {
    message: "I'm not sure I understood that, but I'd love to help! Try asking me to find a product, compare prices, or describe what you're looking for.\n\nFor example:\n• 'Find me running shoes under $100' 🏃\n• 'Show me wireless headphones'\n• 'What's the cheapest laptop?'"
  };
}

// Search products using the API
function searchProducts(query: string, maxPrice?: number): { message: string; products?: any[] } {
  // This will be populated by the API response
  return {
    message: `Searching for "${query}"${maxPrice ? ` under $${maxPrice}` : ''}...`,
    products: []
  };
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Pick AI. I can help you find the best deals and discover similar products. What are you shopping for today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Brief delay for typing indicator
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // First, try the client-side chatbot logic
      const localResponse = processMessage(userInput);

      // If it's a product search, call the search API directly
      if (localResponse.message.includes('Searching for')) {
        try {
          // Extract the search query from the user input
          const searchQuery = userInput
            .toLowerCase()
            .replace(/^(find|show|search|looking for|i want|i need|get me|recommend|what's the best)/gi, '')
            .replace(/(please|under \$?\d+|less than \$?\d+|below \$?\d+|me)/gi, '')
            .trim();

          // Extract max price if mentioned
          const priceMatch = userInput.match(/under\s+\$?(\d+)|less\s+than\s+\$?(\d+)|below\s+\$?(\d+)/);
          const maxPrice = priceMatch ? parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]) : undefined;

          // Call the search API directly
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);

          if (response.ok) {
            const data = await response.json();

            if (data.results && data.results.length > 0) {
              // Filter by price if specified
              let products = data.results;
              if (maxPrice) {
                products = products.filter((p: any) => p.lowestPrice <= maxPrice);
              }

              if (products.length > 0) {
                // Format products for display
                const formattedProducts = products.slice(0, 5).map((product: any) => ({
                  name: product.name,
                  price: product.lowestPrice,
                  retailer: product.prices.find((p: any) => p.amount === product.lowestPrice)?.retailer || 'Amazon',
                  url: product.prices.find((p: any) => p.amount === product.lowestPrice)?.url || '#',
                  image: product.imageUrl
                }));

                const count = formattedProducts.length;
                const priceInfo = maxPrice ? ` under $${maxPrice}` : '';
                const message = `I found ${count} ${count === 1 ? 'product' : 'products'}${priceInfo}! Here are the best deals:`;

                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: message,
                  products: formattedProducts,
                  timestamp: new Date()
                };

                setMessages(prev => [...prev, assistantMessage]);
              } else {
                // No products in price range
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `I couldn't find "${searchQuery}" under $${maxPrice}. Try increasing your budget or searching for similar items!`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
              }
            } else {
              // No results found
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I couldn't find exact matches for "${searchQuery}". Try being more specific or browse using the search bar above! You can search for categories like "headphones", "laptops", "shoes", or "kitchen".`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
          } else {
            throw new Error('Search API failed');
          }
        } catch (apiError) {
          // API failed, fall back to friendly message
          console.error('API error:', apiError);
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I'd love to help you find products! Try using the search bar at the top of the page. You can search for:\n\n• Headphones\n• Laptops\n• Shoes\n• Kitchen appliances\n• And much more!",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, fallbackMessage]);
        }
      } else {
        // Use the local chatbot response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: localResponse.message,
          products: localResponse.products,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Never show a generic error - always provide a helpful response
      const helpfulMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm here to help! Try asking me:\n\n• 'Find me [product name]'\n• 'Show me deals under $50'\n• 'What's the best [product]?'\n\nOr use the search bar at the top to browse our catalog! 🛍️",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, helpfulMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#2A9D8F] text-white rounded-full shadow-lg hover:bg-[#238579] transition-all hover:scale-110 z-50 flex items-center justify-center"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] bg-white border border-[#E5E5E3] rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-[#2A9D8F] text-white border-b border-[#238579]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Pick AI</h3>
                <p className="text-xs opacity-90">Shopping Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded transition-colors"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAF8]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-[#2A9D8F] text-white'
                      : 'bg-white border border-[#E5E5E3]'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                  {/* Product Cards */}
                  {message.products && message.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product, idx) => (
                        <a
                          key={idx}
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-[#FAFAF8] border border-[#E5E5E3] rounded-md hover:border-[#2A9D8F] transition-colors"
                        >
                          <div className="flex gap-3">
                            {product.image && (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-16 h-16 object-contain rounded bg-white"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#1A1A1A] line-clamp-2 mb-1">
                                {product.name}
                              </p>
                              <p className="text-sm font-semibold text-[#2A9D8F]">
                                ${product.price.toFixed(2)}
                              </p>
                              <p className="text-xs text-[#6B6B6B]">{product.retailer}</p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E5E5E3] rounded-lg p-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-[#2A9D8F] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#2A9D8F] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#2A9D8F] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-[#E5E5E3]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-[#E5E5E3] rounded-lg focus:outline-none focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#2A9D8F]/20 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238579] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
