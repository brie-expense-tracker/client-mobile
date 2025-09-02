import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';

interface TimeWindowPillProps {
  start: string;
  end: string;
  tz: string;
}

export function TimeWindowPill({ start, end, tz }: TimeWindowPillProps) {
  const startD = format(parseISO(start), "MMM d");
  const endD = format(parseISO(end), "MMM d, yyyy");
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {startD}–{endD} • {tz}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});
