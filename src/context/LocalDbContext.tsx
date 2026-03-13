"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    getDocs,
    getDoc
} from "firebase/firestore";
import { Activity, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./AuthContext";

// Types
export interface Company {
    id: string;
    name: string;
    description: string;
    status: "ACTIVE" | "INACTIVE";
    logoUrl?: string;
    email?: string;
    phone?: string;
    createdAt: string;
    requireChecklistPhoto?: boolean; 
    retention?: {
        assetLogsDays?: number;
        checklistsDays?: number;
        deletedAssetsDays?: number;
        assetHistoryDays?: number;
        activeAssetsDays?: number;
    };
}

export interface Location {
    id: string;
    companyId: string;
    name: string;
    address: string;
}

export interface Room {
    id: string;
    companyId: string;
    locationId: string;
    name: string;
    description: string;
}

export interface MasterAsset {
    id: string;
    companyId: string;
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
    companyId: string;
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
    photoUrl?: string;
}

export interface AssetLog {
    id: string;
    companyId: string;
    assetId?: string;
    assetName?: string;
    type: "STATUS" | "MOVEMENT" | "SYSTEM" | "AUTH";
    fromValue?: string;
    toValue: string;
    operatorName: string;
    operatorRole?: string;
    timestamp: string;
    notes?: string;
}

export interface Checklist {
    id: string;
    companyId: string;
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

export interface ChangelogEntry {
    id: string;
    version: string;
    date: string;
    title: string;
    description: string;
    type: "FEAT" | "FIX" | "IMPROVE";
    changes: string[];
    visibility: "PUBLIC" | "SUPER_ADMIN";
}

export interface OperatorShift {
    id: string;
    companyId: string;
    operatorId: string;
    operatorName: string;
    operatorPhone?: string;
    startTime: string;
    endTime: string;
    locationId: string;
    locationName: string;
    notes?: string;
    status: "ACTIVE" | "COMPLETED";
    createdAt: string;
}

export interface DeletedAsset {
    id: string;
    companyId: string;
    assetId: string;
    assetName: string;
    assetCode: string;
    category: string;
    deletedBy: string;
    deleteDate: string;
    reason: string;
    originalAssetData: any;
}

interface LocalDbContextType {
    companies: Company[];
    locations: Location[];
    rooms: Room[];
    assets: MasterAsset[];
    deletedAssets: DeletedAsset[];
    roomAssets: RoomAsset[];
    checklists: Checklist[];
    assetLogs: AssetLog[];
    categories: string[];

    // Actions
    addCompany: (company: Omit<Company, "id" | "createdAt" | "status">) => Promise<void>;
    updateCompany: (id: string, company: Partial<Omit<Company, "id" | "createdAt">>) => Promise<void>;
    deleteCompany: (id: string) => Promise<void>;

    addLocation: (loc: Omit<Location, "id" | "companyId">) => Promise<void>;
    updateLocation: (id: string, loc: Partial<Omit<Location, "id" | "companyId">>) => Promise<void>;
    deleteLocation: (id: string) => Promise<void>;

    addCategory: (cat: string) => void;
    bulkAddCategories: (cats: string[]) => Promise<void>;
    deleteCategory: (cat: string) => void;

    addRoom: (room: Omit<Room, "id" | "companyId">) => Promise<void>;
    updateRoom: (id: string, room: Partial<Omit<Room, "id" | "companyId">>) => Promise<void>;
    deleteRoom: (id: string) => Promise<void>;

    changelogs: ChangelogEntry[];
    addChangelog: (entry: Omit<ChangelogEntry, "id">) => Promise<void>;

    addAsset: (asset: Omit<MasterAsset, "id" | "companyId">) => Promise<void>;
    updateAsset: (id: string, asset: Partial<Omit<MasterAsset, "id" | "companyId">>) => Promise<void>;
    deleteAsset: (id: string, reason?: string) => Promise<void>;
    bulkAddAssets: (assets: Omit<MasterAsset, "id" | "companyId">[]) => Promise<void>;

    addRoomAsset: (roomAsset: Omit<RoomAsset, "id" | "companyId">, opName?: string) => Promise<void>;
    deleteRoomAsset: (id: string, opName?: string) => Promise<void>;
    moveRoomAsset: (assetId: string, newRoomId: string, opName?: string) => Promise<void>;

    addChecklist: (checklist: Omit<Checklist, "id" | "isRead" | "companyId">) => Promise<void>;
    markChecklistAsRead: (id: string) => Promise<void>;
    addLog: (log: Omit<AssetLog, "id" | "timestamp" | "operatorName" | "companyId"> & { operatorName?: string; companyId?: string }) => Promise<void>;
    purgeData: (companyId: string, type: 'LOGS' | 'REPORTS' | 'TRASH' | 'ASSET_HISTORY' | 'ACTIVE_ASSETS', days?: number) => Promise<void>;

    operatorShifts: OperatorShift[];
    addShift: (shift: Omit<OperatorShift, "id" | "companyId" | "operatorId" | "operatorName" | "operatorPhone" | "status" | "createdAt">) => Promise<string>;
    endShift: (id: string) => Promise<void>;

    // Global UI State
    isSystemBusy: boolean;
}

const LocalDbContext = createContext<LocalDbContextType | null>(null);

export function LocalDbProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === "SUPER_ADMIN";

    const finalCompanyId = useMemo(() => {
        if (!user || isSuperAdmin) return "";
        return user.companyId || (typeof window !== 'undefined' ? localStorage.getItem("last_known_company_id") : "") || "";
    }, [user, isSuperAdmin]);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [assets, setAssets] = useState<MasterAsset[]>([]);
    const [roomAssets, setRoomAssets] = useState<RoomAsset[]>([]);
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [assetLogs, setAssetLogs] = useState<AssetLog[]>([]);
    const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
    const [operatorShifts, setOperatorShifts] = useState<OperatorShift[]>([]);
    const [categories, setCategories] = useState<string[]>([
        "Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"
    ]);
    const [deletedAssets, setDeletedAssets] = useState<DeletedAsset[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [initialCategories] = useState(["Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"]);
    
    // Global Processing State
    const [isSystemBusy, setIsSystemBusy] = useState(false);

    const resetStates = () => {
        setCompanies([]);
        setLocations([]);
        setRooms([]);
        setAssets([]);
        setRoomAssets([]);
        setChecklists([]);
        setAssetLogs([]);
        setChangelogs([]);
        setOperatorShifts([]);
        setCategories(initialCategories);
        setDeletedAssets([]);
        setIsSystemBusy(false);
    };

    useEffect(() => {
        if (!user) {
            resetStates();
            setIsInitialized(false);
            setIsSystemBusy(false); // Force clear loading on logout
        }
    }, [user]);

    useEffect(() => {
        if (!db || !user) return;
        resetStates();
        const unsubs: (() => void)[] = [];

        if (!isSuperAdmin && !finalCompanyId) return;

        const getBaseQuery = (collName: string) => {
            if (isSuperAdmin) return collection(db, collName);
            return query(collection(db, collName), where("companyId", "==", finalCompanyId));
        };

        // Koleksi 'companies' tidak punya field 'companyId', jadi tidak bisa pakai getBaseQuery.
        // Untuk SUPER_ADMIN: ambil semua perusahaan.
        // Untuk user biasa (ADMIN/OPERATOR/CLIENT): ambil hanya dokumen perusahaan mereka sendiri.
        if (isSuperAdmin) {
            unsubs.push(onSnapshot(collection(db, "companies"), (snap) => {
                setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
            }));
        } else if (finalCompanyId) {
            unsubs.push(onSnapshot(doc(db, "companies", finalCompanyId), (docSnap) => {
                if (docSnap.exists()) {
                    setCompanies([{ id: docSnap.id, ...docSnap.data() } as Company]);
                } else {
                    setCompanies([]);
                }
            }));
        }
        unsubs.push(onSnapshot(getBaseQuery("locations"), (snap) => {
            setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
        }));
        unsubs.push(onSnapshot(getBaseQuery("rooms"), (snap) => {
            setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
        }));
        unsubs.push(onSnapshot(getBaseQuery("assets"), (snap) => {
            setAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterAsset)));
        }));
        unsubs.push(onSnapshot(getBaseQuery("deleted_assets"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedAsset));
            // Urutkan dari yang terbaru ke terlama
            list.sort((a, b) => new Date(b.deleteDate).getTime() - new Date(a.deleteDate).getTime());
            setDeletedAssets(list);
        }));
        unsubs.push(onSnapshot(getBaseQuery("roomAssets"), (snap) => {
            setRoomAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomAsset)));
        }));
        unsubs.push(onSnapshot(
            isSuperAdmin ? collection(db, "checklists") : query(collection(db, "checklists"), where("companyId", "==", finalCompanyId)),
            (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
                setChecklists(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            }
        ));
        unsubs.push(onSnapshot(
            isSuperAdmin ? collection(db, "assetLogs") : query(collection(db, "assetLogs"), where("companyId", "==", finalCompanyId)),
            (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetLog));
                setAssetLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            }
        ));
        unsubs.push(onSnapshot(query(collection(db, "changelogs"), orderBy("date", "desc")), (snap) => {
            setChangelogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangelogEntry)));
        }));
        unsubs.push(onSnapshot(doc(db, "settings", "categories"), (docSnap) => {
            if (docSnap.exists()) setCategories(docSnap.data().list || []);
            else {
                setDoc(doc(db, "settings", "categories"), { list: initialCategories });
                setCategories(initialCategories);
            }
        }));
        unsubs.push(onSnapshot(getBaseQuery("operatorShifts"), (snap) => {
            setOperatorShifts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperatorShift)));
        }));

        setIsInitialized(true);
        return () => unsubs.forEach(unsub => unsub());
    }, [user?.uid, finalCompanyId, isSuperAdmin, initialCategories]);

    // MAGIC HELPER: Auto-Loading with 400ms Threshold
    // Guard: Tidak tampilkan overlay jika user sudah logout (user === null)
    const withLoading = async <T,>(action: () => Promise<T>): Promise<T> => {
        let isDone = false;
        let overlayShown = false;
        
        // Timer: hanya aktif jika user masih login
        const timer = setTimeout(() => {
            if (!isDone && user !== null) {
                setIsSystemBusy(true);
                overlayShown = true;
            }
        }, 200);

        try {
            const result = await action();
            return result;
        } finally {
            isDone = true;
            clearTimeout(timer);
            if (overlayShown) setIsSystemBusy(false);
        }
    };

    const api: LocalDbContextType = {
        companies,
        locations,
        rooms,
        assets,
        deletedAssets,
        roomAssets,
        checklists,
        assetLogs,
        categories,
        changelogs,
        operatorShifts,
        isSystemBusy,

        addCompany: async (comp) => withLoading(async () => {
            const id = uuidv4();
            const newComp: Company = { ...comp, id, status: "ACTIVE", createdAt: new Date().toISOString() };
            await setDoc(doc(db, "companies", id), newComp);
        }),
        updateCompany: async (id, data) => withLoading(async () => {
            console.log("DEBUG: Updating company", id, data);
            try {
                await updateDoc(doc(db, "companies", id), data);
                console.log("DEBUG: Update successful");
            } catch (err) {
                console.error("DEBUG: Update failed", err);
                throw err;
            }
        }),
        deleteCompany: async (id) => withLoading(async () => {
            await deleteDoc(doc(db, "companies", id));
        }),

        addLocation: async (loc) => withLoading(async () => {
            const id = uuidv4();
            const companyId = finalCompanyId;
            const newLoc = { ...loc, id, companyId };
            await setDoc(doc(db, "locations", id), newLoc);
            await api.addLog({ type: "SYSTEM", toValue: `Lokasi Baru: ${loc.name}`, notes: `Menambahkan cabang: ${loc.name}`, companyId });
        }),
        updateLocation: async (id, data) => withLoading(async () => {
            await updateDoc(doc(db, "locations", id), data);
            await api.addLog({ type: "SYSTEM", toValue: `Update Lokasi: ${data.name}`, notes: `Update cabang: ${data.name}`, companyId: finalCompanyId });
        }),
        deleteLocation: async (id) => withLoading(async () => {
            const target = locations.find(l => l.id === id);
            await deleteDoc(doc(db, "locations", id));
            if (target) await api.addLog({ type: "SYSTEM", toValue: `Hapus Lokasi: ${target.name}`, notes: `Hapus cabang`, companyId: finalCompanyId });
        }),

        addCategory: async (cat) => {
            const trimmed = cat.trim();
            if (!trimmed) return;
            setCategories(prev => {
                if (prev.some(c => c.toLowerCase() === trimmed.toLowerCase())) return prev;
                const newList = [...prev, trimmed].sort((a, b) => a.localeCompare(b));
                setDoc(doc(db, "settings", "categories"), { list: newList });
                return newList;
            });
        },
        bulkAddCategories: async (cats) => {
            if (!cats || cats.length === 0) return;
            setCategories(prev => {
                const uniqueNew = cats.map(c => c.trim()).filter(c => c && !prev.some(p => p.toLowerCase() === c.toLowerCase()));
                if (uniqueNew.length === 0) return prev;
                const newList = [...prev, ...uniqueNew].sort((a, b) => a.localeCompare(b));
                setDoc(doc(db, "settings", "categories"), { list: newList });
                return newList;
            });
        },
        deleteCategory: async (cat) => {
            const newList = categories.filter(c => c !== cat);
            setDoc(doc(db, "settings", "categories"), { list: newList });
        },

        addRoom: async (r) => withLoading(async () => {
            const id = uuidv4();
            const companyId = finalCompanyId;
            await setDoc(doc(db, "rooms", id), { ...r, id, companyId });
            await api.addLog({ type: "SYSTEM", toValue: `Ruangan Baru: ${r.name}`, notes: `Room added`, companyId });
        }),
        updateRoom: async (id, data) => withLoading(async () => {
            await updateDoc(doc(db, "rooms", id), data);
            await api.addLog({ type: "SYSTEM", toValue: `Update Ruangan: ${data.name}`, notes: `Room updated`, companyId: finalCompanyId });
        }),
        deleteRoom: async (id) => withLoading(async () => {
            const target = rooms.find(r => r.id === id);
            await deleteDoc(doc(db, "rooms", id));
            if (target) await api.addLog({ type: "SYSTEM", toValue: `Hapus Ruangan: ${target.name}`, notes: `Room deleted`, companyId: finalCompanyId });
        }),

        addChangelog: async (entry) => {
            const id = uuidv4();
            await setDoc(doc(db, "changelogs", id), { ...entry, id });
        },

        addAsset: async (a) => withLoading(async () => {
            const id = uuidv4();
            const companyId = finalCompanyId;
            if (!isSuperAdmin && !companyId) throw new Error("ID Perusahaan tidak ditemukan.");
            await setDoc(doc(db, "assets", id), { ...a, id, companyId });
            await api.addLog({ assetId: id, assetName: a.name, type: "SYSTEM", toValue: `Aset Baru`, notes: `Asset: ${a.name}`, companyId });
        }),
        updateAsset: async (id, data) => withLoading(async () => {
            await updateDoc(doc(db, "assets", id), data as any);
        }),
        deleteAsset: async (id, reason = "Dihapus oleh admin") => withLoading(async () => {
            const asset = assets.find(a => a.id === id);
            const companyId = finalCompanyId;
            const operatorName = user?.name || user?.email || "Unknown";

            // ── VALIDASI ROLE DI SISI APLIKASI (lebih andal dari Firebase Rules) ──
            if (asset && user?.role !== "SUPER_ADMIN") {
                const isClientAsset =
                    asset.category?.toLowerCase().includes("client asset") ||
                    asset.category?.toLowerCase().includes("client aset");

                if (user?.role === "ADMIN" && isClientAsset) {
                    throw new Error("ADMIN STUDIO tidak dapat menghapus aset dengan kategori Client Aset.");
                }
                if (user?.role === "CLIENT_ADMIN" && !isClientAsset) {
                    throw new Error("CLIENT ADMIN hanya dapat menghapus aset dengan kategori Client Aset.");
                }
            }

            if (asset) {
                const deletedAssetRecord: DeletedAsset = {
                    id: uuidv4(),
                    companyId: companyId,
                    assetId: asset.id,
                    assetName: asset.name,
                    assetCode: asset.assetCode || "-",
                    category: asset.category,
                    deletedBy: operatorName,
                    deleteDate: new Date().toISOString(),
                    reason: reason,
                    originalAssetData: asset
                };
                await setDoc(doc(db, "deleted_assets", deletedAssetRecord.id), deletedAssetRecord);
            }

            await deleteDoc(doc(db, "assets", id));
            const existingInRooms = roomAssets.filter(ra => ra.assetId === id);
            for (const ra of existingInRooms) {
                await deleteDoc(doc(db, "roomAssets", ra.id));
            }

            await api.addLog({ assetId: id, assetName: asset?.name || "Unknown Asset", type: "SYSTEM", toValue: "DELETED", operatorName, notes: `Reason: ${reason}`, companyId });
        }),
        bulkAddAssets: async (newAssets) => withLoading(async () => {
            const companyId = finalCompanyId;
            for (const a of newAssets) {
                const id = uuidv4();
                await setDoc(doc(db, "assets", id), { ...a, id, companyId });
            }
        }),

        addRoomAsset: async (ra, opName) => {
            const id = uuidv4();
            const companyId = finalCompanyId;
            if (!isSuperAdmin && !companyId) throw new Error("Sesi perusahaan tidak valid.");

            let assetData = assets.find(a => a.id === ra.assetId);
            let roomData = rooms.find(r => r.id === ra.roomId);

            if (!roomData) {
                const snap = await getDoc(doc(db, "rooms", ra.roomId));
                if (snap.exists()) roomData = { id: snap.id, ...snap.data() } as Room;
            }

            if (assetData && (assetData.status === "SERVIS" || assetData.status === "JUAL")) {
                throw new Error(`Aset dengan status ${assetData.status} tidak bisa dimasukkan ke ruangan.`);
            }

            const existingMaps = roomAssets.filter(item => item.assetId === ra.assetId);
            for (const oldDoc of existingMaps) {
                await deleteDoc(doc(db, "roomAssets", oldDoc.id));
            }

            await setDoc(doc(db, "roomAssets", id), { ...ra, id, companyId });

            if (roomData) {
                await updateDoc(doc(db, "assets", ra.assetId), { locationId: roomData.locationId, companyId, updatedAt: new Date().toISOString() });
                await api.addLog({ assetId: ra.assetId, assetName: ra.assetName, type: "MOVEMENT", toValue: `Masuk ke Ruangan: ${roomData.name}`, operatorName: opName || "Admin", companyId, notes: `Moved to room` });
            }
        },
        deleteRoomAsset: async (id, opName) => {
            const target = roomAssets.find(ra => ra.id === id);
            await deleteDoc(doc(db, "roomAssets", id));
            if (target) {
                await api.addLog({ assetId: target.assetId, assetName: target.assetName, type: "MOVEMENT", toValue: "Ditarik ke Gudang", operatorName: opName || "Admin", companyId: finalCompanyId, notes: "Moved to warehouse" });
            }
        },
        moveRoomAsset: async (assetId, newRoomId, opName) => {
            const companyId = finalCompanyId;
            const ra = roomAssets.find(item => item.assetId === assetId);

            if (newRoomId === "GL-WAREHOUSE") {
                if (ra) {
                    await deleteDoc(doc(db, "roomAssets", ra.id));
                    await api.addLog({ assetId: ra.assetId, assetName: ra.assetName, type: "MOVEMENT", toValue: "Pindah ke Gudang", operatorName: opName || "Admin", companyId, notes: "Moved to warehouse" });
                }
                return;
            }

            let destRoom = rooms.find(r => r.id === newRoomId);
            if (!destRoom) {
                const snap = await getDoc(doc(db, "rooms", newRoomId));
                if (snap.exists()) destRoom = { id: snap.id, ...snap.data() } as Room;
            }

            if (ra && destRoom) {
                await updateDoc(doc(db, "roomAssets", ra.id), { roomId: newRoomId, updatedAt: new Date().toISOString() });
                await updateDoc(doc(db, "assets", assetId), { locationId: destRoom.locationId, companyId, updatedAt: new Date().toISOString() });
                await api.addLog({ assetId: ra.assetId, assetName: ra.assetName, type: "MOVEMENT", toValue: `Pindah ke: ${destRoom.name}`, operatorName: opName || "Admin", companyId, notes: `Moved to ${destRoom.name}` });
            }
        },

        addChecklist: async (c) => withLoading(async () => {
            const id = uuidv4();
            const companyId = finalCompanyId;
            await setDoc(doc(db, "checklists", id), { ...c, id, companyId, isRead: false });

            for (const item of c.items) {
                const currentAsset = assets.find(a => a.id === item.assetId);
                await api.addLog({ assetId: item.assetId, assetName: item.assetName, type: "STATUS", fromValue: currentAsset?.status || "BAIK", toValue: item.status, operatorName: c.operatorName, companyId, notes: item.notes || `Audit in ${c.roomName}` });
                if (item.status) {
                    await updateDoc(doc(db, "assets", item.assetId), { status: item.status, conditionNotes: item.notes, companyId, updatedAt: new Date().toISOString() });
                }
            }
            await api.addLog({ type: "SYSTEM", toValue: `Audit Room: ${c.roomStatus || "SELESAI"}`, operatorName: c.operatorName, companyId, notes: `Checklist submitted for ${c.roomName}` });
        }),
        // Internal helper - tidak perlu loading UI
        markChecklistAsRead: async (id) => {
            await updateDoc(doc(db, "checklists", id), { isRead: true });
        },

        // Internal helper - dipanggil background oleh semua fungsi lain, tidak perlu loading UI
        addLog: async (log) => {
            const id = uuidv4();
            const timestamp = new Date().toISOString();
            const finalName = log.operatorName || user?.name || user?.email || "Admin";
            const finalRole = log.operatorRole || user?.role || "SYSTEM";
            let companyId = log.companyId || user?.companyId || "";
            if (!companyId && finalRole !== "SUPER_ADMIN" && finalRole !== "SYSTEM") companyId = localStorage.getItem("last_known_company_id") || "";
            const newLog: AssetLog = { ...log, id, companyId, timestamp, operatorName: finalName, operatorRole: finalRole };
            await setDoc(doc(db, "assetLogs", id), newLog);
        },

        purgeData: async (companyId, type, days) => withLoading(async () => {
            if (!companyId) return;
            const collectionMapping: Record<string, string> = {
                'LOGS': 'assetLogs',
                'ASSET_HISTORY': 'assetLogs',
                'REPORTS': 'checklists',
                'TRASH': 'deleted_assets',
                'ACTIVE_ASSETS': 'assets'
            };
            const collName = collectionMapping[type];
            let q = query(collection(db, collName), where("companyId", "==", companyId));

            if (type === 'LOGS') {
                q = query(q, where("type", "in", ["SYSTEM", "AUTH"]));
            } else if (type === 'ASSET_HISTORY') {
                q = query(q, where("type", "in", ["STATUS", "MOVEMENT"]));
            }

            if (days !== undefined && days > 0) {
                const threshold = new Date();
                threshold.setDate(threshold.getDate() - days);
                const thresholdStr = threshold.toISOString();
                
                const timeField = type === 'TRASH' ? 'deleteDate' : 'timestamp';
                q = query(q, where(timeField, "<", thresholdStr));
            }

            const snap = await getDocs(q);
            const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);

            // Clean up related data if purging active assets
            if (type === 'ACTIVE_ASSETS') {
                const raQuery = query(collection(db, "roomAssets"), where("companyId", "==", companyId));
                const raSnap = await getDocs(raQuery);
                const raDeletePromises = raSnap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(raDeletePromises);
            }
            
            await api.addLog({
                type: "SYSTEM",
                toValue: `Pembersihan ${type}`,
                notes: days ? `Hapus otomatis data > ${days} hari` : `Hapus manual seluruh data`,
                companyId: companyId
            });
        }),

        addShift: async (shiftData) => withLoading(async () => {
            const companyId = user?.companyId || "";
            const operatorId = user?.uid || "";
            if (operatorShifts.find(s => s.operatorId === operatorId && s.status === "ACTIVE")) throw new Error("Active shift exists.");

            const id = uuidv4();
            const operatorName = user?.name || user?.email || "Operator";
            const operatorPhone = user?.phone || "";
            const newShift: OperatorShift = { ...shiftData, id, companyId, operatorId, operatorName, operatorPhone, status: "ACTIVE", createdAt: new Date().toISOString() };
            await setDoc(doc(db, "operatorShifts", id), newShift);
            await api.addLog({ type: "AUTH", toValue: "Mulai Tugas", operatorName, companyId, notes: `Start shift: ${shiftData.locationName}` });
            return id;
        }),
        endShift: async (id) => withLoading(async () => {
            const target = operatorShifts.find(s => s.id === id);
            await updateDoc(doc(db, "operatorShifts", id), { status: "COMPLETED" });
            if (target) await api.addLog({ type: "AUTH", toValue: "Selesai Tugas", operatorName: target.operatorName, companyId: target.companyId, notes: `End shift` });
        })
    };

    return (
        <LocalDbContext.Provider value={api}>
            {children}
            {/* Global Processing Overlay - Minimalist & Professional */}
            {isSystemBusy && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/10 backdrop-blur-[2px] animate-in fade-in duration-500">
                    {/* Top Progress Bar Part */}
                    <div className="fixed top-0 left-0 right-0 h-0.5 bg-gray-100 overflow-hidden">
                        <div className="h-full bg-brand-purple w-1/3 animate-[shimmer_1.5s_infinite_linear] shadow-[0_0_10px_rgba(124,77,255,0.5)]"></div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 border-2 border-brand-purple/10 border-t-brand-purple rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-brand-purple opacity-40 animate-pulse" />
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-brand-purple/60 uppercase tracking-[0.3em] ml-1">System Working</p>
                    </div>
                </div>
            )}
        </LocalDbContext.Provider>
    );
}

export const useLocalDb = () => {
    const context = useContext(LocalDbContext);
    if (!context) throw new Error("useLocalDb must be used within LocalDbProvider");
    return context;
};
