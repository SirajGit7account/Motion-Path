import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
// import { useMemo } from 'react';
// import debounce from 'lodash/debounce';

// Define the basic point structure for coordinates
export interface Point {
  x: number;
  y: number;
}

// Calculate point on quadratic Bézier curve at time t (0 to 1)
// p0: start point, p1: control point, p2: end point
export const getBezierPoint = (
  t: number,
  p0: Point,
  p1: Point,
  p2: Point
): Point => ({
  x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
  y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y,
});

const EditableMotionPath = ({
  objectPosition,
  motionPath,
  onUpdatePath,
}: {
  objectPosition: Point;
  motionPath: Point[];
  onUpdatePath: (path: Point[]) => void;
}) => {
  const bezierPathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerDimensions({
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  if (motionPath.length < 3) return null;

  // Calculate control points for smoother, more controlled curves
  const calculateControlPoint = (start: Point, mid: Point, end: Point): Point => {
    const scale = 3; // Keep this for proper curve shape
    
    return {
      x: mid.x * scale,
      y: mid.y * scale
    };
  };

  const generatePathData = (points: Point[]): string => {
    const [p0, p1, p2] = points;
    
    // Check if point B is close to the straight line between A and C
    const isPointBNearLine = () => {
      // Calculate expected Y for a straight line at point B's x position
      const slope = (p2.y - p0.y) / (p2.x - p0.x);
      const expectedY = p0.y + slope * (p1.x - p0.x);
      const threshold = 5; // Tolerance for considering point as "on the line"
      
      return Math.abs(expectedY - p1.y) < threshold;
    };

    // If point B is near the straight line, draw straight segments
    if (isPointBNearLine()) {
      return `M${p0.x},${p0.y} L${p1.x},${p1.y} L${p2.x},${p2.y}`;
    }
    
    // Otherwise, use the curved path with control point calculation
    const cp = calculateControlPoint(p0, p1, p2);
    return `M${p0.x},${p0.y} Q${cp.x},${cp.y} ${p2.x},${p2.y}`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 1000,
          overflow: 'visible',
          transform: `translate(${objectPosition.x + containerDimensions.width/2}px, ${objectPosition.y + containerDimensions.height/2}px)`,
        }}
      >
        {/* Define the arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="35"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#A855F7"
            />
          </marker>
        </defs>
        
        {/* Draw a single curved path through all points */}
        <path
          ref={bezierPathRef}
          data-type="bezier"
          d={generatePathData(motionPath)}
          stroke="#A855F7"
          strokeWidth="4"
          fill="none"
          markerEnd="url(#arrowhead)"
        />

        {/* Points remain the same */}
        {motionPath.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="14"
            fill={
              index === 0
                ? '#22c55e'
                : index === 2
                ? '#ef4444'
                : '#eab308'
            }
            stroke="white"
            strokeWidth="2.5"
            style={{
              pointerEvents: 'all',
              // touchAction: 'none',
              cursor: 'grab',
            }}
            drag={true}
            dragConstraints={false}
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ cursor: 'grabbing' }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onDrag={(event, info) => {
              const dragMultiplier = 1; // Amplify the movement
              const newX = (info.point.x - objectPosition.x) * dragMultiplier;
              const newY = (info.point.y - objectPosition.y) * dragMultiplier;
              
              const newPath = [...motionPath];
              newPath[index] = { x: newX, y: newY };
              
              if (bezierPathRef.current) {
                bezierPathRef.current.setAttribute('d', generatePathData(newPath));
              }
              
              onUpdatePath(newPath);
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export default EditableMotionPath;
