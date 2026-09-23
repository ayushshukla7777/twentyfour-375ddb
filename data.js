/* ============================================================================
   Anjali's birthday site — all content lives here.
   ----------------------------------------------------------------------------
   Ayush: everything you might want to change is in this file. Nothing else
   needs touching. The CONFIG block at the top is the only bit that is
   date-sensitive — check TOGETHER_SINCE first.
   ============================================================================ */

const CONFIG = {
  her: "Anjali",
  him: "Ayush",
  // The day you two met: 12 December 2022 — Ayush's own date, so treat it as
  // exact. The live counter and every "how long have we been" line read from
  // this one value, so fix the date here and the whole page follows.
  TOGETHER_SINCE: "2022-12-12T00:00:00+05:30",
  // Her birthday. Used for the countdown / celebration switch. IST.
  BIRTHDAY: "2026-09-24T00:00:00+05:30",
  // What she can type to get in. Any of these, any capitalisation.
  // (It's what you call her — she'll get it instantly.)
  PASSWORDS: ["golu", "sonna", "sona", "baby", "darlo", "babu", "jaan"],
  PASSWORD_HINT: "What does Ayush call you?",
  // Where she's from — colours the whole page. Kolkata.
  kolkata: {
    bengaliWish: "শুভ জন্মদিন, সোনা",
    // The transliteration is shown too, so the wish still lands even on a
    // device with no Bengali font installed.
    bengaliRoman: "Shubho jonmodin, sona",
    bengaliMeaning: "Happy birthday, Sona — “sona” means gold in Bengali. It is what Ayush calls you, and what you are.",
    tag: "A little bit of Kolkata, because it made you.",
  },
};

/* How long we've been "us" — computed from CONFIG.TOGETHER_SINCE rather than
   typed by hand, so no sentence on the page can drift out of date or end up
   disagreeing with the live counter. */
