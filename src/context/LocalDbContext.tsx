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
    addDoc,
    serverTimestamp,
    getDocs,
    getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";

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

export function LocalDbProvider({ children }: { children: ReactNode }) {
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

    // Real-time synchronization from Firestore
    useEffect(() => {
        if (!db) return;

        const unsubs: (() => void)[] = [];

        // 1. Locations
        const unsubLocs = onSnapshot(collection(db, "locations"), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
            setLocations(data);
        });
        unsubs.push(unsubLocs);

        // 2. Rooms
        const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
            setRooms(data);
        });
        unsubs.push(unsubRooms);

        // 3. Assets
        const unsubAssets = onSnapshot(collection(db, "assets"), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterAsset));
            setAssets(data);
        });
        unsubs.push(unsubAssets);

        // 4. Room Assets Mapping
        const unsubRoomAssets = onSnapshot(collection(db, "roomAssets"), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomAsset));
            setRoomAssets(data);
        });
        unsubs.push(unsubRoomAssets);

        // 5. Checklists
        const unsubChecklists = onSnapshot(query(collection(db, "checklists"), orderBy("timestamp", "desc")), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
            setChecklists(data);
        });
        unsubs.push(unsubChecklists);

        // 6. Asset Logs
        const unsubLogs = onSnapshot(query(collection(db, "assetLogs"), orderBy("timestamp", "desc")), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetLog));
            setAssetLogs(data);
        });
        unsubs.push(unsubLogs);

        // 7. Categories
        const unsubCats = onSnapshot(doc(db, "settings", "categories"), (docSnap) => {
            if (docSnap.exists()) {
                setCategories(docSnap.data().list || []);
            } else {
                // Initial categories if not exist in DB
                const initial = ["Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"];
                setDoc(doc(db, "settings", "categories"), { list: initial });
                setCategories(initial);
            }
        });
        unsubs.push(unsubCats);

        setIsInitialized(true);
        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const generateId = () => Math.random().toString(36).substring(2, 10);

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
            await setDoc(doc(db, "locations", id), { ...loc, id });
        },
        updateLocation: async (id, data) => {
            await updateDoc(doc(db, "locations", id), data);
        },
        deleteLocation: async (id) => {
            await deleteDoc(doc(db, "locations", id));
        },

        addRoom: async (r) => {
            const id = uuidv4();
            await setDoc(doc(db, "rooms", id), { ...r, id });
        },
        updateRoom: async (id, data) => {
            await updateDoc(doc(db, "rooms", id), data);
        },
        deleteRoom: async (id) => {
            await deleteDoc(doc(db, "rooms", id));
        },

        addAsset: async (a) => {
            const id = uuidv4();
            await setDoc(doc(db, "assets", id), { ...a, id });

            // Log as well
            const logId = uuidv4();
            await setDoc(doc(db, "assetLogs", logId), {
                id: logId,
                assetId: id,
                type: "SYSTEM",
                toValue: "Aset didaftarkan",
                operatorName: a.lastModifiedBy || "Sistem",
                timestamp: new Date().toISOString(),
                notes: `Kategori: ${a.category}`
            });
        },
        updateAsset: async (id, data) => {
            await updateDoc(doc(db, "assets", id), data as any);
        },
        deleteAsset: async (id) => {
            await deleteDoc(doc(db, "assets", id));
            // Cleanup room mapping
            const q = query(collection(db, "roomAssets"));
            const snap = await getDocs(q);
            snap.docs.forEach(async (d) => {
                if (d.data().assetId === id) await deleteDoc(doc(db, "roomAssets", d.id));
            });
        },

        addRoomAsset: async (ra, opName) => {
            // Cleanup: ensure the asset is removed from any other room first
            const raQuery = query(collection(db, "roomAssets"));
            const raSnap = await getDocs(raQuery);
            const existingMaps = raSnap.docs.filter(d => d.data().assetId === ra.assetId);

            for (const oldDoc of existingMaps) {
                await deleteDoc(doc(db, "roomAssets", oldDoc.id));
            }

            const id = uuidv4();
            await setDoc(doc(db, "roomAssets", id), { ...ra, id });

            // Fetch destination room info
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
        },
        deleteRoomAsset: async (id) => {
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
        },
        moveRoomAsset: async (assetId, newRoomId, opName) => {
            if (newRoomId === "GL-WAREHOUSE") {
                const ra = roomAssets.find(r => r.assetId === assetId);
                if (ra) await deleteDoc(doc(db, "roomAssets", ra.id));
                return;
            }

            const ra = roomAssets.find(r => r.assetId === assetId);
            const destRoom = rooms.find(r => r.id === newRoomId);
            if (ra && destRoom) {
                await updateDoc(doc(db, "roomAssets", ra.id), { roomId: newRoomId });
                await updateDoc(doc(db, "assets", assetId), { locationId: destRoom.locationId });
            }
        },

        addChecklist: async (c) => {
            const id = uuidv4();
            await setDoc(doc(db, "checklists", id), { ...c, id, isRead: false });

            // Create logs for each item
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
            }
        },

        markChecklistAsRead: async (id) => {
            await updateDoc(doc(db, "checklists", id), { isRead: true });
        },

        addCategory: async (cat) => {
            const newList = [...categories, cat].sort((a, b) => a.localeCompare(b));
            await setDoc(doc(db, "settings", "categories"), { list: newList });
        },
        deleteCategory: async (cat) => {
            const newList = categories.filter(c => c !== cat);
            await setDoc(doc(db, "settings", "categories"), { list: newList });
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
