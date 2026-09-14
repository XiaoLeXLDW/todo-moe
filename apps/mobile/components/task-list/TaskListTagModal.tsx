import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { styles } from './task-list.styles';
import { GlassSurface } from '../../moe/glass/GlassSurface';
import { useMoePreferences } from '../../moe/preferences';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { useThemeTokens } from '../../hooks/use-theme-tokens';

type ThemeColors = {
  border: string;
  cardBg: string;
  inputBg: string;
  secondaryText: string;
  text: string;
  tint: string;
};

type TaskListTagModalProps = {
  onChangeTag: (value: string) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  t: (key: string) => string;
  tagInput: string;
  themeColors: ThemeColors;
  visible: boolean;
};

export function TaskListTagModal({
  onChangeTag,
  onClose,
  onSave,
  t,
  tagInput,
  themeColors,
  visible,
}: TaskListTagModalProps) {
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const { isDark } = useThemeTokens();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCardOuter} onPress={(event) => event.stopPropagation()}>
        <GlassSurface mode={preferences.glass} dark={isDark} reducedMotion={reduced} samplingEnabled={visible} style={styles.modalCard}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>{t('bulk.addTag')}</Text>
          <TextInput
            value={tagInput}
            onChangeText={onChangeTag}
            placeholder={t('taskEdit.tagsLabel')}
            placeholderTextColor={themeColors.secondaryText}
            style={[
              styles.modalInput,
              { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border },
            ]}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={[styles.modalButtonText, { color: themeColors.secondaryText }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={!tagInput.trim()}
              style={[styles.modalButton, !tagInput.trim() && styles.modalButtonDisabled]}
            >
              <Text style={[styles.modalButtonText, { color: themeColors.tint }]}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
