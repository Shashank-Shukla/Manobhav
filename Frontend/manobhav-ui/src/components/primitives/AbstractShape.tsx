type AbstractShapeProps = {
  color: string;
  className?: string;
};

export function AbstractShape({ color, className = '' }: AbstractShapeProps) {
  return (
    <svg viewBox="0 0 200 200" className={`absolute opacity-40 ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path
        fill={color}
        d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.8,-2.8C87.5,12.5,82.2,27.4,73.6,40.6C65,53.8,53.1,65.2,39.6,72.4C26.1,79.6,11.1,82.6,-2.8,87.4C-16.7,92.2,-29.4,98.8,-41.2,93.4C-53,88,-63.8,70.6,-71.4,54.6C-79,38.6,-83.4,24,-81.7,10.2C-80,-3.6,-72.1,-16.6,-63.3,-28.3C-54.5,-40,-44.8,-50.3,-33.5,-58.8C-22.2,-67.2,-9.3,-73.7,4.2,-80.9C17.7,-88.1,30.5,-96,44.7,-76.4Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}