const US = (() => {
  const since = new Date(CONFIG.TOGETHER_SINCE);
  const now = new Date();
  let y = now.getFullYear() - since.getFullYear();
  let m = now.getMonth() - since.getMonth();
  if (now.getDate() < since.getDate()) m -= 1;
  if (m < 0) { y -= 1; m += 12; }
  const word = (n) => ["zero", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve"][n] || String(n);
  return {
    short: `${y} years, ${m} months`,                 // "3 years, 9 months"
    words: `${word(y)} years and ${word(m)} months`,  // "three years and nine months"
    days: Math.floor((now - since) / 86400000),
    met: "12 December 2022",
  };
})();

/* ============================================================================
   EVERY PHOTO, WITH A CAPTION
   Written by looking at each one. These are the labels on the gallery.
   ============================================================================ */
const PHOTOS = {
  p01: "You, tiny in the corner of my screen — and me grinning at nothing.",
  p02: "When madam ji wants 2nd opinion on the new dress 😁👗❤️",
  p03: "My cutiee with her smile, looking like a woww!!! 😍🥰❤️",
  p04: "Hai my darlo in full corporate look!! 😻💼❤️",
  p05: "Our first meetup in Indore!! Now we need new meetup pics 😁❤️🤍",
  p06: "We celebrating one more milestone!! 🥰🎉❤️",
  p07: "My golu in tradition for festival 🥰🪔❤️",
  p08: "Proof that you fall asleep while on call, madam 😴😁❤️",
  p09: "Korean heart 🫰 there is no version of you I love more than this one ❤️😻",
  p10: "Hayeeee!!! I love you cutiee 🥹❤️ Will you be my girlfriend?? 💍",
  p11: "Do you remember this one, sonne ji?? 😁❤️🤍",
  p12: "You laughed so hard this photo went blurry. It's still my favourite kind of photo 😂❤️",
  p13: "I love you my beautiful darling.. ❤️🫶😻",
  p14: "Deloitte days!! Hope aapka full time jaldi se ho jaaye!! 🥰🤞❤️",
  p15: "I love it when you do full smile 😁❤️😻",
  p17: "One of my favourite pics ❤️🥹",
  p18: "Arrow represents where I live ➡️❤️",
  p19: "Madam ji in full glamorous look — sunglasses, watch and pose 😎🕶️❤️",
  p20: "2:49am. Your face glowing in the dark, still on the call, refusing to hang up 🌙🥹❤️",
  p22: "Me making sure my golu sleeps before I go to sleep 🥹😴❤️",
  p23: "Hand on your cheek, that soft smile. I remember exactly what we were talking about 🥰❤️",
  p24: "Showing me your new oversized shirt because you think you don't have any clothes left 😁👕❤️",
  p25: "My sonna being the center of attraction 🥰✨❤️",
  p26: "Hayeee meri laddo cutooo!! 😻😻❤️",
  p27: "Sonna ji be like — “tumko itna achha gf mil gayi hai, aise dhundne se bhi nahi milta” 😌❤️😁",
  p28: "Baby ji — har time behas karte ho, chup rho ab 😁🤫❤️",
  p29: "Olive top, that warm smile, the one you save for when it's just us 🤍❤️",
  p30: "Red dupatta, sunglasses, sun on your face. You belong in this weather ☀️😎❤️",
  p31: "I know you roasted me here on something 😏😁❤️",
  p32: "11:53pm, hand on your head, fighting sleep, still refusing to go 😴🥹❤️",
  p33: "My darling ji telling me what all I'm missing 😶‍🌫️😁❤️",
  p34: "Blue striped polo, office mirror, on your way in 💼😁❤️",
  p35: "My sonna showing all her rakhis — so manyyyy!!! 🫶✨❤️",
  p36: "Bolte ho golu jaan ki kapde nahi hai — itne pretty pretty kapde hai!!! 😁👗❤️",
  p37: "“Na Gussa. No Baby!! Apne Golu ko maaf kardo.” I will write you a hundred of these 🙏😁❤️",
  p38: "My golu old pic, hayee!! Sorry, aap bole the isko mat use karna kahi, par kafi pretty lag raha!! 🥹🙈❤️",
  p40: "Another 2:49am. Same sleepy smile. Same refusal to hang up 🌙😴❤️",
  p41: "Beige shirt, lanyard, phone in hand, mid-day at work. Sending me something, probably 📱😁❤️",
  p42: "1:47am. Eyes closed, call still on. This is what loving you looks like 🌙🥹❤️",
  p43: "Floral dress, arches behind you, open sky. You, being happy 🌸☀️❤️",
  p44: "Dress is wowwwwww!!!! 👗😍❤️",
  p45: "Sonna ji on family trip 🚂🥰❤️",
};

/* Photos chosen for particular jobs elsewhere on the page. */
const HERO_PHOTO = "p04";        // the formal portrait — clean, striking
const HERO_PHOTO_ALT = "p15";    // the big smile, for the phone frame
const VIDEO_POSTERS = { v1: "p19", v2: "p30", v3: "p43", v4: "p07" };

/* ============================================================================
   OUR STORY — chapters, each anchored to real photos.
   Nothing invented: every line here is visible in the pictures.
   ============================================================================ */
const STORY = [
  {
    chapter: "Where it started",
    when: "12 December 2022",
    text: "12 December 2022 — that's the day it started, and now it's written down, so neither of us can get it wrong again. And then Indore: paper glasses on both of us, pretending to be serious people, the first photo of us in the same room instead of on the same call. You said we needed new meetup pics. We still do.",
    photos: ["p05", "p11"],
  },
  {
    chapter: "Then it became video calls",
    when: "2023 onwards",
    text: "Somewhere in there, we turned into hundreds of video calls 😁📱 Your face filling my phone at every hour of the night — 2:49am, 1:47am, 11:53pm 🥹❤️ Log kehte hai long distance mushkil hota hai — par mere liye woh calls hi sab kuch thi 🫶 They were never a smaller version of us. They were us ❤️ Half the photos on this page are exactly that, and I wouldn't trade a single one 😁💋",
    photos: ["p20", "p42", "p22", "p23"],
  },
  {
    chapter: "The festivals",
    when: "every year",
    text: "You at the shrine with the diyas lit, holding the aarti thali, doing aarti beside Maa with the marigolds everywhere. You look like the whole puja was arranged around you. Every year I look forward to these photos more than the festival.",
    photos: ["p03", "p07", "p25", "p35"],
  },
  {
    chapter: "The trip",
    when: "—",
    text: "Standing in front of the Taj Mahal in a light blue shirt, looking like the monument should be honoured you came. And then the train home, wedged in with everybody, holding a blue basket of snacks, grinning. That second photo is the one that makes me laugh.",
    photos: ["p38", "p45", "p43", "p19"],
  },
  {
    chapter: "And you, building your life",
    when: "every single day",
    text: "Navy blazer. Teal shirt. Coral kurta with the ID card on. The lift-lobby mirror selfies on your way in, the office corridor ones on your way out. You're out there doing it — the CA papers, the articleship, the long days — and you still make time to call me at 2 in the morning. When that CA goes up on the wall, I want to be in the room. And then you're giving me a party, apparently. I'm holding you to it.",
    photos: ["p18", "p14", "p36", "p41", "p26"],
  },
  {
    chapter: "And us, now",
    when: US.short,
    text: `A lot of photographs, a lot of late nights, a lot of “na gussa, no baby” — ${US.words} of it, all counted from 12 December 2022. Different cities on the map and never really apart. Here's to the next year of it.`,
    photos: ["p09", "p17", "p33"],
  },
];

/* ============================================================================
   24 REASONS — one for each year, since it's the 24th.
   ============================================================================ */
const REASONS = [
  "Aapki hasi at 2:49am, jab aap aadhi so rahi ho aur hasna hi nahi chahiye 😁❤️ Woh hasi meri favourite sound hai 🥹😭",
  "Maa ke paas aarti karti ho aur kisi aur century ki painting lagti ho 🥹🪔❤️",
  "Aap “sonna” aise bolti ho jaise woh aapka ho — aur hai bhi 😌❤️💋",
  "Double thumbs up 👍👍 The most ridiculous and the most perfect thing you do 😁❤️",
  "Kisi cheez pe bhi behas kar leti ho — aur jeet jaati ho 😤❤️ Har baar 😁",
  "Office lift se mirror selfie bhejti ho aur mera pura din ban jaata hai 🥰📱❤️",
  "Call pe so gayi thi, aur mai bas dekhta reh gaya 😴🥹❤️",
  "Taj Mahal ke saamne khadi thi, tourist nahi lag rahi thi — kisi badi cheez jaisi lag rahi thi 🕌😌❤️",
  "Woh pout 😶‍🌫️ Aap jaanti ho ki kaam karta hai, phir bhi karti ho 😁❤️",
  "ID card wali har photo me dikh jaata hai — aapko apne kaam pe kitna proud hai 🥰💼❤️",
  "Ek photo poori blur aa gayi kyunki aap bahut has rahi thi 😂 And I kept it anyway ❤️",
  "Aarti thali aise pakdi jaise duniya ki sabse important cheez ho 🪔❤️ Aap sab kuch aise hi karti ho 🥹",
  "Jab mai galat hoon, aap bol deti ho 😤 Jab sahi hoon, aap bolne deti ho 😌 Usually 😁❤️",
  "Aap camera me aise dekhti ho jaise kisi insaan ko dekh rahi ho 🥹 That's rarer than you'd think ❤️",
  "“Jyada pyaar karo” aise bolti ho jaise koi kaam de rahi ho 😁❤️ Mai waise bhi karunga 😌💋",
  "Family, sab dressed up, aur aap bilkul beech me 🥰 Yehi wali aap hai jisse mai pyaar karta hoon ❤️",
  "Distance ne aapko ek baar bhi chhota nahi banaya 🥹 Aap bas call karti rahi ❤️",
  "Jab aap gussa hoke mera naam bolti ho aur dikhana nahi chahti 😤😁❤️",
  "Aap sabka khayal rakhti ho apne se pehle 🥹 I want someone to look after you for once ❤️",
  "Aapne mujhe photos rakhne wala bana diya 📱 I was never that before you ❤️",
  "12:00am, 1:47am, 2:49am — aapne kabhi mehsoos nahi karaya ki mai late call kar raha hoon 🌙❤️",
  "Aapko fancy kuch nahi chahiye 😌 Ek roshogolla aur thoda attention, bas 🍬🥰❤️",
  "Aapke paas lagbhag forty mirror selfies hai aur har ek alag mood 😁 I love that you're not one person ❤️",
  "Aap mujhe jhel leti ho 😤 The universe will never understand how 😁❤️",
];

/* ============================================================================
   OPEN WHEN — envelopes. Tap to open.
   ============================================================================ */
const ENVELOPES = [
  {
    label: "Open when you miss me",
    body: "Then just know I'm missing you at the same time, same amount, probably more 😭❤️ Meri sonna ji, put your hand on your chest — that feeling is not only yours, it's mine too 🥹💋 Call me, I'll pick up on the first ring 😁🤧",
  },
  {
    label: "Open when you're angry with me",
    body: "You are allowed, and I probably deserve it 😅🙏 Par yaad rakho — “Na Gussa. No Baby!! Apne Golu ko maaf kardo” 😁❤️ Woh likha tha tab bhi, aur sach hai ab bhi 🥹🤍 Jab ready ho — pehle nahi — mai yahin hoon 💋",
  },
  {
    label: "Open when you can't sleep",
    body: "It's late, and it's our hour anyway 😴🌙 You don't have to sleep to rest — phone side pe rakho, lie on your side the way you do, eyes half shut, and imagine me on the other end saying nothing at all 🥹❤️ That's a real thing we do, it will work 💋🤍",
  },
  {
    label: "Open when you feel like you're not doing enough",
    body: "You are doing enough, meri golu 😤❤️ Look at the photos — the lanyard, the office corridor, the lift lobby, the blazer. That's you out there building your life 🥰✨ Nobody is keeping up with you 💪 And when that CA goes up on the wall, I want to be in the room 🤞😁 I'm proud of you and I don't say it enough 🥹❤️",
  },
  {
    label: "Open when you need to smile",
    body: "Double thumbs up 👍👍 Paper glasses 🤓 A blurry photo of you laughing at your own joke 😂❤️ ICON t-shirt, standing in your room explaining your whole day to me 😁👕 Hayeee my cutiee, there it is 🥹❤️",
  },
  {
    label: "Open when you're sad and don't want to explain why",
    body: "You don't have to explain, meri baby jaan 🥹❤️ You never have to 🫶 Sit with it and let it pass, and if it doesn't pass, call me and we won't talk about it at all 😶‍🌫️🌙 I'll just be there, in the corner of the screen, saying nothing 🥹🤍 That's allowed too 💋",
  },
  {
    label: "Open on a random ordinary day, for no reason",
    body: "Hello meri sonna ji 😁❤️ Nothing is wrong, nothing is happening, it's just a Tuesday 😌 I love you. That's the entire message 💋🤍",
  },
];

/* ============================================================================
   THE QUIZ — playful. Q1-Q5 have real answers; the last one, every answer wins.
   ============================================================================ */
const QUIZ = [
  {
    q: "When did our story start? (exact date, no cheating 😁)",
    options: ["12 December 2022", "24 December 2022", "12 November 2022", "23 December 2022"],
    correct: 0,
    right: "12 December 2022 ❤️ Aur ab woh date site pe likhi hai, toh bhoolne ka koi bahana nahi 😁🤍",
    wrong: "12 December 2022 😤 Ab woh date site pe likhi hai — bhoolne ka bahana khatam 😁❤️",
  },
  {
    q: "What does Ayush call you? 🥹",
    options: ["Golu", "Sonna", "Baby", "All of the above 😁"],
    correct: 3,
    right: "Correct — all of them ❤️ He has no consistency and no shame 😁🤍",
    wrong: "It's all of them 😁 Golu, sonna, baby, darlo — he cycles through them like a man choosing a shirt 👕❤️",
  },
  {
    q: "What did I write on the notebook when I was in trouble? 😅",
    options: [
      "I'm sorry, please talk to me",
      "Na Gussa. No Baby!! Apne Golu ko maaf kardo",
      "Happy anniversary",
      "I'll do the dishes",
    ],
    correct: 1,
    right: "Yes!! “Na Gussa. No Baby!! Apne Golu ko maaf kardo” 🙏😁 Mai aise sau aur likh dunga ❤️",
    wrong: "“Na Gussa. No Baby!! Apne Golu ko maaf kardo” 😁❤️ Framed forever, basically 🖼️🙏",
  },
  {
    q: "Where are you standing in the picture with the light blue shirt? 💙",
    options: ["India Gate", "The Taj Mahal", "Howrah Bridge", "Gateway of India"],
    correct: 1,
    right: "The Taj Mahal 🕌 And the monument was not the best-looking thing in that photo 😌❤️",
    wrong: "The Taj Mahal 😁 Honestly, look at the photo again — aap hi attraction thi 🤍",
  },
  {
    q: "Roughly how many of these photos are just your face on a phone screen? 📱",
    options: ["About 5", "About 10", "About 20", "None, we're not like that"],
    correct: 2,
    right: "About twenty 😁 Officially the theme of this relationship. Long distance, many calls 📱❤️",
    wrong: "It's about twenty 😁 This whole website is basically an archive of you on a phone screen 🥹❤️",
  },
  {
    q: "What's the best thing about you? 😌 (no wrong answer here)",
    options: [
      "Your laugh 😂",
      "Your patience with me 🙏",
      "That you're the prettiest in every photo 😻",
      "You work so hard 💼",
    ],
    correct: -1,   // -1 means every answer is correct
    right: "Correct, obviously ❤️ There are no wrong answers to this one 🥰",
    wrong: "There are no wrong answers to this one 🥰",
  },
];

/* ============================================================================
   AYUSH'S LETTER — his own words, verbatim. Not a word edited or reordered.
   ============================================================================ */
const LETTER = [
  "Hello meri baby jaan 😁😁❤️❤️",
  "Can't believe your bday has reached already. I am so unprepared 😭.",
  "I miss you meri sonna ji, Looking at all the pics from past, I am missing you a lot now 🥹🥹💋",
  "Wish you a very very very happy birthday meri sonna ji 😁❤️❤️💋",
  "Wishing ki aapke sonna sare sapne pure ho jaiye, aap khub tarakki karoo 😁💋🔥🤧\nAur mere se kaam ladai karo aur jyada pyaar karo 😁❤️",
  "I hope aap jaldi se CA banjao aur party do 😁🥰\nAur phir mai aapse milne aa pau 🥰🤧🤧",
  "Golu jaann, you baby loves you a lot 😁🥰❤️💋💋",
];

/* ============================================================================
   TINY THINGS — the small marquee lines under the hero.
   ============================================================================ */
const TICKER = [
  US.short,
  "hundreds of video calls",
  "2:49am",
  "double thumbs up",
  "na gussa, no baby",
  "Kolkata",
  "CA ban jao, party do",
  "the pout",
  "ICON t-shirt",
  "rosogolla",
  "tumhe pyaar karta hoon",
  "sonna ji",
  "long distance, no problem",
  "Golu jaann",
];
