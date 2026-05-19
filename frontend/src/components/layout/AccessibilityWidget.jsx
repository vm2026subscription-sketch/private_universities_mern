import React, { useState, useEffect } from 'react';
import { Volume2, Accessibility, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
];

const ACCESSIBILITY_VISIBILITY_STORAGE_KEY = 'vm_accessibility_widget_hidden';

const AccessibilityWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ACCESSIBILITY_VISIBILITY_STORAGE_KEY) === 'true';
  });
  const [activeFilters, setActiveFilters] = useState({
    color: null,
    textSize: 'medium',
    spacing: 'medium',
  });

  const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const toggleFilter = (type, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? null : value,
    }));
  };

  useEffect(() => {
    const html = document.documentElement;

    html.classList.remove('access-bw', 'access-remove-green', 'access-high-contrast');
    html.classList.remove('access-text-small', 'access-text-medium', 'access-text-large');
    html.classList.remove('access-spacing-small', 'access-spacing-medium', 'access-spacing-large');

    if (activeFilters.color) html.classList.add(`access-${activeFilters.color}`);
    if (activeFilters.textSize) html.classList.add(`access-text-${activeFilters.textSize}`);
    if (activeFilters.spacing) html.classList.add(`access-spacing-${activeFilters.spacing}`);
  }, [activeFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESSIBILITY_VISIBILITY_STORAGE_KEY, String(isHidden));
  }, [isHidden]);

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!isSpeaking || !supportsSpeech) return;
      if (event.target.closest('#accessibility-widget')) return;

      event.preventDefault();
      event.stopPropagation();

      const text = event.target.innerText || event.target.textContent;
      if (text?.trim()) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.trim()));
      }
    };

    if (isSpeaking && supportsSpeech) {
      document.body.style.cursor = 'help';
      document.addEventListener('click', handleGlobalClick, { capture: true });
    } else {
      document.body.style.cursor = '';
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      if (supportsSpeech) window.speechSynthesis.cancel();
    }

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, [isSpeaking, supportsSpeech]);

  const handleTranslate = async (lang) => {
    if (lang === 'en') {
      window.location.reload();
      return;
    }

    try {
      const elements = Array.from(
        document.querySelectorAll('h1, h2, h3, p, span, button:not(#accessibility-widget *)')
      ).filter((element) =>
        Array.from(element.childNodes).some(
          (node) => node.nodeType === 3 && node.textContent.trim().length > 0
        )
      );

      toast.loading(`Translating to ${lang}...`, { id: 'translate' });

      for (const element of elements) {
        const originalText =
          element.getAttribute('data-original-text') || element.innerText || element.textContent;

        if (!element.hasAttribute('data-original-text')) {
          element.setAttribute('data-original-text', originalText);
        }

        if (originalText && originalText.trim().length > 3 && originalText.length < 500) {
          try {
            const { data } = await api.post('/bhashini/translate', {
              text: originalText.trim(),
              targetLanguage: lang,
            });

            if (data.success) {
              element.innerText = data.isMock
                ? `[${lang.toUpperCase()}] ${originalText.trim()}`
                : data.translatedText;
            }
          } catch (error) {
            console.error('Translation error:', error);
          }
        }
      }

      toast.success('Translation complete', { id: 'translate' });
    } catch (error) {
      toast.error('Translation failed', { id: 'translate' });
    }
  };

  const handleSpeak = () => {
    if (!supportsSpeech) {
      toast.error('Text-to-speech is not available in this browser.');
      return;
    }

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        'Click to speak activated. Click on any text to read it aloud.'
      )
    );
  };

  const handleHide = () => {
    setIsOpen(false);
    setIsSpeaking(false);
    setIsHidden(true);
  };

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setIsHidden(false)}
        className="fixed left-4 bottom-6 md:bottom-8 z-[80] inline-flex items-center gap-2 rounded-full bg-white dark:bg-dark-card border border-light-border dark:border-dark-border px-4 py-3 text-sm font-bold text-primary shadow-xl hover:scale-105"
        title="Show accessibility widget"
      >
        <Accessibility className="w-4 h-4" />
        Accessibility
      </button>
    );
  }

  return (
    <div id="accessibility-widget" className="fixed left-4 bottom-6 md:bottom-8 z-[80] flex items-end gap-2">
      <div className="bg-primary py-4 px-2 rounded-2xl shadow-2xl flex flex-col gap-4 relative z-20 border border-accent/20">
        <button
          type="button"
          onClick={handleHide}
          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white dark:bg-dark-card text-slate-500 hover:text-primary shadow-lg flex items-center justify-center"
          title="Hide accessibility widget"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSpeak}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isSpeaking
              ? 'bg-accent text-white scale-110 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
          title={isSpeaking ? 'Turn off Click-to-Speak' : 'Turn on Click-to-Speak'}
        >
          <Volume2 className="w-6 h-6" />
        </button>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isOpen ? 'bg-primary-light text-white scale-110' : 'bg-dark-card text-white hover:bg-primary-light'
          }`}
          title="Accessibility Options"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Accessibility className="w-6 h-6" />}
        </button>

        <div className="flex w-full h-2 rounded-full overflow-hidden mt-2 border border-white/10">
          <div className="flex-1 bg-primary-light" />
          <div className="flex-1 bg-accent" />
          <div className="flex-1 bg-orange-200" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl shadow-2xl p-4 w-56 border border-slate-100 flex flex-col gap-2 relative z-10"
          >
            <div className="flex flex-col gap-2 border-b pb-2 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                Color Filters
              </span>
              <MenuButton active={activeFilters.color === 'bw'} onClick={() => toggleFilter('color', 'bw')}>
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
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                Text Size
              </span>
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
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                Spacing
              </span>
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
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
                Language (Bhashini)
              </span>
              <select
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-slate-900 text-white outline-none focus:ring-2 focus:ring-primary"
                onChange={(event) => handleTranslate(event.target.value)}
                defaultValue="en"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
      className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all text-center ${
        active
          ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-md border-transparent scale-105'
          : 'bg-gradient-to-r from-primary-dark to-primary text-white hover:from-primary hover:to-primary-light'
      }`}
    >
      {children}
    </button>
  );
};

export default AccessibilityWidget;
