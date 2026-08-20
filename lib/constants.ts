export const CU_DEPARTMENTS = [
  "College of Computer Studies",
  "College of Engineering",
  "College of Nursing",
  "College of Medical Technology",
  "College of Business Administration",
  "College of Education",
  "College of Criminology",
  "College of Arts and Sciences",
  "College of Maritime Education",
  "Senior High School",
] as const;

export type DepartmentType = typeof CU_DEPARTMENTS[number];

export const MATCHMAKING_TIPS = [
  "Tip: Respect fellow students at all times.",
  "Tip: You can filter matches by 'Same Department' or 'Different Department'.",
  "Tip: No real names or student IDs are shared in conversation.",
  "Tip: Press 'Next' anytime to find a new campus conversation.",
  "Tip: Upload images to share notes or campus highlights securely.",
  "Tip: Try starting with a fun question like 'What's your favorite study spot on campus?'",
];

export interface AvatarOption {
  id: string;
  name: string;
  character: string;
  category: string;
  url: string;
  corner: "left" | "right";
  description: string;
}

export const IP_AVATARS: AvatarOption[] = [
  {
    id: "coin-left",
    name: "Capi-Coin",
    character: "Pink Coin Mascot",
    category: "Mascot",
    url: "/avatars/coin-left.jpg",
    corner: "left",
    description: "CapiTalk's signature hot-pink coin emblem",
  },
  {
    id: "coin-right",
    name: "Capi-Coin Gold",
    character: "Pink Coin Mascot",
    category: "Mascot",
    url: "/avatars/coin-right.jpg",
    corner: "right",
    description: "Pink coin with warm golden accent rim",
  },
  {
    id: "capybara-left",
    name: "Chill Capi",
    character: "Capybara",
    category: "Chill",
    url: "/avatars/capybara-left.jpg",
    corner: "left",
    description: "Caramel capybara radiating calm vibes",
  },
  {
    id: "capybara-right",
    name: "Zen Capi",
    character: "Capybara",
    category: "Chill",
    url: "/avatars/capybara-right.jpg",
    corner: "right",
    description: "Golden tan capybara ready for relaxed chats",
  },
  {
    id: "bubble-left",
    name: "Sunny Talk",
    character: "Chat Bubble",
    category: "Social",
    url: "/avatars/bubble-left.jpg",
    corner: "left",
    description: "Highlight yellow speech bubble avatar",
  },
  {
    id: "bubble-right",
    name: "Lime Talk",
    character: "Chat Bubble",
    category: "Social",
    url: "/avatars/bubble-right.jpg",
    corner: "right",
    description: "Zesty lime-yellow speech bubble mascot",
  },
  {
    id: "owl-left",
    name: "Study Owl",
    character: "Campus Owl",
    category: "Academic",
    url: "/avatars/owl-left.jpg",
    corner: "left",
    description: "Maroon & gold late-night library scholar",
  },
  {
    id: "owl-right",
    name: "Pink Spectacles",
    character: "Campus Owl",
    category: "Academic",
    url: "/avatars/owl-right.jpg",
    corner: "right",
    description: "Ink & coin-pink nocturnal study companion",
  },
  {
    id: "coffee-left",
    name: "Mocha Brew",
    character: "Coffee Bean",
    category: "Campus Life",
    url: "/avatars/coffee-left.jpg",
    corner: "left",
    description: "Rich roasted espresso bean fuel for 7 AM lectures",
  },
  {
    id: "coffee-right",
    name: "Caramel Brew",
    character: "Coffee Bean",
    category: "Campus Life",
    url: "/avatars/coffee-right.jpg",
    corner: "right",
    description: "Caramel amber bean companion",
  },
  {
    id: "cat-left",
    name: "Peach Puspin",
    character: "Campus Cat",
    category: "Campus Life",
    url: "/avatars/cat-left.jpg",
    corner: "left",
    description: "Friendly quad stray cat with warm peach fur",
  },
  {
    id: "cat-right",
    name: "Tuxedo Puspin",
    character: "Campus Cat",
    category: "Campus Life",
    url: "/avatars/cat-right.jpg",
    corner: "right",
    description: "Sleek midnight black campus cat with pink accents",
  },
  {
    id: "sprout-left",
    name: "Sunny Seedling",
    character: "Freshman Sprout",
    category: "Growth",
    url: "/avatars/sprout-left.jpg",
    corner: "left",
    description: "Cheerful green & yellow freshman seedling",
  },
  {
    id: "sprout-right",
    name: "Mint Seedling",
    character: "Freshman Sprout",
    category: "Growth",
    url: "/avatars/sprout-right.jpg",
    corner: "right",
    description: "Soft sage-mint seedling bursting with curiosity",
  },
  {
    id: "ghost-left",
    name: "Nite-Lite Ghost",
    character: "Midnight Ghost",
    category: "Secret",
    url: "/avatars/ghost-left.jpg",
    corner: "left",
    description: "Soft lavender midnight ghost for anonymous whispers",
  },
];

