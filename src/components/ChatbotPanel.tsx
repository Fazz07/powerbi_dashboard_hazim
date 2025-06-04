// src/components/ChatbotPanel.tsx
 import React, { useState, useRef, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Send, ChevronRight, ChevronLeft, X, Mic, MicOff, Loader2 } from 'lucide-react';
 import { ChatMessage, ChatSuggestion, SpeechRecognition } from '@/types/chat';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useToast } from '@/hooks/use-toast';
 import ChartScreenshot from './ChartScreenshot'; 

 interface ChatbotPanelProps {
   isOpen: boolean;
   onToggle: () => void; // This will now trigger the save logic in Dashboard.tsx
   chatHistory: ChatMessage[];
   onSendMessage: (message: string) => void;
   suggestions: ChatSuggestion[];
   selectedChart?: string;
   isDataLoading?: boolean; 
   currentChatSessionId: string | null; // NEW: Pass the session ID from parent
 }

 const ChatbotPanel = ({
   isOpen,
   onToggle, // Now directly used for toggling visibility AND saving
   chatHistory,
   onSendMessage,
   suggestions,
   selectedChart,
   isDataLoading, 
   currentChatSessionId // Destructure new prop
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
   const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

   const isImageDataUrl = (content?: string): boolean => {
     if (!content) return false;
     return content.trim().startsWith('data:image/');
   };

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
           description: "There was a problem with the microphone access.",
           variant: "destructive" 
         });
       };
     }

     return () => {
       if (recognitionRef.current) {
         recognitionRef.current.stop();
       }
     };
   }, [toast]);

   useEffect(() => {
   if (scrollAnchorRef.current) {
     scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
   }
 }, [chatHistory]);


   const toggleListening = () => {
     if (!recognitionRef.current) {
       toast({
         title: "Speech Recognition Not Supported",
         description: "Your browser doesn't support speech recognition.", variant: "destructive"
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
         description: "Start speaking. Your words will appear in the text field.", variant: "destructive"
       });
     }
   };
   

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
       const newWidth = startWidthRef.current - deltaX; // Calculate width from right side
       const minPanelWidth = 280;
       const maxPanelWidth = 800;

       if (newWidth > minPanelWidth && newWidth < maxPanelWidth) {
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
  {isOpen && (
    <div
      className="absolute top-0 left-0 w-1 h-full cursor-ew-resize z-20 hover:bg-primary/20 transition-colors"
      onMouseDown={handleMouseDown}
    />
  )}

  <div
    className="fixed top-14 right-0 h-[calc(100vh-3.5rem)] bg-gray-300 dark:bg-[#1e293b] border-l border-border dark:border-gray-700 transition-all duration-300 flex flex-col z-40 shadow-xl rounded-bl-xl"
    style={{ width: isOpen ? `${width}px` : '40px' }}
  >
    {isOpen ? (
      <>
        {/* Header */}
        <div className="bg-[#273651] dark:bg-[#16263f] flex items-center justify-between p-3 border-b border-border dark:border-gray-700 rounded-tr-xl">
          <h3 className="font-semibold text-white">
            {selectedChart ? `AI Assistant` : 'AI Assistant'}
          </h3>
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle} // Call parent's onToggle, which now handles saving
              className="rounded-md text-white hover:bg-[#12223c] hover:text-white dark:hover:bg-[#34425a]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle} // Call parent's onToggle, which now handles saving
              className="rounded-md text-white hover:bg-[#12223c] hover:text-white dark:hover:bg-[#34425a]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 p-4" ref={chatContainerRef}>
          <div className="space-y-4">
            {chatHistory.length > 0 ? (
              chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl shadow-sm ${
                      chat.isUser
                        ? 'bg-[#293956] text-primary-foreground'
                        : 'bg-muted dark:bg-gray-700 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      {chat.message}
                      {chat.isLoading && (
                        <Loader2 className="mb-1 h-4 w-4 animate-spin text-primary dark:text-gray-100" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground dark:text-gray-400">
                <p>Ask me questions about your data</p>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      size="sm"
                      className="text-left justify-start rounded-md h-auto py-2 bg-[#ccd7e8] hover:text-white hover:bg-[#2b4865] dark:bg-[#374357] dark:hover:bg-[#495569]"
                      onClick={() => {
                        onSendMessage(suggestion.question);
                      }}
                      disabled={isDataLoading}
                    >
                      {suggestion.question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div ref={scrollAnchorRef} />
          </div>
        </ScrollArea>

        {/* Input Section */}
        <div className="p-3 bg-gray-300 dark:bg-[#1e293b] dark:border-gray-700 rounded-bl-xl text-black dark:text-white">
          <div className="flex space-x-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              className="resize-none rounded-md bg-[#1b222e17] text-black placeholder:text-gray-700 dark:bg-[#334155] dark:text-white dark:placeholder:text-gray-400"
              rows={2}
              disabled={isDataLoading}
            />
            <div className="flex flex-col space-y-2">
              <Button
                size="icon"
                variant={isListening ? 'destructive' : 'secondary'}
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start voice input'}
                disabled={isDataLoading}
                className="rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-black dark:text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-black dark:text-white" />
                )}
              </Button>
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={isDataLoading || !message.trim()}
                className="bg-[#16263f] hover:bg-[#34425a] rounded-md dark:bg-gray-500"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className="mt-2 w-10 h-10 rounded-md hover:bg-gray-400"
        onClick={onToggle} // Call parent's onToggle
      >
        <ChevronLeft className="mb-3 h-4 w-4 mt-3 text-black dark:text-white" />
      </Button>
    )}
  </div>
</>

   );
 };

 export default ChatbotPanel;