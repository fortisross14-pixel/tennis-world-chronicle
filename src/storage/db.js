const DB_NAME='tennis-world-chronicle';
const DB_VERSION=1;
const STORE='slots';

function openDb() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'slot'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function listSlots() {
  try {
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>resolve(req.result.sort((a,b)=>a.slot-b.slot));
      req.onerror=()=>reject(req.error);
    });
  } catch (error) {
    const fallback=JSON.parse(localStorage.getItem('twc-slot-metadata')||'[]');
    return fallback;
  }
}

export async function loadSlot(slot) {
  try {
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(slot);
      req.onsuccess=()=>resolve(req.result?.universe||null);
      req.onerror=()=>reject(req.error);
    });
  } catch (error) {
    const raw=localStorage.getItem(`twc-slot-${slot}`);
    return raw?JSON.parse(raw):null;
  }
}

export async function saveSlot(slot,universe) {
  const record={
    slot,
    universe,
    metadata:{
      slot,
      name:universe.name,
      year:universe.year,
      week:universe.week,
      updatedAt:new Date().toISOString(),
      atpNo1:universe.players.ATP[0]?`${universe.players.ATP[0].firstName} ${universe.players.ATP[0].lastName}`:'',
      wtaNo1:universe.players.WTA[0]?`${universe.players.WTA[0].firstName} ${universe.players.WTA[0].lastName}`:'',
    },
  };
  try {
    const db=await openDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  } catch (error) {
    localStorage.setItem(`twc-slot-${slot}`,JSON.stringify(universe));
    const meta=JSON.parse(localStorage.getItem('twc-slot-metadata')||'[]').filter(r=>r.slot!==slot);
    meta.push(record.metadata);
    localStorage.setItem('twc-slot-metadata',JSON.stringify(meta));
  }
  return record.metadata;
}

export async function deleteSlot(slot) {
  try {
    const db=await openDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(slot);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  } catch (error) {
    localStorage.removeItem(`twc-slot-${slot}`);
    const meta=JSON.parse(localStorage.getItem('twc-slot-metadata')||'[]').filter(r=>r.slot!==slot);
    localStorage.setItem('twc-slot-metadata',JSON.stringify(meta));
  }
}
