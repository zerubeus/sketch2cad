import Header from "@/components/Header";
import EditorClient from "./EditorClient";

export const metadata = {
  title: "Editor — Sketch2CAD",
};

export default function EditorPage() {
  return (
    <>
      <Header />
      <EditorClient />
    </>
  );
}
