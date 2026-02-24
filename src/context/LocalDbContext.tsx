"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

    // Load from local storage
    useEffect(() => {
        const loadInitialData = () => {
            try {
                const storedLocations = localStorage.getItem("ls_locations");
                const storedRooms = localStorage.getItem("ls_rooms");
                const storedAssets = localStorage.getItem("ls_assets");
                const storedRoomAssets = localStorage.getItem("ls_room_assets");
                const storedChecklists = localStorage.getItem("ls_checklists");
                const storedAssetLogs = localStorage.getItem("ls_asset_logs");
                const storedCategories = localStorage.getItem("ls_categories");

                if (storedLocations) {
                    const parsed = JSON.parse(storedLocations);
                    if (Array.isArray(parsed)) setLocations(parsed);
                }
                if (storedRooms) {
                    const parsed = JSON.parse(storedRooms);
                    if (Array.isArray(parsed)) {
                        setRooms(parsed.map((r: any) => ({ ...r, locationId: r.locationId || "" })));
                    }
                }
                if (storedAssets) {
                    const parsed = JSON.parse(storedAssets);
                    if (Array.isArray(parsed)) {
                        setAssets(parsed.map((a: any, index: number) => {
                            let fixedCode = a.assetCode;
                            if (!fixedCode || fixedCode.trim() === "") {
                                const prefix = (a.category?.substring(0, 3).toUpperCase() || "BRG");
                                fixedCode = `${prefix}-${String(index + 1).padStart(4, '0')}`;
                            }

                            return {
                                ...a,
                                locationId: a.locationId || "",
                                assetCode: fixedCode,
                                entryDate: a.entryDate || new Date().toISOString().split('T')[0],
                                lastModifiedBy: a.lastModifiedBy || "Sistem",
                                updatedAt: a.updatedAt || new Date().toISOString()
                            };
                        }));
                    }
                }
                if (storedRoomAssets) {
                    const parsed = JSON.parse(storedRoomAssets);
                    if (Array.isArray(parsed)) setRoomAssets(parsed);
                }
                if (storedChecklists) {
                    const parsed = JSON.parse(storedChecklists);
                    if (Array.isArray(parsed)) setChecklists(parsed);
                }
                if (storedAssetLogs) {
                    const parsed = JSON.parse(storedAssetLogs);
                    if (Array.isArray(parsed)) setAssetLogs(parsed);
                }
                if (storedCategories) {
                    const parsed = JSON.parse(storedCategories);
                    if (Array.isArray(parsed)) setCategories(parsed);
                }
            } catch (e) {
                console.error("Local storage initialization error:", e);
            } finally {
                setIsInitialized(true);
            }
        };

        loadInitialData();
    }, []);

    // Save to local storage automatically
    useEffect(() => {
        if (!isInitialized) return;

        const timeout = setTimeout(() => {
            try {
                localStorage.setItem("ls_locations", JSON.stringify(locations));
                localStorage.setItem("ls_rooms", JSON.stringify(rooms));
                localStorage.setItem("ls_assets", JSON.stringify(assets));
                localStorage.setItem("ls_room_assets", JSON.stringify(roomAssets));
                localStorage.setItem("ls_checklists", JSON.stringify(checklists));
                localStorage.setItem("ls_asset_logs", JSON.stringify(assetLogs));
                localStorage.setItem("ls_categories", JSON.stringify(categories));
            } catch (e) {
                console.error("Error saving to local storage:", e);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [locations, rooms, assets, roomAssets, checklists, assetLogs, categories, isInitialized]);

    const generateId = () => Math.random().toString(36).substring(2, 10);

    const api: LocalDbContextType = {
        locations,
        rooms,
        assets,
        roomAssets,
        checklists,
        assetLogs,
        categories,

        addLocation: (loc) => setLocations(prev => [...prev, { ...loc, id: generateId() }]),
        updateLocation: (id, data) => setLocations(prev => prev.map(l => l.id === id ? { ...l, ...data } : l)),
        deleteLocation: (id) => setLocations(prev => prev.filter(l => l.id !== id)),

        addRoom: (r) => setRooms(prev => [...prev, { ...r, id: generateId() }]),
        updateRoom: (id, data) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r)),
        deleteRoom: (id) => {
            setRooms(prev => prev.filter(r => r.id !== id));
            setRoomAssets(prev => prev.filter(ra => ra.roomId !== id));
        },

        addAsset: (a) => {
            const id = generateId();
            setAssets(prev => [...prev, { ...a, id }]);
            setAssetLogs(prev => [...prev, {
                id: generateId(),
                assetId: id,
                type: "SYSTEM",
                toValue: "Aset didaftarkan",
                operatorName: a.lastModifiedBy || "Sistem",
                timestamp: new Date().toISOString(),
                notes: `Kategori: ${a.category}`
            }]);
        },
        updateAsset: (id, data) => {
            setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
            setRoomAssets(prev => prev.map(ra => ra.assetId === id ? {
                ...ra,
                assetName: (data as any).name || ra.assetName
            } : ra));
        },
        deleteAsset: (id) => {
            setAssets(prev => prev.filter(a => a.id !== id));
            setRoomAssets(prev => prev.filter(ra => ra.assetId !== id));
        },

        addRoomAsset: (ra, opName) => {
            const destRoom = rooms.find(r => r.id === ra.roomId);
            if (!destRoom) return;

            setRoomAssets(prev => {
                const filtered = prev.filter(item => item.assetId !== ra.assetId);
                return [...filtered, { ...ra, id: generateId() }];
            });

            setAssets(prev => prev.map(a => a.id === ra.assetId ? { ...a, locationId: destRoom.locationId } : a));

            setAssetLogs(prev => [...prev, {
                id: generateId(),
                assetId: ra.assetId,
                type: "MOVEMENT",
                toValue: `Masuk ke Ruangan: ${destRoom.name}`,
                operatorName: opName || "Admin",
                timestamp: new Date().toISOString(),
                notes: opName ? "Tarik aset saat checklist" : "Distribusi Aset"
            }]);
        },
        deleteRoomAsset: (id) => {
            const target = roomAssets.find(ra => ra.id === id);
            setRoomAssets(prev => prev.filter(ra => ra.id !== id));
            if (target) {
                setAssetLogs(prev => [...prev, {
                    id: generateId(),
                    assetId: target.assetId,
                    type: "MOVEMENT",
                    toValue: "Ditarik ke Gudang",
                    operatorName: "Admin",
                    timestamp: new Date().toISOString()
                }]);
            }
        },
        moveRoomAsset: (assetId, newRoomId, opName) => {
            if (newRoomId === "GL-WAREHOUSE") {
                const sourceRoomAsset = roomAssets.find(ra => ra.assetId === assetId);
                const sourceRoom = rooms.find(r => r.id === sourceRoomAsset?.roomId);

                setRoomAssets(prev => prev.filter(ra => ra.assetId !== assetId));
                setAssetLogs(prev => [...prev, {
                    id: generateId(),
                    assetId: assetId,
                    type: "MOVEMENT",
                    fromValue: sourceRoom?.name || "Ruangan",
                    toValue: "Ditarik ke Gudang",
                    operatorName: opName || "Sistem",
                    timestamp: new Date().toISOString(),
                    notes: "Dikembalikan saat checklist"
                }]);
                return;
            }

            const destRoom = rooms.find(r => r.id === newRoomId);
            const sourceRoomAsset = roomAssets.find(ra => ra.assetId === assetId);
            const sourceRoom = rooms.find(r => r.id === sourceRoomAsset?.roomId);

            if (destRoom) {
                setRoomAssets(prev => prev.map(ra => ra.assetId === assetId ? { ...ra, roomId: newRoomId } : ra));
                setAssets(prev => prev.map(a => a.id === assetId ? { ...a, locationId: destRoom.locationId } : a));

                setAssetLogs(prev => [...prev, {
                    id: generateId(),
                    assetId: assetId,
                    type: "MOVEMENT",
                    fromValue: sourceRoom?.name || "Ruangan",
                    toValue: `Pindah ke: ${destRoom.name}`,
                    operatorName: opName || "Sistem",
                    timestamp: new Date().toISOString(),
                    notes: opName ? "Mutasi saat checklist" : "Mutasi Ruangan"
                }]);
            }
        },

        addChecklist: (c) => {
            const checklistId = generateId();
            setChecklists(prev => [...prev, { ...c, id: checklistId, isRead: false }]);

            c.items.forEach(item => {
                setAssetLogs(prev => {
                    const logs = [...prev];
                    logs.push({
                        id: generateId(),
                        assetId: item.assetId,
                        type: "STATUS",
                        toValue: item.status,
                        operatorName: c.operatorName,
                        timestamp: c.timestamp,
                        notes: item.notes
                    });
                    return logs;
                });
            });
        },

        markChecklistAsRead: (id) => {
            setChecklists(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c));
        },

        addCategory: (cat) => {
            if (!categories.includes(cat)) {
                setCategories(prev => [...prev, cat].sort((a, b) => a.localeCompare(b)));
            }
        },
        deleteCategory: (cat) => setCategories(prev => prev.filter(c => c !== cat))
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
