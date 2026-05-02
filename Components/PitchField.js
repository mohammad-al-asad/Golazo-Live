import React from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';

// Props:
// - players: [{ id, number, name, x: 0..100, y: 0..100, side: 'home'|'away', captain?, badges: ['⚽','🟨'] }]
// - onPlayerPress(player)
// - style: container style (width controlled by parent)
// - aspect: optional aspect ratio width/height (default viewBox 1000x600)
export default function PitchField({ players = [], onPlayerPress, style, aspect = 1000/600 }) {
  const viewW = 1000;
  const viewH = 600;

  const markerRadius = 28;
  
  // Symmetric padding from edges
  const edgePadding = 60; // increased from 40 for more breathing room
  const pitchWidth = viewW - (edgePadding * 2);
  const pitchHeight = viewH - (edgePadding * 2);

  const adjustedPlayers = React.useMemo(() => {
    const maxIterations = 5;
    const markerDiameter = markerRadius * 2;
    let newPlayers = JSON.parse(JSON.stringify(players));

    for (let iter = 0; iter < maxIterations; iter++) {
      let wasAdjusted = false;
      for (let i = 0; i < newPlayers.length; i++) {
        for (let j = i + 1; j < newPlayers.length; j++) {
          const p1 = newPlayers[i];
          const p2 = newPlayers[j];

          const p1_cx = (p1.x / 100) * viewW;
          const p1_cy = (p1.y / 100) * viewH;
          const p2_cx = (p2.x / 100) * viewW;
          const p2_cy = (p2.y / 100) * viewH;

          const dx = p1_cx - p2_cx;
          const dy = p1_cy - p2_cy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0 && distance < markerDiameter) {
            wasAdjusted = true;
            const overlap = markerDiameter - distance;
            const angle = Math.atan2(dy, dx);
            
            const pushX = (overlap / 2) * Math.cos(angle);
            const pushY = (overlap / 2) * Math.sin(angle);

            const pushX_coords = (pushX / viewW) * 100;
            const pushY_coords = (pushY / viewH) * 100;

            p1.x += pushX_coords;
            p1.y += pushY_coords;
            p2.x -= pushX_coords;
            p2.y -= pushY_coords;
          }
        }
      }
      if (!wasAdjusted) break;
    }
    return newPlayers;
  }, [players, viewW, viewH, markerRadius]);

  const renderPlayer = (p) => {
    const cx = (p.x / 100) * viewW;
    const cy = (p.y / 100) * viewH;
    const fill = p.side === 'home' ? '#16a34a' : '#dc2626'; // slightly brighter colors
    const strokeColor = p.captain ? '#fbbf24' : 'rgba(255,255,255,0.2)'; // gold border for captain, subtle for others
    const strokeWidth = p.captain ? 3 : 1;
    
    return (
      <G key={p.id}>
        <TouchableWithoutFeedback onPress={() => onPlayerPress && onPlayerPress(p)}>
          <G>
            {/* Touch area (larger invisible circle for better touch) */}
            <Circle 
              cx={cx} 
              cy={cy} 
              r={markerRadius + 10} 
              fill="transparent"
            />
            {/* Player circle */}
            <Circle 
              cx={cx} 
              cy={cy} 
              r={markerRadius} 
              fill={fill} 
              opacity={0.92}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Player number */}
            <SvgText
              x={cx}
              y={cy + 7}
              fontSize={22}
              fontWeight="800"
              fill="#ffffff"
              textAnchor="middle"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.5}
            >
              {String(p.number)}
            </SvgText>
            {/* Render badges above player */}
            {p.badges && p.badges.length > 0 && (
              <G>
                {p.badges.map((badge, i) => (
                  <SvgText
                    key={i}
                    x={cx - 18 + (i * 15)}
                    y={cy - markerRadius - 12}
                    fontSize={16}
                    textAnchor="middle"
                  >
                    {badge}
                  </SvgText>
                ))}
              </G>
            )}
          </G>
        </TouchableWithoutFeedback>
      </G>
    );
  };

  return (
    <View style={[styles.container, { aspectRatio: aspect }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewW} ${viewH}`}>
        {/* Gradient background for more realistic look */}
        <Defs>
          <LinearGradient id="grassGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2d5016" />
            <Stop offset="50%" stopColor="#1b5e20" />
            <Stop offset="100%" stopColor="#1a4e1a" />
          </LinearGradient>
        </Defs>
        
        {/* pitch background with gradient */}
        <Rect x="0" y="0" width={viewW} height={viewH} fill="url(#grassGradient)" />
        
        {/* grass stripes for texture */}
        {[1,2,3,4,5,6,7,8,9].map(i => (
          <Rect 
            key={i}
            x={edgePadding + (i * (pitchWidth/10))} 
            y={edgePadding} 
            width={pitchWidth/20} 
            height={pitchHeight} 
            fill="rgba(255,255,255,0.015)" 
          />
        ))}
        
        {/* outer boundary */}
        <Rect 
          x={edgePadding} 
          y={edgePadding} 
          width={pitchWidth} 
          height={pitchHeight} 
          fill="none" 
          stroke="rgba(255,255,255,0.4)" 
          strokeWidth="3" 
          rx="8" 
        />
        
        {/* halfway line */}
        <Line 
          x1={viewW/2} 
          y1={edgePadding} 
          x2={viewW/2} 
          y2={viewH - edgePadding} 
          stroke="rgba(255,255,255,0.35)" 
          strokeWidth="3" 
        />
        
        {/* center circle */}
        <Circle 
          cx={viewW/2} 
          cy={viewH/2} 
          r="80" 
          stroke="rgba(255,255,255,0.35)" 
          strokeWidth="3" 
          fill="none" 
        />
        
        {/* center spot */}
        <Circle 
          cx={viewW/2} 
          cy={viewH/2} 
          r="3" 
          fill="rgba(255,255,255,0.6)" 
        />
        
        {/* penalty boxes - symmetric positioning */}
        <Rect 
          x={edgePadding} 
          y={(viewH/2)-140} 
          width="120" 
          height="280" 
          fill="none" 
          stroke="rgba(255,255,255,0.35)" 
          strokeWidth="3" 
        />
        <Rect 
          x={viewW - edgePadding - 120} 
          y={(viewH/2)-140} 
          width="120" 
          height="280" 
          fill="none" 
          stroke="rgba(255,255,255,0.35)" 
          strokeWidth="3" 
        />
        
        {/* 6-yard boxes - symmetric positioning */}
        <Rect 
          x={edgePadding} 
          y={(viewH/2)-70} 
          width="50" 
          height="140" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
        />
        <Rect 
          x={viewW - edgePadding - 50} 
          y={(viewH/2)-70} 
          width="50" 
          height="140" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
        />
        
        {/* penalty spots - symmetric positioning */}
        <Circle cx={edgePadding + 90} cy={viewH/2} r="3" fill="rgba(255,255,255,0.6)" />
        <Circle cx={viewW - edgePadding - 90} cy={viewH/2} r="3" fill="rgba(255,255,255,0.6)" />
        
        {/* corner arcs - using symmetric padding */}
        {[
          {cx: edgePadding, cy: edgePadding, start: 0, end: 90},
          {cx: viewW - edgePadding, cy: edgePadding, start: 90, end: 180},
          {cx: edgePadding, cy: viewH - edgePadding, start: 270, end: 360},
          {cx: viewW - edgePadding, cy: viewH - edgePadding, start: 180, end: 270}
        ].map((corner, i) => (
          <Circle
            key={i}
            cx={corner.cx}
            cy={corner.cy}
            r="20"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
            strokeDasharray="8 75"
            transform={`rotate(${corner.start} ${corner.cx} ${corner.cy})`}
          />
        ))}
        
        {/* player markers */}
        {adjustedPlayers.map(renderPlayer)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  }
});