import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppText, Button, Card, Chip, Input, Screen } from '@/components/ui';
import { useApp } from '@/lib/store';
import { COURSES, YEARS } from '@/lib/subjects';
import { colors, radius, space } from '@/theme/tokens';

export default function SignUp() {
  const { signUp } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [course, setCourse] = useState(COURSES[0]!);
  const [year, setYear] = useState(2);

  const canSubmit = name.trim().length > 1 && email.includes('@');

  const submit = () => {
    signUp({ name, email, course, year }, password);
    router.replace('/verification');
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, gap: space.xl, paddingTop: space.xxl }}>
        <View style={{ gap: 6 }}>
          <AppText variant="display">Create your account</AppText>
        </View>

        <View style={{ gap: space.lg }}>
          <LabeledInput
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="KJ Rivera"
          />
          <LabeledInput
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="kj@northbridge.edu"
          />
          <LabeledInput
            label="Password · optional"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="At least 8 characters"
            trailing={
              <Pressable onPress={() => setShowPassword((s) => !s)}>
                <AppText variant="small" color={colors.primary}>
                  {showPassword ? 'Hide' : 'Show'}
                </AppText>
              </Pressable>
            }
          />
        </View>

        <AppText variant="caption" color={colors.muted}>
          At least 8 characters. Tap the eye to show or hide.
        </AppText>

        <Card tone="flat">
          <AppText variant="small">
            <AppText style={{ fontWeight: '600' }}>Prefer passwordless?</AppText>
            {'\n'}You can skip the password and sign in with a one-time email code.
          </AppText>
        </Card>

        <AppText variant="caption" color={colors.muted}>
          Your name is visible to buddies. Your email stays private.
        </AppText>

        <View style={{ gap: space.sm }}>
          <AppText variant="label" color={colors.muted}>
            COURSE
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {COURSES.map((c) => (
              <Chip key={c} label={c} active={course === c} onPress={() => setCourse(c)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <AppText variant="label" color={colors.muted}>
            YEAR LEVEL
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {YEARS.map((y) => (
              <Chip
                key={y}
                label={`Year ${y}`}
                active={year === y}
                onPress={() => setYear(y)}
              />
            ))}
          </View>
        </View>

        <Button label="Send code" onPress={submit} disabled={!canSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  trailing,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'email-address';
  trailing?: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: space.md,
        gap: space.xs,
      }}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={{ flex: 1, minHeight: 0, padding: 0, borderWidth: 0, backgroundColor: 'transparent' }}
        />
        {trailing}
      </View>
    </View>
  );
}