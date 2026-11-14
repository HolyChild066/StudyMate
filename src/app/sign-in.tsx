import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppText, Button, Card, Input, Screen } from '@/components/ui';
import { useApp } from '@/lib/store';
import { colors, space } from '@/theme/tokens';

export default function SignIn() {
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoggingIn(true);
    try {
      await signIn(email, password);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed. Try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, gap: space.xl, paddingTop: space.xxl }}>
        <View style={{ gap: 6 }}>
          <AppText variant="display">Your next chapter</AppText>
        </View>

        <Card tone="tint">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
            <AppText style={{ fontSize: 20 }}>✨</AppText>
            <AppText variant="body">Small steps. Real progress.</AppText>
          </View>
          <AppText variant="body" color={colors.muted}>
            One account for your tutor, study plan and buddies.
          </AppText>
        </Card>

        <AppText variant="caption" color={colors.muted} align="center">
          Sign in with your email
        </AppText>

        <View style={{ gap: space.lg }}>
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@northbridge.edu"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        <Card tone="flat">
          <AppText variant="small">
            <AppText style={{ fontWeight: '600' }}>Your school, your community</AppText>
            {'\n'}We verify student status before enabling buddy discovery.
          </AppText>
        </Card>

        <Button label="Log in" onPress={submit} disabled={loggingIn} />
        {loggingIn ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: space.sm }} />
        ) : null}

        {error ? (
          <Card tone="flat">
            <AppText variant="small" color={colors.danger}>
              {error}
            </AppText>
          </Card>
        ) : null}

        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/sign-up')}>
            <AppText variant="small" color={colors.primary}>
              New here? Create an account
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}