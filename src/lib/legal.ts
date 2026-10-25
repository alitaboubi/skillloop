import type { Lang } from "@/lib/i18n";

/**
 * Privacy policy and terms (MVP draft, fr/en/ar). Long-form documents live here instead of i18n.tsx; their page
 * chrome (titles, labels) is in i18n.tsx. Every language has the same section ids (tested).
 * `[PLACEHOLDER: …]` marks a fact only the operator can supply; pages are `noindex` and left out of the sitemap while
 * any placeholder remains (hasPlaceholders). Not legal advice: have the final text reviewed.
 * The facts stated here must match the app: processors, what is public, account deletion (docs/account-deletion.md).
 */
export type LegalBlock = string | string[];
export type LegalSection = { id: string; h: string; body: LegalBlock[] };
export type LegalDoc = { intro: string; sections: LegalSection[] };
export type LegalKind = "privacy" | "terms";

export const LEGAL_UPDATED = "2026-10-25";
export const PLACEHOLDER_RE = /\[PLACEHOLDER:[^\]]*\]/g;

const PRIVACY: Record<Lang, LegalDoc> = {
  fr: {
    intro: "Cette politique explique quelles données SkillLoop traite, pourquoi, avec qui elles sont partagées et quels sont vos droits.",
    sections: [
      { id: "operator", h: "Qui est responsable", body: [
        "Responsable du traitement : [PLACEHOLDER: entité légale / exploitant — nom, forme juridique, numéro d'immatriculation, adresse].",
        "Contact confidentialité : [PLACEHOLDER: email de contact confidentialité]. Support : [PLACEHOLDER: email du support].",
      ] },
      { id: "data", h: "Données que nous traitons", body: [[
        "Compte : adresse email, mot de passe (stocké chiffré par notre hébergeur d'authentification), ou les nom et email fournis par Google si vous utilisez la connexion Google.",
        "Profil : nom affiché, titre, ville, zone, présentation, photo, disponibilité, langues, et les contacts que vous ajoutez (seuls ceux que vous marquez « public » sont visibles).",
        "Services : titre, description, catégorie, prix, ville, mode (sur place / à distance), photos, réalisations.",
        "Demandes et messages échangés entre client et prestataire.",
        "Données techniques : adresse IP, type de navigateur et pages demandées, traités par notre hébergeur pour faire fonctionner et sécuriser le site ; le contrôle anti-robot (Cloudflare Turnstile) lors de la connexion, de l'inscription et de la réinitialisation du mot de passe.",
        "Compteurs d'usage quotidiens (nombre de services, demandes, messages et photos envoyés) pour limiter les abus.",
      ]] },
      { id: "purposes", h: "Pourquoi", body: [[
        "Fournir le service : créer votre compte, publier vos services, transmettre les demandes et les messages (exécution du service que vous demandez).",
        "Sécurité et prévention des abus : contrôle anti-robot, limites quotidiennes, journaux techniques (intérêt légitime).",
        "Emails liés au compte : confirmation d'inscription et réinitialisation du mot de passe. Pas de publicité ni de newsletter.",
      ]] },
      { id: "public", h: "Ce qui est public", body: [
        "Sont visibles par tous : votre profil public (nom, photo, titre, ville, présentation, disponibilité), vos services publiés, vos réalisations et les contacts que vous avez rendus publics. Ne sont jamais publics : votre email, vos contacts privés, vos demandes et vos messages (visibles seulement par les deux personnes concernées).",
      ] },
      { id: "processors", h: "Prestataires techniques", body: [
        "Nous ne vendons pas vos données. Elles sont traitées pour nous par :",
        [
          "Supabase — base de données, authentification et stockage des photos (serveurs dans l'Union européenne, Paris).",
          "Cloudflare — hébergement du site et contrôle anti-robot Turnstile.",
          "Google — uniquement si vous choisissez « Continuer avec Google ».",
          "[PLACEHOLDER: fournisseur d'email, ex. Brevo] — envoi des emails de confirmation et de réinitialisation.",
        ],
        "Certaines données peuvent donc être traitées hors de Tunisie, avec les garanties prévues par ces prestataires.",
      ] },
      { id: "retention", h: "Durée de conservation", body: [[
        "Compte, profil, services, demandes et messages : tant que votre compte existe, puis selon la section « Suppression du compte ».",
        "Comptes inactifs : [PLACEHOLDER: durée de conservation des comptes inactifs].",
        "Journaux techniques de l'hébergeur : courte durée, selon les réglages de Cloudflare.",
        "Compteurs d'usage : effacés à la suppression du compte.",
      ]] },
      { id: "deletion", h: "Suppression du compte", body: [
        "Vous pouvez supprimer votre compte dans Paramètres → « Supprimer mon compte ». Ce qui se passe :",
        [
          "Supprimé : votre compte de connexion et votre email, vos photos, réalisations, contacts, les services qui n'ont reçu aucune demande, vos compteurs d'usage.",
          "Anonymisé : votre profil (nom, photo et informations effacés ; il apparaît comme « Compte supprimé ») et les services ayant reçu des demandes (archivés, description et photo effacées, titre conservé).",
          "Conservé : les demandes et messages échangés avec d'autres personnes, pour qu'elles gardent l'historique de leurs échanges ; ils ne sont plus liés à votre identité. Vos demandes en attente sont clôturées.",
        ],
      ] },
      { id: "rights", h: "Vos droits", body: [
        "Conformément à la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données personnelles, vous pouvez demander l'accès à vos données, leur rectification ou leur suppression, et vous opposer à certains traitements. La plupart des données se modifient directement dans vos paramètres. Pour toute demande : [PLACEHOLDER: email de contact confidentialité].",
        "Déclaration auprès de l'INPDP (Instance nationale de protection des données personnelles) : [PLACEHOLDER: statut de la déclaration INPDP]. Vous pouvez aussi adresser une réclamation à l'INPDP.",
      ] },
      { id: "device", h: "Stockage sur votre appareil", body: [
        "SkillLoop enregistre dans votre navigateur votre langue, votre thème (clair/sombre), votre session de connexion et vos brouillons de service. Nous n'utilisons ni cookies publicitaires ni outil de mesure d'audience.",
      ] },
      { id: "age", h: "Âge minimum", body: [
        "SkillLoop est réservé aux personnes âgées d'au moins [PLACEHOLDER: âge minimum] ans.",
      ] },
      { id: "changes", h: "Modifications", body: [
        "Nous pouvons mettre à jour cette politique ; la date en haut de la page indique la dernière version. En cas de changement important, nous vous en informerons dans l'application.",
      ] },
    ],
  },
  en: {
    intro: "This policy explains what data SkillLoop processes, why, who it is shared with and what your rights are.",
    sections: [
      { id: "operator", h: "Who is responsible", body: [
        "Data controller: [PLACEHOLDER: legal entity / operator — name, legal form, registration number, address].",
        "Privacy contact: [PLACEHOLDER: privacy contact email]. Support: [PLACEHOLDER: support email].",
      ] },
      { id: "data", h: "Data we process", body: [[
        "Account: email address, password (stored hashed by our authentication host), or the name and email provided by Google if you use Google sign-in.",
        "Profile: display name, title, city, area, bio, photo, availability, languages, and the contacts you add (only those you mark “public” are visible).",
        "Services: title, description, category, price, city, mode (on site / remote), photos, portfolio items.",
        "Requests and messages exchanged between client and provider.",
        "Technical data: IP address, browser type and requested pages, processed by our host to run and secure the site; the bot check (Cloudflare Turnstile) at sign-in, sign-up and password reset.",
        "Daily usage counters (number of services, requests, messages and photos sent) to limit abuse.",
      ]] },
      { id: "purposes", h: "Why", body: [[
        "Providing the service: creating your account, publishing your services, delivering requests and messages (performing the service you ask for).",
        "Security and abuse prevention: bot check, daily limits, technical logs (legitimate interest).",
        "Account emails: sign-up confirmation and password reset. No advertising or newsletters.",
      ]] },
      { id: "public", h: "What is public", body: [
        "Visible to everyone: your public profile (name, photo, title, city, bio, availability), your published services, your portfolio and the contacts you made public. Never public: your email, private contacts, requests and messages (visible only to the two people involved).",
      ] },
      { id: "processors", h: "Service providers", body: [
        "We do not sell your data. It is processed on our behalf by:",
        [
          "Supabase — database, authentication and photo storage (servers in the European Union, Paris).",
          "Cloudflare — website hosting and the Turnstile bot check.",
          "Google — only if you choose “Continue with Google”.",
          "[PLACEHOLDER: email provider, e.g. Brevo] — sending confirmation and password-reset emails.",
        ],
        "Some data may therefore be processed outside Tunisia, under the safeguards these providers offer.",
      ] },
      { id: "retention", h: "How long we keep data", body: [[
        "Account, profile, services, requests and messages: while your account exists, then as described under “Account deletion”.",
        "Inactive accounts: [PLACEHOLDER: retention period for inactive accounts].",
        "Host technical logs: short period, per Cloudflare's settings.",
        "Usage counters: erased when the account is deleted.",
      ]] },
      { id: "deletion", h: "Account deletion", body: [
        "You can delete your account in Settings → “Delete my account”. What happens:",
        [
          "Deleted: your sign-in account and email, your photos, portfolio, contacts, services that never received a request, your usage counters.",
          "Anonymised: your profile (name, photo and details erased; it shows as “Deleted account”) and services that received requests (archived, description and photo erased, title kept).",
          "Kept: requests and messages exchanged with other people, so they keep the history of their conversations; they are no longer linked to your identity. Your pending requests are closed.",
        ],
      ] },
      { id: "rights", h: "Your rights", body: [
        "Under Tunisian Organic Law No. 2004-63 of 27 July 2004 on the protection of personal data, you can request access to, correction or deletion of your data, and object to certain processing. Most data can be changed directly in your settings. For any request: [PLACEHOLDER: privacy contact email].",
        "Declaration to the INPDP (National Authority for the Protection of Personal Data): [PLACEHOLDER: INPDP declaration status]. You may also lodge a complaint with the INPDP.",
      ] },
      { id: "device", h: "Storage on your device", body: [
        "SkillLoop stores your language, theme (light/dark), sign-in session and service drafts in your browser. We use no advertising cookies and no analytics tools.",
      ] },
      { id: "age", h: "Minimum age", body: [
        "SkillLoop is only for people aged at least [PLACEHOLDER: minimum age].",
      ] },
      { id: "changes", h: "Changes", body: [
        "We may update this policy; the date at the top shows the latest version. For important changes we will tell you in the app.",
      ] },
    ],
  },
  ar: {
    intro: "توضّح هذه السياسة ما هي البيانات التي تعالجها SkillLoop، ولماذا، ومع من تُشارك، وما هي حقوقك.",
    sections: [
      { id: "operator", h: "من المسؤول", body: [
        "المسؤول عن المعالجة: [PLACEHOLDER: الكيان القانوني / المشغّل — الاسم، الشكل القانوني، رقم التسجيل، العنوان].",
        "التواصل بخصوص الخصوصية: [PLACEHOLDER: بريد التواصل للخصوصية]. الدعم: [PLACEHOLDER: بريد الدعم].",
      ] },
      { id: "data", h: "البيانات التي نعالجها", body: [[
        "الحساب: البريد الإلكتروني وكلمة السر (مخزّنة مشفّرة لدى مزوّد المصادقة)، أو الاسم والبريد اللذين يرسلهما Google إذا استعملت الدخول عبر Google.",
        "البروفيل: الاسم الظاهر، العنوان المهني، المدينة، المنطقة، التقديم، الصورة، التوفّر، اللغات، ووسائل الاتصال التي تضيفها (تظهر فقط التي تجعلها «عامة»).",
        "الخدمات: العنوان، الوصف، الصنف، السعر، المدينة، طريقة العمل (في المكان / عن بعد)، الصور، الأعمال السابقة.",
        "الطلبات والرسائل المتبادلة بين الحريف ومقدّم الخدمة.",
        "بيانات تقنية: عنوان IP ونوع المتصفح والصفحات المطلوبة، يعالجها المستضيف لتشغيل الموقع وحمايته؛ والتحقق من أنك لست روبوتًا (Cloudflare Turnstile) عند الدخول والتسجيل وإعادة تعيين كلمة السر.",
        "عدّادات استعمال يومية (عدد الخدمات والطلبات والرسائل والصور) للحدّ من التجاوزات.",
      ]] },
      { id: "purposes", h: "لماذا", body: [[
        "تقديم الخدمة: إنشاء حسابك، نشر خدماتك، إيصال الطلبات والرسائل.",
        "الأمان ومنع التجاوزات: التحقق من الروبوتات، الحدود اليومية، السجلات التقنية (مصلحة مشروعة).",
        "رسائل الحساب: تأكيد التسجيل وإعادة تعيين كلمة السر. لا إشهار ولا نشرات إخبارية.",
      ]] },
      { id: "public", h: "ما هو عام", body: [
        "يراه الجميع: بروفيلك العام (الاسم، الصورة، العنوان المهني، المدينة، التقديم، التوفّر)، خدماتك المنشورة، أعمالك، ووسائل الاتصال التي جعلتها عامة. لا يكون عامًا أبدًا: بريدك الإلكتروني، وسائل الاتصال الخاصة، الطلبات والرسائل (يراها الشخصان المعنيان فقط).",
      ] },
      { id: "processors", h: "مزوّدو الخدمات التقنية", body: [
        "لا نبيع بياناتك. يعالجها لحسابنا:",
        [
          "Supabase — قاعدة البيانات والمصادقة وتخزين الصور (خوادم في الاتحاد الأوروبي، باريس).",
          "Cloudflare — استضافة الموقع والتحقق Turnstile.",
          "Google — فقط إذا اخترت الدخول عبر Google.",
          "[PLACEHOLDER: مزوّد البريد الإلكتروني، مثلًا Brevo] — إرسال رسائل التأكيد وإعادة تعيين كلمة السر.",
        ],
        "لذلك قد تُعالج بعض البيانات خارج تونس، وفق الضمانات التي يوفّرها هؤلاء المزوّدون.",
      ] },
      { id: "retention", h: "مدة الحفظ", body: [[
        "الحساب والبروفيل والخدمات والطلبات والرسائل: ما دام حسابك موجودًا، ثم حسب قسم «حذف الحساب».",
        "الحسابات غير النشطة: [PLACEHOLDER: مدة حفظ الحسابات غير النشطة].",
        "السجلات التقنية لدى المستضيف: مدة قصيرة حسب إعدادات Cloudflare.",
        "عدّادات الاستعمال: تُمحى عند حذف الحساب.",
      ]] },
      { id: "deletion", h: "حذف الحساب", body: [
        "يمكنك حذف حسابك من الإعدادات ← «حذف حسابي». ما يحدث:",
        [
          "يُحذف: حساب الدخول وبريدك الإلكتروني، صورك، أعمالك، وسائل الاتصال، الخدمات التي لم تتلقّ أي طلب، وعدّادات الاستعمال.",
          "يُجهَّل: بروفيلك (يُمحى الاسم والصورة والمعلومات ويظهر «حساب محذوف») والخدمات التي تلقّت طلبات (تُؤرشف، يُمحى الوصف والصورة ويبقى العنوان).",
          "يُحتفظ به: الطلبات والرسائل المتبادلة مع أشخاص آخرين حتى يبقى لهم سجلّ محادثاتهم، دون ربطها بهويتك. وتُغلق طلباتك المعلّقة.",
        ],
      ] },
      { id: "rights", h: "حقوقك", body: [
        "طبقًا للقانون الأساسي عدد 63 لسنة 2004 المؤرخ في 27 جويلية 2004 المتعلق بحماية المعطيات الشخصية، يمكنك طلب النفاذ إلى بياناتك أو تصحيحها أو حذفها، والاعتراض على بعض المعالجات. أغلب البيانات تُعدَّل مباشرة من إعداداتك. لأي طلب: [PLACEHOLDER: بريد التواصل للخصوصية].",
        "التصريح لدى الهيئة الوطنية لحماية المعطيات الشخصية (INPDP): [PLACEHOLDER: حالة التصريح لدى الهيئة]. ويمكنك أيضًا تقديم شكوى إلى الهيئة.",
      ] },
      { id: "device", h: "التخزين على جهازك", body: [
        "تحفظ SkillLoop في متصفحك لغتك والمظهر (فاتح/داكن) وجلسة الدخول ومسودات خدماتك. لا نستعمل ملفات تعريف إشهارية ولا أدوات قياس الجمهور.",
      ] },
      { id: "age", h: "السن الأدنى", body: [
        "SkillLoop مخصّصة للأشخاص الذين لا يقلّ سنّهم عن [PLACEHOLDER: السن الأدنى] سنة.",
      ] },
      { id: "changes", h: "التعديلات", body: [
        "قد نحدّث هذه السياسة؛ التاريخ في أعلى الصفحة يبيّن آخر نسخة. عند تغيير مهم سنُعلمك داخل التطبيق.",
      ] },
    ],
  },
};

