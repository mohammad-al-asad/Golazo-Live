import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PitchField from './PitchField';

// lineup prop (API) shape: [ { team:{name,formation,coach}, startXI:[{grid, number, name, pos}], substitutes:[...] }, ... ]
// Added props: status: 'checking'|'no-coverage'|'pending'|'partial'|'ready'; events (for badges)
const LineUpMatchDetails = ({ lineup, status = 'idle', events = [] }) => {
  const live = Array.isArray(lineup) && lineup.length ? lineup : null;

  // Map events to player name -> badges (goal, yellow, sub)
  const badges = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      if (!ev || !ev.player) return;
      const key = ev.player;
      if (!map[key]) map[key] = [];
      if (ev.type === 'goal') map[key].push('⚽');
      else if (ev.type === 'yellow') map[key].push('🟨');
      else if (ev.type === 'sub') map[key].push('🔁');
    });
    return map;
  }, [events]);

  const data = useMemo(() => {
    if (!live) return null;
    function toCoords(startXI, isHome) {
      if (!startXI?.length) return [];
      const rows = Array.from(new Set(startXI.map(p => Number((p.grid||'1:1').split(':')[0])||1))).sort((a,b)=>a-b);
      return startXI.map(p => {
        const [rowStr] = (p.grid || '1:1').split(':');
        const rowNum = Number(rowStr) || 1;
        const rowIdx = rows.indexOf(rowNum);
        const rowPlayers = startXI.filter(pp => (pp.grid||'').startsWith(rowStr+':')).sort((a,b)=>{
          const ca = Number((a.grid||'1:1').split(':')[1])||1; const cb = Number((b.grid||'1:1').split(':')[1])||1; return ca-cb;
        });
        const colIdx = rowPlayers.indexOf(p);
        const yBase = ((rowIdx+1)/(rows.length+1))*100;
        const y = isHome ? 100 - yBase : yBase;
        const x = ((colIdx+1)/(rowPlayers.length+1))*100;
        return { 
          id: `${isHome ? 'h' : 'a'}-${p.number}`,
          name: p.name, 
          number: p.number, 
          x, 
          y, 
          side: isHome ? 'home' : 'away',
          badges: badges[p.name] || [], 
          captain: !!p.captain 
        };
      });
    }
    const homeSide = live[0];
    const awaySide = live[1];
    return {
      home: homeSide ? {
        team: homeSide.team?.name,
        formation: homeSide.team?.formation,
        manager: homeSide.team?.coach,
        starters: toCoords(homeSide.startXI, true),
        substitutes: (homeSide.substitutes||[]).map(s => ({ name: s.name, number: s.number, position: s.pos })),
      } : null,
      away: awaySide ? {
        team: awaySide.team?.name,
        formation: awaySide.team?.formation,
        manager: awaySide.team?.coach,
        starters: toCoords(awaySide.startXI, false),
        substitutes: (awaySide.substitutes||[]).map(s => ({ name: s.name, number: s.number, position: s.pos })),
      } : null,
    };
  }, [live, badges]);

  const allPlayers = useMemo(() => {
    if (!data?.home?.starters || !data?.away?.starters) return [];
    return [...data.home.starters, ...data.away.starters];
  }, [data]);

  const handlePlayerPress = (player) => {
    // Could show player details modal or highlight player in list
    console.log('Player pressed:', player.name, player.number);
  };

  if (status === 'checking') return (
    <View style={styles.stateBox}><Text style={styles.stateText}>Checking lineup coverage…</Text></View>
  );
  if (status === 'no-coverage') return (
    <View style={styles.stateBox}><Text style={styles.stateText}>Lineups not provided for this competition.</Text></View>
  );
  if (status === 'pending') return (
    <View style={styles.stateBox}><Text style={styles.stateText}>Lineups expected soon…</Text></View>
  );
  if (status === 'partial') {
    return (
      <View style={styles.container}>
        <Text style={styles.teamTitle}>Partial lineup available</Text>
        <Text style={styles.partialNote}>Waiting for other team…</Text>
      </View>
    );
  }

  if (!data || !data.home || !data.away) return (
    <View style={styles.stateBox}><Text style={styles.stateText}>Lineups not available yet.</Text></View>
  );

  return (
    <View style={styles.container}>
      {/* Team Names and Formation */}
      <Text style={styles.teamTitle}>
        {data.home.team} {data.home.formation && `(${data.home.formation})`} vs {data.away.team} {data.away.formation && `(${data.away.formation})`}
      </Text>
      
      {/* SVG Pitch Field with Players */}
      <View style={styles.fieldWrapper}>
        <PitchField 
          players={allPlayers}
          onPlayerPress={handlePlayerPress}
          style={styles.pitchStyle}
        />
      </View>
      {/* Players list under field (starters) */}
      <View style={styles.playersList}>
        <Text style={styles.playersHeader}>STARTING XI</Text>
        <View style={styles.playersColumns}>
          <View style={{flex:1, paddingRight:8}}>
            {[...(data.home.starters||[])].sort((a,b)=>( (a.number||0) - (b.number||0) )).map(p => (
              <Text key={`list-home-${p.number}-${p.name}`} style={[styles.playerListItem, { textAlign: 'left', opacity: 0.85 }]}>{p.number}. {p.name}{p.captain ? ' (C)' : ''}</Text>
            ))}
          </View>
          <View style={{flex:1, paddingLeft:8}}>
            {[...(data.away.starters||[])].sort((a,b)=>( (a.number||0) - (b.number||0) )).map(p => (
              <Text key={`list-away-${p.number}-${p.name}`} style={[styles.playerListItem, { textAlign: 'right', opacity: 0.85 }]}>{p.number}. {p.name}{p.captain ? ' (C)' : ''}</Text>
            ))}
          </View>
        </View>
      </View>
      {/* Substitutes */}
      
      <View style={styles.subsRow}>
        <View style={{ flex: 1 }}>
          {[...(data.home.substitutes||[])].sort((a,b)=>( (a.number||0) - (b.number||0) )).map(sub => (
            <Text key={`sub-home-${sub.number}-${sub.name}`} style={[styles.subName, { textAlign: 'left', opacity: 0.8 }]}>{sub.number != null ? sub.number + '. ' : ''}{sub.name} ({sub.position})</Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {[...(data.away.substitutes||[])].sort((a,b)=>( (a.number||0) - (b.number||0) )).map(sub => (
            <Text key={`sub-away-${sub.number}-${sub.name}`} style={[styles.subName, { textAlign: 'right', opacity: 0.8 }]}>{sub.number != null ? sub.number + '. ' : ''}{sub.name} ({sub.position})</Text>
          ))}
        </View>
      </View>
      {/* Managers */}
      <View style={styles.managerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.managerTitle}>MANAGER</Text>
          <Text style={styles.managerName}>{data.home.manager}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.managerTitle}>MANAGER</Text>
          <Text style={styles.managerName}>{data.away.manager}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  teamTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  fieldWrapper: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1b5e20',
  },
  pitchStyle: {
    borderRadius: 16,
  },
  playersList: { 
    marginTop: 8, 
    backgroundColor: '#181A20', 
    borderRadius: 12, 
    padding: 12 
  },
  playersHeader: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 13, 
    marginBottom: 8, 
    opacity: 0.9, 
    textAlign: 'center' 
  },
  playersColumns: { 
    flexDirection: 'row' 
  },
  playerListItem: { 
    color: '#fff', 
    fontSize: 12, 
    marginBottom: 4, 
    opacity: 0.85 
  },
  subsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  subsTitle: { 
    color: '#cccccc', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  subsTeam: { 
    color: '#cccccc', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 4, 
    textAlign: 'center', 
    opacity: 0.85 
  },
  subName: { 
    color: '#fff', 
    fontSize: 12, 
    marginBottom: 2, 
    opacity: 0.8 
  },
  managerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  managerTitle: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  managerName: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  partialNote: { 
    color: '#ccc', 
    textAlign: 'center', 
    marginTop: 8 
  },
  stateBox: { 
    margin: 16, 
    padding: 16, 
    backgroundColor: '#222', 
    borderRadius: 12 
  },
  stateText: { 
    color: '#fff', 
    fontSize: 13, 
    textAlign: 'center' 
  },
});

export default LineUpMatchDetails;