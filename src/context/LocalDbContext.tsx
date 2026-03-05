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
    addCompany: (company: Omit<Company, "id" | "createdAt" | "status">) => void;
    updateCompany: (id: string, company: Partial<Omit<Company, "id" | "createdAt">>) => void;
    deleteCompany: (id: string) => void;

    addLocation: (loc: Omit<Location, "id" | "companyId">) => void;
    updateLocation: (id: string, loc: Partial<Omit<Location, "id" | "companyId">>) => void;
    deleteLocation: (id: string) => void;

    addCategory: (cat: string) => void;
    deleteCategory: (cat: string) => void;

    addRoom: (room: Omit<Room, "id" | "companyId">) => void;
    updateRoom: (id: string, room: Partial<Omit<Room, "id" | "companyId">>) => void;
    deleteRoom: (id: string) => void;

    changelogs: ChangelogEntry[];
    addChangelog: (entry: Omit<ChangelogEntry, "id">) => void;

    addAsset: (asset: Omit<MasterAsset, "id" | "companyId">) => Promise<void>;
    updateAsset: (id: string, asset: Partial<Omit<MasterAsset, "id" | "companyId">>) => void;
    deleteAsset: (id: string, reason?: string) => Promise<void>;

    addRoomAsset: (roomAsset: Omit<RoomAsset, "id" | "companyId">, opName?: string) => void;
    deleteRoomAsset: (id: string, opName?: string) => void;
    moveRoomAsset: (assetId: string, newRoomId: string, opName?: string) => void;

    addChecklist: (checklist: Omit<Checklist, "id" | "isRead" | "companyId">) => void;
    markChecklistAsRead: (id: string) => void;
    addLog: (log: Omit<AssetLog, "id" | "timestamp" | "operatorName" | "companyId"> & { operatorName?: string; companyId?: string }) => void;

    operatorShifts: OperatorShift[];
    addShift: (shift: Omit<OperatorShift, "id" | "companyId" | "operatorId" | "operatorName" | "operatorPhone" | "status" | "createdAt">) => Promise<string>;
    endShift: (id: string) => Promise<void>;
}

const LocalDbContext = createContext<LocalDbContextType | null>(null);

const STORAGE_KEYS = {
    LOCATIONS: "studioaset_locations",
    ROOMS: "studioaset_rooms",
    ASSETS: "studioaset_assets",
    ROOM_ASSETS: "studioaset_room_assets",
    CHECKLISTS: "studioaset_checklists",
    ASSET_LOGS: "studioaset_asset_logs",
    CATEGORIES: "studioaset_categories",
    CHANGELOGS: "studioaset_changelogs",
    COMPANIES: "studioaset_companies",
    OPERATOR_SHIFTS: "studioaset_operator_shifts"
};

