import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isBlocked, scoreCandidate , buildDeck as buildDeckLocal } from './matching';
import type { CandidateScore } from './matching';
import { UNIVERSITY } from './subjects';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  Availability,
  Block,
  ChatMessage,
  Decision,
  DecisionAction,
  FeedbackConcern,
  FeedbackTag,
  LearningProgress,
  Match,
  MessagePayload,
  PeerFeedback,
  Profile,
  Report,
  ReportReason,
  Rating,
  SessionMode,
  SessionStatus,
  Student,
  StudySession,
  SubjectEntry,
  TopicStatus,
  VerificationStatus,
} from './types';

const STORAGE_KEY = 'studymate.state.v1';

const AVATAR_COLORS = ['#3B4FE0', '#FF5A4F', '#12B76A', '#8B5CF6', '#0EA5E9', '#F59E0B'];

function randomAvatar(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? '#3B4FE0';
}

interface AppState {
  hydrated: boolean;
  signedIn: boolean;
  currentUserId: string | null;
  students: Record<string, Student>;
  decisions: Decision[];
  matches: Match[];
  messages: ChatMessage[];
  sessions: StudySession[];
  blocks: Block[];
  reports: Report[];
  peerFeedback: PeerFeedback[];
  learningProgress: Record<string, LearningProgress>;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

const seedStudents: Record<string, Student> = {};

function initialState(): AppState {
  return {
    hydrated: false,
    signedIn: false,
    currentUserId: null,
    students: seedStudents,
    decisions: [],
    matches: [],
    messages: [],
    sessions: [],
    blocks: [],
    reports: [],
    peerFeedback: [],
    learningProgress: {},
  };
}

interface SignUpInput {
  name: string;
  email: string;
  course: string;
  year: number;
}

interface CreateSessionInput {
  matchId: string;
  subjectId: string;
  date: string;
  start: string;
  end: string;
  mode: SessionMode;
  safetyAcknowledged: boolean;
}

interface ReportInput {
  reportedId: string;
  reason: ReportReason;
  messageId?: string;
  messageText?: string;
  messageCategory?: Report['messageCategory'];
  note?: string;
}

export interface PeerFeedbackInput {
  sessionId: string;
  matchId: string;
  reviewedId: string;
  rating: Rating;
  tags: FeedbackTag[];
  note?: string;
  concern?: FeedbackConcern;
  concernNote?: string;
}

export interface LearningProgressInput {
  subjectId: string;
  topics: { name: string; status: TopicStatus }[];
  confidenceBefore?: number;
  confidenceAfter?: number;
}

interface AppContextValue {
  state: AppState;
  currentStudent: Student | null;
  deck: CandidateScore[];
  myMatches: Match[];
  signIn: (email: string, password?: string) => void;
  signUp: (input: SignUpInput, password?: string) => void;
  signOut: () => void;
  switchUser: (id: string) => void;
  completeVerification: () => void;
  setVerification: (status: VerificationStatus) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  saveSubjects: (entries: SubjectEntry[]) => void;
  saveAvailability: (blocks: Availability[]) => void;
  decide: (targetId: string, action: DecisionAction) => Promise<string | null>;
  submitPeerFeedback: (input: PeerFeedbackInput) => void;
  submitLearningProgress: (input: LearningProgressInput) => void;
  scoreFor: (targetId: string) => CandidateScore | null;
  sendMessage: (matchId: string, templateKey: string, payload?: MessagePayload) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<string | null>;
  setSessionStatus: (sessionId: string, status: SessionStatus) => Promise<void>;
  blockUser: (targetId: string) => void;
  reportUser: (input: ReportInput) => void;
  studentById: (id: string) => Student | undefined;
  matchFor: (matchId: string) => Match | undefined;
  partnerOf: (match: Match) => Student | undefined;
  isBlockedWith: (otherId: string) => boolean;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isSupabaseConfigured) {
          // Clear old demo state that may have cached signedIn/currentUserId
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && alive) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          if (isSupabaseConfigured) {
            setState({ ...initialState(), ...parsed, signedIn: false, currentUserId: null, hydrated: true });
          } else {
            setState({ ...initialState(), ...parsed, hydrated: true });
          }
          return;
        }
      } catch {
        // fall through to a clean demo state
      }
      if (alive) setState((s) => ({ ...s, hydrated: true }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let mounted = true;

    const syncAuth = async () => {
      const sb = supabase!;
      const { data } = await sb.auth.getSession();
      if (!mounted) return;
      if (data.session?.user) {
        setState((s) => ({
          ...s,
          signedIn: true,
          currentUserId: data.session!.user.id,
        }));
      }
    };

    void syncAuth();

    const sb = supabase!;
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setState((s) => ({
          ...s,
          signedIn: true,
          currentUserId: session.user.id,
        }));
      } else {
        setState((s) => ({
          ...s,
          signedIn: false,
          currentUserId: null,
        }));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load data from Supabase when authenticated
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!state.signedIn || !state.currentUserId) return;

    let mounted = true;

    (async () => {
      try {
        const sb = supabase!;
        const uid = state.currentUserId!;

        const [profileRes, subjectsRes, availabilityRes, blocksRes, decisionsRes, matchesRes, reportsRes] = await Promise.all([
          sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
          sb.from('profile_subjects').select('*').eq('profile_id', uid),
          sb.from('availability').select('*').eq('profile_id', uid),
          sb.from('blocks').select('*').or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
          // Includes incoming 'study' decisions when RLS allows (see migration/policy fix).
          sb.from('decisions').select('*').or(`viewer_id.eq.${uid},and(target_id.eq.${uid},action.eq.study)`),
          sb.from('matches').select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`),
          sb.from('reports').select('*').eq('reporter_id', uid),
        ]);

        if (!mounted) return;

        const { data: sessionData } = await sb.auth.getSession();
        const session = sessionData.session;

        setState((s) => {
          const next = { ...s };
          const students = { ...s.students };

          // Profile — create from auth session if it doesn't exist yet
          let profile: any = profileRes.data;
          if (!profile && session?.user) {
            const u = session.user;
            profile = {
              id: u.id,
              name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Student',
              email: u.email || '',
              course: (u.user_metadata?.course as string) || 'BS Information Technology',
              year: (u.user_metadata?.year as number) || 1,
              bio: '',
              studyPref: 'either',
              avatarColor: randomAvatar(),
              university: 'Northbridge University',
              verification: 'none',
            };
            // Insert the profile so it persists
            void sb.from('profiles').insert({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              course: profile.course,
              year: profile.year,
              study_pref: profile.studyPref,
              avatar_color: profile.avatarColor,
            });
          }

          if (profile) {
            students[uid] = {
              profile: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                course: profile.course,
                year: profile.year,
                bio: profile.bio || '',
                studyPref: profile.study_pref || profile.studyPref,
                avatarColor: profile.avatar_color || profile.avatarColor,
                university: profile.university || 'Northbridge University',
                verification: profile.verification,
              },
              subjects: (subjectsRes.data || []).map((ps: any) => ({
                subjectId: ps.subject_id,
                kind: ps.kind,
              })),
              availability: (availabilityRes.data || []).map((a: any) => ({
                day: a.day,
                start: a.start_time?.slice(0, 5),
                end: a.end_time?.slice(0, 5),
              })),
            };
          }

          next.students = students;
          next.blocks = (blocksRes.data || []).map((b: any) => ({
            blockerId: b.blocker_id,
            blockedId: b.blocked_id,
            at: new Date(b.created_at).getTime(),
          }));
          next.decisions = (decisionsRes.data || []).map((d: any) => ({
            viewerId: d.viewer_id,
            targetId: d.target_id,
            action: d.action,
            at: new Date(d.created_at).getTime(),
          }));
          next.matches = (matchesRes.data || []).map((m: any) => ({
            id: m.id,
            a: m.user_a,
            b: m.user_b,
            at: new Date(m.created_at).getTime(),
          }));
          next.reports = (reportsRes.data || []).map((r: any) => ({
            id: r.id,
            reporterId: r.reporter_id,
            reportedId: r.reported_id,
            messageId: r.message_id || undefined,
            messageText: r.message_text || undefined,
            messageCategory: r.message_category || undefined,
            reason: r.reason,
            note: r.note || undefined,
            status: r.status,
            at: new Date(r.created_at).getTime(),
          }));

          return next;
        });

        // Load messages and sessions for matches
        const matchIds = (matchesRes.data || []).map((m: any) => m.id);
        if (matchIds.length > 0) {
          const [messagesRes, sessionsRes] = await Promise.all([
            sb.from('messages').select('*').in('match_id', matchIds).order('created_at', { ascending: true }),
            sb.from('study_sessions').select('*').in('match_id', matchIds).order('created_at', { ascending: true }),
          ]);

          if (!mounted) return;

          setState((s) => ({
            ...s,
            messages: (messagesRes.data || []).map((msg: any) => ({
              id: msg.id,
              matchId: msg.match_id,
              senderId: msg.sender_id,
              templateKey: msg.template_key,
              payload: msg.payload || {},
              at: new Date(msg.created_at).getTime(),
            })),
            sessions: (sessionsRes.data || []).map((ses: any) => ({
              id: ses.id,
              matchId: ses.match_id,
              subjectId: ses.subject_id,
              createdBy: ses.created_by,
              date: ses.session_date,
              start: ses.start_time?.slice(0, 5),
              end: ses.end_time?.slice(0, 5),
              mode: ses.mode,
              location: ses.location,
              status: ses.status,
              safetyAcknowledged: ses.safety_acknowledged,
            })),
          }));
        }

        // Load all approved public profiles for the deck
        const { data: publicProfiles } = await sb.from('public_profiles').select('*');
        if (publicProfiles && publicProfiles.length > 0 && mounted) {
          // Load subjects and availability for each public profile
          const otherIds = publicProfiles.map((p: any) => p.id).filter((id: string) => id !== uid);
          const [otherSubjects, otherAvailability] = await Promise.all([
            sb.from('profile_subjects').select('*').in('profile_id', otherIds),
            sb.from('availability').select('*').in('profile_id', otherIds),
          ]);

          setState((s) => {
            const students = { ...s.students };
            for (const p of publicProfiles) {
              if (p.id === uid) continue;
              const subs = (otherSubjects.data || []).filter((ps: any) => ps.profile_id === p.id).map((ps: any) => ({
                subjectId: ps.subject_id,
                kind: ps.kind,
              }));
              const avail = (otherAvailability.data || []).filter((a: any) => a.profile_id === p.id).map((a: any) => ({
                day: a.day,
                start: a.start_time?.slice(0, 5),
                end: a.end_time?.slice(0, 5),
              }));
              students[p.id] = {
                profile: {
                  id: p.id,
                  name: p.name,
                  email: '',
                  course: p.course,
                  year: p.year,
                  bio: p.bio || '',
                  studyPref: p.study_pref,
                  avatarColor: p.avatar_color || '#3B4FE0',
                  university: p.university || 'Northbridge University',
                  verification: 'approved',
                },
                subjects: subs,
                availability: avail,
              };
            }
            return { ...s, students };
          });
        }
      } catch (e) {
        console.warn('Supabase load failed', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [state.signedIn, state.currentUserId]);

  // Realtime subscriptions: messages, sessions, matches push live between accounts
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!state.signedIn || !state.currentUserId) return;

    const sb = supabase!;
    const uid = state.currentUserId;
    let mounted = true;
    const channels: ReturnType<typeof sb.channel>[] = [];

    // Messages: new messages in any of the user's matches (RLS already restricts to participants)
    const messagesChannel = sb.channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        if (!mounted) return;
        const msg = payload.new as any;
        setState((s) => {
          if (s.messages.some((m) => m.id === msg.id)) return s;
          const at = msg.created_at ? new Date(msg.created_at).getTime() : Date.now();
          const payloadStr = JSON.stringify(msg.payload || {});
          const isDup = s.messages.some((m) =>
            m.matchId === msg.match_id &&
            m.senderId === msg.sender_id &&
            m.templateKey === msg.template_key &&
            JSON.stringify(m.payload || {}) === payloadStr &&
            Math.abs(m.at - at) < 10000
          );
          if (isDup) return s;
          return {
            ...s,
            messages: [...s.messages, {
              id: msg.id,
              matchId: msg.match_id,
              senderId: msg.sender_id,
              templateKey: msg.template_key,
              payload: msg.payload || {},
              at,
            }].sort((a, b) => a.at - b.at),
          };
        });
      })
      .subscribe();
    channels.push(messagesChannel);

    // Study sessions: new sessions + status updates (accept/decline/complete)
    const sessionsChannel = sb.channel('sessions-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'study_sessions',
      }, (payload: any) => {
        if (!mounted) return;
        const ses = payload.new as any;
        setState((s) => {
          if (s.sessions.some((s2) => s2.id === ses.id)) return s;
          return {
            ...s,
            sessions: [...s.sessions, {
              id: ses.id,
              matchId: ses.match_id,
              subjectId: ses.subject_id,
              createdBy: ses.created_by,
              date: ses.session_date,
              start: ses.start_time?.slice(0, 5),
              end: ses.end_time?.slice(0, 5),
              mode: ses.mode,
              location: ses.location,
              status: ses.status,
              safetyAcknowledged: ses.safety_acknowledged,
            }],
          };
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'study_sessions',
      }, (payload: any) => {
        if (!mounted) return;
        const ses = payload.new as any;
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((s2) =>
            s2.id === ses.id ? { ...s2, status: ses.status } : s2
          ),
        }));
      })
      .subscribe();
    channels.push(sessionsChannel);

    // Matches: new mutual matches created (trigger fires on both sides)
    const matchesChannel = sb.channel('matches-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      }, (payload: any) => {
        if (!mounted) return;
        const m = payload.new as any;
        if (m.user_a !== uid && m.user_b !== uid) return;
        let isNew = false;
        setState((s) => {
          if (s.matches.some((mm) => mm.id === m.id)) return s;
          isNew = true;
          return {
            ...s,
            matches: [...s.matches, {
              id: m.id,
              a: m.user_a,
              b: m.user_b,
              at: new Date(m.created_at).getTime(),
            }],
          };
        });
        if (isNew) {
          Alert.alert('New study match! 🎉', 'You and your buddy both chose Study. Open Chats to start a guided conversation.');
        }
      })
      .subscribe();
    channels.push(matchesChannel);

    return () => {
      mounted = false;
      channels.forEach((ch) => sb.removeChannel(ch));
    };
  }, [state.signedIn, state.currentUserId]);

  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _hydrated, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state]);

  const currentStudent = state.currentUserId
    ? (state.students[state.currentUserId] ?? null)
    : null;

  const signIn = useCallback((email: string, password?: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      return (async () => {
        try {
          const sb = supabase!;
          const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: password ?? '' });
          if (error) {
            throw new Error(error.message);
          }
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e));
        }
      })();
    }

    return Promise.reject(
      new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.'),
    );
  }, []);

  const signUp = useCallback((input: SignUpInput, password?: string) => {
    if (isSupabaseConfigured && supabase) {
      void (async () => {
        try {
          const sb = supabase!;
          const { error } = await sb.auth.signUp({
            email: input.email.trim(),
            password: password ?? '',
            options: {
              data: {
                name: input.name.trim() || 'New Student',
                course: input.course,
                year: input.year,
              },
            },
          });
          if (error) {
            console.warn('Supabase sign-up failed:', error.message);
          }
        } catch (e) {
          console.warn('Supabase sign-up failed:', e);
          setState((s) => {
            const id = uid('u');
            const profile: Profile = {
              id,
              name: input.name.trim() || 'New Student',
              email: input.email.trim().toLowerCase(),
              course: input.course,
              year: input.year,
              bio: '',
              studyPref: 'either',
              avatarColor:
                AVATAR_COLORS[Object.keys(s.students).length % AVATAR_COLORS.length] ??
                '#3B4FE0',
              university: UNIVERSITY,
              verification: 'none',
            };
            const student: Student = { profile, subjects: [], availability: [] };
            return {
              ...s,
              students: { ...s.students, [id]: student },
              signedIn: true,
              currentUserId: id,
            };
          });
        }
      })();
      return;
    }

    setState((s) => {
      const id = uid('u');
      const profile: Profile = {
        id,
        name: input.name.trim() || 'New Student',
        email: input.email.trim().toLowerCase(),
        course: input.course,
        year: input.year,
        bio: '',
        studyPref: 'either',
        avatarColor:
          AVATAR_COLORS[Object.keys(s.students).length % AVATAR_COLORS.length] ??
          '#3B4FE0',
        university: UNIVERSITY,
        verification: 'none',
      };
      const student: Student = { profile, subjects: [], availability: [] };
      return {
        ...s,
        students: { ...s.students, [id]: student },
        signedIn: true,
        currentUserId: id,
      };
    });
  }, []);

  const signOut = useCallback(() => {
    if (isSupabaseConfigured && supabase) {
      void supabase.auth.signOut();
    }
    setState((s) => ({ ...s, signedIn: false, currentUserId: null }));
  }, []);

  const switchUser = useCallback((id: string) => {
    setState((s) => (s.students[id] ? { ...s, currentUserId: id, signedIn: true } : s));
  }, []);

  const patchCurrent = useCallback(
    (fn: (student: Student) => Student) => {
      setState((s) => {
        if (!s.currentUserId) return s;
        const current = s.students[s.currentUserId];
        if (!current) return s;
        return {
          ...s,
          students: { ...s.students, [s.currentUserId]: fn(current) },
        };
      });
    },
    [],
  );

  const submitPeerFeedback = useCallback((input: PeerFeedbackInput) => {
    const id = uid('peer_feedback');
    const now = Date.now();
    const feedback: PeerFeedback = {
      id,
      sessionId: input.sessionId,
      matchId: input.matchId,
      reviewerId: state.currentUserId || '',
      reviewedId: input.reviewedId,
      rating: input.rating,
      tags: input.tags,
      note: input.note,
      concern: input.concern,
      concernNote: input.concernNote,
      at: now,
    };
    setState((s) => ({
      ...s,
      peerFeedback: [...s.peerFeedback, feedback],
    }));
    if (isSupabaseConfigured && supabase) {
      void supabase.from('peer_feedback').upsert({
        id,
        session_id: input.sessionId,
        match_id: input.matchId,
        reviewer_id: state.currentUserId,
        reviewed_id: input.reviewedId,
        rating: input.rating,
        tags: input.tags,
        note: input.note || null,
        concern: input.concern || null,
        concern_note: input.concernNote || null,
      }, { onConflict: 'session_id,reviewer_id' });
    }
  }, [state.currentUserId]);

  const submitLearningProgress = useCallback((input: LearningProgressInput) => {
    const profileId = state.currentUserId;
    if (!profileId) return;

    const now = Date.now();
    const existing = state.learningProgress[profileId];
    const topicList = input.topics.map((t) => ({ name: t.name, status: t.status as TopicStatus }));

    const payload: LearningProgress = {
      id: existing?.id || uid('learning_progress'),
      profileId,
      subjectId: input.subjectId,
      topics: topicList,
      confidenceBefore: input.confidenceBefore,
      confidenceAfter: input.confidenceAfter,
      sessionsCompleted: existing?.sessionsCompleted ?? 0,
      updatedAt: now,
    };

    setState((s) => ({
      ...s,
      learningProgress: {
        ...s.learningProgress,
        [profileId]: payload,
      },
    }));

    if (isSupabaseConfigured && supabase) {
      void supabase.from('learning_progress').upsert({
        id: payload.id,
        profile_id: profileId,
        subject_id: input.subjectId,
        topics: topicList,
        confidence_before: input.confidenceBefore,
        confidence_after: input.confidenceAfter,
        sessions_completed: payload.sessionsCompleted,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'profile_id,subject_id' });
    }
  }, [state.currentUserId]);

  const completeVerification = useCallback(() => {
    patchCurrent((st) => ({
      ...st,
      profile: { ...st.profile, verification: 'approved' },
    }));

    // Initialize learning progress for the verified user
    if (state.currentUserId) {
      const profile = state.students[state.currentUserId]?.profile;
      if (!profile) return;

      const subjects = profile.course.includes('IT')
        ? ['IT 101', 'IT 102', 'IT 103', 'IT 203', 'IT 204', 'IT 205']
        : profile.course.includes('CS')
          ? ['IT 101', 'IT 102', 'IT 103', 'IT 203', 'IT 204', 'IT 205', 'MATH 101']
          : ['IT 101', 'IT 102'];

      const newProgress: LearningProgress = {
        id: uid('learning_progress'),
        profileId: state.currentUserId,
        subjectId: 'it101',
        topics: subjects.map((subjectName) => ({ name: subjectName, status: 'learning' as const })),
        confidenceBefore: 3,
        confidenceAfter: undefined,
        sessionsCompleted: 0,
        updatedAt: Date.now(),
      };

      setState((s) => ({
        ...s,
        learningProgress: {
          ...s.learningProgress,
          [state.currentUserId as string]: newProgress,
        },
      }));
    }

    if (isSupabaseConfigured && supabase && state.currentUserId) {
      const sb = supabase;
      const profile = state.students[state.currentUserId]?.profile;
      if (profile) {
        const subjects = profile.course.includes('IT')
          ? ['IT 101', 'IT 102', 'IT 103', 'IT 203', 'IT 204', 'IT 205']
          : profile.course.includes('CS')
            ? ['IT 101', 'IT 102', 'IT 103', 'IT 203', 'IT 204', 'IT 205', 'MATH 101']
            : ['IT 101', 'IT 102'];

        const lpId = uid('learning_progress');
        const topics = subjects.map((subjectName) => ({ name: subjectName, status: 'learning' }));
        void sb.from('learning_progress').upsert({
          id: lpId,
          profile_id: state.currentUserId,
          subject_id: 'it101',
          topics,
          confidence_before: 3,
          confidence_after: null,
          sessions_completed: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id,subject_id' });
      }
    }
  }, [patchCurrent, state.currentUserId]);

  const setVerification = useCallback(
    (status: VerificationStatus) => {
      patchCurrent((st) => ({ ...st, profile: { ...st.profile, verification: status } }));
    },
    [patchCurrent],
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      patchCurrent((st) => ({ ...st, profile: { ...st.profile, ...patch } }));
      if (isSupabaseConfigured && supabase && state.currentUserId) {
        const sb = supabase;
        const updates: any = {};
        if (patch.name !== undefined) updates.name = patch.name;
        if (patch.course !== undefined) updates.course = patch.course;
        if (patch.year !== undefined) updates.year = patch.year;
        if (patch.bio !== undefined) updates.bio = patch.bio;
        if (patch.studyPref !== undefined) updates.study_pref = patch.studyPref;
        if (patch.avatarColor !== undefined) updates.avatar_color = patch.avatarColor;
        void sb.from('profiles').update(updates).eq('id', state.currentUserId);
      }
    },
    [patchCurrent, state.currentUserId],
  );

  const saveSubjects = useCallback(
    (entries: SubjectEntry[]) => {
      patchCurrent((st) => ({ ...st, subjects: entries }));
      if (isSupabaseConfigured && supabase && state.currentUserId) {
        const sb = supabase;
        const uid = state.currentUserId;
        void (async () => {
          await sb.from('profile_subjects').delete().eq('profile_id', uid);
          if (entries.length > 0) {
            await sb.from('profile_subjects').insert(
              entries.map((e) => ({
                profile_id: uid,
                subject_id: e.subjectId,
                kind: e.kind,
              })),
            );
          }
        })();
      }
    },
    [patchCurrent, state.currentUserId],
  );

  const saveAvailability = useCallback(
    (blocks: Availability[]) => {
      patchCurrent((st) => ({ ...st, availability: blocks }));
      if (isSupabaseConfigured && supabase && state.currentUserId) {
        const sb = supabase;
        const uid = state.currentUserId;
        void (async () => {
          await sb.from('availability').delete().eq('profile_id', uid);
          if (blocks.length > 0) {
            await sb.from('availability').insert(
              blocks.map((b) => ({
                profile_id: uid,
                day: b.day,
                start_time: b.start,
                end_time: b.end,
              })),
            );
          }
        })();
      }
    },
    [patchCurrent, state.currentUserId],
  );

  const decide = useCallback(
    async (targetId: string, action: DecisionAction): Promise<string | null> => {
      if (!state.currentUserId) return null;
      const me = state.currentUserId;
      let created: string | null = null;

      if (action === 'study') {
        const reciprocal = state.decisions.some(
          (d) => d.viewerId === targetId && d.targetId === me && d.action === 'study',
        );
        const exists = state.matches.some(
          (m) => pairKey(m.a, m.b) === pairKey(me, targetId),
        );
        // Local optimistic match (offline/demo). In Supabase, the DB trigger creates the real match.
        if (reciprocal && !exists && !isSupabaseConfigured) created = uid('match');
      }

      setState((s) => {
        const decisions: Decision[] = [
          ...s.decisions.filter(
            (d) => !(d.viewerId === me && d.targetId === targetId),
          ),
          { viewerId: me, targetId, action, at: Date.now() },
        ];
        let matches = s.matches;
        if (action === 'study' && created) {
          matches = [...s.matches, { id: created, a: me, b: targetId, at: Date.now() }];
        }
        return { ...s, decisions, matches };
      });

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('decisions')
          .upsert({ viewer_id: me, target_id: targetId, action }, { onConflict: 'viewer_id,target_id' });

        if (action === 'study') {
          const [userA, userB] = [me, targetId].sort();
          const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('user_a', userA)
            .eq('user_b', userB)
            .maybeSingle();
          if (match?.id) {
            const matchId = match.id as string;
            setState((s) => {
              if (s.matches.some((m) => m.id === matchId)) return s;
              return {
                ...s,
                matches: [...s.matches, {
                  id: matchId,
                  a: match.user_a,
                  b: match.user_b,
                  at: match.created_at ? new Date(match.created_at).getTime() : Date.now(),
                }],
              };
            });
            return matchId;
          }
        }
      }

      return created;
    },
    [state.currentUserId, state.decisions, state.matches],
  );

  const scoreFor = useCallback(
    (targetId: string): CandidateScore | null => {
      const me = currentStudent;
      const other = state.students[targetId];
      if (!me || !other) return null;
      return scoreCandidate(me, other);
    },
    [currentStudent, state.students],
  );

  const sendMessage = useCallback(
    async (matchId: string, templateKey: string, payload: MessagePayload = {}) => {
      if (!state.currentUserId) return;
      const localId = uid('msg');
      const now = Date.now();
      setState((s) => {
        if (!s.currentUserId) return s;
        const message: ChatMessage = {
          id: localId,
          matchId,
          senderId: s.currentUserId,
          templateKey,
          payload,
          at: now,
        };
        return { ...s, messages: [...s.messages, message] };
      });
      if (isSupabaseConfigured && supabase && state.currentUserId) {
        const { data, error } = await supabase.from('messages').insert({
          match_id: matchId,
          sender_id: state.currentUserId,
          template_key: templateKey,
          payload,
        }).select('*').single();
        if (error) {
          console.warn('sendMessage failed', error);
          Alert.alert('Message not sent', error.message || 'Could not send message. Check that message templates are seeded and you are a match participant.');
          setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== localId) }));
          return;
        }
        if (data?.id) {
          const real = data as any;
          setState((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === localId
                ? {
                    id: real.id,
                    matchId: real.match_id,
                    senderId: real.sender_id,
                    templateKey: real.template_key,
                    payload: real.payload || {},
                    at: real.created_at ? new Date(real.created_at).getTime() : now,
                  }
                : m,
            ),
          }));
        }
      }
    },
    [state.currentUserId],
  );

  const createSession = useCallback(async (input: CreateSessionInput): Promise<string | null> => {
    if (!state.currentUserId) return null;
    const localId = uid('session');
    const location = input.mode === 'online' ? 'Online' : 'University Library';
    setState((s) => {
      if (!s.currentUserId) return s;
      const session: StudySession = {
        id: localId,
        matchId: input.matchId,
        subjectId: input.subjectId,
        createdBy: s.currentUserId,
        date: input.date,
        start: input.start,
        end: input.end,
        mode: input.mode,
        location,
        status: 'proposed',
        safetyAcknowledged: input.safetyAcknowledged,
      };
      return { ...s, sessions: [...s.sessions, session] };
    });

    if (isSupabaseConfigured && supabase && state.currentUserId) {
      const { data, error } = await supabase.from('study_sessions').insert({
        match_id: input.matchId,
        subject_id: input.subjectId,
        created_by: state.currentUserId,
        session_date: input.date,
        start_time: input.start,
        end_time: input.end,
        mode: input.mode,
        location,
        status: 'proposed',
        safety_acknowledged: input.safetyAcknowledged,
      }).select('*').single();

      if (error) {
        console.warn('createSession failed', error);
        Alert.alert('Session not sent', error.message || 'Could not create session. Check that the match exists and required data is valid.');
        setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== localId) }));
        return null;
      }

      if (data?.id) {
        const ses = data as any;
        const realId = ses.id as string;
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((x) =>
            x.id === localId
              ? {
                  id: realId,
                  matchId: ses.match_id,
                  subjectId: ses.subject_id,
                  createdBy: ses.created_by,
                  date: ses.session_date,
                  start: typeof ses.start_time === 'string' ? ses.start_time.slice(0, 5) : x.start,
                  end: typeof ses.end_time === 'string' ? ses.end_time.slice(0, 5) : x.end,
                  mode: ses.mode,
                  location: ses.location,
                  status: ses.status,
                  safetyAcknowledged: ses.safety_acknowledged,
                }
              : x,
          ),
        }));
        return realId;
      }
    }

    return localId;
  }, [state.currentUserId]);

  const setSessionStatus = useCallback(async (sessionId: string, status: SessionStatus) => {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, status } : x)),
    }));
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('study_sessions').update({ status }).eq('id', sessionId);
      if (error) {
        console.warn('setSessionStatus failed', error);
        Alert.alert('Could not update session', error.message || 'The session status change was not saved.');
      }
    }
  }, []);

  const blockUser = useCallback((targetId: string) => {
    setState((s) => {
      if (!s.currentUserId) return s;
      const exists = s.blocks.some(
        (b) => b.blockerId === s.currentUserId && b.blockedId === targetId,
      );
      if (exists) return s;
      return {
        ...s,
        blocks: [
          ...s.blocks,
          { blockerId: s.currentUserId, blockedId: targetId, at: Date.now() },
        ],
      };
    });
    if (isSupabaseConfigured && supabase && state.currentUserId) {
      void supabase
        .from('blocks')
        .upsert({ blocker_id: state.currentUserId, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id' });
    }
  }, [state.currentUserId]);

  const reportUser = useCallback((input: ReportInput) => {
    const id = uid('report');
    setState((s) => {
      if (!s.currentUserId) return s;
      const report: Report = {
        id,
        reporterId: s.currentUserId,
        reportedId: input.reportedId,
        messageId: input.messageId,
        messageText: input.messageText,
        messageCategory: input.messageCategory,
        reason: input.reason,
        note: input.note,
        status: 'open',
        at: Date.now(),
      };
      return { ...s, reports: [...s.reports, report] };
    });
    if (isSupabaseConfigured && supabase && state.currentUserId) {
      void supabase.from('reports').insert({
        id,
        reporter_id: state.currentUserId,
        reported_id: input.reportedId,
        message_id: input.messageId || null,
        message_text: input.messageText || null,
        message_category: input.messageCategory || null,
        reason: input.reason,
        note: input.note || null,
        status: 'open',
      });
    }
  }, [state.currentUserId]);

  const resetDemo = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setState({ ...initialState(), hydrated: true });
  }, []);

  const studentById = useCallback(
    (id: string) => state.students[id],
    [state.students],
  );

  const matchFor = useCallback(
    (matchId: string) => state.matches.find((m) => m.id === matchId),
    [state.matches],
  );

  const partnerOf = useCallback(
    (match: Match) => {
      const otherId = match.a === state.currentUserId ? match.b : match.a;
      return state.students[otherId];
    },
    [state.currentUserId, state.students],
  );

  const isBlockedWith = useCallback(
    (otherId: string) =>
      Boolean(state.currentUserId) && isBlocked(state.blocks, state.currentUserId!, otherId),
    [state.blocks, state.currentUserId],
  );

  const deck = useMemo(() => {
    if (!currentStudent) return [];
    return buildDeckLocal(
      currentStudent,
      Object.values(state.students),
      state.decisions,
      state.blocks,
    );
  }, [currentStudent, state.students, state.decisions, state.blocks]);

  const myMatches = useMemo(() => {
    if (!state.currentUserId) return [];
    return state.matches
      .filter((m) => m.a === state.currentUserId || m.b === state.currentUserId)
      .filter((m) => {
        const other = m.a === state.currentUserId ? m.b : m.a;
        return !isBlocked(state.blocks, state.currentUserId!, other);
      })
      .sort((a, b) => b.at - a.at);
  }, [state.matches, state.blocks, state.currentUserId]);

  const value: AppContextValue = {
    state,
    currentStudent,
    deck,
    myMatches,
    signIn,
    signUp,
    signOut,
    switchUser,
    completeVerification,
    setVerification,
    updateProfile,
    saveSubjects,
    saveAvailability,
    decide,
    scoreFor,
    sendMessage,
    createSession,
    setSessionStatus,
    blockUser,
    reportUser,
    studentById,
    matchFor,
    partnerOf,
    isBlockedWith,
    resetDemo,
    submitPeerFeedback,
    submitLearningProgress,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
