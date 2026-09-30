import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { Sparkles, Bookmark, Share2 } from 'lucide-react-native';

interface PearlItem {
  id: string;
  subject: string;
  category: string;
  title: string;
  content: string;
  exam: string;
  color: string;
  accentBg: string;
}

const HIGH_YIELD_PEARLS: PearlItem[] = [
  {
    id: 'p1',
    subject: 'General Medicine',
    category: 'Cardiology',
    title: 'S3 Heart Sound vs S4 Heart Sound',
    content: 'S3 (Ventricular Gallop) is due to rapid ventricular filling into a dilated ventricle (Heart Failure, MR, AR). S4 (Atrial Gallop) is due to atrial contraction against a stiff, non-compliant ventricle (Hypertension, AS, HCM). S4 is NEVER heard in Atrial Fibrillation.',
    exam: 'NEET-PG 2024 Recall',
    color: CLAY_COLORS.brandPink,
    accentBg: 'rgba(255, 77, 139, 0.15)',
  },
  {
    id: 'p2',
    subject: 'Pathology',
    category: 'Hematology',
    title: 'Auer Rods & APML (M3) Genetics',
    content: 'Auer rods are pathognomonic crystalline aggregates of fused myeloperoxidase granules found in AML, especially M3 (Acute Promyelocytic Leukemia). Defined by t(15;17) PML-RARA fusion. First-line therapy: All-trans retinoic acid (ATRA) + Arsenic trioxide (ATO). Watch for ATRA differentiation syndrome.',
    exam: 'INI-CET Recall',
    color: CLAY_COLORS.brandLavender,
    accentBg: 'rgba(184, 164, 237, 0.15)',
  },
  {
    id: 'p3',
    subject: 'Anatomy',
    category: 'Neuroanatomy',
    title: 'Lateral Medullary Syndrome (Wallenberg)',
    content: 'Occlusion of PICA (Posterior Inferior Cerebellar Artery) or vertebral artery. Ipsilateral Horner syndrome, ataxia, loss of facial pain/temperature (Spinal nucleus CN V), dysphagia/hoarseness (Nucleus Ambiguus), contralateral hemianesthesia for pain/temp.',
    exam: 'High Yield Landmark',
    color: CLAY_COLORS.brandPeach,
    accentBg: 'rgba(255, 176, 132, 0.15)',
  },
  {
    id: 'p4',
    subject: 'Pharmacology',
    category: 'Autonomic',
    title: 'Organophosphate Poisoning Triad & Treatment',
    content: 'Irreversible inhibition of Acetylcholinesterase leading to cholinergic crisis (DUMBBELLS: Diarrhea, Urination, Miosis, Bradycardia, Bronchospasm, Emesis, Lacrimation, Salivation). Drug of choice: Atropine (blocks muscarinic signs). Reactivator: Pralidoxime (2-PAM) within 24 hours before enzyme aging.',
    exam: 'Clinical Viva Favorite',
    color: CLAY_COLORS.brandOchre,
    accentBg: 'rgba(232, 185, 74, 0.15)',
  },
];

export const HighYieldFeed: React.FC<{ onSelectTopic?: () => void }> = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={18} color={CLAY_COLORS.brandPink} />
          <Text style={styles.sectionTitle}>High-Yield Pearls</Text>
        </View>
        <Text style={styles.subtitle}>Daily Exam Recalls, Pathognomonic Signs & Clinical Triads</Text>
      </View>

      {HIGH_YIELD_PEARLS.map((pearl) => (
        <View
          key={pearl.id}
          style={[
            styles.pearlCard,
            {
              backgroundColor: CLAY_COLORS.surfaceDarkCard,
              borderColor: CLAY_COLORS.surfaceDarkBorder,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View style={[styles.subjectTag, { backgroundColor: pearl.accentBg }]}>
              <Text style={[styles.subjectText, { color: pearl.color }]}>
                {pearl.subject} • {pearl.category}
              </Text>
            </View>
            <View style={styles.examBadge}>
              <Text style={styles.examText}>{pearl.exam}</Text>
            </View>
          </View>

          <Text style={styles.pearlTitle}>{pearl.title}</Text>
          <Text style={styles.pearlContent}>{pearl.content}</Text>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Bookmark size={15} color={CLAY_COLORS.mutedSoft} />
              <Text style={styles.actionText}>Bookmark</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Share2 size={15} color={CLAY_COLORS.mutedSoft} />
              <Text style={styles.actionText}>Share Pearl</Text>
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
  pearlCard: {
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  examBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
  },
  examText: {
    fontSize: 10,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '600',
  },
  pearlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  pearlContent: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '600',
  },
});
