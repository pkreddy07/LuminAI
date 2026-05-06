import { useState, useEffect } from 'react';

export default function LanguageToggle() {
  const [isKannada, setIsKannada] = useState(false);

  const toggleLanguage = () => {
    const newLang = isKannada ? 'en' : 'kn'; // Toggle between English and Kannada
    
    // Find the hidden Google Translate dropdown and force it to change
    const selectElement = document.querySelector('.goog-te-combo');
    if (selectElement) {
      selectElement.value = newLang;
      selectElement.dispatchEvent(new Event('change'));
      setIsKannada(!isKannada);
    } else {
      console.warn("Google Translate engine not fully loaded yet.");
    }
  };

  // Quick styling to fix the annoying top banner Google injects
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      body { top: 0 !important; }
      .skiptranslate { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

    return (
    // 🌟 ADDED 'notranslate' CLASS HERE SO GOOGLE IGNORES THIS BUTTON!
    <button
      onClick={toggleLanguage}
      className="notranslate flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-white transition-all shadow-lg"
    >
      <span className={!isKannada ? "text-emerald-400" : "text-slate-400"}>EN</span>
      <div className={`w-8 h-4 bg-black/50 rounded-full relative transition-colors`}>
        <div className={`w-4 h-4 bg-emerald-400 rounded-full absolute top-0 transition-transform ${isKannada ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <span className={isKannada ? "text-emerald-400" : "text-slate-400"}>ಕನ್ನಡ</span>
    </button>
  );
}