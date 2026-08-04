import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePrimeDexStore } from '@primedex/core';
import { useAuth } from '@primedex/core/neon/AuthProvider';
import { supportedLanguages } from '@primedex/core/lib/languages';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
const LANGUAGE_LABELS: Record<string, string> = {
  auto: 'Auto',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
};

export default function AccountScreen() {
  const { t } = useTranslation();
  const { palette, preference, setPreference } = useTheme();
  const { enabled, loading, user, signIn, signUp, signOut } = useAuth();
  const language = usePrimeDexStore((s) => s.language);
  const setLanguage = usePrimeDexStore((s) => s.setLanguage);

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result =
      mode === 'signIn'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name);
    if (result.error) setError(result.error.message);
    setBusy(false);
  };

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account section */}
        {enabled ? (
          <View style={[styles.card, cardStyle(palette)]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {t('account.title', { defaultValue: 'Account' })}
            </Text>

            {loading ? (
              <ActivityIndicator color={palette.primary} />
            ) : user ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: palette.textMuted }}>
                  {t('account.signedInAs', { defaultValue: 'Signed in as' })}
                </Text>
                <Text style={[styles.email, { color: palette.text }]}>{user.email}</Text>
                <Pressable
                  onPress={signOut}
                  style={[styles.primaryBtn, { backgroundColor: palette.danger }]}
                >
                  <Text style={styles.primaryBtnText}>
                    {t('account.signOut', { defaultValue: 'Sign out' })}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {mode === 'signUp' ? (
                  <Field
                    placeholder={t('account.name', { defaultValue: 'Name' })}
                    value={name}
                    onChangeText={setName}
                    palette={palette}
                  />
                ) : null}
                <Field
                  placeholder={t('account.email', { defaultValue: 'Email' })}
                  value={email}
                  onChangeText={setEmail}
                  palette={palette}
                  keyboardType="email-address"
                />
                <Field
                  placeholder={t('account.password', { defaultValue: 'Password' })}
                  value={password}
                  onChangeText={setPassword}
                  palette={palette}
                  secureTextEntry
                />
                {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
                <Pressable
                  onPress={submit}
                  disabled={busy}
                  style={[styles.primaryBtn, { backgroundColor: palette.primary, opacity: busy ? 0.6 : 1 }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signIn'
                        ? t('account.signIn', { defaultValue: 'Sign in' })
                        : t('account.signUp', { defaultValue: 'Create account' })}
                    </Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
                  <Text style={[styles.switch, { color: palette.primary }]}>
                    {mode === 'signIn'
                      ? t('account.needAccount', { defaultValue: 'Need an account? Sign up' })
                      : t('account.haveAccount', { defaultValue: 'Have an account? Sign in' })}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.card, cardStyle(palette)]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {t('account.title', { defaultValue: 'Account' })}
            </Text>
            <Text style={{ color: palette.textMuted }}>
              {t('account.localOnly', {
                defaultValue:
                  'Running locally. Your collection is saved on this device. Add Neon Auth settings to enable accounts and cloud sync.',
              })}
            </Text>
          </View>
        )}

        {/* Theme */}
        <View style={[styles.card, cardStyle(palette)]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {t('settings.theme', { defaultValue: 'Theme' })}
          </Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setPreference(opt)}
                  style={[
                    styles.segmentItem,
                    {
                      backgroundColor: active ? palette.primary : palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.primaryText : palette.text, fontWeight: '700' }}>
                    {t(`settings.${opt}`, { defaultValue: opt })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.card, cardStyle(palette)]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {t('settings.language', { defaultValue: 'Language' })}
          </Text>
          <View style={styles.langWrap}>
            {(['auto', ...supportedLanguages] as string[]).map((lng) => {
              const active = language === lng;
              return (
                <Pressable
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  style={[
                    styles.lang,
                    {
                      backgroundColor: active ? palette.primary : palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.primaryText : palette.text, fontWeight: '600' }}>
                    {LANGUAGE_LABELS[lng] ?? lng}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  palette,
  ...props
}: TextInputProps & { palette: ReturnType<typeof useTheme>['palette'] }) {
  return (
    <TextInput
      placeholderTextColor={palette.textFaint}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[
        styles.field,
        { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
      ]}
    />
  );
}

const cardStyle = (palette: ReturnType<typeof useTheme>['palette']) => ({
  backgroundColor: palette.card,
  borderColor: palette.border,
});

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  email: { fontSize: 17, fontWeight: '700' },
  field: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  primaryBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  switch: { textAlign: 'center', fontWeight: '600', paddingVertical: 4 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lang: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
