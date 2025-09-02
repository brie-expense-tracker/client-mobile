import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TimeWindowPill } from './TimeWindowPill';
import { GroundedAIResponse as GroundedAIResponseType } from '../services/groundedAIService';

interface GroundedAIResponseProps {
  response: GroundedAIResponseType;
  onEvidencePress?: (factId: string) => void;
}

export function GroundedAIResponse({ response, onEvidencePress }: GroundedAIResponseProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  const handleEvidencePress = (factId: string) => {
    if (onEvidencePress) {
      onEvidencePress(factId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Time Window Pill */}
      <TimeWindowPill
        start={response.factPack.time_window.start}
        end={response.factPack.time_window.end}
        tz={response.factPack.time_window.tz}
      />

      {/* AI Response */}
      <View style={styles.responseContainer}>
        <Text style={styles.responseText}>{response.response}</Text>
        
        {/* Cache indicator */}
        {response.cacheHit && (
          <View style={styles.cacheIndicator}>
            <Text style={styles.cacheText}>⚡ Cached response</Text>
          </View>
        )}
      </View>

      {/* Evidence Section */}
      {response.evidence.length > 0 && (
        <View style={styles.evidenceContainer}>
          <TouchableOpacity
            style={styles.evidenceHeader}
            onPress={() => setShowEvidence(!showEvidence)}
          >
            <Text style={styles.evidenceHeaderText}>
              Why am I seeing this? ({response.evidence.length})
            </Text>
            <Text style={styles.evidenceToggle}>
              {showEvidence ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showEvidence && (
            <ScrollView style={styles.evidenceList}>
              {response.evidence.map((factId, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.evidenceItem}
                  onPress={() => handleEvidencePress(factId)}
                >
                  <Text style={styles.evidenceItemText}>{factId}</Text>
                  <Text style={styles.evidenceItemSubtext}>Tap to view details</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* FactPack Hash for debugging */}
      <View style={styles.hashContainer}>
        <Text style={styles.hashText}>Data hash: {response.factPack.hash.substring(0, 8)}...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  responseContainer: {
    marginBottom: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
  },
  cacheIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  cacheText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  evidenceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  evidenceHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  evidenceToggle: {
    fontSize: 12,
    color: '#6B7280',
  },
  evidenceList: {
    maxHeight: 200,
  },
  evidenceItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  evidenceItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  evidenceItemSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  hashContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 12,
  },
  hashText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
});
