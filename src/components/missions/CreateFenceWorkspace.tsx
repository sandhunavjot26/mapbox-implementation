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
import { getMap } from "@/components/map/mapController";
import { syncFenceLayersToMap } from "@/components/map/layers/fence";

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
  const [showMetadata, setShowMetadata] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const onShapeComplete = useCallback(() => {
    setDraftName("");
    setShowValidation(false);
    setShowMetadata(true);
  }, []);

  const { activeMode, draftGeometry, handleModeSelect, resetDrawing } =
    useFenceDraw({ paused: showMetadata, onShapeComplete, savedFences: fences });

  const draftNameError =
    showValidation && !draftName.trim() ? "Fence name is required." : "";
  const canSaveDraft = !!draftGeometry && draftName.trim().length > 0;

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
      mode: activeMode === "line" || !activeMode ? "polygon" : activeMode,
      geometry: structuredClone(draftGeometry),
    };

    const nextFences = [newFence, ...fences];
    onFencesChange(nextFences);
    setShowMetadata(false);
    setShowValidation(false);
    resetDrawing({ mapSavedFences: nextFences });
  };

  const handleDeleteFence = (name: string) => {
    const next = fences.filter((f) => f.name !== name);
    onFencesChange(next);
    syncFenceLayersToMap(getMap(), null, next);
  };

  const handleCancel = () => {
    resetDrawing();
    setShowMetadata(false);
    setShowValidation(false);
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
          nameError={draftNameError}
          canSave={canSaveDraft}
          onNameChange={setDraftName}
          onCancel={handleCancel}
          onSave={handleSaveFence}
        />
      ) : null}
    </div>
  );
}
