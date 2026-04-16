import React, { useState, useRef } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { SnippetModal } from './SnippetModal';
import { useCommStore } from './store';

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { activeLead } = useCommStore();

  const handleSend = () => {
    if (message.trim() || fileInputRef.current?.files?.length) {
      const filePayload = fileInputRef.current?.files?.[0];
      onSendMessage(message, filePayload);
      setMessage('');
      setShowEmoji(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const cursor = textareaRef.current?.selectionStart || message.length;
    const textBefore = message.substring(0, cursor);
    const textAfter = message.substring(cursor);
    setMessage(textBefore + emojiData.emoji + textAfter);
    
    // Auto-close picker on selection for speed, or leave open. Let's close for now.
    setShowEmoji(false);
    
    // Restore focus
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor + emojiData.emoji.length, cursor + emojiData.emoji.length);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // You could handle immediate send or wait for them to click "Send"
      // For this spec, we just attach it to state and wait for send
      // or send instantly if the message is empty. Let's dispatch immediately if attached.
      onSendMessage('', file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-full p-4 bg-white border-t border-gray-100 flex items-end gap-3 rounded-b-2xl shadow-sm z-30">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileSelect}
      />
      
      {/* Attachment Button */}
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex-shrink-0"
        title="Attach File"
      >
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
      </button>

      {/* Snippet Manager Button */}
      <button 
        onClick={() => setShowSnippets(true)}
        disabled={!activeLead}
        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400 flex-shrink-0"
        title="Snippet Library"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg>
      </button>

      {/* Input Field Container */}
      <div className="relative flex-1 flex items-center bg-gray-50 border border-gray-200 focus-within:bg-white focus-within:border-blue-500 rounded-xl transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeLead ? \`Message \${activeLead.first_name}...\` : "Select a thread to message..."}
          disabled={!activeLead}
          rows={1}
          className="w-full bg-transparent py-3 pl-4 pr-12 text-sm outline-none resize-none max-h-32 text-gray-800 disabled:opacity-50"
        />
        
        {/* Emoji Button (Inside Input) */}
        <button 
          onClick={() => setShowEmoji(!showEmoji)}
          disabled={!activeLead}
          className="absolute right-2 p-1.5 text-gray-400 hover:text-yellow-500 transition-colors rounded-lg hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
        </button>
        
        {/* Emoji Tooltip Modal */}
        {showEmoji && (
          <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
            <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
          </div>
        )}
      </div>

      {/* Send Message Button */}
      <button 
        onClick={handleSend}
        disabled={!activeLead || (!message.trim() && !fileInputRef.current?.value)}
        className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:bg-gray-300 flex-shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>

      {/* Snippet Manager Z-Index Modal */}
      <SnippetModal 
        isOpen={showSnippets} 
        onClose={() => setShowSnippets(false)}
        onSelectSnippet={(text) => {
          setMessage((prev) => (prev ? prev + ' ' + text : text));
          textareaRef.current?.focus();
        }}
      />
    </div>
  );
};
