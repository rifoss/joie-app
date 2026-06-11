import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const MAX_HOBBIES = 12;

const HOBBY_ICONS = ["🎸","🎨","📚","🏃","🧘","🎮","📷","✍️","🎵","🌱","🧑‍🍳","♟️","🏌️","🎯","🏊","🚴","🧗","🎭","🪡","🔬","💻","🎧","⭐","🏋️","☕","💬","🎬","🎲","🐕","🪂","✈️","🎹","🧩","🎤","🛹","🏕️"];

const CATEGORIES = [
  { id: "move", label: "Move", color: "#FF6B6B", desc: "Hobbies that get your body active and build physical health. E.g. running, gym, sports, hiking, dance, yoga, swimming" },
  { id: "learn", label: "Learn", color: "#67E8F9", desc: "Hobbies that stretch your mind and deepen your understanding of the world. E.g. reading, languages, coding, puzzles, courses, chess" },
  { id: "create", label: "Create", color: "#C084FC", desc: "Hobbies where you make something that didn't exist before. E.g. music, art, writing, photography, cooking, design" },
  { id: "restore", label: "Restore", color: "#34D399", desc: "Hobbies that recharge your inner life and bring stillness. E.g. meditation, journaling, gardening, stretching, prayer" },
  { id: "connect", label: "Connect", color: "#FB923C", desc: "Hobbies centered on building relationships and community. E.g. coffee chats, online communities, volunteering, clubs, mentoring, open mics, pickup sports" },
  { id: "play", label: "Play", color: "#FACC15", desc: "Hobbies centered on fun, entertainment, and exploration. E.g. gaming, movies, board games, concerts, trying new restaurants" },
];

const ENCOURAGEMENTS = [
  "You showed up. That's everything.",
  "Small steps, big life.",
  "Today you chose growth.",
  "Consistency beats perfection.",
  "This is what living looks like.",
  "You're building something real.",
  "Future you will thank present you.",
  "The streak is proof you care.",
];

const LEVELS = [
  { level: 1, xp: 0, name: "Drifter" },
  { level: 2, xp: 100, name: "Wanderer" },
  { level: 3, xp: 200, name: "Seeker" },
  { level: 4, xp: 300, name: "Explorer" },
  { level: 5, xp: 400, name: "Pathfinder" },
  { level: 6, xp: 500, name: "Navigator" },
  { level: 7, xp: 600, name: "Voyager" },
  { level: 8, xp: 700, name: "Trailblazer" },
  { level: 9, xp: 800, name: "Sage" },
  { level: 10, xp: 1000, name: "Wayfarer" },
];

const STAGES = [
  { stage: 1, name: "Drifter", req: null, desc: "Beginning the journey" },
  { stage: 2, name: "Wanderer", req: { count: 1, level: 2 }, desc: "1 category at Lv.2" },
  { stage: 3, name: "Seeker", req: { count: 2, level: 2 }, desc: "2 categories at Lv.2" },
  { stage: 4, name: "Explorer", req: { count: 2, level: 3 }, desc: "2 categories at Lv.3" },
  { stage: 5, name: "Pathfinder", req: { count: 3, level: 3 }, desc: "3 categories at Lv.3" },
  { stage: 6, name: "Navigator", req: { count: 3, level: 4 }, desc: "3 categories at Lv.4" },
  { stage: 7, name: "Voyager", req: { count: 4, level: 4 }, desc: "4 categories at Lv.4" },
  { stage: 8, name: "Trailblazer", req: { count: 4, level: 5 }, desc: "4 categories at Lv.5" },
  { stage: 9, name: "Sage", req: { count: 5, level: 5 }, desc: "5 categories at Lv.5" },
  { stage: 10, name: "Wayfarer", req: { count: 5, level: 6 }, desc: "All 5 categories at Lv.6" },
];

const WEEKLY_GOAL_BONUS = 25;

const CATEGORY_MULTIPLIERS = { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75 };
const DIVERSITY_MULTIPLIERS = { 1: 1, 2: 1.05, 3: 1.10, 4: 1.15, 5: 1.20, 6: 1.25 };

function getCategoryMultiplier(hobbies, categoryId) {
  const count = hobbies.filter(h => (h.category || "move") === categoryId && Object.keys(h.log).some(k => h.log[k])).length;
  return CATEGORY_MULTIPLIERS[Math.min(count, 4)] || 1;
}

function getDiversityMultiplier(hobbies) {
  const activeCats = new Set(hobbies.filter(h => Object.keys(h.log).some(k => h.log[k])).map(h => h.category || "move"));
  return DIVERSITY_MULTIPLIERS[activeCats.size] || 1;
}

function getTotalMultiplier(hobbies, categoryId) {
  return Math.round(getCategoryMultiplier(hobbies, categoryId) * getDiversityMultiplier(hobbies) * 100) / 100;
}

function getWeekStartDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return toLocalDateStr(d);
}

const EVENT_XP = 50;

function getHobbyXP(log, weeklyGoal, multiplier, hobbyType) {
  let xp = 0;

  if (hobbyType === "event") {
    for (const date in log) {
      if (log[date]) xp += EVENT_XP;
    }
    return Math.floor(xp * (multiplier || 1));
  }

  const weekTotals = {};

  for (const date in log) {
    if (!log[date]) continue;
    const mins = typeof log[date] === "number" ? log[date] : 30;
    xp += 10;
    xp += Math.floor(mins / 30) * 5;

    if (weeklyGoal) {
      const weekStart = getWeekStartDate(date);
      weekTotals[weekStart] = (weekTotals[weekStart] || 0) + mins;
    }
  }

  if (weeklyGoal) {
    for (const week in weekTotals) {
      if (weekTotals[week] >= weeklyGoal) {
        xp += WEEKLY_GOAL_BONUS;
      }
    }
  }

  return Math.floor(xp * (multiplier || 1));
}

function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { current = LEVELS[i]; break; }
  }
  const next = LEVELS.find(l => l.level === current.level + 1);
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { ...current, xp: xp, nextXp: next ? next.xp : current.xp, nextName: next ? next.name : null, progress };
}

function getCategoryLevels(hobbies) {
  return CATEGORIES.map(c => {
    const catHobbies = hobbies.filter(h => (h.category || "move") === c.id);
    if (catHobbies.length === 0) return { ...c, level: 0, xp: 0, progress: 0, name: "—", nextName: null, nextXp: 0, mult: 1 };

    const mult = getTotalMultiplier(hobbies, c.id);

    let bestXP = 0;
    catHobbies.forEach(h => {
      const hxp = getHobbyXP(h.log, h.weeklyGoal, mult, h.hobbyType);
      if (hxp > bestXP) bestXP = hxp;
    });

    return { ...c, ...getLevelInfo(bestXP), mult };
  });
}

function getStageInfo(hobbies) {
  const catLevels = getCategoryLevels(hobbies);
  let currentStage = STAGES[0];

  for (let i = STAGES.length - 1; i >= 0; i--) {
    const s = STAGES[i];
    if (!s.req) { currentStage = s; continue; }
    const qualifying = catLevels.filter(c => c.level >= s.req.level).length;
    if (qualifying >= s.req.count) {
      currentStage = s;
      break;
    }
  }

  const nextStage = STAGES.find(s => s.stage === currentStage.stage + 1);
  return { ...currentStage, next: nextStage, catLevels };
}

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getToday() {
  return toLocalDateStr(new Date());
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }
  return days;
}

