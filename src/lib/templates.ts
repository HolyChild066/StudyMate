import type {
  ChatMessage,
  ConversationStage,
  MessageCategory,
  MessageTemplate,
  PlaceholderType,
  StudySession,
} from './types';

export const CATEGORY_META: Record<
  MessageCategory,
  { label: string; emoji: string }
> = {
  introduction: { label: 'Introduction', emoji: '👋' },
  help_request: { label: 'Help request', emoji: '❓' },
  offering_help: { label: 'Offering help', emoji: '🙋' },
  study_together: { label: 'Study together', emoji: '📚' },
  availability: { label: 'Availability', emoji: '🕐' },
  study_mode: { label: 'Study mode', emoji: '💻' },
  study_session: { label: 'Study session', emoji: '📅' },
  confirmation: { label: 'Confirmation', emoji: '✅' },
  rescheduling: { label: 'Rescheduling', emoji: '🔄' },
};

export const CATEGORY_ORDER: MessageCategory[] = [
  'introduction',
  'help_request',
  'offering_help',
  'study_together',
  'availability',
  'study_mode',
  'study_session',
  'confirmation',
  'rescheduling',
];

export const TEMPLATES: MessageTemplate[] = [
  // Introduction
  { key: 'hi', category: 'introduction', emoji: '👋', text: 'Hi! Nice to meet you.', placeholders: [] },
  { key: 'like_study', category: 'introduction', emoji: '📚', text: "I'd like to study together.", placeholders: [] },
  { key: 'glad_matched', category: 'introduction', emoji: '🤝', text: 'Glad we matched!', placeholders: [] },
  { key: 'ask_subject', category: 'introduction', emoji: '❓', text: 'What subject would you like to study?', placeholders: [] },
  { key: 'study_subject', category: 'introduction', emoji: '📚', text: "Let's focus on {subject}.", placeholders: ['subject'] },

  // Help request
  { key: 'can_help_me', category: 'help_request', emoji: '❓', text: 'Can you help me with this subject?', placeholders: [] },
  { key: 'help_subject', category: 'help_request', emoji: '❓', text: 'Can you help me with {subject}?', placeholders: ['subject'] },
  { key: 'need_help_topic', category: 'help_request', emoji: '📚', text: "I'd like some help with this topic.", placeholders: [] },
  { key: 'difficulty', category: 'help_request', emoji: '📝', text: "I'm having difficulty understanding this subject.", placeholders: [] },
  { key: 'explain_topic', category: 'help_request', emoji: '💡', text: 'Could you explain this topic to me?', placeholders: [] },

  // Offering help
  { key: 'can_help', category: 'offering_help', emoji: '🙋', text: 'I can help you with this subject.', placeholders: [] },
  { key: 'can_help_subject', category: 'offering_help', emoji: '🙋', text: 'I can help you with {subject}.', placeholders: ['subject'] },
  { key: 'happy_study', category: 'offering_help', emoji: '📚', text: "I'd be happy to study this with you.", placeholders: [] },
  { key: 'can_explain', category: 'offering_help', emoji: '💡', text: 'I can explain what I know about this topic.', placeholders: [] },

  // Study together
  { key: 'would_study', category: 'study_together', emoji: '📚', text: 'Would you like to study together?', placeholders: [] },
  { key: 'lets_study', category: 'study_together', emoji: '🤝', text: "Let's study together.", placeholders: [] },
  { key: 'review_together', category: 'study_together', emoji: '📝', text: "Let's review this subject together.", placeholders: [] },

  // Availability
  { key: 'when_available', category: 'availability', emoji: '🕐', text: 'When are you available?', placeholders: [] },
  { key: 'morning', category: 'availability', emoji: '🌅', text: 'Are you available in the morning?', placeholders: [] },
  { key: 'afternoon', category: 'availability', emoji: '☀️', text: 'Are you available in the afternoon?', placeholders: [] },
  { key: 'evening', category: 'availability', emoji: '🌙', text: 'Are you available in the evening?', placeholders: [] },
  { key: 'my_slot', category: 'availability', emoji: '🕐', text: "I'm free {slot}.", placeholders: ['slot'] },

  // Study mode
  { key: 'prefer_online', category: 'study_mode', emoji: '💻', text: "I'd prefer to study online.", placeholders: [] },
  { key: 'prefer_in_person', category: 'study_mode', emoji: '🏫', text: "I'd prefer to study in person.", placeholders: [] },
  { key: 'either_mode', category: 'study_mode', emoji: '🔄', text: 'Either option works for me.', placeholders: [] },

  // Study session
  { key: 'schedule_session', category: 'study_session', emoji: '📅', text: "Let's schedule a study session.", placeholders: [] },
  { key: 'does_time_work', category: 'study_session', emoji: '⏰', text: 'Does this time work for you?', placeholders: ['session'] },
  { key: 'what_study', category: 'study_session', emoji: '📚', text: 'What should we study?', placeholders: [] },
  { key: 'running_late', category: 'study_session', emoji: '⏰', text: 'Running a few minutes late.', placeholders: [] },
  { key: 'on_my_way', category: 'study_session', emoji: '🏃', text: 'On my way!', placeholders: [] },
  { key: 'thanks_session', category: 'study_session', emoji: '🙏', text: 'Thanks for the session — that really helped!', placeholders: [] },

  // Confirmation
  { key: 'sounds_good', category: 'confirmation', emoji: '✅', text: 'Sounds good!', placeholders: [] },
  { key: 'works_for_me', category: 'confirmation', emoji: '👍', text: 'That works for me.', placeholders: [] },
  { key: 'see_you', category: 'confirmation', emoji: '🎉', text: 'See you then!', placeholders: [] },
  { key: 'ready', category: 'confirmation', emoji: '📚', text: "I'll be ready for our study session.", placeholders: [] },

  // Rescheduling
  { key: 'cant_make', category: 'rescheduling', emoji: '❌', text: "I can't make it at that time.", placeholders: [] },
  { key: 'another_time', category: 'rescheduling', emoji: '🕐', text: 'Can we choose another time?', placeholders: [] },
  { key: 'reschedule', category: 'rescheduling', emoji: '📅', text: 'Can we reschedule?', placeholders: [] },
];

