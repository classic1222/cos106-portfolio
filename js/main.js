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

/* --------------------------------------------------------------------------
   5. ACADEMIC PLANNER (planner.html only)
   Everything below is wrapped in a check for taskList, so this whole block
   quietly does nothing on every other page. The task data lives in one
   array of objects in memory, and is mirrored to localStorage so the list
   survives a page refresh or a closed browser tab. Every function here is
   a small, single-purpose piece: load, save, render, add, toggle, delete,
   updateStats, exactly the "arrays and functions" the brief asks for.
   -------------------------------------------------------------------------- */
const taskList = document.getElementById('taskList');

if (taskList) {
  const taskForm = document.getElementById('taskForm');
  const taskInput = document.getElementById('taskInput');
  const taskDateInput = document.getElementById('taskDate');
  const formError = document.getElementById('formError');
  const filterTabs = document.getElementById('filterTabs');
  const emptyState = document.getElementById('emptyState');
  const statTotal = document.getElementById('statTotal');
  const statActive = document.getElementById('statActive');
  const statDone = document.getElementById('statDone');

  const STORAGE_KEY = 'cos106-planner-tasks';

  // Tracks which filter button is currently selected, starts on "all".
  let currentFilter = 'all';

  /**
   * Reads the saved task array out of localStorage. Wrapped in try/catch
   * because localStorage can throw (private browsing, storage disabled,
   * or corrupted JSON from a previous version of this page), in which
   * case we just start from an empty list rather than crashing the page.
   */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Could not load saved tasks:', error);
      return [];
    }
  }

  /**
   * Writes the current tasks array back to localStorage as a JSON string.
   * Called after every add, toggle, and delete so the saved copy never
   * falls out of sync with what is on screen.
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Could not save tasks:', error);
    }
  }

  // The in-memory array of task objects. Each task looks like:
  // { id: number, text: string, dueDate: string, completed: boolean }
  let tasks = loadTasks();

  /**
   * Formats an ISO date string (from the <input type="date">) into a
   * short, readable label like "Jul 20". Returns an empty string if no
   * date was set, since due dates are optional.
   */
  function formatDueDate(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Returns only the tasks that belong to the given filter. This is the
   * "arrays" requirement in practice, Array.prototype.filter builds a new
   * array instead of mutating the original list, so switching filters
   * never loses or reorders the underlying data.
   */
  function getFilteredTasks(filter) {
    if (filter === 'active') return tasks.filter((task) => !task.completed);
    if (filter === 'completed') return tasks.filter((task) => task.completed);
    return tasks;
  }

  /**
   * Rebuilds the <ul> from scratch based on the current tasks array and
   * the currently selected filter. Clearing and re-rendering the whole
   * list on every change is simpler than patching individual DOM nodes,
   * and with a task list this size the performance cost is not
   * noticeable.
   */
  function renderTasks() {
    const visibleTasks = getFilteredTasks(currentFilter);

    // Clear whatever was previously rendered before drawing the new list.
    taskList.innerHTML = '';

    visibleTasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = 'task-item' + (task.completed ? ' completed' : '');
      item.dataset.id = task.id;

      // Building this row with template literals keeps the structure
      // readable. The checkbox's checked state and the delete button's
      // data-id are both driven directly from the task object.
      item.innerHTML = `
        <label class="task-checkbox">
          <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark '${task.text}' as complete">
          <span class="checkbox-visual"></span>
        </label>
        <span class="task-text"></span>
        ${task.dueDate ? `<span class="task-due">${formatDueDate(task.dueDate)}</span>` : ''}
        <button type="button" class="task-delete" aria-label="Delete '${task.text}'">&times;</button>
      `;

      // The task text is set with textContent rather than being placed
      // directly in the template string above. This treats whatever the
      // visitor typed as plain text rather than HTML, so a task like
      // "<b>hi</b>" shows up literally instead of being rendered as bold.
      item.querySelector('.task-text').textContent = task.text;

      taskList.appendChild(item);
    });

    // Toggle the empty state message depending on whether this filter has
    // anything to show right now.
    emptyState.classList.toggle('visible', visibleTasks.length === 0);

    updateStats();
  }

  /**
   * Recalculates the three counters in the stats bar from the full tasks
   * array (not the filtered view, the counts should always reflect
   * everything, regardless of which filter tab is active).
   */
  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter((task) => task.completed).length;
    statTotal.textContent = total;
    statDone.textContent = done;
    statActive.textContent = total - done;
  }

  /**
   * Adds a new task to the array, saves, and re-renders. A simple
   * Date.now() is used as the id, good enough for a client-only list
   * where ids never need to be looked up against a server.
   */
  function addTask(text, dueDate) {
    tasks.push({
      id: Date.now(),
      text: text,
      dueDate: dueDate,
      completed: false,
    });
    saveTasks();
    renderTasks();
  }

  /** Flips a task's completed state by id, then saves and re-renders. */
  function toggleTaskComplete(id) {
    const task = tasks.find((task) => task.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
    }
  }

  /** Removes a task from the array by id, then saves and re-renders. */
  function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
  }

  // EVENT: form submission handles adding a new task. preventDefault()
  // stops the browser's default full-page reload that a form submit would
  // otherwise trigger.
  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (text === '') {
      formError.textContent = 'Type a task before adding it.';
      taskInput.focus();
      return;
    }

    formError.textContent = '';
    addTask(text, taskDateInput.value);

    // Reset the form for the next entry and return focus to the text
    // field so a visitor adding several tasks in a row never has to
    // reach for the mouse.
    taskForm.reset();
    taskInput.focus();
  });

  // EVENT DELEGATION: rather than attaching a click listener to every
  // individual checkbox and delete button (which would need to be redone
  // every time renderTasks() rebuilds the list), one listener sits on the
  // parent <ul> and inspects event.target to figure out what was actually
  // clicked. This keeps working correctly no matter how many times the
  // list is re-rendered.
  taskList.addEventListener('click', (event) => {
    const row = event.target.closest('.task-item');
    if (!row) return;

    const id = Number(row.dataset.id);

    if (event.target.matches('.task-delete')) {
      deleteTask(id);
    } else if (event.target.matches('input[type="checkbox"]')) {
      toggleTaskComplete(id);
    }
  });

  // EVENT: clicking a filter tab updates which tasks are visible and
  // moves the .active styling to the clicked button.
  filterTabs.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;

    filterTabs.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    currentFilter = button.dataset.filter;
    renderTasks();
  });

  // Draw whatever was loaded from localStorage (or an empty list) the
  // moment the planner page loads.
  renderTasks();
}

