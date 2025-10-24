// MessageFeedback.tsx - Thumbs up/down feedback with micro-prompt for dissatisfaction
// Captures user satisfaction to identify why chats feel dull

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logUserSatisfaction, DissatisfactionReason } from '../../../../src/services/feature/analyticsService';

interface MessageFeedbackProps {
  messageId: string;
  onFeedback?: (satisfaction: 'thumbs_up' | 'thumbs_down') => void;
}

const DISSATISFACTION_REASONS: DissatisfactionReason[] = [
  { tag: 'too_vague', description: 'Too vague' },
  { tag: 'wrong_numbers', description: 'Wrong numbers' },
  { tag: 'not_timely', description: 'Not timely' },
  { tag: 'other', description: 'Other' }
];

export default function MessageFeedback({ messageId, onFeedback }: MessageFeedbackProps) {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedSatisfaction, setSelectedSatisfaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);

  const handleSatisfaction = (satisfaction: 'thumbs_up' | 'thumbs_down') => {
    setSelectedSatisfaction(satisfaction);
    
    if (satisfaction === 'thumbs_up') {
      // Log positive feedback immediately
      logUserSatisfaction(messageId, satisfaction);
      onFeedback?.(satisfaction);
    } else {
      // Show reason modal for negative feedback
      setShowReasonModal(true);
    }
  };

  const handleReasonSelection = (reason: DissatisfactionReason) => {
    // Log negative feedback with reason
    logUserSatisfaction(messageId, 'thumbs_down', reason);
    onFeedback?.('thumbs_down');
    
    // Close modal
    setShowReasonModal(false);
    setSelectedSatisfaction(null);
  };

  const handleCloseModal = () => {
    setShowReasonModal(false);
    setSelectedSatisfaction(null);
  };

  return (
    <>
      {/* Feedback buttons */}
      <View style={styles.feedbackContainer}>
        <TouchableOpacity
          style={[
            styles.feedbackButton,
            selectedSatisfaction === 'thumbs_up' && styles.feedbackButtonSelected
          ]}
          onPress={() => handleSatisfaction('thumbs_up')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="thumbs-up"
            size={16}
            color={selectedSatisfaction === 'thumbs_up' ? '#10b981' : '#6b7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.feedbackButton,
            selectedSatisfaction === 'thumbs_down' && styles.feedbackButtonSelected
          ]}
          onPress={() => handleSatisfaction('thumbs_down')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="thumbs-down"
            size={16}
            color={selectedSatisfaction === 'thumbs_down' ? '#ef4444' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>

      {/* Dissatisfaction reason modal */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What didn&apos;t help?</Text>
            
            {DISSATISFACTION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.tag}
                style={styles.reasonButton}
                onPress={() => handleReasonSelection(reason)}
                activeOpacity={0.7}
              >
                <Text style={styles.reasonText}>{reason.description}</Text>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseModal}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  feedbackContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  feedbackButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reasonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
