// src/components/ChatbotPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ChevronRight, ChevronLeft, X, Mic, MicOff, Loader2 } from 'lucide-react'; // Import Loader2
import { ChatMessage, ChatSuggestion, SpeechRecognition } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ChartScreenshot from './ChartScreenshot';

interface ChatbotPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  suggestions: ChatSuggestion[];
  selectedChart?: string;
}

const ChatbotPanel = ({
  isOpen,
  onToggle,
  chatHistory,
  onSendMessage,
  suggestions,
  selectedChart
}: ChatbotPanelProps) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Helper to determine if content is an image data URL
  const isImageDataUrl = (content?: string): boolean => {
    if (!content) return false;
    return content.trim().startsWith('data:image/');
  };

  // Setup speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description: "There was a problem with the microphone access."
        });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition."
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Start speaking. Your words will appear in the text field."
      });
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const currentScroll = container.scrollTop;

      // Only scroll to bottom if already near bottom
      if (scrollHeight - currentScroll <= clientHeight + 100) {
        container.scrollTop = scrollHeight;
      }
    }
  }, [chatHistory]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = e.clientX < window.innerWidth / 2
        ? startWidthRef.current - deltaX
        : startWidthRef.current + deltaX;

      if (newWidth > 280 && newWidth < 800) {
        setWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');

      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Resize handles - visible only when panel is open */}
      {isOpen && (
        <>
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize z-20 hover:bg-primary/10"
            onMouseDown={handleMouseDown}
          />
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize z-20 hover:bg-primary/10"
            onMouseDown={handleMouseDown}
          />
        </>
      )}

      <div
        className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] bg-background border-l border-border transition-all duration-300 flex flex-col z-10 shadow-lg"
        style={{ width: isOpen ? `${width}px` : '40px' }}
      >
        {isOpen ? (
          <>
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">
                {selectedChart ? `Chat - ${selectedChart}` : 'AI Assistant'}
              </h3>
              <div className="flex">
                <Button variant="ghost" size="icon" onClick={onToggle}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onToggle}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
              <div className="space-y-4">
                {chatHistory.length > 0 ? (
                  chatHistory.map((chat, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        chat.isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-lg ${
                          chat.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="mt-2 flex items-center">
                          {chat.message}
                          {chat.isLoading && (
                            <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p>Ask me questions about your data</p>
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="secondary"
                          size="sm"
                          className="text-left justify-start"
                          onClick={() => {
                            onSendMessage(suggestion.question);
                          }}
                        >
                          {suggestion.question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <div className="flex space-x-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  className="resize-none"
                  rows={2}
                />
                <div className="flex flex-col space-y-2">
                  <Button
                    size="icon"
                    variant={isListening ? "destructive" : "secondary"}
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={onToggle}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  );
};

export default ChatbotPanel;