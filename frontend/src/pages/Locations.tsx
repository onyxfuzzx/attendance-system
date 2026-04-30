import { useState, useCallback } from 'react';
import { GoogleMap, useLoadScript, CircleF, MarkerF } from '@react-google-maps/api';
import { Map as MapIcon, X, Plus, AlertCircle, Target, Crosshair, Navigation, History, Download, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '../components/DataTable';

interface Location { id: string; name: string; latitude: number; longitude: number; radius_meters: number; }
const mapContainerStyle = { width: '100%', height: '100%' };

export default function Locations() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', latitude: 0, longitude: 0, radius_meters: 100 });
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: import.meta.env.VITE_MAP_API_KEY || '' });
  const { data, isLoading } = useQuery({ queryKey: ['locations', limit, offset, searchTerm], queryFn: () => api.locations.getAll({ limit, offset, search: searchTerm }) });
  const locations = Array.isArray(data) ? data : (data?.locations || []);
  const total = Array.isArray(data) ? data.length : (data?.total || 0);

  const createMutation = useMutation({ mutationFn: (data: any) => api.locations.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setShowForm(false); setFormData({ name: '', latitude: 0, longitude: 0, radius_meters: 100 }); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.locations.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['locations'] }); setSelectedLocation(null); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });

  const onMapLoad = useCallback((map: google.maps.Map) => { setMapInstance(map); if (locations.length > 0) { const bounds = new window.google.maps.LatLngBounds(); locations.forEach((loc: Location) => bounds.extend({ lat: loc.latitude, lng: loc.longitude })); map.fitBounds(bounds); const listener = window.google.maps.event.addListener(map, 'idle', () => { if (map.getZoom()! > 16) map.setZoom(16); window.google.maps.event.removeListener(listener); }); } else { map.setCenter({ lat: 20, lng: 0 }); map.setZoom(2); } }, [locations]);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => { if (e.latLng) { setFormData({ name: '', latitude: Number(e.latLng.lat().toFixed(6)), longitude: Number(e.latLng.lng().toFixed(6)), radius_meters: 100 }); setSelectedLocation(null); setShowForm(true); if (mapInstance) { mapInstance.panTo(e.latLng); mapInstance.setZoom(17); } } }, [mapInstance]);

  const handleSelectLocation = (loc: Location) => { setSelectedLocation(loc); setShowForm(false); if (mapInstance) { mapInstance.panTo({ lat: loc.latitude, lng: loc.longitude }); mapInstance.setZoom(18); } };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); createMutation.mutate(formData); };
  const handleDelete = (id: string) => { if (!window.confirm('Are you sure you want to delete this location?')) return; deleteMutation.mutate(id); };

  const getUserLocation = () => { if (!navigator.geolocation) { setError("Geolocation is not supported."); return; } navigator.geolocation.getCurrentPosition((pos) => { const { latitude, longitude } = pos.coords; setFormData(prev => ({ ...prev, latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) })); setSelectedLocation(null); setShowForm(true); if (mapInstance) { mapInstance.panTo({ lat: latitude, lng: longitude }); mapInstance.setZoom(17); } }, (err) => { setError(`Unable to retrieve location: ${err.message}`); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); };

  const columns = [
    { header: 'Zone Identifier', accessor: (loc: Location) => (<div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-amber-500/8 flex items-center justify-center text-amber-500 border border-amber-500/15"><Target size={18} /></div><div><p className="text-sm font-bold text-on-surface">{loc.name}</p><p className="text-[9px] text-on-surface-variant/50 font-mono">UID: {loc.id.slice(0, 8)}</p></div></div>) },
    { header: 'Coordinates', accessor: (loc: Location) => (<span className="font-mono text-xs text-amber-500 font-bold">{loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E</span>) },
    { header: 'Perimeter', accessor: (loc: Location) => (<span className="px-3 py-1 bg-primary-dark border border-outline/20 rounded-lg text-[10px] font-bold text-on-surface">{loc.radius_meters}m Radius</span>) },
    { header: 'Actions', accessor: (loc: Location) => (<div className="flex items-center gap-2"><button onClick={() => handleSelectLocation(loc)} className="p-2 hover:bg-amber-500/8 rounded-lg text-amber-500 transition-colors"><Crosshair size={18} /></button><button onClick={() => handleDelete(loc.id)} className="p-2 hover:bg-rose-500/8 rounded-lg text-rose-400 transition-colors"><Trash2 size={18} /></button></div>) }
  ];

  if (isLoading || (!isLoaded && !loadError)) return (<div className="flex flex-col items-center justify-center h-[60vh] space-y-4"><div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div><p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{isLoading ? 'Calibrating Geofence Hub...' : 'Initializing Map Engine...'}</p></div>);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500"><MapIcon size={16} /><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Geospatial Intelligence</span></div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Attendance Zone Registry</h1>
          <p className="text-on-surface-variant text-sm font-medium">Define high-precision geofences for workforce presence tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={getUserLocation} className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"><Navigation size={16} />My Location</button>
          <button onClick={() => { setFormData({ name: '', latitude: 0, longitude: 0, radius_meters: 100 }); setSelectedLocation(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus size={16} />Provision Node</button>
        </div>
      </div>

      {error && (<div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl flex items-center gap-3 animate-fade-in"><AlertCircle size={18} /><p className="text-sm font-semibold">{error}</p><button onClick={() => setError('')} className="ml-auto p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"><X size={16} /></button></div>)}

      <div className="relative bg-surface rounded-2xl overflow-hidden h-[600px] border border-outline/20 shadow-midnight">
        {loadError ? (<div className="absolute inset-0 flex flex-col items-center justify-center bg-primary-dark space-y-4"><AlertCircle size={48} className="text-rose-400/60" /><p className="text-sm font-bold text-rose-400">Failed to load Map interface.</p></div>) : isLoaded && (
          <GoogleMap mapContainerStyle={mapContainerStyle} zoom={2} center={{ lat: 20, lng: 0 }} onLoad={onMapLoad} onClick={onMapClick} options={{ mapTypeId: mapType, disableDefaultUI: true, zoomControl: true }}>
            {locations.map((loc: Location) => { const isSelected = selectedLocation?.id === loc.id; return (<div key={loc.id}><MarkerF position={{ lat: loc.latitude, lng: loc.longitude }} onClick={() => handleSelectLocation(loc)} /><CircleF center={{ lat: loc.latitude, lng: loc.longitude }} radius={loc.radius_meters} options={{ fillColor: isSelected ? '#d97706' : '#f59e0b', fillOpacity: isSelected ? 0.2 : 0.08, strokeColor: isSelected ? '#d97706' : '#f59e0b', strokeOpacity: 0.7, strokeWeight: isSelected ? 2 : 1 }} /></div>); })}
          </GoogleMap>
        )}
        <div className="absolute top-6 left-6 z-[10] flex flex-col gap-3 pointer-events-none">
          <div className="flex items-center bg-surface/90 backdrop-blur-md p-1 rounded-lg border border-outline/20 pointer-events-auto shadow-midnight">
            {['roadmap', 'satellite', 'terrain'].map(type => (<button key={type} onClick={() => setMapType(type as any)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${mapType === type ? 'bg-amber-500 text-primary-dark shadow-amber-sm' : 'text-on-surface-variant/60 hover:bg-primary-dark'}`}>{type}</button>))}
          </div>
        </div>

        {(selectedLocation || showForm) && (
          <div className="absolute top-6 right-6 bottom-6 z-[10] w-[380px] bg-surface/95 backdrop-blur-md rounded-2xl shadow-midnight border border-outline/20 p-8 flex flex-col animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${showForm ? 'bg-amber-500 text-primary-dark shadow-amber-sm border-amber-500' : 'bg-amber-500/8 text-amber-500 border-amber-500/15'} rounded-xl flex items-center justify-center border`}>{showForm ? <Plus size={20} /> : <Target size={20} />}</div>
                <h3 className="text-lg font-bold text-on-surface">{showForm ? 'Initialize Node' : 'Node Intelligence'}</h3>
              </div>
              <button onClick={() => { setSelectedLocation(null); setShowForm(false); }} className="p-2 hover:bg-primary-dark rounded-lg text-on-surface-variant transition-colors"><X size={18} /></button>
            </div>
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Zone Designation</label><input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input-field" placeholder="e.g. CORE_HQ_EAST_GATE" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Latitude</label><input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))} className="input-field font-mono text-xs" required /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Longitude</label><input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))} className="input-field font-mono text-xs" required /></div>
                  </div>
                  <div className="space-y-4"><div className="flex justify-between items-center"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Geofence Radius ({formData.radius_meters}m)</label></div><input type="range" min="20" max="1000" step="10" value={formData.radius_meters} onChange={(e) => setFormData(prev => ({ ...prev, radius_meters: parseInt(e.target.value) }))} className="w-full h-1.5 bg-primary-dark rounded-full appearance-none cursor-pointer accent-amber-500" /></div>
                </div>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full py-4 mt-auto text-sm">{createMutation.isPending ? 'Processing...' : 'Deploy Node'}</button>
              </form>
            ) : selectedLocation && (
              <div className="space-y-8 flex-1 flex flex-col">
                <div className="space-y-1"><h2 className="text-2xl font-bold text-on-surface">{selectedLocation.name}</h2><div className="flex items-center gap-2 py-1 px-3 bg-emerald-500/8 text-emerald-400 rounded-lg w-fit border border-emerald-500/15"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div><span className="text-[9px] font-bold uppercase tracking-widest">Optimal Coverage</span></div></div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-primary-dark p-4 rounded-xl border border-outline/20"><p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Radius</p><p className="text-lg font-bold text-on-surface">{selectedLocation.radius_meters}m</p></div>
                  <div className="bg-primary-dark p-4 rounded-xl border border-outline/20"><p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Status</p><p className="text-lg font-bold text-amber-500">FIXED</p></div>
                </div>
                <button onClick={() => handleDelete(selectedLocation.id)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/8 rounded-xl transition-all border border-rose-500/20 mt-auto">Decommission Node</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl overflow-hidden border border-outline/20 shadow-midnight">
        <div className="p-8 border-b border-outline/20 flex justify-between items-center bg-primary-dark/50">
          <div className="space-y-1"><h2 className="text-lg font-bold flex items-center gap-2 text-on-surface"><History size={18} className="text-amber-500" />Node Registry</h2><p className="text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-widest">Established geospatial perimeters</p></div>
          <button className="btn-outline flex items-center gap-2 px-4 py-2 text-xs"><Download size={14} /> Export</button>
        </div>
        <DataTable columns={columns as any} data={locations} total={total} limit={limit} offset={offset} onPageChange={setOffset} onSearch={setSearchTerm} isLoading={isLoading} />
      </div>
    </div>
  );
}
