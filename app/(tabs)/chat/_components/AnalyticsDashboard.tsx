// AnalyticsDashboard.tsx - Real-time chat quality monitoring for developers
// Shows metrics to identify why chats feel dull and enable fast fixes

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsService } from '../../../../src/services/feature/analyticsService';

export default function AnalyticsDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [summary, setSummary] = useState(analyticsService.getSessionSummary());
  const [eventsNeedingAttention, setEventsNeedingAttention] = useState(analyticsService.getEventsNeedingAttention());

  useEffect(() => {
    // Update summary every 5 seconds
    const interval = setInterval(() => {
      setSummary(analyticsService.getSessionSummary());
      setEventsNeedingAttention(analyticsService.getEventsNeedingAttention());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const exportAnalytics = () => {
    const data = analyticsService.exportAnalytics();
    console.log('📊 [Analytics] Export:', data);
    Alert.alert('Analytics Exported', 'Check console for data export');
  };

  const clearAnalytics = () => {
    Alert.alert(
      'Clear Analytics',
      'This will clear all analytics data for this session. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            analyticsService.clearAnalytics();
            setSummary(analyticsService.getSessionSummary());
            setEventsNeedingAttention(analyticsService.getEventsNeedingAttention());
          }
        }
      ]
    );
  };

  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.toggleButton} onPress={toggleVisibility}>
        <Ionicons name="analytics" size={20} color="#6b7280" />
        <Text style={styles.toggleText}>Analytics</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat Quality Analytics</Text>
        <TouchableOpacity onPress={toggleVisibility} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Summary</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{summary.totalEvents}</Text>
              <Text style={styles.metricLabel}>Total Events</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{summary.averageResponseTime.toFixed(0)}ms</Text>
              <Text style={styles.metricLabel}>Avg Response</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{(summary.satisfactionRate * 100).toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>Satisfaction</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{(summary.groundingUsage * 100).toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>Grounding</Text>
            </View>
          </View>
        </View>

        {/* Quality Issues */}
        {summary.qualityIssues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Quality Issues</Text>
            {summary.qualityIssues.map((issue, index) => (
              <View key={index} style={styles.issueItem}>
                <Ionicons name="warning" size={16} color="#f59e0b" />
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Events Needing Attention */}
        {eventsNeedingAttention.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Needs Attention</Text>
            {eventsNeedingAttention.slice(0, 5).map((event, index) => (
              <View key={index} style={styles.attentionItem}>
                <View style={styles.attentionHeader}>
                  <Text style={styles.attentionIntent}>{event.intent}</Text>
                  <Text style={styles.attentionTime}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.attentionDetails}>
                  {event.userSatisfaction === 'thumbs_down' && '👎 User dissatisfied'}
                  {event.fallback && '🔄 Used fallback'}
                  {event.groundingConfidence && event.groundingConfidence < 0.5 && '❓ Low confidence'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Intent Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intent Distribution</Text>
          <Text style={styles.intentText}>
            Most common: <Text style={styles.intentHighlight}>{summary.mostCommonIntent || 'None'}</Text>
          </Text>
          <Text style={styles.intentText}>
            Fallback rate: <Text style={styles.intentHighlight}>{(summary.fallbackRate * 100).toFixed(1)}%</Text>
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={exportAnalytics}>
              <Ionicons name="download" size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={clearAnalytics}>
              <Ionicons name="trash" size={16} color="#ef4444" />
              <Text style={styles.actionButtonText}>Clear Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 320,
    maxHeight: 500,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  toggleButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    alignItems: 'center',
    minWidth: 60,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  attentionItem: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  attentionIntent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  attentionTime: {
    fontSize: 10,
    color: '#92400e',
  },
  attentionDetails: {
    fontSize: 11,
    color: '#92400e',
  },
  intentText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  intentHighlight: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
