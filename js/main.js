/* ==========================================================================
   COS 106 PORTFOLIO, SHARED JAVASCRIPT
   This one file is loaded at the bottom of every page. Each page only has
   the DOM elements relevant to it, so every block below checks that its
   target element actually exists before touching it. That way this same
   main.js can be reused on about.html, projects.html, planner.html, and
   contact.html without throwing errors on pages that do not have a
   terminal or a hero section.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. NAVBAR SCROLL STATE
   Adds a "scrolled" class to the navbar once the page has scrolled past
   40 pixels, and removes it if the user scrolls back to the very top.
   The CSS rule for .navbar.scrolled is what actually paints the solid
   background, this script only ever toggles the class name.
   -------------------------------------------------------------------------- */
const navbar = document.getElementById('navbar');

function updateNavbarOnScroll() {
  if (!navbar) return;
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

// Run once on load in case the page is refreshed while already scrolled
// down, then keep listening for further scroll events.
updateNavbarOnScroll();
window.addEventListener('scroll', updateNavbarOnScroll);

/* --------------------------------------------------------------------------
   2. MOBILE NAV TOGGLE
   The hamburger button is only visible below the 768px breakpoint (see
   CSS). Clicking it adds .open to both the button (so the CSS can animate
   the bars into an X) and the link list (so CSS can slide the menu into
   view). aria-expanded is kept in sync so screen readers announce the
   menu's state correctly.
   -------------------------------------------------------------------------- */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the menu automatically after the visitor taps a link, otherwise
  // it would stay open and cover the page they just navigated to.
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --------------------------------------------------------------------------
   3. TERMINAL TYPING EFFECT
   Types the visitor's name, then the role line, one character at a time,
   using setTimeout to space out each letter. The two target elements were
   left empty in the HTML on purpose, with the real text stored in a
   data-full-text attribute instead. That is what typeText() reads from,
   which is what makes this function reusable for both lines without
   hardcoding either string inside this file.
   -------------------------------------------------------------------------- */

/**
 * Types the string stored in element's data-full-text attribute into that
 * element, one character every `speed` milliseconds, then calls onDone
 * once the whole string has been typed.
 */
function typeText(element, speed, onDone) {
  if (!element) {
    if (onDone) onDone();
    return;
  }

  const fullText = element.getAttribute('data-full-text') || '';
  let charIndex = 0;

  function typeNextChar() {
    if (charIndex < fullText.length) {
      // textContent is rebuilt from a growing substring each tick. For a
      // short hero string this is simple and fast enough that a more
      // complex approach is not worth the extra code.
      element.textContent = fullText.slice(0, charIndex + 1);
      charIndex += 1;
      setTimeout(typeNextChar, speed);
    } else if (onDone) {
      onDone();
    }
  }

  typeNextChar();
}

const typedName = document.getElementById('typedName');
const typedRole = document.getElementById('typedRole');
const cursorOne = document.getElementById('cursorOne');
const cursorTwo = document.getElementById('cursorTwo');

if (typedName && typedRole) {
  // Small delay before typing starts so the page feels like it has
  // "loaded" first rather than animating instantly.
  setTimeout(() => {
    typeText(typedName, 70, () => {
      // Once the name finishes, hide its cursor and reveal the second
      // line's cursor, then start typing the role under it.
      if (cursorOne) cursorOne.classList.add('hidden');
      if (cursorTwo) cursorTwo.classList.remove('hidden');
      typeText(typedRole, 40);
    });
  }, 500);
}

/* --------------------------------------------------------------------------
   4. SCROLL-TRIGGERED REVEAL (Intersection Observer)
   Any element with the .reveal-target class starts hidden and shifted down
   (see the CSS rule). This observer watches all of them and adds the
   .revealed class the moment an element becomes 10% visible in the
   viewport, which triggers the CSS transition back to full opacity and
   position. unobserve() stops watching that element once it has fired, so
   the animation only ever plays once per element instead of replaying
   every time the visitor scrolls past it.
   -------------------------------------------------------------------------- */
const revealTargets = document.querySelectorAll('.reveal-target');

if (revealTargets.length > 0 && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  // Fallback for browsers without IntersectionObserver support: just show
  // everything immediately rather than leaving it invisible forever.
  revealTargets.forEach((target) => target.classList.add('revealed'));
}
