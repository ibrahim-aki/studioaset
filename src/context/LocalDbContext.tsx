"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    getDocs,
    getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./AuthContext";

// Types
export interface Location {
    id: string;
    name: string;
    address: string;
}

export interface Room {
    id: string;
    locationId: string;
    name: string;
    description: string;
}

export interface MasterAsset {
    id: string;
    locationId: string;
    assetCode?: string;
    name: string;
    category: string;
    status: string; // "BAIK" | "RUSAK" | "MATI" | "HILANG" | ""
    conditionNotes: string;
    description: string;
    position?: string;
    entryDate?: string;
    lastModifiedBy?: string;
    updatedAt?: string;
}

export interface RoomAsset {
    id: string;
    roomId: string;
    assetId: string;
    assetName: string;
}

export interface ChecklistItem {
    assetId: string;
    assetName: string;
    status: string;
    notes: string;
    movedToRoomId?: string;
}

export interface AssetLog {
    id: string;
    assetId: string;
    type: "STATUS" | "MOVEMENT" | "SYSTEM";
    fromValue?: string;
    toValue: string;
    operatorName: string;
    timestamp: string;
    notes?: string;
}

export interface Checklist {
    id: string;
    locationId: string;
    locationName: string;
    roomId: string;
    roomName: string;
    operatorId: string;
    operatorName: string;
    timestamp: string;
    overallNotes: string;
    roomStatus: "LIVE_NOW" | "READY_FOR_LIVE" | "NOT_READY" | "STANDBY" | "FINISHED_LIVE" | "";
    items: ChecklistItem[];
    isRead?: boolean;
}

interface LocalDbContextType {
    locations: Location[];
    rooms: Room[];
    assets: MasterAsset[];
    roomAssets: RoomAsset[];
    checklists: Checklist[];
    assetLogs: AssetLog[];
    categories: string[];

    // Actions
    addLocation: (loc: Omit<Location, "id">) => void;
    updateLocation: (id: string, loc: Omit<Location, "id">) => void;
    deleteLocation: (id: string) => void;

    addCategory: (cat: string) => void;
    deleteCategory: (cat: string) => void;

    addRoom: (room: Omit<Room, "id">) => void;
    updateRoom: (id: string, room: Omit<Room, "id">) => void;
    deleteRoom: (id: string) => void;

    addAsset: (asset: Omit<MasterAsset, "id">) => void;
    updateAsset: (id: string, asset: Partial<Omit<MasterAsset, "id">>) => void;
    deleteAsset: (id: string) => void;

    addRoomAsset: (roomAsset: Omit<RoomAsset, "id">, opName?: string) => void;
    deleteRoomAsset: (id: string) => void;
    moveRoomAsset: (assetId: string, newRoomId: string, opName?: string) => void;

    addChecklist: (checklist: Omit<Checklist, "id" | "isRead">) => void;
    markChecklistAsRead: (id: string) => void;
}

const LocalDbContext = createContext<LocalDbContextType | null>(null);

const STORAGE_KEYS = {
    LOCATIONS: "studioaset_locations",
    ROOMS: "studioaset_rooms",
    ASSETS: "studioaset_assets",
    ROOM_ASSETS: "studioaset_room_assets",
    CHECKLISTS: "studioaset_checklists",
    ASSET_LOGS: "studioaset_asset_logs",
    CATEGORIES: "studioaset_categories"
};

