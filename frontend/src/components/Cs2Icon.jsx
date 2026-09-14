export default function Cs2Icon({ name, size = 16, className = '', title }) {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    '--cs2-icon': `url("/cs2-icons/${name}.svg")`,
  }

  return (
    <span
      className={`cs2-icon ${className}`}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      title={title}
    />
  )
}
