import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { FileText, DownloadCloud, Eye } from 'lucide-react-native';

interface NoteCard {
  id: string;
  title: string;
  subject: string;
  pages: number;
  sizeMb: number;
  color: string;
  accentBg: string;
}

const CLINICAL_NOTES: NoteCard[] = [
  {
    id: 'n1',
    title: 'High-Yield Clinical Pathology Practical Atlas & Slides',
    subject: 'Pathology',
    pages: 64,
    sizeMb: 18.4,
    color: CLAY_COLORS.brandPink,
    accentBg: 'rgba(255, 77, 139, 0.15)',
  },
  {
    id: 'n2',
    title: 'Harrison Cardiology & ECG Interpretation Summary Guide',
    subject: 'General Medicine',
    pages: 82,
    sizeMb: 24.1,
    color: CLAY_COLORS.marrowTeal,
    accentBg: 'rgba(0, 163, 137, 0.15)',
  },
  {
    id: 'n3',
    title: 'Neuroanatomy Tracts, Cross-Sections & Cranial Nerve Guide',
    subject: 'Anatomy',
    pages: 48,
    sizeMb: 14.8,
    color: CLAY_COLORS.brandLavender,
    accentBg: 'rgba(184, 164, 237, 0.15)',
  },
  {
    id: 'n4',
    title: 'Autonomic Drugs of Choice & Receptor Summary Charts',
    subject: 'Pharmacology',
    pages: 36,
    sizeMb: 9.5,
    color: CLAY_COLORS.brandOchre,
    accentBg: 'rgba(232, 185, 74, 0.15)',
  },
];

export const NotesAtlasFeed: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FileText size={18} color={CLAY_COLORS.brandMint} />
          <Text style={styles.sectionTitle}>Clinical Notes & Atlases</Text>
        </View>
        <Text style={styles.subtitle}>
          High-Yield Slide Decks, Practical Manuals & Pathology Atlases
        </Text>
      </View>

      {CLINICAL_NOTES.map((note) => (
        <View
          key={note.id}
          style={[
            styles.card,
            {
              backgroundColor: CLAY_COLORS.surfaceDarkCard,
              borderColor: CLAY_COLORS.surfaceDarkBorder,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: note.accentBg }]}>
              <Text style={[styles.badgeText, { color: note.color }]}>
                {note.subject}
              </Text>
            </View>
            <Text style={styles.metaText}>{note.pages} pages • {note.sizeMb} MB</Text>
          </View>

          <Text style={styles.title}>{note.title}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.viewBtn} activeOpacity={0.7}>
              <Eye size={14} color="#FFFFFF" />
              <Text style={styles.viewBtnText}>Read Slides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7}>
              <DownloadCloud size={14} color={CLAY_COLORS.mutedSoft} />
              <Text style={styles.downloadText}>Save Offline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY_COLORS.mutedSoft,
  },
  card: {
    borderRadius: CLAY_ROUNDED.xl,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_ROUNDED.pill,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_ROUNDED.pill,
  },
  downloadText: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '600',
  },
});
