import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateStickerModal from "./CreateStickerModal";

/**
 * Global "Crear sticker" trigger (R-CRT-01, D1). Owns the ONLY piece of modal
 * state (`open`); the team is chosen INSIDE the modal, so no per-team button is
 * rendered. Mounted from `App.tsx` (composition root) rather than the sticky
 * header — its `z-10` stacking context would trap the fixed dialog (design A1).
 */
export default function CreateStickerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="light"
        className="h-12 rounded-full"
        onClick={() => {
          setOpen(true);
        }}
      >
        Crear sticker
      </Button>
      {open ? (
        <CreateStickerModal
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
