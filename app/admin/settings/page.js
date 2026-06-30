'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from "../../firebaseConfig"; // Pastikan path ke firebaseConfig sudah benar

export default function AdminSettings() {
  // === STATE UNTUK PASSCODE (LOGIN) ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);

  // === STATE UNTUK ADMIN DASHBOARD ===
  const [waNumber, setWaNumber] = useState('');
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔐 PASSCODE RAHASIA
  const SECRET_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;

  // Helper Format Tanggal agar lebih cantik dibaca Admin
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === SECRET_PASSCODE) {
      setIsAuthenticated(true);
      setLoginError(false);
      fetchData();
    } else {
      setLoginError(true);
      setPasscode('');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setWaNumber(docSnap.data().adminWaNumber || '');
      }

      const q = query(collection(db, 'peminjaman'), where('status', '==', 'menunggu'));
      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingBookings(bookings);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWA = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), { adminWaNumber: waNumber }, { merge: true });
      alert('Nomor WhatsApp Admin berhasil diperbarui!');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan nomor WA.');
    }
  };

  const handleValidation = async (id, newStatus) => {
    try {
      const bookingRef = doc(db, 'peminjaman', id);
      await updateDoc(bookingRef, { status: newStatus });
      
      setPendingBookings(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error(error);
      alert('Gagal mengubah status.');
    }
  };

  // ==========================================
  // UI 1: HALAMAN LOCK SCREEN (PASSCODE)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 selection:bg-blue-900 selection:text-white">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full border-t-8 border-emerald-500 animate-slideUp">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-900 mb-6 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Akses Admin</h2>
            <p className="text-sm font-medium text-blue-500 mt-2">Sistem Administrasi Aula</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="password" 
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className={`w-full border-2 rounded-2xl p-4 text-center text-2xl tracking-[0.5em] font-mono outline-none transition-colors ${loginError ? 'border-orange-500 bg-orange-50 focus:border-orange-600 text-orange-900' : 'border-blue-100 bg-blue-50/50 focus:border-blue-500 text-blue-900 focus:bg-white'}`}
                placeholder="••••"
              />
              {loginError && <p className="text-orange-600 text-xs mt-3 text-center font-bold uppercase tracking-wider">Passcode tidak valid!</p>}
            </div>
            <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold p-4 rounded-xl transition-all shadow-lg shadow-blue-900/20">
              Buka Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // UI 2: DASHBOARD ADMIN (LOADING)
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-blue-900 font-bold tracking-wider uppercase text-sm">Menghubungkan ke Database...</p>
      </div>
    );
  }

  // ==========================================
  // UI 3: DASHBOARD ADMIN (TAMPILAN UTAMA)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 selection:bg-blue-900 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
        
        {/* HEADER */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">Dashboard Admin</h1>
            <p className="text-sm font-bold text-orange-500 mt-2 tracking-wide uppercase">Sistem Administrasi </p>
          </div>
          <button onClick={() => window.location.href='/'} className="bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold px-5 py-2.5 rounded-xl transition-colors text-sm border border-blue-200 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Kembali ke Kalender
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI: PENGATURAN WA */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-blue-900 tracking-tight">Nomor WhatsApp</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Tujuan Notifikasi</label>
                  <input 
                    type="text" 
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    placeholder="6281234567890"
                    className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-emerald-500 transition-colors outline-none font-medium"
                  />
                  <p className="text-[11px] font-medium text-blue-500 mt-2 leading-relaxed">Format gunakan awalan 62 tanpa tanda (+). Sistem akan mengirim pesan kesini saat ada staf yang meminjam.</p>
                </div>
                <button 
                  onClick={handleSaveWA}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  Simpan Nomor
                </button>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: VALIDASI RUANGAN */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-blue-100 h-full">
              <div className="flex items-center gap-3 mb-6 border-b border-blue-50 pb-6">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900 tracking-tight">Antrean Validasi</h2>
                  <p className="text-xs font-bold text-orange-500 mt-1 uppercase tracking-wider">{pendingBookings.length} Permohonan Menunggu</p>
                </div>
              </div>
              
              {pendingBookings.length === 0 ? (
                <div className="text-center py-16 px-4 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-100 flex flex-col items-center">
                  <span className="text-5xl mb-4">☕</span>
                  <h3 className="text-lg font-bold text-blue-900 mb-1">Semua Terkendali!</h3>
                  <p className="text-sm font-medium text-blue-600">Tidak ada permohonan peminjaman aula yang menunggu divalidasi saat ini.</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="border-2 border-orange-100 rounded-2xl p-5 hover:shadow-lg hover:shadow-orange-100/50 transition-all bg-white relative overflow-hidden group flex flex-col">
                      
                      {/* Aksen Garis Kiri */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400"></div>

                      <div className="flex justify-between items-start mb-4 pl-2">
                        <div className="truncate pr-2">
                          <h3 className="font-extrabold text-blue-900 text-lg truncate">{booking.nama}</h3>
                          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-0.5">{booking.bidang}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6 pl-2 flex-1">
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                          <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Jadwal</p>
                          <p className="text-sm font-bold text-blue-900">{formatDate(booking.tanggal)}</p>
                          <p className="text-sm font-bold text-blue-900">{booking.jamMulai} — {booking.jamSelesai} WIB</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Keperluan</p>
                          <p className="text-sm font-medium text-blue-800 leading-snug">{booking.keperluan}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pl-2 mt-auto">
                        <button 
                          onClick={() => handleValidation(booking.id, 'disetujui')}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-emerald-500/30"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => handleValidation(booking.id, 'ditolak')}
                          className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-rose-500/30"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}