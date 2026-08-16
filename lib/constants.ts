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

export const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=pixelwizard&backgroundColor=ff90e8",
  "https://api.dicebear.com/7.x/bottts/svg?seed=sleepycoder&backgroundColor=ffc900",
  "https://api.dicebear.com/7.x/bottts/svg?seed=coffeelover&backgroundColor=f1f333",
  "https://api.dicebear.com/7.x/bottts/svg?seed=dev_july&backgroundColor=dc341e",
  "https://api.dicebear.com/7.x/bottts/svg?seed=capitalk1&backgroundColor=f4f4f0",
];

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
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=capitalkadmin&backgroundColor=701a31",
    status: "in_chat",
    is_admin: true,
  },
  {
    id: "bot_1",
    username: "pixel_sammy",
    department: "College of Computer Studies",
    bio: "Building cool web apps & drinking iced coffee ☕",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sammy&backgroundColor=ff90e8",
    status: "in_chat",
  },
  {
    id: "bot_2",
    username: "nurse_kate",
    department: "College of Nursing",
    bio: "Duty starts at 6 AM! Coffee is life 💉",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=kate&backgroundColor=ffc900",
    status: "in_chat",
  },
  {
    id: "bot_medtech",
    username: "medtech_claire",
    department: "College of Medical Technology",
    bio: "Microbiology lab duties & hematology smears 🔬🧫",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=medtechclaire&backgroundColor=00e599",
    status: "in_chat",
  },
  {
    id: "bot_3",
    username: "engr_mark",
    department: "College of Engineering",
    bio: "Circuits & structural mechanics 🛠️",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=mark&backgroundColor=f1f333",
    status: "in_chat",
  },
  {
    id: "bot_4",
    username: "biz_alexa",
    department: "College of Business Administration",
    bio: "Marketing strategy & entrepreneurship 📈",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=alexa&backgroundColor=dc341e",
    status: "in_chat",
  },
  {
    id: "bot_educ",
    username: "teacher_josh",
    department: "College of Education",
    bio: "Lesson plans, pedagogy & student mentorship 📚✏️",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=josh&backgroundColor=701a31",
    status: "in_chat",
  },
  {
    id: "bot_crim",
    username: "cadet_miguel",
    department: "College of Criminology",
    bio: "Forensics, law enforcement & physical training 👮‍♂️🛡️",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=miguel&backgroundColor=18181b",
    status: "in_chat",
  },
  {
    id: "bot_cas",
    username: "writer_sophia",
    department: "College of Arts and Sciences",
    bio: "Communication arts, philosophy & campus journalism ✍️🎭",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sophia&backgroundColor=ff4b91",
    status: "in_chat",
  },
  {
    id: "bot_maritime",
    username: "seaman_kevin",
    department: "College of Maritime Education",
    bio: "Bridge navigation, seamanship & compass heading ⚓🌊",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=kevin&backgroundColor=2563eb",
    status: "in_chat",
  },
  {
    id: "bot_shs",
    username: "stem_chloe",
    department: "Senior High School",
    bio: "SHS STEM student getting ready for university life 🎓✨",
    avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=chloe&backgroundColor=16a34a",
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
