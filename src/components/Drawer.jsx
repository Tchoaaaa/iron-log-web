import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Drawer({ title, onClose, children, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="ore-drawer"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="drawer-content">
        <header className="flex items-center justify-between gap-4 mb-5">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            className="icon-button"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
