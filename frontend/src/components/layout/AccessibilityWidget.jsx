import React, { useState, useEffect } from 'react';
import { Volume2, Accessibility, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const AccessibilityWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    color: null, // 'bw', 'remove-green', 'high-contrast'
    textSize: 'medium', // 'small', 'medium', 'large'
    spacing: 'medium', // 'small', 'medium', 'large'
  });

  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? null : value
    }));
  };

  useEffect(() => {
    const html = document.documentElement;
    
    // Clear previous classes
    html.classList.remove('access-bw', 'access-remove-green', 'access-high-contrast');
    html.classList.remove('access-text-small', 'access-text-medium', 'access-text-large');
    html.classList.remove('access-spacing-small', 'access-spacing-medium', 'access-spacing-large');

    // Apply new classes
    if (activeFilters.color) html.classList.add(`access-${activeFilters.color}`);
    if (activeFilters.textSize) html.classList.add(`access-text-${activeFilters.textSize}`);
    if (activeFilters.spacing) html.classList.add(`access-spacing-${activeFilters.spacing}`);

  }, [activeFilters]);

  // Click-to-Speak Implementation
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!isSpeaking) return;

      // Do not intercept clicks inside the accessibility widget itself
      if (e.target.closest('#accessibility-widget')) return;

      e.preventDefault();
      e.stopPropagation();

      const text = e.target.innerText || e.target.textContent;
      if (text && text.trim().length > 0) {
        window.speechSynthesis.cancel(); // Stop current speech
        const utterance = new SpeechSynthesisUtterance(text.trim());
        window.speechSynthesis.speak(utterance);
      }
    };

    if (isSpeaking) {
      document.body.style.cursor = 'help';
      document.addEventListener('click', handleGlobalClick, { capture: true });
    } else {
      document.body.style.cursor = 'default';
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      window.speechSynthesis.cancel();
    }

    return () => {
      document.body.style.cursor = 'default';
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, [isSpeaking]);

  const handleTranslate = async (lang) => {
    if (lang === 'en') {
      window.location.reload();
      return;
    }

    try {
      // Find elements that have text nodes directly as children (to avoid nested translation issues)
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button:not(#accessibility-widget *)'))
        .filter(el => Array.from(el.childNodes).some(node => node.nodeType === 3 && node.textContent.trim().length > 0));

      toast.loading(`Translating to ${lang}...`, { id: 'translate' });

      for (const el of elements) {
        // Use a data attribute to store original text to prevent stacking prefixes
        const originalText = el.getAttribute('data-original-text') || el.innerText || el.textContent;
        if (!el.hasAttribute('data-original-text')) {
          el.setAttribute('data-original-text', originalText);
        }

        if (originalText && originalText.trim().length > 3 && originalText.length < 500) {
          try {
            const { data } = await api.post('/bhashini/translate', {
              text: originalText.trim(),
              targetLanguage: lang
            });
            if (data.success) {
              // For the mock demo, let's make it cleaner
              const cleanTranslated = data.isMock 
                ? `[${lang.toUpperCase()}] ${originalText.trim()}` 
                : data.translatedText;
              
              el.innerText = cleanTranslated;
            }
          } catch (e) {
            console.error('Translation error:', e);
          }
        }
      }
      toast.success('Translation complete', { id: 'translate' });
    } catch (error) {
      toast.error('Translation failed', { id: 'translate' });
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("Click to speak activated. Click on any text to read it aloud."));
    }
  };

  return (
    <div id="accessibility-widget" className="fixed left-0 bottom-8 z-[100] flex items-end">
      {/* Action Buttons Container */}
      <div className="bg-[#9c0b89] py-4 px-2 rounded-r-2xl shadow-2xl flex flex-col gap-4 relative z-20">
        <button 
          onClick={handleSpeak}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-[#ff6b00] text-white scale-110 shadow-[0_0_15px_rgba(255,107,0,0.5)]' : 'bg-white/20 text-white hover:bg-white/30'}`}
          title={isSpeaking ? "Turn off Click-to-Speak" : "Turn on Click-to-Speak"}
        >
          <Volume2 className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-indigo-600 text-white scale-110' : 'bg-indigo-800 text-white hover:bg-indigo-600'}`}
          title="Accessibility Options"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Accessibility className="w-6 h-6" />}
        </button>
        
        {/* Colorful Bar at bottom (SS3 reference) */}
        <div className="flex w-full h-2 rounded-full overflow-hidden mt-2 border border-white/10">
          <div className="flex-1 bg-[#9c0b89]" />
          <div className="flex-1 bg-[#ff6b00]" />
          <div className="flex-1 bg-[#00a651]" />
        </div>
      </div>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="ml-2 bg-white rounded-2xl shadow-2xl p-4 w-56 border border-slate-100 flex flex-col gap-2 relative z-10"
          >
            <div className="flex flex-col gap-2 border-b pb-2 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Color Filters</span>
              <MenuButton 
                active={activeFilters.color === 'bw'} 
                onClick={() => toggleFilter('color', 'bw')}
              >
                Black and White
              </MenuButton>
              <MenuButton 
                active={activeFilters.color === 'remove-green'} 
                onClick={() => toggleFilter('color', 'remove-green')}
              >
                Remove Green
              </MenuButton>
              <MenuButton 
                active={activeFilters.color === 'high-contrast'} 
                onClick={() => toggleFilter('color', 'high-contrast')}
              >
                High Contrast
              </MenuButton>
            </div>

            <div className="flex flex-col gap-2 border-b pb-2 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Text Size</span>
              <MenuButton 
                active={activeFilters.textSize === 'small'} 
                onClick={() => toggleFilter('textSize', 'small')}
              >
                Small Text
              </MenuButton>
              <MenuButton 
                active={activeFilters.textSize === 'medium'} 
                onClick={() => toggleFilter('textSize', 'medium')}
              >
                Medium Text
              </MenuButton>
              <MenuButton 
                active={activeFilters.textSize === 'large'} 
                onClick={() => toggleFilter('textSize', 'large')}
              >
                Large Text
              </MenuButton>
            </div>

            <div className="flex flex-col gap-2 border-b pb-2 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Spacing</span>
              <MenuButton 
                active={activeFilters.spacing === 'small'} 
                onClick={() => toggleFilter('spacing', 'small')}
              >
                Small Spacing
              </MenuButton>
              <MenuButton 
                active={activeFilters.spacing === 'medium'} 
                onClick={() => toggleFilter('spacing', 'medium')}
              >
                Medium Spacing
              </MenuButton>
              <MenuButton 
                active={activeFilters.spacing === 'large'} 
                onClick={() => toggleFilter('spacing', 'large')}
              >
                Large Spacing
              </MenuButton>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Language (Bhashini)</span>
              <select 
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-slate-900 text-white outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => handleTranslate(e.target.value)}
                defaultValue="en"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuButton = ({ children, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all text-center
        ${active 
          ? 'bg-gradient-to-r from-fuchsia-700 to-indigo-800 text-white shadow-md border-transparent scale-105' 
          : 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white hover:from-fuchsia-700 hover:to-indigo-800'
        }`}
    >
      {children}
    </button>
  );
};

export default AccessibilityWidget;
