"use client";

import { useCallback, useState } from "react";
import { CreateFencePanel } from "@/components/missions/CreateFencePanel";
import {
  FenceDrawToolbar,
  type FenceDrawMode,
} from "@/components/missions/FenceDrawToolbar";
import { FenceMetadataPopover } from "@/components/missions/FenceMetadataPopover";
import type { SavedFence } from "@/types/aeroshield";
import { useFenceDraw } from "@/hooks/useFenceDraw";

export type CreateFenceWorkspaceProps = {
  fences: SavedFence[];
  onBack: () => void;
  onFencesChange: (fences: SavedFence[]) => void;
};

export function CreateFenceWorkspace({
  fences,
  onBack,
  onFencesChange,
}: CreateFenceWorkspaceProps) {
  const [draftName, setDraftName] = useState("");
  const [draftAltitude, setDraftAltitude] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const onShapeComplete = useCallback(() => {
    setDraftName("");
    setDraftAltitude("");
    setShowValidation(false);
    setShowMetadata(true);
  }, []);

  const {
    activeMode,
    draftGeometry,
    setSavedFences,
    handleModeSelect,
    resetDrawing,
  } = useFenceDraw({ paused: showMetadata, onShapeComplete });

  const draftNameError =
    showValidation && !draftName.trim() ? "Fence name is required." : "";
  const draftAltitudeError =
    showValidation && !draftAltitude.trim()
      ? "Altitude ceiling is required."
      : showValidation && Number.isNaN(Number(draftAltitude.trim()))
        ? "Altitude ceiling must be a number."
        : "";
  const canSaveDraft =
    !!draftGeometry &&
    draftName.trim().length > 0 &&
    draftAltitude.trim().length > 0 &&
    !Number.isNaN(Number(draftAltitude.trim()));

  const handleToolSelect = (mode: FenceDrawMode) => {
    handleModeSelect(mode);
    setShowMetadata(false);
    setShowValidation(false);
  };

  const handleSaveFence = () => {
    if (!canSaveDraft || !draftGeometry) {
      setShowValidation(true);
      return;
    }

    const newFence: SavedFence = {
      name: draftName.trim(),
      altitude: draftAltitude,
      mode: activeMode === "line" || !activeMode ? "polygon" : activeMode,
      geometry: draftGeometry,
    };

    setSavedFences((prev) => [...prev, newFence]);
    onFencesChange([newFence, ...fences]);
    setShowMetadata(false);
    setShowValidation(false);
    resetDrawing();
  };

  const handleDeleteFence = (name: string) => {
    onFencesChange(fences.filter((f) => f.name !== name));
    setSavedFences((prev) => prev.filter((f) => f.name !== name));
  };

  const handleCancel = () => {
    setShowMetadata(false);
    setShowValidation(false);
    resetDrawing();
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-visible">
      <CreateFencePanel
        fences={fences}
        onBack={onBack}
        onDeleteFence={handleDeleteFence}
      />

      <FenceDrawToolbar activeMode={activeMode} onModeSelect={handleToolSelect} />

      {showMetadata ? (
        <FenceMetadataPopover
          name={draftName}
          altitude={draftAltitude}
          nameError={draftNameError}
          altitudeError={draftAltitudeError}
          canSave={canSaveDraft}
          onNameChange={setDraftName}
          onAltitudeChange={setDraftAltitude}
          onCancel={handleCancel}
          onSave={handleSaveFence}
        />
      ) : null}
    </div>
  );
}
