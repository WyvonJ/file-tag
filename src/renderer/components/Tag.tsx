import MaterialIcon from "./MaterialIcon"
import './Tag.scss'

export interface TagProps {
  onClick?: any;
  onClose?: any;
  icon?: string;
  name?: string;
  color?: string;
  style?: any;
  closable?: boolean;
  className?: string;
  desc?: string;
}

function Tag({ onClick, onClose, icon = '', name = '', closable = false, className = '', color, style, desc = '' }: TagProps) {

  function handlerClose(e: { stopPropagation: () => void }) {
    e.stopPropagation()
    if (typeof onClose === 'function') {
      onClose(e)
    }
  }
  return <span title={desc} style={style} className={`ft-tag ${className} ${color || 'grey'}`} onClick={onClick}>
        <span className="ft-tag__icon">
            <MaterialIcon icon={icon} />
        </span>
        <span className="ft-tag__name">{name}</span>
    { closable && <span className="ft-tag__close" onClick={handlerClose}>
            <MaterialIcon icon="cancel"/>
        </span>}
    </span>
}

export default Tag;
