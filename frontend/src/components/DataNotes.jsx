import { IconCheck, IconNote } from "../icons";

export default function DataNotes({ notes, t }) {
  return (
    <div className="card">
      <h3><span className="ico"><IconNote /></span>{t.notesTitle}</h3>
      <p className="sub">{t.notesSub}</p>
      {notes.map((n) => {
        const render = t.noteText[n.id];
        if (!render) return null;
        return (
          <div className="note-row" key={n.id}>
            <span className="tick"><IconCheck width={15} height={15} /></span>
            <span>{render(n.data)}</span>
          </div>
        );
      })}
    </div>
  );
}