/* --------------------------------------------------------------------------
   6. CONTACT FORM VALIDATION (contact.html only)
   Checks name, email, phone, and message on submit. Every rule from the
   brief is covered here: no field left empty, email must match a valid
   pattern, phone must contain digits only. Each field gets its own error
   message shown right under it, rather than one generic alert for the
   whole form, so the visitor knows exactly what to fix without hunting.
   -------------------------------------------------------------------------- */
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  const nameField = document.getElementById('nameField');
  const emailField = document.getElementById('emailField');
  const phoneField = document.getElementById('phoneField');
  const messageField = document.getElementById('messageField');
  const formSuccess = document.getElementById('formSuccess');

  // A simple, readable email pattern: something, an @ symbol, something,
  // a dot, something. Not a full RFC-5322 implementation, but that level
  // of strictness tends to reject valid real-world addresses anyway, this
  // catches the actual typos visitors make (missing @, missing domain).
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Digits only, as the brief specifies. Visitors are told in the
  // placeholder to type digits only, so this does not try to strip
  // spaces or dashes first, it checks exactly what was typed.
  const PHONE_PATTERN = /^\d+$/;

  /**
   * Shows an error message under one field and marks its .form-group as
   * invalid (which the CSS uses to turn the input's border pink). Passing
   * an empty message clears both the text and the invalid styling, this
   * same function handles showing and hiding errors.
   */
  function setFieldError(field, errorElement, message) {
    errorElement.textContent = message;
    field.closest('.form-group').classList.toggle('invalid', message !== '');
  }

  /**
   * Runs every validation rule and returns true only if every field
   * passes. Each field is checked and reported independently, so if a
   * visitor leaves three fields empty they see three separate messages
   * at once instead of having to fix and resubmit one at a time.
   */
  function validateContactForm() {
    let isValid = true;

    if (nameField.value.trim() === '') {
      setFieldError(nameField, document.getElementById('nameError'), 'Enter your name.');
      isValid = false;
    } else {
      setFieldError(nameField, document.getElementById('nameError'), '');
    }

    if (emailField.value.trim() === '') {
      setFieldError(emailField, document.getElementById('emailError'), 'Enter your email.');
      isValid = false;
    } else if (!EMAIL_PATTERN.test(emailField.value.trim())) {
      setFieldError(emailField, document.getElementById('emailError'), 'Enter a valid email address.');
      isValid = false;
    } else {
      setFieldError(emailField, document.getElementById('emailError'), '');
    }

    if (phoneField.value.trim() === '') {
      setFieldError(phoneField, document.getElementById('phoneError'), 'Enter your phone number.');
      isValid = false;
    } else if (!PHONE_PATTERN.test(phoneField.value.trim())) {
      setFieldError(phoneField, document.getElementById('phoneError'), 'Digits only, no spaces or symbols.');
      isValid = false;
    } else {
      setFieldError(phoneField, document.getElementById('phoneError'), '');
    }

    if (messageField.value.trim() === '') {
      setFieldError(messageField, document.getElementById('messageError'), 'Enter a message.');
      isValid = false;
    } else {
      setFieldError(messageField, document.getElementById('messageError'), '');
    }

    return isValid;
  }

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    formSuccess.classList.remove('visible');

    if (validateContactForm()) {
      // No backend is connected yet, so "sending" just means confirming
      // the data is well-formed and resetting the form. See the comment
      // in contact.html on #formSuccess for more on this.
      formSuccess.classList.add('visible');
      contactForm.reset();
    } else {
      // Move focus to the first field that still has an error, so
      // keyboard users land exactly where they need to fix something
      // instead of staying wherever they happened to submit from.
      const firstInvalid = contactForm.querySelector('.form-group.invalid input, .form-group.invalid textarea');
      if (firstInvalid) firstInvalid.focus();
    }
  });

  // Clears a field's error the moment the visitor starts correcting it,
  // rather than making them wait for another full submit to see the
  // message disappear.
  [nameField, emailField, phoneField, messageField].forEach((field) => {
    field.addEventListener('input', () => {
      field.closest('.form-group').classList.remove('invalid');
      const errorEl = field.closest('.form-group').querySelector('.field-error');
      if (errorEl) errorEl.textContent = '';
    });
  });
}