export const DEFAULT_AVATARS = IP_AVATARS.map((avatar) => avatar.url);

/**
 * Deterministically generates a default IP placeholder avatar URL
 * based on the user's pseudonym string.
 */
export function getAvatarForPseudonym(pseudonym: string): string {
  if (!pseudonym || !pseudonym.trim()) {
    return IP_AVATARS[0].url;
  }
  const clean = pseudonym.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % IP_AVATARS.length;
  return IP_AVATARS[index].url;
}

export const BOT_PARTNERS: Array<{
  id: string;
  username: string;
  department: DepartmentType;
  bio: string;
  avatar_url: string;
  status: "in_chat";
  is_admin?: boolean;
}> = [
  {
    id: "bot_admin",
    username: "👑 CapiTalk Admin",
    department: "College of Computer Studies",
    bio: "Official CapiTalk Platform Administrator 🛡️ Here to moderate & assist campus chats.",
    avatar_url: "/avatars/coin-left.jpg",
    status: "in_chat",
    is_admin: true,
  },
  {
    id: "bot_1",
    username: "pixel_sammy",
    department: "College of Computer Studies",
    bio: "Building cool web apps & drinking iced coffee ☕",
    avatar_url: "/avatars/bubble-left.jpg",
    status: "in_chat",
  },
  {
    id: "bot_2",
    username: "nurse_kate",
    department: "College of Nursing",
    bio: "Duty starts at 6 AM! Coffee is life 💉",
    avatar_url: "/avatars/capybara-left.jpg",
    status: "in_chat",
  },
  {
    id: "bot_medtech",
    username: "medtech_claire",
    department: "College of Medical Technology",
    bio: "Microbiology lab duties & hematology smears 🔬🧫",
    avatar_url: "/avatars/sprout-right.jpg",
    status: "in_chat",
  },
  {
    id: "bot_3",
    username: "engr_mark",
    department: "College of Engineering",
    bio: "Circuits & structural mechanics 🛠️",
    avatar_url: "/avatars/owl-left.jpg",
    status: "in_chat",
  },
  {
    id: "bot_4",
    username: "biz_alexa",
    department: "College of Business Administration",
    bio: "Marketing strategy & entrepreneurship 📈",
    avatar_url: "/avatars/coin-right.jpg",
    status: "in_chat",
  },
  {
    id: "bot_educ",
    username: "teacher_josh",
    department: "College of Education",
    bio: "Lesson plans, pedagogy & student mentorship 📚✏️",
    avatar_url: "/avatars/owl-right.jpg",
    status: "in_chat",
  },
  {
    id: "bot_crim",
    username: "cadet_miguel",
    department: "College of Criminology",
    bio: "Forensics, law enforcement & physical training 👮‍♂️🛡️",
    avatar_url: "/avatars/cat-right.jpg",
    status: "in_chat",
  },
  {
    id: "bot_cas",
    username: "writer_sophia",
    department: "College of Arts and Sciences",
    bio: "Communication arts, philosophy & campus journalism ✍️🎭",
    avatar_url: "/avatars/ghost-left.jpg",
    status: "in_chat",
  },
  {
    id: "bot_maritime",
    username: "seaman_kevin",
    department: "College of Maritime Education",
    bio: "Bridge navigation, seamanship & compass heading ⚓🌊",
    avatar_url: "/avatars/coffee-left.jpg",
    status: "in_chat",
  },
  {
    id: "bot_shs",
    username: "stem_chloe",
    department: "Senior High School",
    bio: "SHS STEM student getting ready for university life 🎓✨",
    avatar_url: "/avatars/sprout-left.jpg",
    status: "in_chat",
  },
];

export const BOT_RESPONSES = [
  "Hey there! Ready to chat? What department are you from?",
  "Haha nice! How are your classes going this semester?",
  "I was just studying at the campus library! It's so peaceful today.",
  "That's awesome! Have you tried the coffee near the student lounge?",
  "Totally agree! What year level are you in?",
  "Glad we got connected on CapiTalk! 👋",
];