const TERMS: Record<Lang, LegalDoc> = {
  fr: {
    intro: "Ces conditions encadrent l'utilisation de SkillLoop. En créant un compte, vous les acceptez.",
    sections: [
      { id: "operator", h: "Qui exploite SkillLoop", body: [
        "SkillLoop est exploité par [PLACEHOLDER: entité légale / exploitant — nom, forme juridique, numéro d'immatriculation, adresse]. Contact : [PLACEHOLDER: email du support].",
      ] },
      { id: "role", h: "Ce que fait SkillLoop", body: [
        "SkillLoop met en relation des clients et des prestataires de services en Tunisie. SkillLoop ne réserve pas, n'encaisse aucun paiement, ne garantit pas les prestations et n'est pas partie aux accords conclus entre utilisateurs. Le prix, le déroulement et la qualité d'une prestation relèvent du client et du prestataire.",
      ] },
      { id: "account", h: "Votre compte", body: [[
        "Vous devez avoir au moins [PLACEHOLDER: âge minimum] ans.",
        "Les informations de votre compte et de votre profil doivent être exactes.",
        "Vous êtes responsable de la confidentialité de votre mot de passe et de l'activité de votre compte.",
        "Vous pouvez supprimer votre compte à tout moment depuis les paramètres (voir la politique de confidentialité).",
      ]] },
      { id: "providers", h: "Si vous proposez des services", body: [[
        "Décrivez honnêtement vos services, vos prix (en dinars tunisiens) et vos qualifications ; n'inventez ni diplômes, ni avis, ni garanties.",
        "Les activités réglementées (par exemple la santé) exigent les autorisations légales nécessaires ; vous en êtes seul responsable.",
        "Vous respectez les lois applicables à votre activité, y compris fiscales et sociales.",
      ]] },
      { id: "content", h: "Contenus interdits", body: [
        "Il est interdit de publier ou d'envoyer :",
        [
          "des contenus illégaux, trompeurs, frauduleux ou portant atteinte aux droits d'autrui ;",
          "des contenus haineux, harcelants, violents ou à caractère sexuel ;",
          "les données personnelles d'une autre personne sans son accord ;",
          "du spam, de la publicité non sollicitée ou des liens malveillants ;",
          "des services interdits par la loi.",
        ],
      ] },
      { id: "report", h: "Signaler un problème", body: [
        "Pour signaler un contenu ou un comportement : [PLACEHOLDER: email du support]. Nous pouvons retirer un contenu ou suspendre un compte qui ne respecte pas ces conditions.",
      ] },
      { id: "limits", h: "Limites d'usage", body: [
        "Pour protéger le service, le nombre de services, demandes, messages et photos est limité par jour. Toute tentative de contourner ces limites ou d'automatiser l'utilisation est interdite.",
      ] },
      { id: "ownership", h: "Vos contenus", body: [
        "Vous restez propriétaire de vos textes et photos. Vous autorisez SkillLoop à les afficher sur le site pour faire fonctionner le service, tant qu'ils sont publiés.",
      ] },
      { id: "liability", h: "Responsabilité", body: [
        "SkillLoop est fourni « en l'état », en version de lancement. [PLACEHOLDER: clause de limitation de responsabilité — à faire relire par votre conseiller].",
      ] },
      { id: "law", h: "Droit applicable", body: [
        "[PLACEHOLDER: droit applicable et tribunaux compétents].",
      ] },
      { id: "changes", h: "Modifications", body: [
        "Nous pouvons modifier ces conditions ; la date en haut de la page indique la dernière version. En cas de changement important, nous vous en informerons dans l'application.",
      ] },
    ],
  },
  en: {
    intro: "These terms govern the use of SkillLoop. By creating an account you accept them.",
    sections: [
      { id: "operator", h: "Who runs SkillLoop", body: [
        "SkillLoop is operated by [PLACEHOLDER: legal entity / operator — name, legal form, registration number, address]. Contact: [PLACEHOLDER: support email].",
      ] },
      { id: "role", h: "What SkillLoop does", body: [
        "SkillLoop connects clients and service providers in Tunisia. SkillLoop does not book, takes no payments, does not guarantee services and is not a party to agreements between users. The price, delivery and quality of a service are between the client and the provider.",
      ] },
      { id: "account", h: "Your account", body: [[
        "You must be at least [PLACEHOLDER: minimum age] years old.",
        "Your account and profile information must be accurate.",
        "You are responsible for keeping your password confidential and for activity on your account.",
        "You can delete your account at any time in settings (see the privacy policy).",
      ]] },
      { id: "providers", h: "If you offer services", body: [[
        "Describe your services, prices (in Tunisian dinars) and qualifications honestly; never invent diplomas, reviews or guarantees.",
        "Regulated activities (for example healthcare) require the legal authorisations; you alone are responsible for them.",
        "You comply with the laws that apply to your activity, including tax and social-security rules.",
      ]] },
      { id: "content", h: "Prohibited content", body: [
        "You may not publish or send:",
        [
          "illegal, misleading or fraudulent content, or content that infringes others' rights;",
          "hateful, harassing, violent or sexual content;",
          "another person's personal data without their consent;",
          "spam, unsolicited advertising or malicious links;",
          "services that are prohibited by law.",
        ],
      ] },
      { id: "report", h: "Reporting a problem", body: [
        "To report content or behaviour: [PLACEHOLDER: support email]. We may remove content or suspend an account that breaks these terms.",
      ] },
      { id: "limits", h: "Usage limits", body: [
        "To protect the service, the number of services, requests, messages and photos per day is limited. Trying to get around these limits or automating use is prohibited.",
      ] },
      { id: "ownership", h: "Your content", body: [
        "You keep ownership of your texts and photos. You allow SkillLoop to display them on the site to run the service while they are published.",
      ] },
      { id: "liability", h: "Liability", body: [
        "SkillLoop is provided “as is”, as a launch version. [PLACEHOLDER: limitation-of-liability clause — to be reviewed by your adviser].",
      ] },
      { id: "law", h: "Governing law", body: [
        "[PLACEHOLDER: governing law and competent courts].",
      ] },
      { id: "changes", h: "Changes", body: [
        "We may change these terms; the date at the top shows the latest version. For important changes we will tell you in the app.",
      ] },
    ],
  },
  ar: {
    intro: "تنظّم هذه الشروط استعمال SkillLoop. بإنشاء حساب فإنك تقبلها.",
    sections: [
      { id: "operator", h: "من يشغّل SkillLoop", body: [
        "يشغّل SkillLoop: [PLACEHOLDER: الكيان القانوني / المشغّل — الاسم، الشكل القانوني، رقم التسجيل، العنوان]. للتواصل: [PLACEHOLDER: بريد الدعم].",
      ] },
      { id: "role", h: "ماذا تفعل SkillLoop", body: [
        "تربط SkillLoop بين الحرفاء ومقدّمي الخدمات في تونس. لا تقوم SkillLoop بالحجز، ولا تقبض أي دفعات، ولا تضمن الخدمات، وليست طرفًا في الاتفاقات بين المستعملين. السعر وطريقة الإنجاز والجودة أمر بين الحريف ومقدّم الخدمة.",
      ] },
      { id: "account", h: "حسابك", body: [[
        "يجب ألا يقلّ سنّك عن [PLACEHOLDER: السن الأدنى] سنة.",
        "يجب أن تكون معلومات حسابك وبروفيلك صحيحة.",
        "أنت مسؤول عن سرّية كلمة السر وعن النشاط على حسابك.",
        "يمكنك حذف حسابك في أي وقت من الإعدادات (انظر سياسة الخصوصية).",
      ]] },
      { id: "providers", h: "إذا كنت تقدّم خدمات", body: [[
        "صِف خدماتك وأسعارك (بالدينار التونسي) ومؤهلاتك بصدق؛ لا تخترع شهادات أو آراء أو ضمانات.",
        "الأنشطة المنظّمة (مثل الصحة) تتطلّب التراخيص القانونية؛ وأنت وحدك المسؤول عنها.",
        "تحترم القوانين المنطبقة على نشاطك، بما فيها الجبائية والاجتماعية.",
      ]] },
      { id: "content", h: "المحتوى الممنوع", body: [
        "يُمنع نشر أو إرسال:",
        [
          "محتوى غير قانوني أو مضلّل أو احتيالي أو يمسّ بحقوق الغير؛",
          "محتوى يحضّ على الكراهية أو التحرّش أو العنف أو ذو طابع جنسي؛",
          "البيانات الشخصية لشخص آخر دون موافقته؛",
          "الرسائل المزعجة أو الإشهار غير المطلوب أو الروابط الضارّة؛",
          "خدمات يمنعها القانون.",
        ],
      ] },
      { id: "report", h: "الإبلاغ عن مشكلة", body: [
        "للإبلاغ عن محتوى أو سلوك: [PLACEHOLDER: بريد الدعم]. يمكننا حذف محتوى أو تعليق حساب لا يحترم هذه الشروط.",
      ] },
      { id: "limits", h: "حدود الاستعمال", body: [
        "لحماية الخدمة، عدد الخدمات والطلبات والرسائل والصور محدود يوميًا. يُمنع التحايل على هذه الحدود أو أتمتة الاستعمال.",
      ] },
      { id: "ownership", h: "محتواك", body: [
        "تبقى مالكًا لنصوصك وصورك. وتسمح لـ SkillLoop بعرضها على الموقع لتشغيل الخدمة ما دامت منشورة.",
      ] },
      { id: "liability", h: "المسؤولية", body: [
        "تُقدَّم SkillLoop «على حالها» كنسخة إطلاق. [PLACEHOLDER: بند تحديد المسؤولية — يُراجع من طرف مستشارك].",
      ] },
      { id: "law", h: "القانون المنطبق", body: [
        "[PLACEHOLDER: القانون المنطبق والمحاكم المختصة].",
      ] },
      { id: "changes", h: "التعديلات", body: [
        "قد نعدّل هذه الشروط؛ التاريخ في أعلى الصفحة يبيّن آخر نسخة. عند تغيير مهم سنُعلمك داخل التطبيق.",
      ] },
    ],
  },
};

export const LEGAL: Record<LegalKind, Record<Lang, LegalDoc>> = { privacy: PRIVACY, terms: TERMS };

function docText(d: LegalDoc): string {
  return [d.intro, ...d.sections.flatMap((s) => [s.h, ...s.body.flat()])].join("\n");
}

/** True while any language of the document still has a [PLACEHOLDER: …] (⇒ noindex, not in the sitemap). */
export function hasPlaceholders(kind: LegalKind): boolean {
  return Object.values(LEGAL[kind]).some((d) => new RegExp(PLACEHOLDER_RE.source).test(docText(d)));
}

/** Splits text into plain parts and placeholder parts (rendered highlighted). */
export function splitPlaceholders(text: string): Array<{ text: string; placeholder: boolean }> {
  const out: Array<{ text: string; placeholder: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(PLACEHOLDER_RE.source, "g"))) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), placeholder: false });
    out.push({ text: m[0], placeholder: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), placeholder: false });
  return out;
}
