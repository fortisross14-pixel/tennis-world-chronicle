import React,{useState} from 'react';

export default function SaveSlots({slots,onCreate,onLoad,onDelete,busy}) {
  const [name,setName]=useState('Tennis World Chronicle');
  const rows=[1,2,3].map(slot=>({slot,metadata:slots.find(s=>(s.slot||s.metadata?.slot)===slot)?.metadata||slots.find(s=>s.slot===slot)||null}));
  return <main className="save-screen">
    <section className="save-hero">
      <div className="court-mark">TWC</div>
      <p className="kicker">A living tennis universe</p>
      <h1>Tennis World Chronicle</h1>
      <p>Follow ATP, WTA, doubles and junior careers across generations. Every title, ranking and retirement belongs to one canonical history.</p>
      <label className="world-name">Universe name<input value={name} maxLength={44} onChange={e=>setName(e.target.value)} /></label>
    </section>
    <section className="slot-grid">
      {rows.map(({slot,metadata})=><article className={`slot-card ${metadata?'occupied':'empty'}`} key={slot}>
        <div className="slot-number">SAVE {slot}</div>
        {metadata?<>
          <h2>{metadata.name}</h2>
          <p className="slot-season">{metadata.year} · Week {metadata.week}</p>
          <dl><div><dt>ATP No. 1</dt><dd>{metadata.atpNo1||'—'}</dd></div><div><dt>WTA No. 1</dt><dd>{metadata.wtaNo1||'—'}</dd></div></dl>
          <button disabled={busy} onClick={()=>onLoad(slot)}>Continue world</button>
          <button className="secondary danger" disabled={busy} onClick={()=>onDelete(slot)}>Delete permanently</button>
        </>:<>
          <h2>Empty chronicle</h2>
          <p>Create 720 singles players, full doubles fields, junior systems and the complete season calendar.</p>
          <button disabled={busy} onClick={()=>onCreate(slot,name.trim()||'Tennis World Chronicle')}>Create new universe</button>
        </>}
      </article>)}
    </section>
    <footer className="save-footer">Three independent IndexedDB save slots · autosave after every simulation · GitHub Pages ready</footer>
  </main>;
}
