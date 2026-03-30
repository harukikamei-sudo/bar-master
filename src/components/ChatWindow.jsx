import { useEffect, useRef, useState, useCallback } from 'react';

function TypewriterText({ text, speed = 40, onComplete }) {
  const [displayed, setDisplayed] = useState('');
  const idxRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayed('');
    idxRef.current = 0;
    completedRef.current = false;
    const interval = setInterval(() => {
      idxRef.current++;
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) {
        clearInterval(interval);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>;
}

export default function ChatWindow({ messages, choices, onSelect, onTextInput, onTypingDone }) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [typingDone, setTypingDone] = useState(true);
  const [inputText, setInputText] = useState('');
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'master') {
        setTypingDone(false);
      } else {
        setTypingDone(true);
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingDone, scrollToBottom]);

  const handleComplete = useCallback(() => {
    setTypingDone(true);
    scrollToBottom();
    onTypingDone?.();
  }, [scrollToBottom, onTypingDone]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!inputText.trim() || !typingDone) return;
    onTextInput?.(inputText.trim());
    setInputText('');
  }, [inputText, typingDone, onTextInput]);

  const lastMasterIdx = messages.reduce((acc, m, i) => m.role === 'master' ? i : acc, -1);

  return (
    <div className="chat-window">
      <div className="chat-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'master' && (
              <div className="chat-avatar">
                <div className="avatar-icon">🍸</div>
              </div>
            )}
            <div className="chat-text">
              {msg.role === 'master' && <div className="chat-name">Master</div>}
              {msg.role === 'master' && i === lastMasterIdx && !typingDone ? (
                <TypewriterText
                  text={msg.text}
                  speed={40}
                  onComplete={handleComplete}
                />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {typingDone && choices.length > 0 && (
        <div className="chat-choices">
          {choices.map((choice, i) => (
            <button
              key={i}
              className="choice-btn"
              onClick={() => onSelect(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="何かお探しですか？..."
          disabled={!typingDone}
        />
        <button type="submit" className="chat-send" disabled={!typingDone || !inputText.trim()}>
          送信
        </button>
      </form>
    </div>
  );
}
