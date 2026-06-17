"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/state/store";
import Header from "./Header";
import CapabilityBanner from "./CapabilityBanner";
import ProfileBar from "./ProfileBar";
import TemplatePicker from "./TemplatePicker";
import LabelSizeForm from "./LabelSizeForm";
import ElementList from "./ElementList";
import ElementEditor from "./ElementEditor";
import EditorCanvas from "./EditorCanvas";
import ActionsBar from "./ActionsBar";
import PrinterPanel from "./PrinterPanel";

export default function LabelerApp() {
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    void useStore.getState().init();
  }, []);

  if (!loaded) {
    return (
      <div className="p-10 text-center text-sm text-zinc-500">
        Loading OpenLabs Labeler…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 sm:p-6">
      <Header />
      <CapabilityBanner />
      <div className="grid flex-1 gap-5 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <ProfileBar />
          <TemplatePicker />
          <LabelSizeForm />
          <ElementList />
          <ElementEditor />
        </div>
        <div className="flex flex-col gap-4">
          <EditorCanvas />
          <ActionsBar />
          <PrinterPanel />
        </div>
      </div>
    </div>
  );
}
