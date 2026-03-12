/**
 * introScreen.js — Cinematic Intro & Game Splash
 * Shows Pixar-style intro before initialization
 */

export function createIntroScreen() {
  const intro = document.createElement('div');
  intro.id = 'intro-screen';
  intro.innerHTML = `
    <style>
      #intro-screen {
        position: fixed;
        inset: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: intro-fade-in 0.5s ease-out;
      }

      .intro-container {
        text-align: center;
        animation: intro-sequence 10s ease-in-out forwards;
        max-width: 90vw;
        padding: 0 16px;
      }

      .intro-logo {
        font-family: 'Cinzel', serif;
        font-weight: 900;
        color: #fff;
        text-shadow: 0 0 40px rgba(234, 179, 8, 0.6);
        letter-spacing: 8px;
        margin-bottom: 40px;
        line-height: 1.2;
      }

      .intro-presents {
        font-size: clamp(1rem, 5vw, 2.5rem);
        font-weight: 700;
        color: #eab308;
        text-transform: uppercase;
        animation: fade-in-text 1.5s ease-out 0s forwards;
        opacity: 0;
        margin-bottom: 60px;
      }

      .intro-title {
        font-size: clamp(2.5rem, 12vw, 6rem);
        font-weight: 900;
        background: linear-gradient(180deg, #fde68a 0%, #eab308 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-transform: uppercase;
        letter-spacing: clamp(4px, 2vw, 12px);
        animation: zoom-in-text 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.2s forwards;
        opacity: 0;
        text-shadow: 0 0 60px rgba(234, 179, 8, 0.3);
        filter: drop-shadow(0 0 30px rgba(234, 179, 8, 0.4));
      }

      .intro-version {
        font-size: clamp(0.7rem, 2.5vw, 1rem);
        color: #888;
        text-transform: uppercase;
        letter-spacing: 3px;
        margin-top: 40px;
        animation: fade-in-text 1.5s ease-out 3.2s forwards;
        opacity: 0;
      }

      .intro-tagline {
        font-size: clamp(0.7rem, 2.5vw, 1.1rem);
        color: #aaa;
        margin-top: 60px;
        animation: fade-in-text 1s ease-out 4s forwards;
        opacity: 0;
        letter-spacing: 2px;
      }

      @keyframes intro-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes fade-in-text {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes zoom-in-text {
        from {
          opacity: 0;
          transform: scale(0.8);
          filter: blur(10px);
        }
        to {
          opacity: 1;
          transform: scale(1);
          filter: blur(0);
        }
      }

      @keyframes intro-sequence {
        0% { opacity: 1; }
        85% { opacity: 1; }
        100% { opacity: 0; }
      }

      .intro-skip {
        position: absolute;
        bottom: 40px;
        right: 40px;
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #eab308;
        color: #eab308;
        cursor: pointer;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        border-radius: 2px;
        transition: all 0.3s;
        font-weight: 700;
      }

      .intro-skip:hover {
        background: rgba(234, 179, 8, 0.2);
        text-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
      }
    </style>

    <div class="intro-container">
      <div class="intro-presents">MOSTY GAMES PRESENTS</div>
      <div class="intro-logo">
        <div class="intro-title">ASCENT</div>
      </div>
      <div class="intro-version">Version 2.0 • Build 2026</div>
      <div class="intro-tagline">WHERE POLITICS BECOMES POWER</div>
    </div>

    <div class="intro-skip">PRESS ANY KEY / TAP TO CONTINUE</div>
  `;

  document.body.appendChild(intro);

  return new Promise((resolve) => {
    let resolved = false;

    // Auto-skip after 10 seconds
    const autoTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, 10000);

    // Failsafe: guarantee cleanup even if something hangs
    // This prevents the screen from persisting indefinitely
    const failsafeTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, 12000);

    // Skip on any key or click
    const skipHandler = () => {
      clearTimeout(autoTimeout);
      clearTimeout(failsafeTimeout);
      cleanup();
      resolve();
    };

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener('click', skipHandler);
      document.removeEventListener('keydown', skipHandler);
      if (intro.parentElement) intro.remove();
    };

    document.addEventListener('click', skipHandler, { once: true });
    document.addEventListener('keydown', skipHandler, { once: true });
  });
}
