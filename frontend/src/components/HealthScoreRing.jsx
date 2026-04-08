export const HealthScoreRing = ({ score = 85 }) => {
  const radius = 16;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = "text-emerald-500";
  let bg = "text-emerald-50";
  if (score < 60) {
    color = "text-rose-500";
    bg = "text-rose-50";
  } else if (score < 80) {
    color = "text-amber-500";
    bg = "text-amber-50";
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`${bg} transition-colors duration-500`}
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1.5s ease-in-out" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`${color} glow-effect`}
        />
      </svg>
      <span className={`absolute text-[10px] font-black ${color}`}>{score}</span>
    </div>
  );
};
