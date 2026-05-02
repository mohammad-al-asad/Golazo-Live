import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mapping API stat type to friendly label + normalization
const LABEL_MAP = {
  'Shots on Goal': 'Shots on Goal',
  'Shots off Goal': 'Shots off Goal',
  'Total Shots': 'Total Shots',
  'Blocked Shots': 'Blocked',
  'Shots insidebox': 'Shots In Box',
  'Shots outsidebox': 'Shots Out Box',
  'Fouls': 'Fouls',
  'Corner Kicks': 'Corners',
  'Offsides': 'Offsides',
  'Ball Possession': 'Possession',
  'Yellow Cards': 'Yellow Cards',
  'Red Cards': 'Red Cards',
  'Goalkeeper Saves': 'GK Saves',
  'Total passes': 'Passes',
  'Passes accurate': 'Passes Accurate',
  'Passes %': 'Pass %',
  'expected_goals': 'xG',
};

function normalizeValue(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string' && v.endsWith('%')) return Number(v.replace('%',''));
  return Number(v) || 0;
}

const StatsMatchDetails = ({ stats }) => {
  // stats: [ { team:{}, stats:{ type:value } } , { ... } ]
  if (!Array.isArray(stats) || stats.length < 2) return null;
  const [home, away] = stats;

  const rows = useMemo(() => {
    const keys = new Set([...Object.keys(home.stats), ...Object.keys(away.stats)]);
    // Preferred order
    const priority = [
      'Ball Possession','Total Shots','Shots on Goal','Shots off Goal','Shots insidebox','Shots outsidebox','Blocked Shots',
      'Goalkeeper Saves','Fouls','Corner Kicks','Offsides','Yellow Cards','Red Cards','Total passes','Passes accurate','Passes %','expected_goals'
    ];
    const ordered = Array.from(keys).filter(k => LABEL_MAP[k]).sort((a,b)=>{
      const ia = priority.indexOf(a); const ib = priority.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
    });
    return ordered.map(k => {
      const hv = normalizeValue(home.stats[k]);
      const av = normalizeValue(away.stats[k]);
      const isPercent = typeof home.stats[k] === 'string' && home.stats[k]?.toString().endsWith('%');
      const total = hv + av || 1;
      const hf = isPercent ? hv : Math.round((hv / total) * 100);
      const af = isPercent ? av : Math.round((av / total) * 100);
      return { key: k, label: LABEL_MAP[k] || k, hv, av, hf, af, isPercent };
    });
  }, [home, away]);

  return (
    <View style={styles.container}>
      <View style={styles.teamsRow}>
        <Text style={styles.teamName}>{home.team?.name}</Text>
        <Text style={styles.teamName}>{away.team?.name}</Text>
      </View>
      {rows.length === 0 && (
        <Text style={{ color:'#fff', fontSize:13, textAlign:'center', marginTop:8 }}>No statistics available.</Text>
      )}
      {rows.map(r => (
        <View key={r.key} style={styles.statRow}>
          <Text style={styles.statValue}>{r.isPercent ? `${r.hv}%` : r.hv}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { flex: r.hf, backgroundColor: '#22C55E' }]} />
            <View style={[styles.bar, { flex: r.af, backgroundColor: '#333' }]} />
          </View>
          <Text style={styles.statValue}>{r.isPercent ? `${r.av}%` : r.av}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    width: 40,
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: 8,
  },
});

export default StatsMatchDetails;