export function templateByKey(key: string): MessageTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

export function templatesByCategory(category: MessageCategory): MessageTemplate[] {
  return TEMPLATES.filter((t) => t.category === category);
}

/**
 * Conversation stage is derived, never stored, so it can't drift out of sync.
 */
export function deriveStage(
  messages: ChatMessage[],
  sessions: StudySession[],
): ConversationStage {
  if (sessions.some((s) => s.status !== 'cancelled')) return 'scheduled';
  const hasSubject = messages.some(
    (m) => Boolean(m.payload.subjectId) || m.templateKey === 'study_subject' || m.templateKey === 'help_subject' || m.templateKey === 'can_help_subject',
  );
  return hasSubject ? 'subject' : 'new';
}

const STAGE_CATEGORIES: Record<ConversationStage, MessageCategory[]> = {
  new: ['introduction', 'study_together'],
  subject: [
    'availability',
    'study_mode',
    'study_session',
    'help_request',
    'offering_help',
  ],
  scheduled: ['confirmation', 'rescheduling', 'study_session'],
};

export function suggestedCategories(stage: ConversationStage): MessageCategory[] {
  return STAGE_CATEGORIES[stage];
}

export function primarySuggestions(
  stage: ConversationStage,
  limit = 6,
): MessageTemplate[] {
  const cats = suggestedCategories(stage);
  const out: MessageTemplate[] = [];
  for (const key of PREFS[stage]) {
    const t = templateByKey(key);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  for (const cat of cats) {
    for (const t of templatesByCategory(cat)) {
      if (!out.includes(t)) out.push(t);
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return out;
}

const PREFS: Record<ConversationStage, string[]> = {
  new: ['hi', 'like_study', 'ask_subject', 'glad_matched'],
  subject: ['when_available', 'prefer_online', 'prefer_in_person', 'schedule_session', 'my_slot'],
  scheduled: ['sounds_good', 'works_for_me', 'see_you', 'reschedule'],
};

export interface SuggestRepliesInput {
  messages: ChatMessage[];
  sessions: StudySession[];
  currentUserId?: string;
  stage: ConversationStage;
  hasAvailability?: boolean;
  hasSubject?: boolean;
  limit?: number;
}

function byKeys(keys: string[]): MessageTemplate[] {
  const out: MessageTemplate[] = [];
  for (const key of keys) {
    const t = templateByKey(key);
    if (t && !out.some((x) => x.key === t.key)) out.push(t);
  }
  return out;
}

function latestRelevantSession(sessions: StudySession[]): StudySession | undefined {
  if (sessions.length === 0) return undefined;
  const active = sessions.filter((s) => s.status === 'proposed' || s.status === 'confirmed');
  const pool = active.length > 0 ? active : sessions;
  return [...pool].sort((a, b) => (b.id > a.id ? 1 : -1))[0] ?? pool[pool.length - 1];
}

function fallbackReplies(input: SuggestRepliesInput): MessageTemplate[] {
  const { stage, hasAvailability, hasSubject } = input;
  if (stage === 'scheduled') {
    return byKeys(['sounds_good', 'works_for_me', 'see_you', 'ready', 'reschedule', 'on_my_way', 'running_late']);
  }
  if (stage === 'subject') {
    return byKeys([
      hasAvailability ? 'my_slot' : 'when_available',
      'schedule_session',
      hasSubject ? 'study_subject' : 'what_study',
      'prefer_online',
      'prefer_in_person',
      'sounds_good',
      'another_time',
    ]);
  }
  return byKeys(['hi', 'like_study', 'ask_subject', hasAvailability ? 'my_slot' : 'when_available', 'sounds_good', 'glad_matched']);
}

/**
 * Rule-based, context-aware suggested replies (3-5).
 * Considers last incoming message intent, subject/availability context, and session status.
 * All replies are predefined templates; no AI required.
 */
export function suggestReplies(input: SuggestRepliesInput): MessageTemplate[] {
  const limit = Math.max(3, Math.min(5, input.limit ?? 4));
  const { messages, sessions, currentUserId, stage, hasAvailability = false, hasSubject = false } = input;
  const sorted = [...messages].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];
  const lastIncoming = [...sorted].reverse().find((m) => !currentUserId || m.senderId !== currentUserId) ?? last;
  const recentOwnKeys = new Set(
    sorted.filter((m) => currentUserId && m.senderId === currentUserId).slice(-2).map((m) => m.templateKey),
  );
  const session = latestRelevantSession(sessions);
  const proposedByOther = session?.status === 'proposed' && currentUserId && session.createdBy !== currentUserId;
  const proposedByMe = session?.status === 'proposed' && currentUserId && session.createdBy === currentUserId;
  const confirmed = session?.status === 'confirmed';

  let keys: string[] = [];

  const incomingKey = lastIncoming?.templateKey;
  const incomingCat = incomingKey ? templateByKey(incomingKey)?.category : undefined;

  // Intent from last incoming message takes priority (keeps replies responsive to what was just said)
  if (lastIncoming && incomingKey) {
    // Rescheduling / can't make
    if (incomingKey === 'cant_make' || incomingKey === 'another_time' || incomingKey === 'reschedule' || incomingCat === 'rescheduling') {
      keys.push(
        hasAvailability ? 'my_slot' : 'when_available',
        'another_time',
        'reschedule',
        'when_available',
        'schedule_session',
      );
    }
    // Study-together / invite intents
    else if (incomingKey === 'would_study' || incomingKey === 'lets_study' || incomingKey === 'like_study' || incomingKey === 'happy_study' || incomingKey === 'review_together' || incomingCat === 'study_together') {
      keys.push(
        'happy_study',
        'works_for_me',
        hasSubject ? 'study_subject' : 'what_study',
        hasAvailability ? 'my_slot' : 'when_available',
        'another_time',
      );
    }
    // Subject question / focus intents
    else if (incomingKey === 'ask_subject' || incomingKey === 'what_study' || incomingKey === 'study_subject') {
      keys.push(
        hasSubject ? 'study_subject' : 'what_study',
        'can_help_subject',
        'help_subject',
        hasAvailability ? 'my_slot' : 'when_available',
        'schedule_session',
      );
    }
    // Introduction / greeting
    else if (incomingCat === 'introduction' && (incomingKey === 'hi' || incomingKey === 'glad_matched' || incomingKey === 'like_study')) {
      keys.push('hi', 'like_study', hasSubject ? 'study_subject' : 'ask_subject', hasAvailability ? 'my_slot' : 'when_available', 'glad_matched');
    }
    // Help request intents
    else if (incomingCat === 'help_request' || incomingKey === 'can_help_me' || incomingKey === 'help_subject' || incomingKey === 'need_help_topic' || incomingKey === 'difficulty' || incomingKey === 'explain_topic') {
      keys.push('can_help_subject', 'can_help', 'can_explain', 'happy_study', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session');
    }
    // Offering help intents
    else if (incomingCat === 'offering_help' || incomingKey === 'can_help' || incomingKey === 'can_help_subject' || incomingKey === 'can_explain') {
      keys.push('works_for_me', 'sounds_good', 'help_subject', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session');
    }
    // Availability intents
    else if (incomingCat === 'availability' || incomingKey === 'when_available' || incomingKey === 'morning' || incomingKey === 'afternoon' || incomingKey === 'evening' || incomingKey === 'my_slot') {
      keys.push(
        hasAvailability ? 'my_slot' : 'works_for_me',
        'works_for_me',
        'cant_make',
        'another_time',
        'schedule_session',
      );
    }
    // Study mode intents
    else if (incomingCat === 'study_mode' || incomingKey === 'prefer_online' || incomingKey === 'prefer_in_person' || incomingKey === 'either_mode') {
      if (incomingKey === 'prefer_online') {
        keys.push('prefer_online', 'either_mode', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session', 'works_for_me');
      } else if (incomingKey === 'prefer_in_person') {
        keys.push('prefer_in_person', 'either_mode', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session', 'works_for_me');
      } else {
        keys.push('either_mode', 'prefer_online', 'prefer_in_person', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session');
      }
    }
    // Study session intents
    else if (incomingCat === 'study_session' || incomingKey === 'does_time_work' || incomingKey === 'schedule_session' || incomingKey === 'what_study' || incomingKey === 'running_late' || incomingKey === 'on_my_way' || incomingKey === 'thanks_session') {
      if (incomingKey === 'does_time_work') {
        // If someone is asking if a proposed time works, answer clearly
        if (proposedByOther) {
          keys.push('works_for_me', 'sounds_good', 'cant_make', 'another_time', 'reschedule');
        } else {
          keys.push('works_for_me', 'sounds_good', 'cant_make', 'another_time', hasAvailability ? 'my_slot' : 'when_available');
        }
      } else if (incomingKey === 'what_study') {
        keys.push(hasSubject ? 'study_subject' : 'what_study', 'help_subject', 'can_help_subject', 'lets_study', 'when_available');
      } else if (incomingKey === 'running_late' || incomingKey === 'on_my_way') {
        keys.push('sounds_good', 'works_for_me', 'see_you', 'ready', 'another_time');
      } else if (incomingKey === 'thanks_session') {
        keys.push('thanks_session', 'glad_matched', 'sounds_good', 'schedule_session', 'like_study');
      } else {
        keys.push('schedule_session', 'works_for_me', hasAvailability ? 'my_slot' : 'when_available', hasSubject ? 'study_subject' : 'what_study', 'another_time');
      }
    }
    // Confirmation intents
    else if (incomingCat === 'confirmation' || incomingKey === 'sounds_good' || incomingKey === 'works_for_me' || incomingKey === 'see_you' || incomingKey === 'ready') {
      if (confirmed) {
        keys.push('see_you', 'ready', 'on_my_way', 'running_late', 'reschedule');
      } else if (proposedByMe) {
        keys.push('see_you', 'works_for_me', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session', 'another_time');
      } else {
        keys.push('sounds_good', 'see_you', 'ready', hasAvailability ? 'my_slot' : 'when_available', 'schedule_session');
      }
    }
  }

  // Session-status driven suggestions when there is no strong incoming intent handled above
  if (keys.length === 0) {
    if (proposedByOther) {
      keys.push('works_for_me', 'sounds_good', 'cant_make', 'another_time', 'reschedule');
    } else if (proposedByMe) {
      keys.push('see_you', 'works_for_me', hasAvailability ? 'my_slot' : 'when_available', 'another_time', 'reschedule');
    } else if (confirmed) {
      keys.push('see_you', 'ready', 'on_my_way', 'running_late', 'reschedule');
    }
  } else if (proposedByOther && incomingKey === 'does_time_work') {
    // keep acceptance/reschedule options already chosen
  } else if (confirmed && !['cant_make', 'another_time', 'reschedule', 'running_late', 'on_my_way'].includes(incomingKey || '')) {
    // add light confirmed-session follow-ups after intent replies if room
    keys.push('see_you', 'ready');
  }

  // Fallbacks and stage-based fill
  keys.push(...fallbackReplies(input).map((t) => t.key));
  keys.push(...primarySuggestions(stage, 8).map((t) => t.key));

  // Filter unusable suggestions and dedupe
  const out: MessageTemplate[] = [];
  for (const key of keys) {
    const t = templateByKey(key);
    if (!t) continue;
    if (out.some((x) => x.key === t.key)) continue;
    if (t.placeholders.includes('slot') && !hasAvailability) continue;
    if (t.placeholders.includes('session')) {
      // session picker in UI routes to scheduling; allow it
    }
    if (recentOwnKeys.has(t.key) && out.length >= 2) continue;
    out.push(t);
    if (out.length >= limit) break;
  }

  // Ensure minimum results with safe fallbacks
  if (out.length < 3) {
    for (const t of fallbackReplies(input)) {
      if (out.some((x) => x.key === t.key)) continue;
      if (t.placeholders.includes('slot') && !hasAvailability) continue;
      out.push(t);
      if (out.length >= 3) break;
    }
  }

  return out.slice(0, limit);
}

export function renderTemplate(
  text: string,
  ctx: { subjectName?: string; slotLabel?: string } = {},
): string {
  return text
    .replace('{subject}', ctx.subjectName ?? 'this subject')
    .replace('{slot}', ctx.slotLabel ?? 'that time');
}

export function placeholderCount(placeholders: PlaceholderType[]): number {
  return placeholders.length;
}
