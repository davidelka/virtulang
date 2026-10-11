// Interface text, Arabic (primary). he.ts mirrors it and is shown under it. Practice content lives in src/content.
import type { ActivityTemplate } from '../types';

export const ar = {
  appName: 'عبري يومي',
  tagline: 'تدرّب على العبرية المحكية في مواقف من الحياة اليومية',

  common: {
    back: 'رجوع',
    points: (n: number) => `${n} نقطة`,
    notFound: 'لم نجد هذه الصفحة',
    toMap: 'إلى الخريطة',
  },

  login: {
    title: 'أهلًا وسهلًا!',
    classCode: 'رمز الصف',
    classCodeHint: '4 أرقام يعطيك إياها المعلّم',
    name: 'اسمك',
    namePlaceholder: 'اكتب اسمك هنا',
    submit: 'دخول',
    errCode: 'رمز الصف يتكوّن من 4 أرقام',
    errName: 'اكتب اسمك من فضلك',
    teacherLink: 'أنا معلّم — لوحة المعلّم',
  },

  avatar: {
    title: 'اختر شخصيتك',
    subtitle: 'هذه الشخصية سترافقك في رحلتك عبر الصحراء',
    confirm: 'لنبدأ!',
  },

  topbar: {
    profile: 'ملفي الشخصي',
    streak: (n: number) => `${n} 🔥`,
  },

  map: {
    title: 'خريطة الصحراء',
    hello: (name: string) => `مرحبًا ${name}! إلى أين نذهب اليوم؟`,
    locked: (lvl: string) => `مستوى ${lvl}`,
    lockedToast: (lvl: string) =>
      `هذه المنطقة تُفتح عندما تصل إلى مستوى ${lvl}. استمر في التدريب!`,
  },

  region: {
    notFound: 'لم نجد هذه المنطقة',
    locked: (lvl: string) => `هذه المنطقة مقفلة حتى مستوى ${lvl}`,
    soon: 'أنشطة جديدة قريبًا...',
    template: {
      dialogue: 'حوار',
      match: 'مطابقة كلمات',
    } satisfies Record<ActivityTemplate, string>,
    pointsShort: (n: number) => `+${n}`,
  },

  activity: {
    notFound: 'لم نجد هذا النشاط',
    exit: 'خروج',
  },

  dialogue: {
    task: 'مهمتك:',
    you: 'أنت',
    listen: 'استمع مرة أخرى',
    micStart: 'اضغط وتكلّم بالعبرية',
    micStop: 'أستمع... اضغط عند الانتهاء',
    micAgain: 'حاول مرة أخرى',
    praise: ['ممتاز! 👏', 'رائع! نطق واضح 🌟', 'أحسنت! 💪', 'ممتاز جدًا! 🎉'],
    pointsCorrect: '+5 نقاط على الكلام',
    almost: 'قريب! جرّب أن تقول:',
    pointsAttempt: '+2 على المحاولة',
    tries: (left: number) => (left === 1 ? 'بقيت محاولة واحدة' : `بقيت ${left} محاولات`),
    outOfTries: 'لا بأس! اختر الجواب من الخيارات وسنتابع.',
    noSpeech: 'لم أسمع شيئًا. اقترب من الميكروفون وجرّب مرة أخرى.',
    micBlocked: 'لا يمكن استخدام الميكروفون. اسمح للمتصفّح باستخدامه، أو اختر الجواب من الخيارات.',
    network:
      'خدمة التعرّف على الكلام لا تعمل في هذا المتصفّح. استخدم Google Chrome (وليس Chromium) أو Chrome على هاتف أندرويد، وتأكّد من الاتصال بالإنترنت. حاليًا اختر الجواب من الخيارات.',
    unsupported:
      'المتصفّح لا يدعم التعرّف على الصوت. للتدرّب بالكلام استخدم Chrome على هاتف أندرويد. حاليًا اختر الجواب من الخيارات.',
    needHelp: 'تحتاج مساعدة؟ اعرض الخيارات',
    helpCost: '(نقاط أقل)',
    choose: 'اختر الردّ المناسب:',
    hint: (meaning: string) =>
      `جوابك يعني: «${meaning}». هل هذا يناسب ما قيل؟ جرّب ردًّا آخر 🙂`,
    continue: 'متابعة',
    finish: 'إنهاء الحوار',
  },

  match: {
    instructions: 'اضغط على كلمة بالعبرية ثم على معناها بالعربية',
    hebrew: 'العبرية',
    arabic: 'العربية',
    tryAgain: 'ليس هذا الزوج، جرّب مرة أخرى',
    allDone: 'رائع! طابقت كل الكلمات',
    finish: 'إنهاء النشاط',
  },

  done: {
    titles: ['', 'أحسنت على المحاولة!', 'عمل جيد جدًا!', 'ممتاز! أداء كامل!'],
    earned: 'النقاط التي جمعتها',
    base: 'إكمال النشاط',
    bonus: 'مكافأة 3 نجوم',
    help: 'استعانة بالخيارات',
    spokenCorrect: 'جمل قلتها بصوتك بشكل صحيح',
    spokenAttempts: 'محاولات كلام',
    total: 'المجموع',
    backToMap: 'العودة إلى الخريطة',
    moreHere: 'أنشطة أخرى في هذه المنطقة',
    retry: 'أعد النشاط',
  },

  profile: {
    title: 'ملفي الشخصي',
    classCode: (c: string) => `صف ${c}`,
    level: 'المستوى',
    points: 'النقاط',
    streak: 'أيام متتالية',
    stars: 'النجوم',
    shop: 'متجر الشخصية',
    shopHint: 'تُفتح القطع تلقائيًا كلما جمعت نقاطًا أكثر',
    unlockAt: (n: number) => `🔒 ${n} نقطة`,
    equip: 'ارتدِ',
    equipped: 'مُرتدى ✓',
    changeAvatar: 'تغيير الشخصية',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد الخروج؟ سيتم مسح التقدّم على هذا الجهاز.',
  },

  bot: {
    open: 'اسأل معلّم العبرية',
    title: 'معلّم العبرية',
    placeholder: 'اكتب سؤالك...',
    send: 'إرسال',
    voice: 'الصوت:',
    male: 'رجل',
    female: 'امرأة',
    close: 'إغلاق',
    listen: 'استمع',
    mic: 'تكلّم مع المعلّم',
    micStop: 'إيقاف',
    micLang: { he: 'עב', ar: 'عر' },
    micLangLabel: 'لغة الميكروفون',
    tapToTalk: 'اضغط وتكلّم',
    listening: 'أستمع... اضغط عند الانتهاء',
    thinking: 'المعلّم يفكّر...',
    yourTurn: 'دورك! أجب بصوتك',
    offline: 'ردّ بسيط — المعلّم الذكي غير متصل',
    noSpeech: 'لم أسمع شيئًا. اضغط على الميكروفون وتكلّم.',
    micBlocked: 'لا يمكن استخدام الميكروفون. اسمح للمتصفّح باستخدامه، أو اكتب.',
    micUnavailable: 'التعرّف على الكلام لا يعمل في هذا المتصفّح. استخدم Google Chrome، أو اكتب.',
  },

  teacher: {
    title: 'لوحة المعلّم',
    subtitle: 'صف تجريبي — البيانات للعرض فقط',
    students: 'طلاب',
    avgMinutes: 'معدّل دقائق التدريب',
    totalPoints: 'مجموع النقاط',
    cols: {
      name: 'الاسم',
      level: 'المستوى',
      points: 'النقاط',
      lastActivity: 'آخر نشاط',
      minutes: 'دقائق هذا الأسبوع',
    },
    hoursAgo: (h: number) =>
      h < 1 ? 'قبل قليل' : h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : h < 24 ? `قبل ${h} ساعات` : h < 48 ? 'أمس' : `قبل ${Math.round(h / 24)} أيام`,
    needsNudge: 'يحتاج تشجيعًا',
    backToApp: 'إلى تطبيق الطالب',
  },
};