function calculateOverallStreak(hobbies, restDays) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = toLocalDateStr(d);
    const didAny = hobbies.some(h => h.log[key]);
    const wasRest = restDays && restDays[key];
    if (i === 0 && !didAny && !wasRest) continue;
    if (didAny || wasRest) streak++;
    else break;
  }
  return streak;
}

function getRestDaysThisWeek(restDays) {
  const weekDays = getWeekDates();
  return weekDays.filter(d => restDays && restDays[d]).length;
}

function calculateStreak(log) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = toLocalDateStr(d);
    if (i === 0 && !log[key]) continue;
    if (log[key]) streak++;
    else break;
  }
  return streak;
}

function calculateLongestStreak(log) {
  const dates = Object.keys(log).filter(k => log[k]).sort();
  if (dates.length === 0) return 0;
  let longest = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T12:00:00");
    const curr = new Date(dates[i] + "T12:00:00");
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return Math.max(longest, current);
}

function totalDays(log) {
  return Object.values(log).filter(Boolean).length;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(toLocalDateStr(d));
  }
  return days;
}

function getWeeklyMinutes(log) {
  const weekDays = getWeekDates();
  return weekDays.reduce((sum, d) => sum + (typeof log[d] === "number" ? log[d] : (log[d] ? 30 : 0)), 0);
}

const INTERESTS = [
  { id: "science", label: "Science & Nature", icon: "🔬", desc: "The universe, biology, physics, climate" },
  { id: "philosophy", label: "Philosophy & Big Questions", icon: "🤔", desc: "Meaning, ethics, how to live" },
  { id: "history", label: "History & Culture", icon: "🏛️", desc: "Civilizations, traditions, untold stories" },
  { id: "technology", label: "Technology & Future", icon: "🚀", desc: "AI, space, innovation" },
  { id: "health", label: "Health & Human Body", icon: "🧬", desc: "Nutrition, sleep, neuroscience, longevity" },
  { id: "art", label: "Art & Design", icon: "🎨", desc: "Visual culture, architecture, film" },
  { id: "music", label: "Music & Sound", icon: "🎵", desc: "Theory, history, production, genres" },
  { id: "psychology", label: "Psychology & Behavior", icon: "🧠", desc: "Why we do what we do, habits, motivation" },
  { id: "travel", label: "Travel & Geography", icon: "🌍", desc: "Places, peoples, food cultures" },
  { id: "money", label: "Money & Independence", icon: "💰", desc: "Personal finance, investing, freedom" },
];

const DAILY_CARD_LIMIT = 15;

const TOPIC_GRADIENTS = {
  "Science & Nature": "linear-gradient(135deg, #1a3a2a, #0d4a3a)",
  "Philosophy & Big Questions": "linear-gradient(135deg, #2a1a3a, #3a1a4a)",
  "History & Culture": "linear-gradient(135deg, #3a2a1a, #4a3018)",
  "Technology & Future": "linear-gradient(135deg, #1a2a3a, #0d2a4a)",
  "Health & Human Body": "linear-gradient(135deg, #1a3a3a, #0d3a4a)",
  "Art & Design": "linear-gradient(135deg, #3a1a2a, #4a1838)",
  "Music & Sound": "linear-gradient(135deg, #2a1a3a, #4a1a5a)",
  "Psychology & Behavior": "linear-gradient(135deg, #2a2a1a, #3a3a18)",
  "Travel & Geography": "linear-gradient(135deg, #1a2a2a, #183a3a)",
  "Money & Independence": "linear-gradient(135deg, #2a3a1a, #2a4a18)",
};

const defaultData = {
  hobbies: [],
  restDays: {},
  interests: [],
  savedItems: [],
  version: 1,
};

