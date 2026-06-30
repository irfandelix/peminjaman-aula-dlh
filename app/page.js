'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore"; 
import { db } from "./firebaseConfig"; 
import Link from 'next/link';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nama: '', bidang: '', tanggal: '', jamMulai: '', jamSelesai: '', keperluan: ''
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };
  
  const [status, setStatus] = useState('idle'); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const fetchSchedules = async () => {
    try {
      const q = query(collection(db, "peminjaman"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSchedules(data);
    } catch (error) {
      console.error("Gagal mengambil jadwal:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay(); 
    return day === 0 || day === 6; 
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayNames = ["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const handleDateClick = (dateString) => {
    setFormData({ ...formData, tanggal: dateString });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    if (formData.jamMulai >= formData.jamSelesai) {
      showToast('Jam selesai harus lebih dari jam mulai!', 'error');
      setStatus('idle');
      return;
    }

    try {
      const q = query(collection(db, "peminjaman"), where("tanggal", "==", formData.tanggal));
      const querySnapshot = await getDocs(q);
      let isBentrok = false;
      let pesanBentrok = '';

      querySnapshot.forEach((document) => {
        const booking = document.data();
        if (booking.status === 'ditolak') return;
        
        if ((formData.jamMulai < booking.jamSelesai) && (formData.jamSelesai > booking.jamMulai)) {
          isBentrok = true;
          pesanBentrok = `Gagal! Ruang dipakai pkl ${booking.jamMulai}-${booking.jamSelesai} untuk ${booking.keperluan}.`;
        }
      });

      if (isBentrok) {
        showToast(pesanBentrok, 'error');
        setStatus('idle');
        return;
      }

      await addDoc(collection(db, "peminjaman"), {
        ...formData,
        status: 'menunggu',
        createdAt: new Date()
      });

      fetchSchedules(); 

      const adminDoc = await getDoc(doc(db, 'settings', 'general'));
      const nomorAdmin = adminDoc.exists() && adminDoc.data().adminWaNumber ? adminDoc.data().adminWaNumber : "6281234567890"; 

      const pesanWA = `*Permohonan Peminjaman Aula*%0A%0AAcara : ${formData.keperluan}%0ANama : ${formData.nama}%0ABidang : ${formData.bidang}%0ATanggal : ${formatDate(formData.tanggal)}%0AJam : ${formData.jamMulai} - ${formData.jamSelesai}%0A%0AMohon Persetujuan untuk Peminjaman Ruang Aula pada Aplikasi.%0ATerima kasih.`;
      
      window.open(`https://wa.me/${nomorAdmin}?text=${pesanWA}`, '_blank');
      
      showToast('Berhasil! Jadwal telah dicatat.', 'success');
      setFormData({ nama: '', bidang: '', tanggal: '', jamMulai: '', jamSelesai: '', keperluan: '' });
      setIsModalOpen(false);

    } catch (error) {
      console.error(error);
      showToast('Terjadi kesalahan sistem.', 'error');
    } finally {
      setStatus('idle');
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <main className="min-h-screen bg-[#f8fafc] md:p-8 relative selection:bg-blue-900 selection:text-white">
      
      <div className={`fixed top-5 right-5 z-[100] transform transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-4 rounded-xl shadow-2xl text-white font-medium flex items-center gap-3 tracking-wide ${toast.type === 'error' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
          <p>{toast.message}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-white md:p-8 md:rounded-3xl shadow-sm border-b md:border border-blue-100 min-h-screen md:min-h-0">
          
          {/* HEADER: Dibuat ringkas di HP, lengkap di PC */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-0 mb-4 md:mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-extrabold text-blue-900 tracking-tight">{monthNames[month]} {year}</h2>
              {/* Teks ini akan hilang (hidden) di layar HP agar tidak memenuhi layar */}
              <p className="hidden md:block text-sm font-bold text-orange-500 mt-2 tracking-wide uppercase">Sistem Peminjaman Ruang Aula DLH</p>
              <p className="hidden md:inline-block text-sm font-medium text-emerald-700 mt-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                💡 Klik pada tanggal untuk meminjam ruangan
              </p>
            </div>
            <div className="flex bg-blue-50 p-1 rounded-xl border border-blue-100 w-full md:w-auto justify-between md:justify-start">
              <button onClick={prevMonth} className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm text-blue-700 transition-all flex-1 md:flex-none text-center flex justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 rounded-lg text-sm font-bold text-blue-800 hover:bg-white hover:shadow-sm transition-all flex-1 md:flex-none">Hari Ini</button>
              <button onClick={nextMonth} className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm text-blue-700 transition-all flex-1 md:flex-none text-center flex justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>

          {/* GRID KALENDER: Bisa di-swipe ke samping (overflow-x-auto) di HP */}
          <div className="border-y md:border border-blue-100 md:rounded-2xl bg-white overflow-x-auto custom-scrollbar">
            {/* min-w-[800px] memaksa kalender tetap lebar, jadi di HP harus geser ke samping */}
            <div className="min-w-[800px] md:min-w-full">
              <div className="grid grid-cols-7 bg-blue-50/50 border-b border-blue-100">
                {dayNames.map(day => (
                  <div key={day} className="py-4 text-center text-xs font-bold text-blue-800 uppercase tracking-wider">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 auto-rows-[minmax(120px,_1fr)] gap-px bg-blue-100/50">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50/50 p-2"></div>
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const weekend = isWeekend(dateString); 

                  const dayBookings = schedules
                    .filter(b => b.tanggal === dateString && b.status !== 'ditolak')
                    .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));

                  const isToday = dateString === new Date().toISOString().split('T')[0];

                  return (
                    <div 
                      key={day} 
                      onClick={() => handleDateClick(dateString)} 
                      className={`bg-white p-2.5 transition-all cursor-pointer group relative flex flex-col hover:shadow-inner ${weekend ? 'bg-orange-50/40' : 'hover:bg-blue-50/40'}`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold rounded-full mb-2 transition-colors
                        ${isToday ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : weekend ? 'text-orange-600' : 'text-blue-900 group-hover:text-blue-700'}`}>
                        {day}
                      </span>
                      
                      <div className="absolute top-3 right-3 opacity-0 md:group-hover:opacity-100 text-emerald-500 transition-all scale-75 group-hover:scale-100">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                      </div>

                      <div className="space-y-1.5 mt-1 overflow-y-auto max-h-24 custom-scrollbar flex-1 pr-1">
                        {dayBookings.map(b => (
                          <div 
                            key={b.id} 
                            title={`${b.jamMulai}-${b.jamSelesai} | ${b.nama} (${b.bidang})`}
                            className={`text-[11px] px-2 py-1.5 rounded-md truncate font-medium border-l-4 ${
                              b.status === 'disetujui' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-orange-400 bg-orange-50 text-orange-900'
                            }`}
                          >
                            <span className="font-bold mr-1.5 opacity-80">{b.jamMulai}</span>
                            {b.keperluan}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex gap-6 mt-6 text-xs font-bold text-blue-800 uppercase tracking-wider bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2.5"><span className="w-3.5 h-3.5 rounded-full bg-orange-400 shadow-sm block"></span> Menunggu Persetujuan</div>
            <div className="flex items-center gap-2.5"><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm block"></span> Disetujui</div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-950/40 z-50 flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white p-6 md:p-10 rounded-t-3xl md:rounded-[2rem] shadow-2xl w-full max-w-xl relative animate-slideUp border-t-8 border-emerald-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 text-blue-400 hover:text-orange-600 bg-blue-50 hover:bg-orange-50 rounded-full p-2.5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="mb-6 md:mb-8 border-b border-blue-100 pb-4 md:pb-6 pr-8">
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 tracking-tight">Form Peminjaman</h1>
              <p className="text-blue-600 text-xs md:text-sm mt-2 md:mt-3 font-medium flex items-center flex-wrap gap-2">
                Tanggal terpilih: <span className="font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{formatDate(formData.tanggal)}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1.5 md:mb-2 uppercase tracking-wider">Acara / Keperluan</label>
                <input 
                  type="text" required value={formData.keperluan}
                  onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                  className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-blue-500 transition-colors outline-none font-medium"
                  placeholder="Contoh: Rapat Evaluasi AMDAL"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-blue-800 mb-1.5 md:mb-2 uppercase tracking-wider">Nama Peminjam</label>
                  <input 
                    type="text" required value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-blue-500 transition-colors outline-none font-medium"
                    placeholder="Nama Lengkap"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-blue-800 mb-1.5 md:mb-2 uppercase tracking-wider">Bidang</label>
                  <select 
                    required 
                    value={formData.bidang}
                    onChange={(e) => setFormData({...formData, bidang: e.target.value})}
                    className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-blue-500 transition-colors outline-none font-medium appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-gray-500">Pilih Bidang</option>
                    <option value="Sekretariat" className="text-gray-900">Sekretariat</option>
                    <option value="Bidang 1 (P3LH)" className="text-gray-900">Bidang 1 (P3LH)</option>
                    <option value="Bidang 2 (PPLH)" className="text-gray-900">Bidang 2 (PPLH)</option>
                    <option value="Bidang 3 (Persampahan)" className="text-gray-900">Bidang 3 (Persampahan)</option>
                    <option value="Pihak Luar" className="text-gray-900">Pihak Luar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-5">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider">Jam Mulai</label>
                  <select 
                    value={formData.jamMulai}
                    onChange={(e) => setFormData({...formData, jamMulai: e.target.value})}
                    className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-blue-500 transition-colors outline-none font-medium cursor-pointer"
                  >
                    <option value="">Pilih Jam</option>
                    {generateTimeOptions().map(time => (
                      <option key={time} value={time} className="text-gray-900">{time}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider">Selesai</label>
                  <select 
                    value={formData.jamSelesai}
                    onChange={(e) => setFormData({...formData, jamSelesai: e.target.value})}
                    className="w-full border-2 border-blue-100 rounded-xl p-3 text-blue-900 bg-blue-50/30 focus:bg-white focus:ring-0 focus:border-blue-500 transition-colors outline-none font-medium cursor-pointer"
                  >
                    <option value="">Pilih Jam</option>
                    {generateTimeOptions().map(time => (
                      <option key={time} value={time} className="text-gray-900">{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit" disabled={status === 'loading'}
                className="w-full mt-6 md:mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl p-4 transition-all disabled:opacity-70 shadow-lg shadow-emerald-600/30 flex justify-center items-center gap-2"
              >
                {status === 'loading' ? 'Mengecek Jadwal...' : 'Kirim Permohonan via WhatsApp'}
              </button>
            </form>

            <div className="mt-6 md:mt-8 pt-6 border-t border-blue-100 pb-4 md:pb-0">
              <h3 className="text-xs font-bold text-blue-800 mb-4 uppercase tracking-wider">Jadwal yang sudah terisi hari ini:</h3>
              
              {(() => {
                const dayBookings = schedules
                  .filter(b => b.tanggal === formData.tanggal && b.status !== 'ditolak')
                  .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));

                if (dayBookings.length === 0) {
                  return (
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 text-sm font-semibold flex items-center gap-3">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Asyik! Ruangan masih kosong seharian.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {dayBookings.map(b => (
                      <div key={b.id} className="flex justify-between items-center p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 hover:bg-white hover:shadow-sm transition-all">
                        <div>
                          <p className="text-sm font-bold text-blue-900">{b.jamMulai} - {b.jamSelesai} WIB</p>
                          <p className="text-xs font-semibold text-blue-700 mt-1">{b.nama} <span className="font-medium opacity-75">({b.bidang})</span></p>
                          <p className="text-[10px] text-blue-500 mt-1.5 uppercase tracking-wider font-bold truncate max-w-[150px] md:max-w-[200px]">{b.keperluan}</p>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg uppercase tracking-wider ${
                          b.status === 'disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {b.status}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      <Link href="/admin/settings" className="fixed bottom-6 right-6 p-3 bg-white rounded-full text-blue-200 hover:text-blue-600 hover:shadow-lg transition-all z-0 border border-blue-100">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </Link>
    </main>
  );
}