export function LocalDbProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isDemo = user?.isDemo;
    const isSuperAdmin = user?.role === "SUPER_ADMIN";

    // Memoized Company ID with robust fallback to ensure logs/data never go missing
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
            loadLocal(STORAGE_KEYS.CHANGELOGS, setChangelogs);
            loadLocal(STORAGE_KEYS.CATEGORIES, setCategories, ["Kamera", "Audio / Mic", "Lighting", "PC / Laptop", "Monitor", "Aksesoris", "Kabel", "Inventaris", "Atk", "Lainnya"]);
            loadLocal(STORAGE_KEYS.COMPANIES, setCompanies);
            loadLocal(STORAGE_KEYS.OPERATOR_SHIFTS, setOperatorShifts);
            loadLocal("deleted_assets", setDeletedAssets);
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
        if (!db || isDemo || !user) return;

        const unsubs: (() => void)[] = [];

        // Jika bukan Super Admin tapi companyId belum ada, tunggu sampai siap
        // Ini mencegah query "where companyId == undefined" yang mengakibatkan data kosong
        if (!isSuperAdmin && !finalCompanyId) {
            console.warn("LocalDb: Waiting for companyId for role:", user.role);
            return;
        }

        // Helper to get base collection or filtered query
        const getBaseQuery = (collName: string) => {
            if (isSuperAdmin) return collection(db, collName);
            return query(collection(db, collName), where("companyId", "==", finalCompanyId));
        };

        // Listen to companies (Super Admin sees all, Admin/Operator sees only their own)
        const unsubCompanies = onSnapshot(getBaseQuery("companies"), (snap) => {
            setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
        });
        unsubs.push(unsubCompanies);

        const unsubLocs = onSnapshot(getBaseQuery("locations"), (snap) => {
            setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
        });
        unsubs.push(unsubLocs);

        const unsubRooms = onSnapshot(getBaseQuery("rooms"), (snap) => {
            setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
        });
        unsubs.push(unsubRooms);

        const unsubAssets = onSnapshot(getBaseQuery("assets"), (snap) => {
            setAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterAsset)));
        });
        unsubs.push(unsubAssets);

        const unsubDeleted = onSnapshot(getBaseQuery("deleted_assets"), (snap) => {
            setDeletedAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletedAsset)));
        });
        unsubs.push(unsubDeleted);

        const unsubRoomAssets = onSnapshot(getBaseQuery("roomAssets"), (snap) => {
            setRoomAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoomAsset)));
        });
        unsubs.push(unsubRoomAssets);

        const unsubChecklists = onSnapshot(
            isSuperAdmin
                ? collection(db, "checklists")
                : query(collection(db, "checklists"), where("companyId", "==", finalCompanyId)),
            (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
                setChecklists(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            }
        );
        unsubs.push(unsubChecklists);

        const unsubLogs = onSnapshot(
            isSuperAdmin
                ? collection(db, "assetLogs")
                : query(collection(db, "assetLogs"), where("companyId", "==", finalCompanyId)),
            (snap) => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssetLog));
                setAssetLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            }
        );
        unsubs.push(unsubLogs);

        const unsubChangelogs = onSnapshot(query(collection(db, "changelogs"), orderBy("date", "desc")), (snap) => {
            setChangelogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangelogEntry)));
        });
        unsubs.push(unsubChangelogs);

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

        const unsubShifts = onSnapshot(getBaseQuery("operatorShifts"), (snap) => {
            setOperatorShifts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OperatorShift)));
        });
        unsubs.push(unsubShifts);

        setIsInitialized(true);
        return () => unsubs.forEach(unsub => unsub());
    }, [isDemo, user?.uid, finalCompanyId]);

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

        addCompany: async (comp) => {
            const id = uuidv4();
            const newComp: Company = {
                ...comp,
                id,
                status: "ACTIVE",
                createdAt: new Date().toISOString()
            };
            if (isDemo) {
                setCompanies(prev => [...prev, newComp]);
                // We'll trust the state for demo mode, or we could re-read from localStorage
                // but for now let's just ensure we don't lose updates.
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANIES) || "[]");
                saveToLocal(STORAGE_KEYS.COMPANIES, [...current, newComp]);
            } else {
                await setDoc(doc(db, "companies", id), newComp);
            }
        },
        updateCompany: async (id, data) => {
            if (isDemo) {
                const updated = companies.map(c => c.id === id ? { ...c, ...data } : c);
                setCompanies(updated);
                saveToLocal(STORAGE_KEYS.COMPANIES, updated);
            } else {
                await updateDoc(doc(db, "companies", id), data);
            }
        },
        deleteCompany: async (id) => {
            if (isDemo) {
                const updated = companies.filter(c => c.id !== id);
                setCompanies(updated);
                saveToLocal(STORAGE_KEYS.COMPANIES, updated);
            } else {
                await deleteDoc(doc(db, "companies", id));
            }
        },

        addLocation: async (loc) => {
            const id = uuidv4();
            const companyId = user?.companyId || "";
            const newLoc = { ...loc, id, companyId };
            if (isDemo) {
                setLocations(prev => [...prev, newLoc]);
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCATIONS) || "[]");
                saveToLocal(STORAGE_KEYS.LOCATIONS, [...current, newLoc]);
            } else {
                await setDoc(doc(db, "locations", id), newLoc);
            }

            // Tambahkan log sistem
            await api.addLog({
                type: "SYSTEM",
                toValue: `Lokasi Baru: ${loc.name}`,
                notes: `Berhasil menambahkan cabang baru di ${loc.address}`
            });
        },
        updateLocation: async (id, data) => {
            if (isDemo) {
                const updated = locations.map(l => l.id === id ? { ...l, ...data } : l);
                setLocations(updated);
                saveToLocal(STORAGE_KEYS.LOCATIONS, updated);
            } else {
                await updateDoc(doc(db, "locations", id), data);
            }

            // Tambahkan log sistem
            await api.addLog({
                type: "SYSTEM",
                toValue: `Update Lokasi: ${data.name}`,
                notes: `Memperbarui data cabang: ${data.name}`
            });
        },
        deleteLocation: async (id) => {
            const target = locations.find(l => l.id === id);
            if (isDemo) {
                const updated = locations.filter(l => l.id !== id);
                setLocations(updated);
                saveToLocal(STORAGE_KEYS.LOCATIONS, updated);
            } else {
                await deleteDoc(doc(db, "locations", id));
            }

            // Tambahkan log sistem
            if (target) {
                await api.addLog({
                    type: "SYSTEM",
                    toValue: `Hapus Lokasi: ${target.name}`,
                    notes: `Menghapus data cabang dari sistem`
                });
            }
        },

        addRoom: async (r) => {
            const id = uuidv4();
            const companyId = user?.companyId || "";
            const newRoom = { ...r, id, companyId };
            if (isDemo) {
                setRooms(prev => [...prev, newRoom]);
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOMS) || "[]");
                saveToLocal(STORAGE_KEYS.ROOMS, [...current, newRoom]);
            } else {
                await setDoc(doc(db, "rooms", id), newRoom);
            }

            // Tambahkan log sistem
            const locName = locations.find(l => l.id === r.locationId)?.name || "Lokasi";
            await api.addLog({
                type: "SYSTEM",
                toValue: `Ruangan Baru: ${r.name}`,
                notes: `Berhasil menambahkan ruangan baru di cabang ${locName}`
            });
        },
        updateRoom: async (id, data) => {
            if (isDemo) {
                const updated = rooms.map(r => r.id === id ? { ...r, ...data } : r);
                setRooms(updated);
                saveToLocal(STORAGE_KEYS.ROOMS, updated);
            } else {
                await updateDoc(doc(db, "rooms", id), data);
            }

            // Tambahkan log sistem
            await api.addLog({
                type: "SYSTEM",
                toValue: `Update Ruangan: ${data.name}`,
                notes: `Memperbarui detail ruangan di sistem`
            });
        },
        deleteRoom: async (id) => {
            const target = rooms.find(r => r.id === id);
            if (isDemo) {
                const updated = rooms.filter(r => r.id !== id);
                setRooms(updated);
                saveToLocal(STORAGE_KEYS.ROOMS, updated);
            } else {
                await deleteDoc(doc(db, "rooms", id));
            }

            // Tambahkan log sistem
            if (target) {
                await api.addLog({
                    type: "SYSTEM",
                    toValue: `Hapus Ruangan: ${target.name}`,
                    notes: `Menghapus data ruangan dari sistem`
                });
            }
        },

        addAsset: async (a) => {
            const id = uuidv4();
            const companyId = finalCompanyId; // Gunakan finalCompanyId yang stabil

            if (!isSuperAdmin && !companyId) {
                throw new Error("Gagal menambah aset: ID Perusahaan tidak ditemukan.");
            }

            const newAsset = { ...a, id, companyId };

            if (isDemo) {
                setAssets(prev => [...prev, newAsset]);
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSETS) || "[]");
                saveToLocal(STORAGE_KEYS.ASSETS, [...current, newAsset]);
            } else {
                await setDoc(doc(db, "assets", id), newAsset);
            }

            // Gunakan addLog agar otomatis mendapatkan Role dan masuk ke filter Admin
            await api.addLog({
                assetId: id,
                assetName: a.name,
                type: "SYSTEM",
                toValue: `Aset Baru: ${a.name}`,
                operatorName: a.lastModifiedBy,
                notes: `Kategori: ${a.category}, Kode: ${a.assetCode || "-"}`
            });
        },
        updateAsset: async (id, data) => {
            const target = assets.find(a => a.id === id);
            if (isDemo) {
                const updated = assets.map(a => a.id === id ? { ...a, ...data } : a);
                setAssets(updated);
                saveToLocal(STORAGE_KEYS.ASSETS, updated);
            } else {
                await updateDoc(doc(db, "assets", id), data as any);
            }

            // Tambahkan log sistem
            if (target) {
                await api.addLog({
                    type: "SYSTEM",
                    toValue: `Update Aset: ${data.name || target.name}`,
                    notes: `Memperbarui info aset. Kode: ${target.assetCode || "-"}`
                });
            }
        },
        async deleteAsset(id: string, reason: string = "Dihapus oleh admin") {
            const asset = assets.find(a => a.id === id);
            const idToDelete = id;
            const companyId = finalCompanyId;
            const operatorName = user?.name || user?.email || "Unknown";

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

                try {
                    if (isDemo) {
                        setDeletedAssets(prev => [deletedAssetRecord, ...prev]);
                        const currentDeleted = JSON.parse(localStorage.getItem("deleted_assets") || "[]");
                        saveToLocal("deleted_assets", [deletedAssetRecord, ...currentDeleted]);
                    } else {
                        // Langkah 1: Simpan ke Arsip
                        await setDoc(doc(db, "deleted_assets", deletedAssetRecord.id), deletedAssetRecord);
                    }
                } catch (err) {
                    console.error("❌ Gagal membuat arsip di deleted_assets:", err);
                    throw new Error("Gagal mengarsipkan aset. Cek Firebase Rules koleksi 'deleted_assets'.");
                }
            }

            if (isDemo) {
                setAssets(prev => prev.filter(a => a.id !== idToDelete));
                const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSETS) || "[]");
                saveToLocal(STORAGE_KEYS.ASSETS, current.filter((a: any) => a.id !== idToDelete));

                const updatedRA = roomAssets.filter(ra => ra.assetId !== idToDelete);
                setRoomAssets(updatedRA);
                saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);
            } else {
                await deleteDoc(doc(db, "assets", idToDelete));
                const existingInRooms = roomAssets.filter(ra => ra.assetId === idToDelete);
                for (const ra of existingInRooms) {
                    await deleteDoc(doc(db, "roomAssets", ra.id));
                }
            }

            await api.addLog({
                assetId: idToDelete,
                assetName: asset?.name || "Unknown Asset",
                type: "SYSTEM",
                toValue: "DELETED",
                operatorName,
                notes: `Aset dihapus. Alasan: ${reason}`
            });
        },

        addRoomAsset: async (ra, opName) => {
            const id = uuidv4();
            const companyId = finalCompanyId;

            // VALIDASI KRITIS
            if (!isSuperAdmin && !companyId) {
                throw new Error("Sesi perusahaan tidak valid. Silakan logout dan login kembali.");
            }

            const newRA = { ...ra, id, companyId };

            if (isDemo) {
                const asset = assets.find(a => a.id === ra.assetId);
                if (asset && (asset.status === "SERVIS" || asset.status === "JUAL")) {
                    throw new Error(`Aset dengan status ${asset.status} tidak bisa dimasukkan ke ruangan.`);
                }

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

                    await api.addLog({
                        assetId: ra.assetId,
                        assetName: ra.assetName,
                        type: "MOVEMENT",
                        toValue: `Masuk ke Ruangan: ${destRoom.name}`,
                        operatorName: opName,
                        companyId: companyId,
                        notes: `Alokasi aset ke ruangan studio (Demo)`
                    });
                }
            } else {
                // 1. Dapatkan data aset & room (Gunakan state lokal dahulu, fallback ke DB)
                let assetData = assets.find(a => a.id === ra.assetId);
                let roomData = rooms.find(r => r.id === ra.roomId);

                if (!roomData) {
                    const snap = await getDoc(doc(db, "rooms", ra.roomId));
                    if (snap.exists()) roomData = { id: snap.id, ...snap.data() } as Room;
                }

                if (assetData) {
                    if (assetData.status === "SERVIS" || assetData.status === "JUAL") {
                        throw new Error(`Aset dengan status ${assetData.status} tidak bisa dimasukkan ke ruangan.`);
                    }
                }

                // 2. Bersihkan pemetaan lama (Gunakan state lokal sebagai filter)
                const existingMaps = roomAssets.filter(item => item.assetId === ra.assetId);
                for (const oldDoc of existingMaps) {
                    await deleteDoc(doc(db, "roomAssets", oldDoc.id));
                }

                // 3. Simpan pemetaan baru
                await setDoc(doc(db, "roomAssets", id), newRA);

                // 4. Update lokasi di Master Asset jika data ruangan tersedia
                if (roomData) {
                    await updateDoc(doc(db, "assets", ra.assetId), {
                        locationId: roomData.locationId,
                        companyId: companyId, // Sertakan kembali untuk validasi Security Rules
                        updatedAt: new Date().toISOString()
                    });

                    await api.addLog({
                        assetId: ra.assetId,
                        assetName: ra.assetName,
                        type: "MOVEMENT",
                        toValue: `Masuk ke Ruangan: ${roomData.name}`,
                        operatorName: opName,
                        companyId: companyId,
                        notes: `Berhasil alokasikan aset ke ruangan`
                    });
                } else {
                    // Log minimal jika data ruangan gagal dimuat
                    await api.addLog({
                        assetId: ra.assetId,
                        assetName: ra.assetName,
                        type: "MOVEMENT",
                        toValue: "Masuk ke Ruangan",
                        operatorName: opName,
                        companyId: companyId,
                        notes: "Alokasi tercatat (Room detail pending sync)"
                    });
                }
            }
        },
        deleteRoomAsset: async (id, opName) => {
            const companyId = finalCompanyId;
            if (isDemo) {
                const target = roomAssets.find(ra => ra.id === id);
                const updatedRA = roomAssets.filter(ra => ra.id !== id);
                setRoomAssets(updatedRA);
                saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);

                if (target) {
                    await api.addLog({
                        assetId: target.assetId,
                        assetName: target.assetName,
                        type: "MOVEMENT",
                        toValue: "Ditarik ke Gudang",
                        operatorName: opName,
                        companyId: companyId,
                        notes: "Pelepasan aset dari ruangan (Demo)"
                    });
                }
            } else {
                const target = roomAssets.find(ra => ra.id === id);
                await deleteDoc(doc(db, "roomAssets", id));
                if (target) {
                    await api.addLog({
                        assetId: target.assetId,
                        assetName: target.assetName,
                        type: "MOVEMENT",
                        toValue: "Ditarik ke Gudang",
                        operatorName: opName,
                        companyId: companyId,
                        notes: "Berhasil menarik aset kembali ke gudang pusat"
                    });
                }
            }
        },
        moveRoomAsset: async (assetId, newRoomId, opName) => {
            const companyId = finalCompanyId;
            if (isDemo) {
                const ra = roomAssets.find(item => item.assetId === assetId);
                if (newRoomId === "GL-WAREHOUSE") {
                    if (ra) {
                        const updatedRA = roomAssets.filter(item => item.id !== ra.id);
                        setRoomAssets(updatedRA);
                        saveToLocal(STORAGE_KEYS.ROOM_ASSETS, updatedRA);

                        await api.addLog({
                            assetId: ra.assetId,
                            assetName: ra.assetName,
                            type: "MOVEMENT",
                            toValue: "Pindah ke Gudang",
                            operatorName: opName,
                            companyId: companyId,
                            notes: "Perpindahan melalui menu manajemen ruangan (Demo)"
                        });
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

                    await api.addLog({
                        assetId: ra.assetId,
                        assetName: ra.assetName,
                        type: "MOVEMENT",
                        toValue: `Pindah ke: ${destRoom.name}`,
                        operatorName: opName,
                        companyId: companyId,
                        notes: `Berhasil memindahkan aset antar ruangan (Demo)`
                    });
                }
            } else {
                // FIX: Gunakan state lokal agar lebih aman dan efisien
                const ra = roomAssets.find(item => item.assetId === assetId);

                if (newRoomId === "GL-WAREHOUSE") {
                    if (ra) {
                        const data = ra; // State item
                        await deleteDoc(doc(db, "roomAssets", ra.id));
                        await api.addLog({
                            assetId: data.assetId,
                            assetName: data.assetName,
                            type: "MOVEMENT",
                            toValue: "Pindah ke Gudang",
                            operatorName: opName,
                            companyId: companyId,
                            notes: "Berhasil ditarik kembali ke gudang pusat"
                        });
                    }
                    return;
                }

                let destRoom = rooms.find(r => r.id === newRoomId);
                if (!destRoom) {
                    const snap = await getDoc(doc(db, "rooms", newRoomId));
                    if (snap.exists()) destRoom = { id: snap.id, ...snap.data() } as Room;
                }

                if (ra && destRoom) {
                    const data = ra; // State item
                    await updateDoc(doc(db, "roomAssets", ra.id), { roomId: newRoomId, updatedAt: new Date().toISOString() });
                    await updateDoc(doc(db, "assets", assetId), {
                        locationId: destRoom.locationId,
                        companyId: companyId, // Sertakan kembali untuk validasi Security Rules
                        updatedAt: new Date().toISOString()
                    });

                    await api.addLog({
                        assetId: data.assetId,
                        assetName: data.assetName,
                        type: "MOVEMENT",
                        toValue: `Pindah ke: ${destRoom.name}`,
                        operatorName: opName,
                        companyId: companyId,
                        notes: `Berhasil update lokasi aset di database pusat`
                    });
                }
            }
        },

        addChecklist: async (c) => {
            const id = uuidv4();
            const companyId = finalCompanyId; // Gunakan finalCompanyId yang stabil
            const newChecklist = { ...c, id, companyId, isRead: false };

            if (isDemo) {
                const updatedChecklists = [newChecklist, ...checklists];
                setChecklists(updatedChecklists);
                saveToLocal(STORAGE_KEYS.CHECKLISTS, updatedChecklists);

                let updatedAssets = [...assets];
                let updatedLogs = [...assetLogs];

                for (const item of c.items) {
                    await api.addLog({
                        assetId: item.assetId,
                        assetName: item.assetName,
                        type: "STATUS",
                        toValue: item.status,
                        operatorName: c.operatorName,
                        notes: item.notes || `Pengecekan rutin di ${c.roomName}`
                    });

                    if (item.status) {
                        updatedAssets = updatedAssets.map(a => a.id === item.assetId ? {
                            ...a,
                            status: item.status,
                            conditionNotes: item.notes,
                            updatedAt: new Date().toISOString()
                        } : a);
                    }
                }

                await api.addLog({
                    type: "SYSTEM",
                    toValue: `Audit: ${c.roomStatus || "SELESAI"}`,
                    operatorName: c.operatorName,
                    companyId: companyId, // Pastikan ID perusahaan terkirim
                    notes: `Laporan checklist ruangan ${c.roomName} (${c.locationName}). Catatan: ${c.overallNotes || "-"}`
                });

                setAssets(updatedAssets);
                saveToLocal(STORAGE_KEYS.ASSETS, updatedAssets);
            } else {
                // STEP 1: Simpan checklist utama — operasi kritis, biarkan error propagate
                await setDoc(doc(db, "checklists", id), newChecklist);

                // STEP 2: Update status aset & log — operasi sekunder (best-effort)
                // Dibungkus try-catch individual agar kegagalan permission rules
                // pada koleksi 'assets' tidak membatalkan seluruh pengiriman laporan.
                for (const item of c.items) {
                    try {
                        await api.addLog({
                            assetId: item.assetId,
                            assetName: item.assetName,
                            type: "STATUS",
                            toValue: item.status,
                            operatorName: c.operatorName,
                            companyId: companyId,
                            notes: item.notes || `Audit sistem di ${c.roomName}`
                        });
                    } catch (logErr) {
                        console.warn("[addChecklist] Gagal tulis log item (non-kritis):", logErr);
                    }

                    if (item.status) {
                        try {
                            await updateDoc(doc(db, "assets", item.assetId), {
                                status: item.status,
                                conditionNotes: item.notes,
                                companyId: companyId, // Sertakan agar Security Rules tidak reject
                                updatedAt: new Date().toISOString()
                            });
                        } catch (assetErr) {
                            console.warn(`[addChecklist] Gagal update status aset ${item.assetName} (non-kritis):`, assetErr);
                        }
                    }
                }

                // STEP 3: Log ringkasan ruangan — best-effort
                try {
                    await api.addLog({
                        type: "SYSTEM",
                        toValue: `Audit Room: ${c.roomStatus || "SELESAI"}`,
                        operatorName: c.operatorName,
                        companyId: companyId,
                        notes: `Laporan masuk untuk ${c.roomName} (${c.locationName}). Status akhir: ${c.roomStatus || "SELESAI"}`
                    });
                } catch (summaryLogErr) {
                    console.warn("[addChecklist] Gagal tulis log ringkasan (non-kritis):", summaryLogErr);
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
        },

        addLog: async (log) => {
            const id = uuidv4();
            const timestamp = new Date().toISOString();

            // Prioritas Nama: 
            // 1. Nama yang dikirim manual (log.operatorName)
            // 2. Nama dari user login (user.name)
            // 3. Email jika nama kosong
            // 4. Default "Admin"
            const finalName = log.operatorName || user?.name || user?.email || "Admin";

            // Prioritas Role: 
            // 1. Role yang dikirim manual di parameter (log.operatorRole)
            // 2. Role dari user yang sedang login (user.role)
            // 3. Default "SYSTEM" jika tidak ada user
            const finalRole = log.operatorRole || user?.role || "SYSTEM";

            let companyId = log.companyId || user?.companyId || "";
            if (!companyId && finalRole !== "SUPER_ADMIN" && finalRole !== "SYSTEM") {
                companyId = localStorage.getItem("last_known_company_id") || "";
            }

            const newLog: AssetLog = {
                ...log,
                id,
                companyId: companyId,
                timestamp,
                operatorName: finalName,
                operatorRole: finalRole
            };

            if (isDemo) {
                const updated = [newLog, ...assetLogs] as AssetLog[];
                setAssetLogs(updated);
                saveToLocal(STORAGE_KEYS.ASSET_LOGS, updated);
            } else {
                await setDoc(doc(db, "assetLogs", id), newLog);
            }
        },

        addChangelog: async (entry) => {
            const id = uuidv4();
            const newEntry = { ...entry, id };
            if (isDemo) {
                const updated = [newEntry, ...changelogs];
                setChangelogs(updated);
                saveToLocal(STORAGE_KEYS.CHANGELOGS, updated);
            } else {
                await setDoc(doc(db, "changelogs", id), newEntry);
            }
        },


        addShift: async (shiftData) => {
            const companyId = user?.companyId || "";
            const operatorId = user?.uid || "";

            // Anti-double shift check: verify if there's any shift with status ACTIVE for this operator
            const activeShift = operatorShifts.find(s => s.operatorId === operatorId && s.status === "ACTIVE");
            if (activeShift) {
                throw new Error("Selesaikan tugas Anda saat ini terlebih dahulu sebelum memulai tugas baru.");
            }

            const id = uuidv4();
            const operatorName = user?.name || user?.email || "Operator";
            const operatorPhone = user?.phone || "";

            const newShift: OperatorShift = {
                ...shiftData,
                id,
                companyId,
                operatorId,
                operatorName,
                operatorPhone,
                status: "ACTIVE",
                createdAt: new Date().toISOString()
            };

            if (isDemo) {
                const updated = [newShift, ...operatorShifts];
                setOperatorShifts(updated);
                saveToLocal(STORAGE_KEYS.OPERATOR_SHIFTS, updated);
            } else {
                await setDoc(doc(db, "operatorShifts", id), newShift);
            }

            // Log activity
            await api.addLog({
                type: "AUTH",
                toValue: "Mulai Tugas",
                operatorName,
                companyId: companyId, // Pastikan ID perusahaan terkirim
                notes: `Mulai shift di ${shiftData.locationName} (${shiftData.startTime} - ${shiftData.endTime})`
            });

            return id;
        },
        endShift: async (id) => {
            const target = operatorShifts.find(s => s.id === id);
            if (isDemo) {
                const updated = operatorShifts.map(s => s.id === id ? { ...s, status: "COMPLETED" } : s) as OperatorShift[];
                setOperatorShifts(updated);
                saveToLocal(STORAGE_KEYS.OPERATOR_SHIFTS, updated);
            } else {
                await updateDoc(doc(db, "operatorShifts", id), { status: "COMPLETED" });
            }

            if (target) {
                await api.addLog({
                    type: "AUTH",
                    toValue: "Selesai Tugas",
                    operatorName: target.operatorName,
                    companyId: target.companyId,
                    notes: `Menyelesaikan tugas (Shift: ${target.startTime} - ${target.endTime})`
                });
            }
        }
    };

    // Remove the return null to prevent whole app white-out
    // if (!isInitialized) return null;

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