export default function Joie() {
  const [data, setData] = useState(defaultData);
  const [view, setView] = useState("dashboard");
  const [editingHobby, setEditingHobby] = useState(null);
  const [hobbyForm, setHobbyForm] = useState({ name: "", icon: "🎸", weeklyGoal: "", category: "move", hobbyType: "routine" });
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [checkinId, setCheckinId] = useState(null);
  const [checkinMinutes, setCheckinMinutes] = useState("30");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [heatEdit, setHeatEdit] = useState(null);
  const [heatMinutes, setHeatMinutes] = useState("30");
  const [feedCards, setFeedCards] = useState([]);
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedDate, setFeedDate] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [discoverView, setDiscoverView] = useState("feed");
  // Auth state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadFromSupabase(session.user.id);
      else setLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadFromSupabase(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFromSupabase = async (userId) => {
    try {
      // Try loading from Supabase first
      const { data: rows, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId);

      if (error) {
        console.error("Supabase load error:", error);
      }

      if (rows && rows.length > 0 && rows[0].data) {
        const merged = { ...defaultData, ...rows[0].data };
        setData(merged);
        try { localStorage.setItem("joie-data", JSON.stringify(merged)); } catch {}
        setLoaded(true);
        return;
      }

      // No cloud data — check localStorage for existing data to migrate
      const local = localStorage.getItem("joie-data");
      if (local) {
        const parsed = { ...defaultData, ...JSON.parse(local) };
        setData(parsed);
        await supabase.from("user_data")
          .update({ data: parsed, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    } catch (e) {
      console.error("Load error:", e);
      // Final fallback — try localStorage
      try {
        const local = localStorage.getItem("joie-data");
        if (local) setData({ ...defaultData, ...JSON.parse(local) });
      } catch {}
    }
    setLoaded(true);
  };

  const persist = useCallback(async (newData) => {
    setData(newData);
    try { localStorage.setItem("joie-data", JSON.stringify(newData)); } catch {}
    if (user) {
      try {
        // Try update first (row should exist)
        const { error: updateError } = await supabase
          .from("user_data")
          .update({ data: newData, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Update failed, trying insert:", updateError);
          // Fallback to insert if row doesn't exist yet
          const { error: insertError } = await supabase
            .from("user_data")
            .insert({ user_id: user.id, data: newData, updated_at: new Date().toISOString() });

          if (insertError) console.error("Insert also failed:", insertError);
        }
      } catch (e) { console.error("Supabase save exception:", e); }
    }
  }, [user]);

  const handleAuth = async (mode) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      let result;
      if (mode === "signup") {
        result = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      } else {
        result = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      }
      if (result.error) setAuthError(result.error.message);
      else if (mode === "signup" && result.data?.user && !result.data.session) {
        setAuthError("Check your email to confirm your account, then log in.");
        setAuthMode("login");
      }
    } catch (e) {
      setAuthError(e.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setData(defaultData);
    setView("dashboard");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const today = getToday();
  const last7 = getLast7Days();

  // --- Hobby CRUD ---
  const addHobby = () => {
    if (!hobbyForm.name.trim()) return;
    if (data.hobbies.length >= MAX_HOBBIES) {
      showToast(`Max ${MAX_HOBBIES} hobbies — quality over quantity!`);
      return;
    }
    const newHobby = {
      id: Date.now().toString(),
      name: hobbyForm.name.trim(),
      icon: hobbyForm.icon,
      weeklyGoal: hobbyForm.hobbyType === "routine" && hobbyForm.weeklyGoal ? parseInt(hobbyForm.weeklyGoal) : null,
      category: hobbyForm.category,
      hobbyType: hobbyForm.hobbyType,
      log: {},
      createdAt: today,
    };
    persist({ ...data, hobbies: [...data.hobbies, newHobby] });
    setHobbyForm({ name: "", icon: "🎸", weeklyGoal: "", category: "move", hobbyType: "routine" });
    showToast(`${newHobby.icon} ${newHobby.name} added!`);
    setView("dashboard");
  };

  const updateHobby = () => {
    if (!hobbyForm.name.trim()) return;
    const updated = data.hobbies.map(h =>
      h.id === editingHobby ? { ...h, name: hobbyForm.name.trim(), icon: hobbyForm.icon, weeklyGoal: hobbyForm.hobbyType === "routine" && hobbyForm.weeklyGoal ? parseInt(hobbyForm.weeklyGoal) : null, category: hobbyForm.category, hobbyType: hobbyForm.hobbyType } : h
    );
    persist({ ...data, hobbies: updated });
    setEditingHobby(null);
    setHobbyForm({ name: "", icon: "🎸", weeklyGoal: "", category: "move", hobbyType: "routine" });
    showToast("Hobby updated!");
    setView("dashboard");
  };

  const deleteHobby = (id) => {
    const hobby = data.hobbies.find(h => h.id === id);
    persist({ ...data, hobbies: data.hobbies.filter(h => h.id !== id) });
    setEditingHobby(null);
    showToast(`${hobby?.name} removed`);
    setView("dashboard");
  };

  const toggleDay = (hobbyId, date) => {
    const hobby = data.hobbies.find(h => h.id === hobbyId);
    const isEvent = hobby.hobbyType === "event";

    if (hobby.log[date]) {
      // Unchecking any day
      const updated = data.hobbies.map(h => {
        if (h.id !== hobbyId) return h;
        const log = { ...h.log };
        delete log[date];
        return { ...h, log };
      });
      persist({ ...data, hobbies: updated });
      setCheckinId(null);
      setHeatEdit(null);
      return;
    }

    if (isEvent) {
      // Event hobbies: instant check-in, no minutes
      const updated = data.hobbies.map(h => {
        if (h.id !== hobbyId) return h;
        const log = { ...h.log };
        log[date] = true;
        return { ...h, log };
      });
      persist({ ...data, hobbies: updated });
      const catMult = getTotalMultiplier(data.hobbies, hobby.category || "move");
      const xp = Math.floor(EVENT_XP * catMult);
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      showToast(`+${xp} XP · ${msg}`);
      return;
    }

    if (date === today) {
      setCheckinId(hobbyId);
      setCheckinMinutes("30");
    } else {
      setHeatEdit({ hobbyId, date });
      setHeatMinutes("30");
    }
  };

  const confirmHeatEdit = () => {
    if (!heatEdit) return;
    const mins = parseInt(heatMinutes) || 0;
    if (mins <= 0) { showToast("Log at least 1 minute!"); return; }
    const xpEarned = 10 + Math.floor(mins / 30) * 5;
    const updated = data.hobbies.map(h => {
      if (h.id !== heatEdit.hobbyId) return h;
      const log = { ...h.log };
      log[heatEdit.date] = mins;
      return { ...h, log };
    });
    persist({ ...data, hobbies: updated });
    showToast(`+${xpEarned} XP · Logged ${mins}min retroactively`);
    setHeatEdit(null);
  };

  const confirmCheckin = () => {
    const mins = parseInt(checkinMinutes) || 0;
    if (mins <= 0) { showToast("Log at least 1 minute!"); return; }
    const hobby = data.hobbies.find(h => h.id === checkinId);
    const catMult = getTotalMultiplier(data.hobbies, hobby?.category || "move");
    const baseXP = 10 + Math.floor(mins / 30) * 5;
    const xpEarned = Math.floor(baseXP * catMult);
    const updated = data.hobbies.map(h => {
      if (h.id !== checkinId) return h;
      const log = { ...h.log };
      log[today] = mins;
      return { ...h, log };
    });

    // Check if this check-in triggers weekly goal bonus
    let bonusMsg = "";
    if (hobby && hobby.weeklyGoal) {
      const beforeMins = getWeeklyMinutes(hobby.log);
      const afterMins = beforeMins + mins;
      if (beforeMins < hobby.weeklyGoal && afterMins >= hobby.weeklyGoal) {
        bonusMsg = ` 🎯 +${WEEKLY_GOAL_BONUS} bonus!`;
      }
    }
    const multMsg = catMult > 1 ? ` (${catMult.toFixed(2)}x)` : "";

    persist({ ...data, hobbies: updated });
    const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    showToast(`+${xpEarned} XP${multMsg}${bonusMsg} · ${msg}`);
    setCheckinId(null);
  };

  const startEdit = (hobby) => {
    setEditingHobby(hobby.id);
    setHobbyForm({ name: hobby.name, icon: hobby.icon, weeklyGoal: hobby.weeklyGoal || "", category: hobby.category || "move", hobbyType: hobby.hobbyType || "routine" });
    setConfirmDelete(false);
    setView("add");
  };

  // --- Discover ---
  const toggleInterest = (id) => {
    const current = data.interests || [];
    const updated = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
    persist({ ...data, interests: updated });
  };

  const saveItem = (item) => {
    const saved = data.savedItems || [];
    const exists = saved.some(s => s.title === item.title);
    if (exists) {
      persist({ ...data, savedItems: saved.filter(s => s.title !== item.title) });
      showToast("Removed from saved");
    } else {
      persist({ ...data, savedItems: [...saved, { ...item, savedAt: today }] });
      showToast("Saved for later ✦");
    }
  };

  const isItemSaved = (item) => {
    return (data.savedItems || []).some(s => s.title === item.title);
  };

  const fetchDiscover = async () => {
    const interests = data.interests || [];
    if (interests.length === 0) return;

    if (feedDate === today && feedCards.length > 0) return;

    setFeedLoading(true);
    setFeedError(null);
    const selectedTopics = INTERESTS.filter(i => interests.includes(i.id));
    const topicList = selectedTopics.map(t => t.label).join(", ");
    const recentSaved = (data.savedItems || []).slice(-10).map(s => `"${s.title}" (${s.topic})`).join(", ");

    const prompt = `You are a thoughtful content curator for a personal growth app. Search the web and curate ${DAILY_CARD_LIMIT} pieces of content. My interests are: ${topicList}.
${recentSaved ? `\nTASTE SIGNAL: Here are articles I recently saved and enjoyed. Use these as hints for the kind of content I gravitate toward, but don't repeat them:\n${recentSaved}\n` : ""}
CRITICAL DISTRIBUTION RULE: Spread content EVENLY across my ${selectedTopics.length} topics. Each topic must have at least ${Math.max(1, Math.floor(DAILY_CARD_LIMIT / selectedTopics.length))} pieces. Do NOT over-index on any single topic.

Content guidelines:
- Hopeful and constructive tone — progress, breakthroughs, solutions, human stories
- Mix of articles, video essays, and long-reads
- Include 1-2 online community recommendations (subreddits, Discord servers, forums, Substacks) that match my interests
- Include lesser-known sources alongside major publications
- Relevant to 2025-2026 where possible
- No clickbait, no outrage, no doom
- For current events: focus on what's going RIGHT, not what's going wrong
- Surprise me — include at least 2-3 things I wouldn't have found on my own

Return ONLY a JSON array, no other text, no markdown fences:
[{"title":"string","source":"string","url":"https://...","imageUrl":"direct URL to thumbnail or empty string","summary":"2-3 sentences","topic":"one of: ${topicList}","type":"article, video, or community","whyPicked":"one sentence connecting this to personal growth or joy"}]`;

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API returned ${response.status}: ${errText.slice(0, 200)}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const text = result.text || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      const cards = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(cards) || cards.length === 0) {
        throw new Error("Could not parse content cards from response");
      }

      setFeedCards(cards.slice(0, DAILY_CARD_LIMIT));
      setFeedIndex(0);
      setFeedDate(today);
      setFeedError(null);
    } catch (err) {
      console.error("Discover fetch error:", err);
      setFeedError(err.message);
      showToast("Couldn't load content — see error below");
    }
    setFeedLoading(false);
  };

  const todayCheckedCount = data.hobbies.filter(h => h.log[today]).length;
  const todayTotal = data.hobbies.length;
  const overallStreak = calculateOverallStreak(data.hobbies, data.restDays);
  const isRestDay = data.restDays && data.restDays[today];
  const restDaysUsedThisWeek = getRestDaysThisWeek(data.restDays);
  const stageInfo = getStageInfo(data.hobbies);
  const diversityMult = getDiversityMultiplier(data.hobbies);

  const toggleRestDay = (date) => {
    const d = date || today;
    const restDays = { ...(data.restDays || {}) };
    if (restDays[d]) {
      delete restDays[d];
      persist({ ...data, restDays });
      showToast("Rest day removed");
    } else {
      const weekDays = getWeekDates();
      const usedThisWeek = weekDays.filter(wd => restDays[wd]).length;
      if (usedThisWeek >= 2) {
        showToast("Max 2 rest days per week — you got this!");
        return;
      }
      restDays[d] = true;
      persist({ ...data, restDays });
      showToast(d === today ? "Rest day — you've earned it 🌿" : `Rest day logged for ${d}`);
    }
  };

  if (!loaded) return <div style={styles.loadWrap}><div style={styles.loadPulse}>🌱</div></div>;

  // Auth screen
  if (!user) return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #141118; overflow-x: hidden; }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: accent, marginBottom: 8 }}>Joie</h1>
        <p style={{ color: textDim, fontSize: 15, marginBottom: 40 }}>Find joy in life outside of work</p>

        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ display: "flex", marginBottom: 20, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { setAuthMode("login"); setAuthError(null); }}
              style={{ flex: 1, padding: "10px", background: authMode === "login" ? accentDim : "transparent", color: authMode === "login" ? accent : textDim, border: "none", cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, fontWeight: 500 }}
            >Log in</button>
            <button
              onClick={() => { setAuthMode("signup"); setAuthError(null); }}
              style={{ flex: 1, padding: "10px", background: authMode === "signup" ? accentDim : "transparent", color: authMode === "signup" ? accent : textDim, border: "none", cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, fontWeight: 500 }}
            >Sign up</button>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            style={{ ...styles.input, width: "100%", marginBottom: 12 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth(authMode)}
            style={{ ...styles.input, width: "100%", marginBottom: 20 }}
          />

          {authError && (
            <p style={{ color: accent, fontSize: 13, marginBottom: 16, textAlign: "center" }}>{authError}</p>
          )}

          <button
            onClick={() => handleAuth(authMode)}
            disabled={authLoading}
            style={{ ...styles.primaryBtn, width: "100%", opacity: authLoading ? 0.6 : 1 }}
          >
            {authLoading ? "..." : authMode === "login" ? "Log in" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #141118; overflow-x: hidden; }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>Joie</h1>
          <p style={styles.subtitle}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          {todayTotal > 0 && (
            <div style={styles.headerStat}>
              <span style={styles.headerStatNum}>{todayCheckedCount}/{todayTotal}</span>
              <span style={styles.headerStatLabel}>today</span>
            </div>
          )}
          <button onClick={handleLogout} style={{ background: "none", border: "none", color: textDim, fontSize: 12, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", padding: "4px 0" }}>Logout</button>
        </div>
      </header>

      {/* Nav */}
      <nav style={styles.nav}>
        {[
          { key: "dashboard", label: "Dashboard", icon: "◉" },
          { key: "discover", label: "Discover", icon: "✦" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{ ...styles.navBtn, ...((view === tab.key || (tab.key === "dashboard" && view === "add")) ? styles.navBtnActive : {}) }}
          >
            <span style={styles.navIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {/* ===== DASHBOARD ===== */}
        {view === "dashboard" && (
          <div style={styles.fadeIn}>
            {data.hobbies.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                <h2 style={styles.emptyTitle}>Plant your first seed</h2>
                <p style={styles.emptyText}>Add a hobby to start tracking your growth.</p>
                <button style={styles.primaryBtn} onClick={() => setView("add")}>+ Add First Hobby</button>
              </div>
            ) : (
              <>
                {/* Stage & Category Levels */}
                <div style={{
                  background: card, borderRadius: 16, padding: "20px 24px", marginBottom: 24,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {/* Stage display */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `linear-gradient(135deg, ${accent}, ${secondary})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, color: bg,
                      fontFamily: "'DM Serif Display', serif",
                    }}>
                      {stageInfo.stage}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: text }}>{stageInfo.name}</div>
                        {diversityMult > 1 && (
                          <span style={{ fontSize: 10, color: tertiary, background: "rgba(103,232,249,0.08)", padding: "2px 7px", borderRadius: 5, fontWeight: 600 }}>+{((diversityMult - 1) * 100).toFixed(0)}% diversity</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: textDim }}>
                        {stageInfo.next ? `Next: ${stageInfo.next.desc}` : "Journey complete — you are the Wayfarer"}
                      </div>
                    </div>
                  </div>

                  {/* Category levels */}
                  <div className="stage-cats" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {stageInfo.catLevels.map(cat => {
                      const hasHobbies = data.hobbies.some(h => h.category === cat.id);
                      return (
                        <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="cat-label" style={{ fontSize: 12, color: cat.color, width: 65, textAlign: "right", fontWeight: 500 }}>{cat.label}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${cat.progress * 100}%`, height: "100%", background: cat.color, borderRadius: 3, transition: "width 0.4s ease" }}></div>
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: hasHobbies ? cat.color : textDim, fontWeight: 600, width: 36 }}>
                            {hasHobbies ? `Lv.${cat.level}` : "—"}
                          </span>
                          {hasHobbies && (
                            <span style={{ fontSize: 10, color: cat.mult > 1 ? tertiary : textDim, background: cat.mult > 1 ? "rgba(103,232,249,0.08)" : "rgba(255,255,255,0.04)", padding: "1px 6px", borderRadius: 5, fontWeight: 600 }}>{cat.mult.toFixed(2)}x</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Mini stats */}
                  <div className="mini-stats" style={{ display: "flex", gap: 16, justifyContent: "center", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: accent, fontFamily: "'DM Serif Display', serif" }}>{overallStreak}</div>
                      <div style={{ fontSize: 10, color: textDim, textTransform: "uppercase", letterSpacing: 1 }}>streak</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }}></div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: secondary, fontFamily: "'DM Serif Display', serif" }}>{data.hobbies.reduce((a, h) => a + totalDays(h.log), 0)}</div>
                      <div style={{ fontSize: 10, color: textDim, textTransform: "uppercase", letterSpacing: 1 }}>check-ins</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }}></div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#34D399", fontFamily: "'DM Serif Display', serif" }}>{restDaysUsedThisWeek}/2</div>
                      <div style={{ fontSize: 10, color: textDim, textTransform: "uppercase", letterSpacing: 1 }}>rest days</div>
                    </div>
                  </div>
                </div>

                {/* Today's check-ins */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Today's Check-in</h2>
                  <button style={styles.smallBtn} onClick={() => { setEditingHobby(null); setHobbyForm({ name: "", icon: "🎸", weeklyGoal: "", category: "move", hobbyType: "routine" }); setView("add"); }}>+ Add hobby</button>
                </div>

                {/* Rest day button */}
                <button
                  onClick={() => toggleRestDay()}
                  style={{
                    width: "100%",
                    marginBottom: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: isRestDay ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(52,211,153,0.15)",
                    background: isRestDay ? "rgba(52,211,153,0.08)" : "rgba(52,211,153,0.03)",
                    color: isRestDay ? "#34D399" : "#34D399",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Source Sans 3', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.25s",
                    opacity: isRestDay ? 1 : 0.7,
                  }}
                >
                  <span>{isRestDay ? "🌿" : "☽"}</span>
                  {isRestDay ? "Resting today — streak protected" : "Take a rest day"}
                </button>

                <div className="checkin-grid" style={styles.checkinGrid}>
                  {data.hobbies.map(h => {
                    const done = h.log[today];
                    const cat = CATEGORIES.find(c => c.id === h.category) || CATEGORIES[0];
                    const weekMins = getWeeklyMinutes(h.log);
                    const isCheckinOpen = checkinId === h.id;
                    const hobbyXP = getHobbyXP(h.log, h.weeklyGoal, getTotalMultiplier(data.hobbies, h.category || "move"), h.hobbyType);
                    const hobbyLevel = getLevelInfo(hobbyXP);

                    if (isCheckinOpen) {
                      return (
                        <div key={h.id} style={{ ...styles.checkinCard, ...styles.checkinDone, gap: 10 }}>
                          <span style={{ fontSize: 28 }}>{h.icon}</span>
                          <span style={styles.checkinName}>{h.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <input
                              type="number"
                              value={checkinMinutes}
                              onChange={e => setCheckinMinutes(e.target.value)}
                              style={{ ...styles.input, width: 64, padding: "8px 10px", textAlign: "center", fontSize: 16 }}
                              min="1"
                              max="480"
                              autoFocus
                            />
                            <span style={{ fontSize: 12, color: textDim }}>min</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                            <button onClick={confirmCheckin} style={{ ...styles.primaryBtn, padding: "6px 16px", fontSize: 13 }}>Log</button>
                            <button onClick={() => setCheckinId(null)} style={{ ...styles.secondaryBtn, padding: "6px 12px", fontSize: 13 }}>✕</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={h.id}
                        onClick={() => toggleDay(h.id, today)}
                        style={{
                          ...styles.checkinCard,
                          ...(done ? styles.checkinDone : {}),
                          ...(h.hobbyType === "event" && !done ? { background: "rgba(250,204,21,0.04)", borderColor: "rgba(250,204,21,0.12)" } : {}),
                          ...(h.hobbyType === "event" && done ? { background: "rgba(250,204,21,0.10)", borderColor: "rgba(250,204,21,0.25)" } : {}),
                          position: "relative", cursor: "pointer",
                        }}
                      >
                        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: secondary, padding: "2px 6px", borderRadius: 6, background: "rgba(192,132,252,0.1)", fontWeight: 600 }}>Lv.{hobbyLevel.level} · {hobbyXP} XP</span>
                          {h.hobbyType === "event" && (
                            <span style={{ fontSize: 9, color: "#FACC15", background: "rgba(250,204,21,0.12)", padding: "2px 6px", borderRadius: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Event</span>
                          )}
                        </div>
                        <span
                          onClick={e => { e.stopPropagation(); startEdit(h); }}
                          style={{ position: "absolute", top: 8, right: 8, fontSize: 13, color: textDim, cursor: "pointer", padding: "4px 6px", borderRadius: 6, background: "rgba(255,255,255,0.06)" }}
                          title="Edit hobby"
                        >✎</span>
                        <span style={{ fontSize: 28, marginTop: 8 }}>{h.icon}</span>
                        <span style={styles.checkinName}>{h.name}</span>
                        <span style={{ fontSize: 10, color: cat.color, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8 }}>{cat.label}</span>
                        <span style={{ ...styles.checkinCheck, ...(done ? styles.checkinCheckDone : {}) }}>
                          {done ? "✓" : "○"}
                        </span>
                        {h.hobbyType === "event" ? (
                          <span style={{ fontSize: 11, color: textDim }}>{done ? "Logged" : `${totalDays(h.log)} events total`}</span>
                        ) : (
                          <>
                            {done && <span style={{ fontSize: 11, color: textDim }}>{typeof done === "number" ? done : 30}min today</span>}
                            {h.weeklyGoal ? (
                              <div style={{ width: "100%", marginTop: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: textDim, marginBottom: 3 }}>
                                  <span>{weekMins}min</span>
                                  <span>{h.weeklyGoal}min/wk</span>
                                </div>
                                <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                                  <div style={{ width: `${Math.min((weekMins / h.weeklyGoal) * 100, 100)}%`, height: "100%", background: weekMins >= h.weeklyGoal ? "#34D399" : accent, borderRadius: 2, transition: "width 0.3s ease" }}></div>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: textDim }}>{weekMins > 0 ? `${weekMins}min this week` : ""}</span>
                            )}
                          </>
                        )}
                        {/* Hobby XP progress */}
                        <div style={{ width: "100%", marginTop: 6 }}>
                          <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${hobbyLevel.progress * 100}%`, height: "100%", background: secondary, borderRadius: 2, transition: "width 0.3s ease" }}></div>
                          </div>
                          <div style={{ fontSize: 9, color: textDim, marginTop: 3, textAlign: "center" }}>
                            {hobbyLevel.nextName ? `${hobbyLevel.nextXp - hobbyXP} XP to ${hobbyLevel.nextName}` : "Max level!"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Week overview */}
                <h2 style={{ ...styles.sectionTitle, marginTop: 32 }}>This Week</h2>
                <div className="hgrid" style={styles.heatWrap}>
                  {/* Rest day row */}
                  <div style={styles.heatRow}>
                    <div style={styles.heatLabel}>🌿 Rest Days</div>
                    <div className="heat-days" style={styles.heatDays}>
                      {last7.map(d => {
                        const isRest = data.restDays && data.restDays[d];
                        return (
                          <button
                            key={d}
                            onClick={() => toggleRestDay(d)}
                            title={isRest ? `Rest day on ${d}` : `Mark ${d} as rest`}
                            style={{
                              ...styles.heatCell,
                              background: isRest ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)",
                              border: d === today ? "2px solid rgba(52,211,153,0.4)" : "2px solid transparent",
                            }}
                          >
                            <span style={{ ...styles.heatDayLabel, color: isRest ? "#34D399" : "rgba(255,255,255,0.35)" }}>{isRest ? "🌿" : getDayLabel(d)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {data.hobbies.map(h => {
                    const isEditing = heatEdit && heatEdit.hobbyId === h.id;
                    return (
                    <div key={h.id} style={styles.heatRow}>
                      <div style={styles.heatLabel}>{h.icon} {h.name}</div>
                      <div className="heat-days" style={styles.heatDays}>
                        {last7.map(d => {
                          const isRest = data.restDays && data.restDays[d];
                          const didIt = h.log[d];
                          const isEvent = h.hobbyType === "event";
                          const mins = typeof didIt === "number" ? didIt : (didIt ? 30 : 0);
                          return (
                            <button
                              key={d}
                              onClick={() => toggleDay(h.id, d)}
                              title={didIt ? (isEvent ? `Logged on ${d}` : `${mins}min on ${d}`) : d}
                              style={{
                                ...styles.heatCell,
                                background: didIt ? "var(--accent)" : isRest ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                                border: (isEditing && heatEdit.date === d) ? "2px solid var(--accent)" : d === today ? "2px solid var(--accent-dim)" : "2px solid transparent",
                              }}
                            >
                              {didIt ? (
                                <span style={{ fontSize: 9, color: bg, fontWeight: 600 }}>{isEvent ? "✓" : `${mins}m`}</span>
                              ) : (
                                <span style={styles.heatDayLabel}>{isRest ? "🌿" : getDayLabel(d)}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {isEditing && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, marginTop: 6,
                          padding: "8px 12px", background: card, borderRadius: 10,
                          border: "1px solid rgba(255,107,107,0.2)",
                        }}>
                          <span style={{ fontSize: 12, color: textDim }}>{heatEdit.date}</span>
                          <input
                            type="number"
                            value={heatMinutes}
                            onChange={e => setHeatMinutes(e.target.value)}
                            style={{ ...styles.input, width: 56, padding: "6px 8px", textAlign: "center", fontSize: 14 }}
                            min="1"
                            max="480"
                            autoFocus
                          />
                          <span style={{ fontSize: 12, color: textDim }}>min</span>
                          <button onClick={confirmHeatEdit} style={{ ...styles.primaryBtn, padding: "5px 14px", fontSize: 12 }}>Log</button>
                          <button onClick={() => setHeatEdit(null)} style={{ ...styles.secondaryBtn, padding: "5px 10px", fontSize: 12 }}>✕</button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== ADD / EDIT HOBBY ===== */}
        {view === "add" && (
          <div style={styles.fadeIn}>
            <h2 style={styles.sectionTitle}>{editingHobby ? "Edit Hobby" : "Add a Hobby"}</h2>
            <div style={styles.formCard}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                placeholder="e.g. Guitar, Reading, Running..."
                value={hobbyForm.name}
                onChange={e => setHobbyForm({ ...hobbyForm, name: e.target.value })}
                maxLength={32}
              />

              <label style={{ ...styles.label, marginTop: 20 }}>Type</label>
              <div className="type-picker" style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "routine", label: "Routine", desc: "Log minutes, set weekly goals" },
                  { id: "event", label: "Event", desc: "Just check in when you do it" },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setHobbyForm({ ...hobbyForm, hobbyType: t.id })}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 10,
                      border: hobbyForm.hobbyType === t.id ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.06)",
                      background: hobbyForm.hobbyType === t.id ? accentDim : "rgba(255,255,255,0.04)",
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "'Source Sans 3', sans-serif",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 500, color: hobbyForm.hobbyType === t.id ? accent : text }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: textDim, marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              <label style={{ ...styles.label, marginTop: 20 }}>Icon</label>
              <div style={styles.iconPicker}>
                {HOBBY_ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setHobbyForm({ ...hobbyForm, icon: ic })}
                    style={{ ...styles.iconOption, ...(hobbyForm.icon === ic ? styles.iconSelected : {}) }}
                  >
                    {ic}
                  </button>
                ))}
              </div>

              <label style={{ ...styles.label, marginTop: 20 }}>Category</label>
              <div style={styles.categoryPicker}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setHobbyForm({ ...hobbyForm, category: cat.id })}
                    style={{
                      ...styles.categoryOption,
                      borderColor: hobbyForm.category === cat.id ? cat.color : "transparent",
                      background: hobbyForm.category === cat.id ? cat.color + "20" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, display: "inline-block" }}></span>
                    <span style={{ color: hobbyForm.category === cat.id ? cat.color : textDim, fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                  </button>
                ))}
              </div>
              {(() => {
                const selected = CATEGORIES.find(c => c.id === hobbyForm.category);
                return selected ? (
                  <p style={{ fontSize: 12, color: selected.color, marginTop: 8, opacity: 0.7 }}>
                    {selected.desc}
                  </p>
                ) : null;
              })()}

              {hobbyForm.hobbyType === "routine" && (
                <>
                  <label style={{ ...styles.label, marginTop: 20 }}>Weekly goal (optional)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number"
                      style={{ ...styles.input, width: 100 }}
                      placeholder="e.g. 120"
                      value={hobbyForm.weeklyGoal}
                      onChange={e => setHobbyForm({ ...hobbyForm, weeklyGoal: e.target.value })}
                      min="0"
                      max="2000"
                    />
                    <span style={{ fontSize: 13, color: textDim }}>minutes per week</span>
                  </div>
                  {hobbyForm.weeklyGoal && (
                    <p style={{ fontSize: 12, color: textDim, marginTop: 6 }}>
                      That's ~{Math.round(parseInt(hobbyForm.weeklyGoal) / 7)} min/day or ~{Math.round(parseInt(hobbyForm.weeklyGoal) / 3)} min over 3 sessions
                    </p>
                  )}
                </>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <button style={styles.primaryBtn} onClick={editingHobby ? updateHobby : addHobby}>
                  {editingHobby ? "Save Changes" : "Add Hobby"}
                </button>
                <button style={styles.secondaryBtn} onClick={() => { setEditingHobby(null); setHobbyForm({ name: "", icon: "🎸", weeklyGoal: "", category: "move", hobbyType: "routine" }); setView("dashboard"); }}>
                  Cancel
                </button>
              </div>
              {editingHobby && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {!confirmDelete ? (
                    <button
                      style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", color: accent, fontSize: 14, cursor: "pointer", padding: "10px 20px", borderRadius: 10, fontFamily: "'Source Sans 3', sans-serif", fontWeight: 500, width: "100%" }}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete this hobby
                    </button>
                  ) : (
                    <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: text, marginBottom: 12 }}>Remove this hobby? All check-in data will be lost.</p>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button
                          style={{ background: accent, color: bg, border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}
                          onClick={() => deleteHobby(editingHobby)}
                        >
                          Yes, delete
                        </button>
                        <button
                          style={{ background: "rgba(255,255,255,0.06)", color: textDim, border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Keep it
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!editingHobby && (
              <p style={styles.hint}>{data.hobbies.length}/{MAX_HOBBIES} hobby slots used</p>
            )}
          </div>
        )}

        {/* ===== DISCOVER ===== */}
        {view === "discover" && (
          <div style={styles.fadeIn}>
            {/* Sub-nav */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { key: "feed", label: "Feed" },
                { key: "saved", label: `Saved (${(data.savedItems || []).length})` },
                { key: "interests", label: "Interests" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDiscoverView(tab.key)}
                  style={{
                    ...styles.navBtn,
                    ...(discoverView === tab.key ? styles.navBtnActive : {}),
                    fontSize: 13,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Interest Picker */}
            {discoverView === "interests" && (
              <div>
                <h2 style={styles.sectionTitle}>What are you curious about?</h2>
                <p style={{ fontSize: 13, color: textDim, marginBottom: 20 }}>Pick at least 3 topics. These shape your daily Discover feed.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {INTERESTS.map(interest => {
                    const selected = (data.interests || []).includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "14px 18px", borderRadius: 14,
                          background: selected ? "rgba(192,132,252,0.08)" : card,
                          border: selected ? "1px solid rgba(192,132,252,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          cursor: "pointer", transition: "all 0.2s",
                          fontFamily: "'Source Sans 3', sans-serif", textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{interest.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: selected ? secondary : text }}>{interest.label}</div>
                          <div style={{ fontSize: 12, color: textDim, marginTop: 2 }}>{interest.desc}</div>
                        </div>
                        <span style={{ fontSize: 18, color: selected ? secondary : "rgba(255,255,255,0.1)" }}>{selected ? "✓" : "○"}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ ...styles.hint, marginTop: 16 }}>{(data.interests || []).length} selected</p>
              </div>
            )}

            {/* Feed */}
            {discoverView === "feed" && (
              <div>
                {(data.interests || []).length < 3 ? (
                  <div style={styles.empty}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                    <h2 style={styles.emptyTitle}>Set your interests first</h2>
                    <p style={styles.emptyText}>Pick at least 3 topics to start your Discover feed.</p>
                    <button style={styles.primaryBtn} onClick={() => setDiscoverView("interests")}>Choose Interests</button>
                  </div>
                ) : feedLoading ? (
                  <div style={{ ...styles.empty, padding: "80px 20px" }}>
                    <div style={{ fontSize: 48, animation: "pulse 1.5s ease infinite", marginBottom: 16 }}>✦</div>
                    <p style={{ color: textDim, fontSize: 15 }}>Curating today's discoveries...</p>
                  </div>
                ) : feedCards.length === 0 ? (
                  <div style={styles.empty}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
                    <h2 style={styles.emptyTitle}>Ready to explore?</h2>
                    <p style={styles.emptyText}>Tap below to load today's {DAILY_CARD_LIMIT} discoveries.</p>
                    <button style={styles.primaryBtn} onClick={fetchDiscover}>Load Today's Feed</button>
                    {feedError && (
                      <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,107,107,0.08)", borderRadius: 10, border: "1px solid rgba(255,107,107,0.2)" }}>
                        <p style={{ fontSize: 12, color: accent, wordBreak: "break-word" }}>{feedError}</p>
                        <button
                          style={{ ...styles.smallBtn, marginTop: 8 }}
                          onClick={() => { setFeedError(null); setFeedDate(null); fetchDiscover(); }}
                        >Retry</button>
                      </div>
                    )}
                  </div>
                ) : feedIndex >= feedCards.length ? (
                  <div style={styles.empty}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🌙</div>
                    <h2 style={styles.emptyTitle}>You've explored enough for today</h2>
                    <p style={styles.emptyText}>Come back tomorrow for fresh discoveries. Now go do something.</p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                      {(data.savedItems || []).length > 0 && (
                        <button style={styles.secondaryBtn} onClick={() => setDiscoverView("saved")}>
                          Saved ({(data.savedItems || []).length})
                        </button>
                      )}
                      <button style={styles.secondaryBtn} onClick={() => { setFeedDate(null); setFeedCards([]); fetchDiscover(); }}>
                        Refresh feed
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Progress */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: textDim }}>{feedIndex + 1} of {feedCards.length}</span>
                      <div style={{ flex: 1, marginLeft: 12, marginRight: 12, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${((feedIndex + 1) / feedCards.length) * 100}%`, height: "100%", background: secondary, borderRadius: 2, transition: "width 0.3s ease" }}></div>
                      </div>
                      <span style={{ fontSize: 12, color: textDim }}>{feedCards.length - feedIndex - 1} left</span>
                    </div>

                    {/* Card */}
                    {(() => {
                      const item = feedCards[feedIndex];
                      const saved = isItemSaved(item);
                      const topicInfo = INTERESTS.find(i => i.label === item.topic || i.id === item.topic);
                      const hasImage = item.imageUrl && item.imageUrl.length > 5;
                      const fallbackGradient = TOPIC_GRADIENTS[item.topic] || "linear-gradient(135deg, #1a1a2a, #2a1a3a)";

                      return (
                        <div style={{
                          background: card, borderRadius: 20, overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.06)",
                          animation: "fadeUp 0.3s ease",
                        }}>
                          {/* Hero image / gradient fallback */}
                          <div style={{
                            position: "relative",
                            height: 180,
                            background: fallbackGradient,
                            overflow: "hidden",
                          }}>
                            {hasImage && (
                              <img
                                src={item.imageUrl}
                                alt=""
                                onError={e => { e.target.style.display = "none"; }}
                                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }}
                              />
                            )}
                            {/* Gradient overlay for text readability */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}></div>
                            {/* Fallback icon when no image */}
                            {!hasImage && (
                              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", fontSize: 52, opacity: 0.3 }}>
                                {topicInfo?.icon || "✦"}
                              </div>
                            )}
                            {/* Topic + type badges */}
                            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
                              <span style={{
                                fontSize: 11, color: "#fff", background: "rgba(0,0,0,0.5)",
                                padding: "4px 10px", borderRadius: 20, fontWeight: 600,
                                backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 5,
                              }}>
                                {topicInfo?.icon || "✦"} {item.topic}
                              </span>
                              <span style={{
                                fontSize: 11, color: "#fff", background: "rgba(0,0,0,0.5)",
                                padding: "4px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 1,
                                backdropFilter: "blur(4px)",
                              }}>
                                {item.type || "article"}
                              </span>
                            </div>
                            {/* Source at bottom of image */}
                            <div style={{ position: "absolute", bottom: 12, left: 14 }}>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{item.source}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ padding: "18px 20px 20px" }}>
                            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: text, lineHeight: 1.3, marginBottom: 10 }}>{item.title}</h3>
                            <p style={{ fontSize: 14, color: text, lineHeight: 1.6, marginBottom: 14, opacity: 0.8 }}>{item.summary}</p>

                            {/* Why picked */}
                            <div style={{ background: "rgba(192,132,252,0.06)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, borderLeft: `3px solid ${secondary}` }}>
                              <p style={{ fontSize: 12, color: secondary }}>"{item.whyPicked}"</p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 10 }}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ ...styles.primaryBtn, textDecoration: "none", textAlign: "center", flex: 1 }}
                              >
                                {item.type === "video" ? "▶ Watch" : item.type === "community" ? "💬 Join" : "Read ↗"}
                              </a>
                              <button
                                onClick={() => saveItem(item)}
                                style={{
                                  ...styles.secondaryBtn,
                                  background: saved ? "rgba(192,132,252,0.12)" : "rgba(255,255,255,0.06)",
                                  color: saved ? secondary : textDim,
                                  borderColor: saved ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.08)",
                                  padding: "12px 20px",
                                }}
                              >
                                {saved ? "✓ Saved" : "Save"}
                              </button>
                              <button
                                onClick={() => setFeedIndex(feedIndex + 1)}
                                style={{ ...styles.secondaryBtn, padding: "12px 20px" }}
                              >
                                Skip →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Next button */}
                    {feedIndex < feedCards.length - 1 && (
                      <button
                        onClick={() => setFeedIndex(feedIndex + 1)}
                        style={{
                          width: "100%", marginTop: 12, padding: "14px",
                          background: "none", border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12, color: textDim, fontSize: 14,
                          cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif",
                        }}
                      >
                        Next discovery →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Saved */}
            {discoverView === "saved" && (
              <div>
                <h2 style={styles.sectionTitle}>Saved Discoveries</h2>
                {(data.savedItems || []).length === 0 ? (
                  <div style={styles.empty}>
                    <p style={styles.emptyText}>Nothing saved yet. Browse your feed and save what speaks to you.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[...(data.savedItems || [])].reverse().map((item, i) => (
                      <div key={i} style={{
                        background: card, borderRadius: 14, padding: "16px 20px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: secondary, textTransform: "uppercase", letterSpacing: 1 }}>{item.topic}</span>
                            <h4 style={{ fontSize: 15, fontWeight: 600, color: text, marginTop: 4, lineHeight: 1.3 }}>{item.title}</h4>
                            <p style={{ fontSize: 12, color: textDim, marginTop: 4 }}>{item.source}</p>
                          </div>
                          <button
                            onClick={() => saveItem(item)}
                            style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 14, padding: "4px 8px" }}
                          >✕</button>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 13, color: secondary, textDecoration: "none" }}
                          >
                            {item.type === "video" ? "Watch ↗" : item.type === "community" ? "Join ↗" : "Read ↗"}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && <div className="toast-msg" style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ---- STYLES ----
const accent = "#FF6B6B";
const accentDim = "rgba(255,107,107,0.25)";
const secondary = "#C084FC";
const secondaryDim = "rgba(192,132,252,0.15)";
const tertiary = "#67E8F9";
const bg = "#141118";
const card = "rgba(255,255,255,0.04)";
const cardHover = "rgba(255,255,255,0.07)";
const text = "#e8e0f0";
const textDim = "rgba(232,224,240,0.5)";

const styles = {
  app: {
    "--accent": accent,
    "--accent-dim": accentDim,
    "--secondary": secondary,
    "--secondary-dim": secondaryDim,
    "--tertiary": tertiary,
    fontFamily: "'Source Sans 3', sans-serif",
    color: text,
    background: bg,
    minHeight: "100vh",
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 20px 80px",
    overflowX: "hidden",
  },
  loadWrap: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: bg },
  loadPulse: { fontSize: 48, animation: "pulse 1.5s ease infinite" },

  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    padding: "40px 0 24px", borderBottom: `1px solid rgba(255,255,255,0.06)`,
  },
  logo: {
    fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 400, color: accent,
    letterSpacing: "-0.5px",
  },
  subtitle: { fontSize: 14, color: textDim, marginTop: 4, fontWeight: 300 },
  headerStat: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  headerStatNum: { fontSize: 24, fontFamily: "'DM Serif Display', serif", color: accent },
  headerStatLabel: { fontSize: 12, color: textDim, textTransform: "uppercase", letterSpacing: 1 },

  nav: {
    display: "flex", gap: 4, padding: "16px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navBtn: {
    background: "none", border: "none", color: textDim, fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14, padding: "8px 16px", borderRadius: 8, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
  },
  navBtnActive: { background: accentDim, color: accent },
  navIcon: { fontSize: 10 },

  main: { paddingTop: 28 },
  fadeIn: { animation: "fadeUp 0.4s ease" },

  // Stats
  statsRow: { display: "flex", gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, background: card, borderRadius: 12, padding: "20px 16px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    border: "1px solid rgba(255,255,255,0.04)",
  },
  statValue: { fontFamily: "'DM Serif Display', serif", fontSize: 28, color: accent },
  statLabel: { fontSize: 11, color: textDim, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" },

  // Check-in
  sectionTitle: {
    fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400,
    marginBottom: 16, color: text,
  },
  checkinGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  checkinCard: {
    background: card, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
    padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    cursor: "pointer", transition: "all 0.25s", fontFamily: "'Source Sans 3', sans-serif",
    color: text,
  },
  checkinDone: {
    background: "rgba(200,164,110,0.1)", borderColor: "rgba(200,164,110,0.3)",
  },
  checkinName: { fontSize: 14, fontWeight: 500 },
  checkinCheck: { fontSize: 22, color: textDim, transition: "all 0.2s" },
  checkinCheckDone: { color: accent, transform: "scale(1.2)" },
  checkinStreak: { fontSize: 11, color: textDim },

  // Heat map
  heatWrap: { display: "flex", flexDirection: "column", gap: 16, overflowX: "auto" },
  heatRow: { display: "flex", flexDirection: "column", gap: 8 },
  heatLabel: { fontSize: 13, color: textDim, fontWeight: 500 },
  heatDays: { display: "flex", gap: 6, flex: 1 },
  heatCell: {
    flex: 1, height: 44, borderRadius: 10, border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s", fontFamily: "'Source Sans 3', sans-serif",
  },
  heatDayLabel: { fontSize: 10, color: "rgba(255,255,255,0.35)" },

  // Hobby list
  hobbyListCard: {
    background: card, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
    padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  hobbyListLeft: { display: "flex", alignItems: "center", gap: 16 },
  hobbyListName: { fontSize: 16, fontWeight: 600 },
  hobbyListGoal: { fontSize: 13, color: textDim, marginTop: 2 },
  hobbyListMeta: { fontSize: 12, color: textDim, marginTop: 4 },
  iconBtn: {
    background: "rgba(255,255,255,0.06)", border: "none", color: textDim,
    width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // Form
  formCard: {
    background: card, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
    padding: 28,
  },
  label: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: textDim, marginBottom: 8, display: "block" },
  input: {
    width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: text,
    fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, outline: "none",
  },
  iconPicker: { display: "flex", flexWrap: "wrap", gap: 8 },
  iconOption: {
    width: 42, height: 42, borderRadius: 10, border: "2px solid transparent",
    background: "rgba(255,255,255,0.04)", fontSize: 20, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
  },
  iconSelected: { borderColor: accent, background: accentDim },

  categoryPicker: { display: "flex", flexWrap: "wrap", gap: 8 },
  categoryOption: {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
    borderRadius: 10, border: "2px solid transparent", cursor: "pointer",
    background: "rgba(255,255,255,0.04)", transition: "all 0.15s",
    fontFamily: "'Source Sans 3', sans-serif",
  },

  primaryBtn: {
    background: accent, color: bg, border: "none", borderRadius: 10,
    padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Source Sans 3', sans-serif", transition: "all 0.2s",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.06)", color: textDim, border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, padding: "12px 28px", fontSize: 15, cursor: "pointer",
    fontFamily: "'Source Sans 3', sans-serif",
  },
  smallBtn: {
    background: accentDim, color: accent, border: "none", borderRadius: 8,
    padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Source Sans 3', sans-serif",
  },
  hint: { marginTop: 16, fontSize: 13, color: textDim, textAlign: "center" },

  // Empty state
  empty: { textAlign: "center", padding: "60px 20px" },
  emptyTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, marginBottom: 8 },
  emptyText: { color: textDim, fontSize: 15, marginBottom: 24 },

  // Toast
  toast: {
    position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
    background: accent, color: bg, padding: "12px 24px", borderRadius: 12,
    fontSize: 14, fontWeight: 600, fontFamily: "'Source Sans 3', sans-serif",
    animation: "toastIn 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    zIndex: 100, whiteSpace: "normal", textAlign: "center", maxWidth: "90vw",
  },
};