export function LocalDbProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isDemo = user?.isDemo;

    const [locations, setLocations] = useState<Location[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [assets, setAssets] = useState<MasterAsset[]>([]);
    const [roomAssets, setRoomAssets] = useState<RoomAsset[]>([]);
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [assetLogs, setAssetLogs] = useState<AssetLog[]>([]);
    const [categories, setCategories] = useState<string[]>([
        "Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"
    ]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load for LocalStorage (if Demo)
    useEffect(() => {
        if (isDemo) {
            const loadLocal = (key: string, setter: any, fallback: any = []) => {
                const saved = localStorage.getItem(key);
                if (saved) setter(JSON.parse(saved));
                else if (fallback.length > 0) setter(fallback);
            };

            loadLocal(STORAGE_KEYS.LOCATIONS, setLocations);
            loadLocal(STORAGE_KEYS.ROOMS, setRooms);
            loadLocal(STORAGE_KEYS.ASSETS, setAssets);
            loadLocal(STORAGE_KEYS.ROOM_ASSETS, setRoomAssets);
            loadLocal(STORAGE_KEYS.CHECKLISTS, setChecklists);
            loadLocal(STORAGE_KEYS.ASSET_LOGS, setAssetLogs);
            loadLocal(STORAGE_KEYS.CATEGORIES, setCategories, ["Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"]);
            setIsInitialized(true);
        }
    }, [isDemo]);

    // Save to LocalStorage helper
    const saveToLocal = (key: string, data: any) => {
        if (isDemo) {
            localStorage.setItem(key, JSON.stringify(data));
        }
    };

    // Real-time synchronization from Firestore (if NOT Demo)
    useEffect(() => {
        if (!db || isDemo) return;

        const unsubs: (() => void)[] = [];

        const unsubLocs = onSnapshot(collection(db, "locations"), (snap) => {
            setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
        });
        unsubs.push(unsubLocs);

        const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
            setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
        });
        unsubs.push(unsubRooms);

        const unsubAssets = onSnapshot(collection(db, "assets"), (snap) => {
            setAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterAsset)));
        });
        unsubs.push(unsubAssets);

        const unsubRoomAssets = onSnapshot(collection(db, "roomAssets"), (snap) => {
            setRoomAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomAsset)));
        });
        unsubs.push(unsubRoomAssets);

        const unsubChecklists = onSnapshot(query(collection(db, "checklists"), orderBy("timestamp", "desc")), (snap) => {
            setChecklists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist)));
        });
        unsubs.push(unsubChecklists);

        const unsubLogs = onSnapshot(query(collection(db, "assetLogs"), orderBy("timestamp", "desc")), (snap) => {
            setAssetLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetLog)));
        });
        unsubs.push(unsubLogs);

        const unsubCats = onSnapshot(doc(db, "settings", "categories"), (docSnap) => {
            if (docSnap.exists()) {
                setCategories(docSnap.data().list || []);
            } else {
                const initial = ["Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"];
                setDoc(doc(db, "settings", "categories"), { list: initial });
                setCategories(initial);
            }
        });
        unsubs.push(unsubCats);

        setIsInitialized(true);
        return () => unsubs.forEach(unsub => unsub());
    }, [isDemo]);

    const api: LocalDbContextType = {
        locations,
        rooms,
        assets,
        roomAssets,
        checklists,
        assetLogs,
        categories,

        addLocation: async (loc) => {
            const id = uuidv4();
            const newLoc = { ...loc, id };
            if (isDemo) {
                const updated = [...locations, newLoc];
                setLocations(updated);
                saveToLocal(STORAGE_KEYS.LOCATIONS, updated);
            } else {
                await setDoc(doc(db, "locations", id), newLoc);
            }
        },
        updateLocation: async (id, data) => {
            if (isDemo) {
                const updated = locations.map(l => l.id === id ? { ...l, ...data } : l);
                setLocations(updated);
                saveToLocal(STORAGE_KEYS.LOCATIONS, updated);
            } else {
                await updateDoc(doc(db, "locations", id), data);
            }
        },
        deleteLocation: async (id) => {
            if (isDemo) {
                const updated = locations.filter(l => l.id !== id);
                setLocations(updated);
                saveToLocal(STORAGE_KEYS.LOCATIONS, updated);
            } else {
                await deleteDoc(doc(db, "locations", id));
            }
        },

        addRoom: async (r) => {
            const id = uuidv4();
            const newRoom = { ...r, id };
            if (isDemo) {
                const updated = [...rooms, newRoom];
                setRooms(updated);
                saveToLocal(STORAGE_KEYS.ROOMS, updated);
            } else {
                await setDoc(doc(db, "rooms", id), newRoom);
            }
        },
        updateRoom: async (id, data) => {
            if (isDemo) {
                const updated = rooms.map(r => r.id === id ? { ...r, ...data } : r);
                setRooms(updated);
                saveToLocal(STORAGE_KEYS.ROOMS, updated);
            } else {
                await updateDoc(doc(db, "rooms", id), data);
            }
        },
        deleteRoom: async (id) => {
            if (isDemo) {
                const updated = rooms.filter(r => r.id !== id);
                setRooms(updated);
                saveToLocal(STORAGE_KEYS.ROOMS, updated);
            } else {
                await deleteDoc(doc(db, "rooms", id));
            }
        },

        addAsset: async (a) => {
            const id = uuidv4();
            const newAsset = { ...a, id };
            const logId = uuidv4();
            const newLog: AssetLog = {
                id: logId,
                assetId: id,
                type: "SYSTEM",
                toValue: "Aset didaftarkan",
                operatorName: a.lastModifiedBy || "Sistem",
                timestamp: new Date().toISOString(),
                notes: `Kategori: ${a.category}`
            };

            if (isDemo) {
                const updatedAssets = [...assets, newAsset];
                setAssets(updatedAssets);
                saveToLocal(STORAGE_KEYS.ASSETS, updatedAssets);

                const updatedLogs = [newLog, ...assetLogs];
                setAssetLogs(updatedLogs);
                saveToLocal(STORAGE_KEYS.ASSET_LOGS, updatedLogs);
            } else {
                await setDoc(doc(db, "assets", id), newAsset);
                await setDoc(doc(db, "assetLogs", logId), newLog);
            }
        },
        updateAsset: async (id, data) => {
            if (isDemo) {
                const updated = assets.map(a => a.id === id ? { ...a, ...data } : a);
                setAssets(updated);
                saveToLocal(STORAGE_KEYS.ASSETS, updated);
            } else {
                await updateDoc(doc(db, "assets", id), data as any);
            }
        },
        deleteAsset: async (id) => {
            if (isDemo) {
                setAssets(assets.filter(a => a.id !== id));
                saveToLocal(STORAGE_KEYS.ASSETS, assets.filter(a => a.id !== id));
                const updatedRA = roomAssets.filter(ra => ra.assetId !== id);
                setRoomAssets(updatedRA);
                saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);
            } else {
                await deleteDoc(doc(db, "assets", id));
                const q = query(collection(db, "roomAssets"));
                const snap = await getDocs(q);
                snap.docs.forEach(async (d) => {
                    if (d.data().assetId === id) await deleteDoc(doc(db, "roomAssets", d.id));
                });
            }
        },

        addRoomAsset: async (ra, opName) => {
            const id = uuidv4();
            const newRA = { ...ra, id };

            if (isDemo) {
                // Remove existing mapping first
                const filteredRA = roomAssets.filter(item => item.assetId !== ra.assetId);
                const updatedRA = [...filteredRA, newRA];
                setRoomAssets(updatedRA);
                saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);

                const destRoom = rooms.find(r => r.id === ra.roomId);
                if (destRoom) {
                    const updatedAssets = assets.map(a => a.id === ra.assetId ? {
                        ...a,
                        locationId: destRoom.locationId,
                        updatedAt: new Date().toISOString()
                    } : a);
                    setAssets(updatedAssets);
                    saveToLocal(STORAGE_KEYS.ASSETS, updatedAssets);

                    const logId = uuidv4();
                    const newLog: AssetLog = {
                        id: logId,
                        assetId: ra.assetId,
                        type: "MOVEMENT",
                        toValue: `Masuk ke Ruangan: ${destRoom.name}`,
                        operatorName: opName || "Admin",
                        timestamp: new Date().toISOString()
                    };
                    const updatedLogs = [newLog, ...assetLogs];
                    setAssetLogs(updatedLogs);
                    saveToLocal(STORAGE_KEYS.ASSET_LOGS, updatedLogs);
                }
            } else {
                const raQuery = query(collection(db, "roomAssets"));
                const raSnap = await getDocs(raQuery);
                const existingMaps = raSnap.docs.filter(d => d.data().assetId === ra.assetId);
                for (const oldDoc of existingMaps) await deleteDoc(doc(db, "roomAssets", oldDoc.id));

                await setDoc(doc(db, "roomAssets", id), newRA);

                const roomSnap = await getDoc(doc(db, "rooms", ra.roomId));
                const destRoom = roomSnap.exists() ? roomSnap.data() : null;
                if (destRoom) {
                    await updateDoc(doc(db, "assets", ra.assetId), {
                        locationId: destRoom.locationId,
                        updatedAt: new Date().toISOString()
                    });
                    const logId = uuidv4();
                    await setDoc(doc(db, "assetLogs", logId), {
                        id: logId,
                        assetId: ra.assetId,
                        type: "MOVEMENT",
                        toValue: `Masuk ke Ruangan: ${destRoom.name}`,
                        operatorName: opName || "Admin",
                        timestamp: new Date().toISOString()
                    });
                }
            }
        },
        deleteRoomAsset: async (id) => {
            if (isDemo) {
                const target = roomAssets.find(ra => ra.id === id);
                const updatedRA = roomAssets.filter(ra => ra.id !== id);
                setRoomAssets(updatedRA);
                saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);

                if (target) {
                    const logId = uuidv4();
                    const newLog: AssetLog = {
                        id: logId,
                        assetId: target.assetId,
                        type: "MOVEMENT",
                        toValue: "Ditarik ke Gudang",
                        operatorName: "Admin",
                        timestamp: new Date().toISOString()
                    };
                    const updatedLogs = [newLog, ...assetLogs];
                    setAssetLogs(updatedLogs);
                    saveToLocal(STORAGE_KEYS.ASSET_LOGS, updatedLogs);
                }
            } else {
                const target = roomAssets.find(ra => ra.id === id);
                await deleteDoc(doc(db, "roomAssets", id));
                if (target) {
                    const logId = uuidv4();
                    await setDoc(doc(db, "assetLogs", logId), {
                        id: logId,
                        assetId: target.assetId,
                        type: "MOVEMENT",
                        toValue: "Ditarik ke Gudang",
                        operatorName: "Admin",
                        timestamp: new Date().toISOString()
                    });
                }
            }
        },
        moveRoomAsset: async (assetId, newRoomId, opName) => {
            if (isDemo) {
                const ra = roomAssets.find(item => item.assetId === assetId);
                if (newRoomId === "GL-WAREHOUSE") {
                    if (ra) {
                        const updatedRA = roomAssets.filter(item => item.id !== ra.id);
                        setRoomAssets(updatedRA);
                        saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);
                    }
                    return;
                }
                const destRoom = rooms.find(r => r.id === newRoomId);
                if (ra && destRoom) {
                    const updatedRA = roomAssets.map(item => item.id === ra.id ? { ...item, roomId: newRoomId } : item);
                    setRoomAssets(updatedRA);
                    saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);

                    const updatedAssets = assets.map(a => a.id === assetId ? { ...a, locationId: destRoom.locationId, updatedAt: new Date().toISOString() } : a);
                    setAssets(updatedAssets);
                    saveToLocal(STORAGE_KEYS.ASSETS, updatedAssets);
                }
            } else {
                const q = query(collection(db, "roomAssets"));
                const snap = await getDocs(q);
                const ra = snap.docs.find(d => d.data().assetId === assetId);

                if (newRoomId === "GL-WAREHOUSE") {
                    if (ra) await deleteDoc(doc(db, "roomAssets", ra.id));
                    return;
                }

                const roomSnap = await getDoc(doc(db, "rooms", newRoomId));
                const destRoom = roomSnap.exists() ? roomSnap.data() : null;

                if (ra && destRoom) {
                    await updateDoc(doc(db, "roomAssets", ra.id), { roomId: newRoomId, updatedAt: new Date().toISOString() });
                    await updateDoc(doc(db, "assets", assetId), { locationId: destRoom.locationId, updatedAt: new Date().toISOString() });
                }
            }
        },

        addChecklist: async (c) => {
            const id = uuidv4();
            const newChecklist = { ...c, id, isRead: false };

            if (isDemo) {
                const updatedChecklists = [newChecklist, ...checklists];
                setChecklists(updatedChecklists);
                saveToLocal(STORAGE_KEYS.CHECKLISTS, updatedChecklists);

                let updatedAssets = [...assets];
                let updatedLogs = [...assetLogs];

                for (const item of c.items) {
                    const logId = uuidv4();
                    const newLog: AssetLog = {
                        id: logId,
                        assetId: item.assetId,
                        type: "STATUS",
                        toValue: item.status,
                        operatorName: c.operatorName,
                        timestamp: c.timestamp,
                        notes: item.notes
                    };
                    updatedLogs = [newLog, ...updatedLogs];

                    if (item.status) {
                        updatedAssets = updatedAssets.map(a => a.id === item.assetId ? {
                            ...a,
                            status: item.status,
                            conditionNotes: item.notes,
                            updatedAt: new Date().toISOString()
                        } : a);
                    }
                }
                setAssets(updatedAssets);
                saveToLocal(STORAGE_KEYS.ASSETS, updatedAssets);
                setAssetLogs(updatedLogs);
                saveToLocal(STORAGE_KEYS.ASSET_LOGS, updatedLogs);
            } else {
                await setDoc(doc(db, "checklists", id), newChecklist);
                for (const item of c.items) {
                    const logId = uuidv4();
                    await setDoc(doc(db, "assetLogs", logId), {
                        id: logId,
                        assetId: item.assetId,
                        type: "STATUS",
                        toValue: item.status,
                        operatorName: c.operatorName,
                        timestamp: c.timestamp,
                        notes: item.notes
                    });
                    if (item.status) {
                        await updateDoc(doc(db, "assets", item.assetId), {
                            status: item.status,
                            conditionNotes: item.notes,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            }
        },

        markChecklistAsRead: async (id) => {
            if (isDemo) {
                const updated = checklists.map(c => c.id === id ? { ...c, isRead: true } : c);
                setChecklists(updated);
                saveToLocal(STORAGE_KEYS.CHECKLISTS, updated);
            } else {
                await updateDoc(doc(db, "checklists", id), { isRead: true });
            }
        },

        addCategory: async (cat) => {
            const newList = [...categories, cat].sort((a, b) => a.localeCompare(b));
            if (isDemo) {
                setCategories(newList);
                saveToLocal(STORAGE_KEYS.CATEGORIES, newList);
            } else {
                await setDoc(doc(db, "settings", "categories"), { list: newList });
            }
        },
        deleteCategory: async (cat) => {
            const newList = categories.filter(c => c !== cat);
            if (isDemo) {
                setCategories(newList);
                saveToLocal(STORAGE_KEYS.CATEGORIES, newList);
            } else {
                await setDoc(doc(db, "settings", "categories"), { list: newList });
            }
        }
    };

    if (!isInitialized) return null;

    return (
        <LocalDbContext.Provider value={api}>
            {children}
        </LocalDbContext.Provider>
    );
}

export const useLocalDb = () => {
    const context = useContext(LocalDbContext);
    if (!context) throw new Error("useLocalDb must be used within LocalDbProvider");
    return context;
};
