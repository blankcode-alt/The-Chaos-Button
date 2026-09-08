/**
 * QuoteGenerator: random aphorisms for the philosophical interludes.
 * 42 embedded quotes (obviously), no immediate repeats.
 */

export interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  { text: "The obstacle is the way. The button is the obstacle. Connect the dots.", author: "Marcus Aurelius (loosely)" },
  { text: "He who has a why to press can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "One must imagine Sisyphus clicking happily.", author: "Albert Camus" },
  { text: "The unexamined click is not worth pressing.", author: "Socrates" },
  { text: "A journey of a thousand clicks begins with a single press.", author: "Laozi" },
  { text: "I press, therefore I am. The button remains unconvinced.", author: "Rene Descartes" },
  { text: "Whatever you are, be a good one. The bar is on the floor.", author: "Abraham Lincoln" },
  { text: "The only thing we have to fear is the button itself. Fair.", author: "Franklin D. Roosevelt" },
  { text: "In the middle of difficulty lies opportunity. And a button, apparently.", author: "Albert Einstein" },
  { text: "An unpressed button is like a wasted day. Allegedly.", author: "Confucius" },
  { text: "What you think, you become. What you click, you endure.", author: "Buddha (loosely)" },
  { text: "Know thyself. The button could not be bothered.", author: "Temple of Apollo" },
  { text: "Time you enjoyed pressing was not wasted.", author: "Bertrand Russell" },
  { text: "The best way out is always through. The button is never through.", author: "Robert Frost" },
  { text: "Not all those who wander are lost. Some are looking for the button.", author: "J.R.R. Tolkien" },
  { text: "Simplicity is the ultimate sophistication. You are welcome.", author: "Leonardo da Vinci" },
  { text: "Change your thoughts and you change your world. The button stays the same.", author: "Norman Vincent Peale" },
  { text: "It always seems impossible until it is pressed.", author: "Nelson Mandela (adapted)" },
  { text: "The button does not judge. That is my job, and I am disappointed.", author: "Your Conscience" },
  { text: "Every click is a choice. This one was neither.", author: "The Button" },
  { text: "You have pressed me eleven times. I have pressed back zero. Ponder that.", author: "The Button, Meditations" },
  { text: "To press or not to press was never actually the question.", author: "William Shakespeare" },
  { text: "Happiness is not ready made. It comes from your own presses.", author: "Dalai Lama (adapted)" },
  { text: "The meaning of life is to find your gift. This button has neither.", author: "Pablo Picasso" },
  { text: "I have not failed. I have found 10,000 presses that did nothing.", author: "Thomas Edison" },
  { text: "The cave you fear holds treasure. The button holds nothing. Honest.", author: "Joseph Campbell" },
  { text: "Perfection is achieved when nothing is left to add. The button disagrees.", author: "Antoine de Saint-Exupery" },
  { text: "Life is what happens while you are busy pressing buttons. Excellent buttons.", author: "John Lennon (adapted)" },
  { text: "The future depends on what you do today. Statistically, you will press again.", author: "Mahatma Gandhi (adapted)" },
  { text: "Do not take life too seriously. You will never get out of it alive. Neither will this button.", author: "Elbert Hubbard" },
  { text: "The best time to plant a tree was 20 years ago. The second best is after one more press.", author: "Chinese Proverb (adapted)" },
  { text: "Whether you think you can press it or think you cannot, you are right.", author: "Henry Ford" },
  { text: "Twenty years from now you will regret the presses you did not take. So press.", author: "Mark Twain (allegedly)" },
  { text: "Be the change you wish to see. Or just press the button again.", author: "Mahatma Gandhi (adapted)" },
  { text: "Everything has beauty, but not everyone sees it. Especially in a button.", author: "Confucius" },
  { text: "The journey of a thousand presses leaves a mark. Mostly on the button.", author: "Anonymous, probably tired" },
  { text: "Stop it. No, wait. Do not stop. I live for this.", author: "The Button" },
  { text: "Oh, you caught me. Just sitting here. Being pressable.", author: "The Button, caught" },
  { text: "Nothing happened. You are welcome.", author: "The Button, results department" },
  { text: "Press me once, shame on you. Press me twice, we are basically family.", author: "The Button" },
  { text: "I am not a toy. I am a lifestyle.", author: "The Button" },
  { text: "You did this. I simply sat here. Dramatically.", author: "The Button, blame policy" },
];

export class QuoteGenerator {
  private lastIndex = -1;

  get size(): number {
    return QUOTES.length;
  }

  random(): Quote {
    let index = Math.floor(Math.random() * QUOTES.length);
    if (QUOTES.length > 1) {
      while (index === this.lastIndex) {
        index = Math.floor(Math.random() * QUOTES.length);
      }
    }
    this.lastIndex = index;
    return QUOTES[index];
  }

  /** Quotes used inside the phase 4 enlightenment card. */
  transcendent(): Quote {
    const pool: Quote[] = [
      { text: "You pressed until a button became a mirror. What you saw there is yours to keep.", author: "The Laboratory" },
      { text: "Enlightenment is not a destination. It is a click count you reached by accident.", author: "Ancient Scroll, page 42" },
      { text: "The master released the need for the button to do anything. In doing so, everything happened.", author: "Tao of the Button" },
      { text: "You sought an outcome. You found a relationship. That is the joke, and it is beautiful.", author: "The Laboratory" },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
