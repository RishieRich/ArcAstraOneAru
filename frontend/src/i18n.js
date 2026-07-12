/** UI strings in the three ways our users actually talk.
 *  Roman script throughout — that is how the target users type.
 *  Alerts/notes arrive from the backend as language-neutral facts
 *  ({id, severity, data}); the alert/note maps below turn them into copy. */
export const LANGS = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hinglish" },
  { id: "gu", label: "Gujarati" },
];

export const T = {
  en: {
    tagline: "Who owes you money — live from Tally",
    company: "Company",
    logout: "Log out",
    // login
    loginTitle: "Welcome back",
    loginSub: "Log in to see your receivables",
    email: "Email",
    pin: "4-digit PIN",
    loginBtn: "Open dashboard",
    loggingIn: "Checking…",
    loginFooter: "Ask your admin for access · PIN is 4 digits",
    // tiles
    outstanding: "Total outstanding",
    overdue: "Overdue",
    notDueTile: "Not yet due",
    bills: "Unpaid bills",
    customers: "Customers",
    avgOverdue: "Avg overdue",
    daysShort: "days",
    ofTotal: (pct) => `${pct}% of what you are owed`,
    onTrack: "on track",
    invoices: (n) => `${n} ${n === 1 ? "invoice" : "invoices"}`,
    // sections
    aging: "How old is the money",
    agingSub: "Outstanding by how long it is overdue",
    dueTimeline: "When money was due",
    dueTimelineSub: "Bills by due month — red is already late",
    topDebtors: "Who owes the most",
    topDebtorsSub: (pct) => `Top customer = ${pct}% of outstanding`,
    chase: "Chase these first",
    chaseSub: "Oldest overdue bills — every day makes them harder to collect",
    alerts: "Alerts — needs your attention",
    alertsSub: "Auto-flagged from your books",
    notesTitle: "Data notes",
    notesSub: "An honest read of what this dashboard can and cannot see",
    billsTable: "Every unpaid bill",
    party: "Customer",
    billRef: "Bill",
    due: "Due date",
    amount: "Amount",
    overdueDays: "Overdue",
    days: "days",
    notDue: "Not due",
    lastSync: "Last sync",
    urgent: "URGENT",
    watch: "WATCH",
    allClear: "Nothing flagged — books look healthy",
    // copilot
    askTitle: "Business Copilot",
    askStatus: "online · grounded in your books",
    askHello:
      "Namaste! I answer from this company's synced Tally data. Ask in English, Hinglish or Gujarati — tap a shortcut below or type.",
    placeholder: "Type a message…",
    send: "Ask",
    thinking: "Thinking…",
    // states
    noData: "No data synced yet",
    noDataBody:
      "This company has registered, but no customers or unpaid bills have come through yet. Open Tally, make sure bill-wise entry is on, and press Push Now in the connector.",
    empty: "Nothing here yet",
    loading: "Loading your books…",
    suggestions: [
      "Who owes me the most?",
      "How much is overdue by 60+ days?",
      "Which bills should I chase first?",
      "Summarise my receivables in 3 lines",
    ],
    alertText: {
      concentration: (d, fm) =>
        [`Customer concentration is high`,
         `${d.party} alone owes ${fm(d.amount)} — ${d.pct}% of everything outstanding. If this one account delays, it hits you directly.`],
      ninety_plus: (d, fm) =>
        [`Bills stuck past 90 days`,
         `${d.count} bill${d.count === 1 ? "" : "s"} worth ${fm(d.amount)} ${d.count === 1 ? "is" : "are"} over 90 days late (oldest: ${d.oldest_days} days). Recovery gets much harder from here — call now.`],
      overdue_share: (d, fm) =>
        [`Most of your money is overdue`,
         `${d.pct}% of outstanding (${fm(d.amount)}) is already past its due date. Your collections are running behind your sales.`],
      big_bill: (d, fm) =>
        [`One bill dominates`,
         `Bill ${d.ref || "—"} from ${d.party} is ${fm(d.amount)} — ${d.pct}% of everything outstanding. Track this one personally.`],
    },
    noteText: {
      snapshot: (d) =>
        `Figures come from the latest Tally sync — ${d.bills} unpaid bill${d.bills === 1 ? "" : "s"} across ${d.parties} customer${d.parties === 1 ? "" : "s"}.`,
      sign: () =>
        `Tally reports receivables as debit (negative) balances; amounts here are shown as positive money owed to you.`,
      scope: () =>
        `Only Sundry Debtors and unpaid sales bills are synced. Purchases, stock, expenses and paid invoices are not visible here.`,
    },
  },

  hi: {
    tagline: "Kiska paisa aapke paas fansa hai — seedha Tally se",
    company: "Company",
    logout: "Log out",
    loginTitle: "Wapas swagat hai",
    loginSub: "Apna baaki paisa dekhne ke liye login karo",
    email: "Email",
    pin: "4-digit PIN",
    loginBtn: "Dashboard kholo",
    loggingIn: "Check kar rahe hain…",
    loginFooter: "Access ke liye admin se poochho · PIN 4 digit ka hai",
    outstanding: "Total baaki",
    overdue: "Overdue",
    notDueTile: "Abhi due nahi",
    bills: "Unpaid bills",
    customers: "Customers",
    avgOverdue: "Average overdue",
    daysShort: "din",
    ofTotal: (pct) => `Total baaki ka ${pct}%`,
    onTrack: "time par",
    invoices: (n) => `${n} bill`,
    aging: "Paisa kitna purana hai",
    agingSub: "Kitne din se overdue hai, uske hisaab se",
    dueTimeline: "Paisa kab due tha",
    dueTimelineSub: "Due month ke hisaab se — laal matlab late ho chuka",
    topDebtors: "Sabse zyada kiska baaki",
    topDebtorsSub: (pct) => `Top customer = baaki ka ${pct}%`,
    chase: "Pehle inke peeche pado",
    chaseSub: "Sabse purane overdue bills — jitni der, utna mushkil recovery",
    alerts: "Alerts — dhyan dena zaroori",
    alertsSub: "Aapke books se auto-flagged",
    notesTitle: "Data notes",
    notesSub: "Yeh dashboard kya dekh sakta hai aur kya nahi — seedhi baat",
    billsTable: "Saare unpaid bills",
    party: "Customer",
    billRef: "Bill",
    due: "Due date",
    amount: "Amount",
    overdueDays: "Overdue",
    days: "din",
    notDue: "Abhi due nahi",
    lastSync: "Last sync",
    urgent: "URGENT",
    watch: "DHYAN DO",
    allClear: "Kuch flag nahi hua — books theek lag rahi hain",
    askTitle: "Business Copilot",
    askStatus: "online · aapke books pe grounded",
    askHello:
      "Namaste! Main is company ke synced Tally data se jawab deta hoon. Hindi, English ya Hinglish mein poochhiye — neeche shortcuts dabaiye ya khud type kijiye.",
    placeholder: "Message likhiye…",
    send: "Poochho",
    thinking: "Soch raha hoon…",
    noData: "Abhi tak koi data nahi aaya",
    noDataBody:
      "Company register ho gayi hai, par abhi tak koi customer ya unpaid bill nahi aaya. Tally kholo, bill-wise entry on karo, aur connector mein Push Now dabao.",
    empty: "Abhi kuch nahi",
    loading: "Aapke books load ho rahe hain…",
    suggestions: [
      "Sabse zyada paisa kiska baaki hai?",
      "60+ din se kitna overdue hai?",
      "Pehle kis bill ke peeche padun?",
      "3 line mein meri receivables batao",
    ],
    alertText: {
      concentration: (d, fm) =>
        [`Customer concentration zyada hai`,
         `${d.party} akele ${fm(d.amount)} dete hain — total baaki ka ${d.pct}%. Yeh ek account late hua toh seedha asar padega.`],
      ninety_plus: (d, fm) =>
        [`90 din se atke bills`,
         `${d.count} bill (${fm(d.amount)}) 90 din se zyada late hain (sabse purana: ${d.oldest_days} din). Ab recovery mushkil hoti jayegi — abhi call karo.`],
      overdue_share: (d, fm) =>
        [`Zyada tar paisa overdue hai`,
         `Baaki ka ${d.pct}% (${fm(d.amount)}) due date cross kar chuka hai. Collections sales se peeche chal rahi hain.`],
      big_bill: (d, fm) =>
        [`Ek hi bill sab par bhaari`,
         `${d.party} ka bill ${d.ref || "—"} hi ${fm(d.amount)} ka hai — total ka ${d.pct}%. Is par khud nazar rakho.`],
    },
    noteText: {
      snapshot: (d) =>
        `Figures latest Tally sync se hain — ${d.parties} customer ke ${d.bills} unpaid bill.`,
      sign: () =>
        `Tally receivables ko debit (negative) balance dikhata hai; yahan amounts positive mein hain — jo paisa aapko milna hai.`,
      scope: () =>
        `Sirf Sundry Debtors aur unpaid sales bills sync hote hain. Purchases, stock, kharcha aur paid invoices yahan nahi dikhte.`,
    },
  },

  gu: {
    tagline: "Tamara paisa kone rakhya che — sidha Tally mathi",
    company: "Company",
    logout: "Log out",
    loginTitle: "Pachha aavya, swagat che",
    loginSub: "Tamara baki paisa jova mate login karo",
    email: "Email",
    pin: "4-digit PIN",
    loginBtn: "Dashboard kholo",
    loggingIn: "Check kari rahya chhe…",
    loginFooter: "Access mate admin ne puchho · PIN 4 digit no che",
    outstanding: "Kul baki",
    overdue: "Overdue",
    notDueTile: "Have due nathi",
    bills: "Unpaid bills",
    customers: "Customers",
    avgOverdue: "Average overdue",
    daysShort: "divas",
    ofTotal: (pct) => `Kul baki na ${pct}%`,
    onTrack: "time par",
    invoices: (n) => `${n} bill`,
    aging: "Paisa ketlo juno che",
    agingSub: "Ketla divas thi overdue che e pramane",
    dueTimeline: "Paisa kyare due hato",
    dueTimelineSub: "Due month pramane — lal etle late thai gayu",
    topDebtors: "Sauthi vadhare kona baki",
    topDebtorsSub: (pct) => `Top customer = baki na ${pct}%`,
    chase: "Pehla emni pachhal pado",
    chaseSub: "Sauthi juna overdue bills — jetli var, etli mushkel recovery",
    alerts: "Alerts — dhyan devu jaruri",
    alertsSub: "Tamara books mathi auto-flagged",
    notesTitle: "Data notes",
    notesSub: "Aa dashboard shu joi shake ane shu nahi — sidhi vaat",
    billsTable: "Badha unpaid bills",
    party: "Customer",
    billRef: "Bill",
    due: "Due date",
    amount: "Amount",
    overdueDays: "Overdue",
    days: "divas",
    notDue: "Have due nathi",
    lastSync: "Last sync",
    urgent: "URGENT",
    watch: "DHYAN AAPO",
    allClear: "Kai flag nathi thayu — books barabar lage che",
    askTitle: "Business Copilot",
    askStatus: "online · tamara books par grounded",
    askHello:
      "Namaste! Hu aa company na synced Tally data mathi jawab aapu chhu. English, Hinglish ke Gujarati ma puchho — niche shortcuts dabavo ke jaate type karo.",
    placeholder: "Message lakho…",
    send: "Puchho",
    thinking: "Vichari rahyo chhu…",
    noData: "Havi sudhi koi data nathi avyo",
    noDataBody:
      "Company register thai gai che, pan havi sudhi koi customer ke unpaid bill nathi avyo. Tally kholo, bill-wise entry on karo, ane connector ma Push Now dabavo.",
    empty: "Have kai nathi",
    loading: "Tamara books load thai rahya che…",
    suggestions: [
      "Sauthi vadhare rupiya kona baki che?",
      "60+ divas thi ketlo overdue che?",
      "Pehla kya bill pachhal padvu?",
      "3 line ma mari receivables batavo",
    ],
    alertText: {
      concentration: (d, fm) =>
        [`Customer concentration vadhare che`,
         `${d.party} ekla ${fm(d.amount)} aape che — kul baki na ${d.pct}%. Aa ek account late thayu toh sidhi asar padse.`],
      ninety_plus: (d, fm) =>
        [`90 divas thi atkela bills`,
         `${d.count} bill (${fm(d.amount)}) 90 divas thi vadhare late che (sauthi juno: ${d.oldest_days} divas). Have recovery mushkel thashe — aaje j call karo.`],
      overdue_share: (d, fm) =>
        [`Motu bhag overdue che`,
         `Baki na ${d.pct}% (${fm(d.amount)}) due date pass kari gaya che. Collections sales thi pachhal che.`],
      big_bill: (d, fm) =>
        [`Ek j bill badhu bhare che`,
         `${d.party} nu bill ${d.ref || "—"} j ${fm(d.amount)} nu che — kul na ${d.pct}%. Aa par jaate dhyan rakho.`],
    },
    noteText: {
      snapshot: (d) =>
        `Figures latest Tally sync mathi che — ${d.parties} customer na ${d.bills} unpaid bill.`,
      sign: () =>
        `Tally receivables ne debit (negative) balance batave che; ahi amounts positive ma che — je paisa tamne malvana che.`,
      scope: () =>
        `Fakt Sundry Debtors ane unpaid sales bills sync thay che. Purchases, stock, kharch ane paid invoices ahi nathi dekhata.`,
    },
  },
};
