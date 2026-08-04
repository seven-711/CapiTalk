'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, DepartmentType } from '../lib/constants';
import { CampusMapPin } from '../lib/types';
import { MapPin, Plus, Heart, Trash2, Compass, AlertCircle, X, Sparkles, Layers, Search, MessageSquare, Users, Send, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

declare const google: any;

// Custom Neo-Brutalist Capsule Cluster Renderer
const customClusterRenderer = {
  render: ({ count, position }: { count: number; position: any }) => {
    const bgColor = count >= 10 ? '#701a31' : '#ffc900';
    const textColor = count >= 10 ? '#ffffff' : '#000000';

    const svgCapsule = `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow -->
  <circle cx="32" cy="32" r="30" fill="#000000" />

  <!-- Main circle -->
  <circle
    cx="32"
    cy="32"
    r="28"
    fill="${bgColor}"
    stroke="#000000"
    stroke-width="2.5"
  />

  <text
    x="32"
    y="36"
    font-family="system-ui, -apple-system, sans-serif"
    font-weight="900"
    font-size="22"
    fill="${textColor}"
    text-anchor="middle"
  >
    ${count}
  </text>
</svg>
    `;

    return new google.maps.Marker({
      position,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgCapsule),
        scaledSize: new google.maps.Size(68, 34),
        anchor: new google.maps.Point(34, 17),
      },
      title: `${count} Pinpoint Notes Capsulized (Click to breakdown)`,
      zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
    });
  },
};

interface MapComment {
  id: string;
  post_id: string;
  author_alias: string;
  department: string;
  message: string;
  created_at: string;
}

const CAPITOL_UNIV_CENTER = { lat: 8.486016, lng: 124.656461 };

const MAP_STYLES: any[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f4f4f0' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#242423' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#d1d5dc' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }, { strokeColor: '#000000' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#ffe3e8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e2f9eb' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#000000' }, { weight: 1 }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#dbeafe' }],
  },
];

const PIN_COLORS = [
  { name: 'Maroon', value: '#701a31', text: 'text-white' },
  { name: 'Gold', value: '#ffc900', text: 'text-black' },
  { name: 'Pink', value: '#ff90e8', text: 'text-black' },
  { name: 'Mint', value: '#00e599', text: 'text-black' },
  { name: 'Sky', value: '#38bdf8', text: 'text-black' },
];

export const CampusMap: React.FC = () => {
  const { currentUser, mapPins, addMapPin, deleteMapPin, approveMapPin, likeMapPin } = useChatStore();

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activeInfoWindow = useRef<any>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPin, setSelectedPin] = useState<CampusMapPin | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinDrawer, setShowPinDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Comments state
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePinForComments, setActivePinForComments] = useState<CampusMapPin | null>(null);
  const [commentsList, setCommentsList] = useState<MapComment[]>([]);
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAlias, setCommentAlias] = useState(currentUser ? currentUser.username : '');
  const [isFetchingComments, setIsFetchingComments] = useState(false);

  // Reactors state
  const [showReactorsModal, setShowReactorsModal] = useState(false);
  const [activePinForReactors, setActivePinForReactors] = useState<CampusMapPin | null>(null);

  // New Pin form state
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [spotName, setSpotName] = useState('');
  const [message, setMessage] = useState('');
  const [color, setColor] = useState(PIN_COLORS[1].value);
  const [authorAlias, setAuthorAlias] = useState(currentUser ? currentUser.username : '');
  const [department, setDepartment] = useState<DepartmentType>(currentUser ? currentUser.department : 'College of Computer Studies');
  const [formError, setFormError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const currentUserId = currentUser
    ? currentUser.id
    : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');

  const isAdminUser =
    (typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true') ||
    currentUser?.username?.toLowerCase().includes('admin');

  // Current active selected pin re-synced from Zustand store
  const activeSelectedPin = mapPins.find((p) => p.id === selectedPin?.id) || selectedPin;

  // Load Google Maps Script
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setIsMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapLoaded(true);
      script.onerror = () => setLoadError('Unable to load Google Maps. Please check your internet connection.');
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setIsMapLoaded(true));
    }
  }, [apiKey]);

  // Load Comments counts for map pins
  useEffect(() => {
    const fetchCounts = async () => {
      if (supabase && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('freedom_comments').select('post_id');
          if (data) {
            const counts: Record<string, number> = {};
            data.forEach((row: { post_id: string }) => {
              counts[row.post_id] = (counts[row.post_id] || 0) + 1;
            });
            setCommentsCountMap(counts);
          }
        } catch (e) {}
      }
    };
    fetchCounts();
  }, [mapPins.length]);

  // Initialize Map Instance
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || googleMapInstance.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: CAPITOL_UNIV_CENTER,
        zoom: 17,
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      googleMapInstance.current = map;

      // Click on map to add a pin
      map.addListener('click', (e: any) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setClickCoords({ lat, lng });
          setShowAddModal(true);
          setSelectedPin(null);
        }
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setLoadError('Failed to render map.');
    }
  }, [isMapLoaded]);

  const clustererRef = useRef<MarkerClusterer | null>(null);

  // Render Map Markers & MarkerClusterer whenever mapPins change
  useEffect(() => {
    if (!googleMapInstance.current || !isMapLoaded) return;

    // Clear existing markers & clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    } else {
      clustererRef.current = new MarkerClusterer({
        map: googleMapInstance.current,
        renderer: customClusterRenderer,
      });
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visiblePins = mapPins.filter((pin) => {
      if (pin.status === 'approved' || pin.status === undefined) return true;
      if (isAdminUser) return true;
      if (pin.author_id === currentUserId) return true;
      return false;
    });

    const newMarkers = visiblePins.map((pin) => {
      const pinColor = pin.color || '#ffc900';
      const svgMarker = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: pinColor,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#000000',
        scale: 2.0,
        anchor: typeof google !== 'undefined' && google.maps ? new google.maps.Point(12, 22) : undefined,
      };

      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        title: `${pin.spot_name} - ${pin.author_alias}`,
        icon: svgMarker,
      });

      marker.addListener('click', () => {
        setSelectedPin(pin);
        setShowAddModal(false);

        if (googleMapInstance.current) {
          googleMapInstance.current.panTo({ lat: pin.lat, lng: pin.lng });
        }
      });

      return marker;
    });

    markersRef.current = newMarkers;
    clustererRef.current.addMarkers(newMarkers);
  }, [mapPins, isMapLoaded, isAdminUser, currentUserId]);

  // Open Comments Modal
  const openCommentsModal = async (pin: CampusMapPin) => {
    setActivePinForComments(pin);
    setShowCommentsModal(true);
    setIsFetchingComments(true);
    setCommentsList([]);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('freedom_comments')
          .select('*')
          .eq('post_id', pin.id)
          .order('created_at', { ascending: true });

        if (data) {
          setCommentsList(data as MapComment[]);
          setIsFetchingComments(false);
          return;
        }
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`capitalk_comments_${pin.id}`);
        if (raw) setCommentsList(JSON.parse(raw));
      } catch (e) {}
    }
    setIsFetchingComments(false);
  };

  // Add Comment Submit
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activePinForComments) return;

    const newComment: MapComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: activePinForComments.id,
      author_alias: commentAlias.trim() || (currentUser ? currentUser.username : 'Anon Student'),
      department: currentUser ? currentUser.department : 'General',
      message: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };

    const updated = [...commentsList, newComment];
    setCommentsList(updated);
    setCommentsCountMap((prev) => ({
      ...prev,
      [activePinForComments.id]: (prev[activePinForComments.id] || 0) + 1,
    }));
    setNewCommentText('');

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`capitalk_comments_${activePinForComments.id}`, JSON.stringify(updated));
      } catch (e) {}
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('freedom_comments').insert({
          id: newComment.id,
          post_id: newComment.post_id,
          author_alias: newComment.author_alias,
          department: newComment.department,
          message: newComment.message,
          created_at: newComment.created_at,
        });
      } catch (e) {}
    }
  };

  // Open Reactors Modal
  const openReactorsModal = (pin: CampusMapPin) => {
    setActivePinForReactors(pin);
    setShowReactorsModal(true);
  };

  // Handle Add Pin Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!spotName.trim()) {
      setFormError('Please provide a name/label for this spot.');
      return;
    }

    if (!message.trim()) {
      setFormError('Please share why this spot is special to you.');
      return;
    }

    const coords = clickCoords || CAPITOL_UNIV_CENTER;

    addMapPin({
      spot_name: spotName.trim(),
      message: message.trim(),
      lat: coords.lat,
      lng: coords.lng,
      color,
      author_alias: authorAlias.trim() || (currentUser ? currentUser.username : 'Anon Student'),
      department: department || (currentUser ? currentUser.department : 'College of Engineering'),
    });

    setSpotName('');
    setMessage('');
    setShowAddModal(false);
    setClickCoords(null);
  };

  const handleRecenter = () => {
    if (googleMapInstance.current) {
      googleMapInstance.current.panTo(CAPITOL_UNIV_CENTER);
      googleMapInstance.current.setZoom(17);
    }
  };

  const handleCardClick = (pin: CampusMapPin) => {
    setSelectedPin(pin);
    setShowAddModal(false);
    setShowPinDrawer(false);

    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat: pin.lat, lng: pin.lng });
      googleMapInstance.current.setZoom(18);
    }
  };


  const filteredPins = mapPins.filter(
    (p) =>
      p.spot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author_alias.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-[calc(100vh-56px)] relative overflow-hidden bg-[#f4f4f0]">
      {/* 1. Full Page Map Container */}
      <div className="w-full h-full relative z-0">
        {loadError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#fff1f3]">
            <AlertCircle className="w-12 h-12 text-[#dc341e] mb-3" />
            <h3 className="text-lg font-extrabold text-black">Map Unavailable</h3>
            <p className="text-xs text-gray-600 max-w-md mt-1">{loadError}</p>
          </div>
        ) : !isMapLoaded ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 border-4 border-black border-t-[#ffc900] rounded-full animate-spin mb-3" />
            <p className="text-sm font-extrabold text-black">Loading Capitol University Full Map...</p>
          </div>
        ) : null}

        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* 2. Floating Top Left Controls Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 max-w-[calc(100vw-120px)] sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md border-2 border-black rounded-2xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5 shrink-0">
          <span className="p-1.5 bg-[#ffc900] border-2 border-black rounded-xl text-black shrink-0 shadow-xs">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold text-black truncate leading-snug">
              Memory Map
            </h1>
            <p className="text-[10px] sm:text-xs text-[#242423] font-semibold truncate hidden sm:block">
              {mapPins.length} pinpoint notes dropped
            </p>
          </div>
        </div>
      </div>

      {/* 3. Floating Top Right Tools */}
      <div className="absolute top-7 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPinDrawer(!showPinDrawer)}
          className={`px-3 py-2 rounded-xl border-2 border-black font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 ${
            showPinDrawer ? 'bg-black text-white' : 'bg-[#ffc900] text-black hover:bg-black hover:text-white'
          }`}
          title="Browse All Pinpoints"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Pinpoints</span>
          <span className="bg-black text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {mapPins.length}
          </span>
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="bg-white hover:bg-black hover:text-white text-black border-2 border-black font-extrabold text-xs px-3 py-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 active:scale-95"
          title="Recenter Map on Capitol University"
        >
          <Compass className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      </div>

      {/* 4. Bottom Center Main Action Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setClickCoords(CAPITOL_UNIV_CENTER);
            setShowAddModal(true);
            setSelectedPin(null);
          }}
          className="btn-gumroad-primary text-xs sm:text-sm px-5 sm:px-7 py-3 sm:py-3.5 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-extrabold scale-105 active:scale-95 transition-all"
        >
          <span>Add Note</span>
        </button>
      </div>

      {/* 5. Floating Selected Pinpoint Notes Card Overlay */}
      {activeSelectedPin && (
        <div className="absolute top-22 left-4 right-4 md:top-25 md:left-4 sm:left-6 sm:right-auto z-30 max-w-sm bg-white border-2 sm:border-4 border-black rounded-2xl p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => setSelectedPin(null)}
            className="absolute top-3 right-3 p-1 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border border-black transition-all"
            title="Close Note"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-4 h-4 rounded-full border-2 border-black shrink-0"
              style={{ backgroundColor: activeSelectedPin.color || '#ffc900' }}
            />
            <h3 className="text-base sm:text-lg font-black text-black truncate pr-6">
              {activeSelectedPin.spot_name}
            </h3>
          </div>

          <div className="p-3 bg-[#f4f4f0] rounded-2xl border-2 border-black/20 mb-3">
            <p className="text-xs sm:text-sm text-black font-extrabold leading-relaxed whitespace-pre-wrap">
              "{activeSelectedPin.message}"
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-gray-700 font-bold pt-2 border-t border-black/10">
            <div className="truncate">
              <span className="text-black font-black">{activeSelectedPin.author_alias}</span>
              <span className="block text-[10px] text-gray-500 font-semibold truncate">
                {activeSelectedPin.department.replace('College of ', '')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Like Button */}
              <button
                type="button"
                onClick={() => likeMapPin(activeSelectedPin.id)}
                className={`px-2.5 py-1 rounded-xl border-2 border-black text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-xs ${
                  activeSelectedPin.liked_by_users?.includes(currentUserId)
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-black hover:bg-[#fff1f3]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeSelectedPin.liked_by_users?.includes(currentUserId) ? 'fill-white text-white' : ''}`} />
                <span>{activeSelectedPin.likes_count || 0}</span>
              </button>

              {/* Reactors List Button */}
              {activeSelectedPin.likes_count > 0 && (
                <button
                  type="button"
                  onClick={() => openReactorsModal(activeSelectedPin)}
                  className="p-1 rounded-xl border-2 border-black bg-white hover:bg-[#ffc900] text-black transition-all shadow-xs"
                  title="See who liked this note"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Comments Button */}
              <button
                type="button"
                onClick={() => openCommentsModal(activeSelectedPin)}
                className="px-2 py-1 rounded-xl border-2 border-black bg-white hover:bg-[#fff1f3] text-black transition-all shadow-xs flex items-center gap-1 font-black text-xs"
                title="View Comments"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{commentsCountMap[activeSelectedPin.id] || 0}</span>
              </button>

              {/* Approve Button for Admin */}
              {isAdminUser && activeSelectedPin.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => approveMapPin(activeSelectedPin.id)}
                  className="px-2.5 py-1 rounded-xl border-2 border-black bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-xs flex items-center gap-1 active:scale-95"
                  title="Approve Pinpoint"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
              )}

              {(activeSelectedPin.author_id === currentUserId || isAdminUser) && (
                <button
                  type="button"
                  onClick={() => {
                    deleteMapPin(activeSelectedPin.id);
                    setSelectedPin(null);
                  }}
                  className="p-1 rounded-xl border-2 border-black bg-white hover:bg-red-500 hover:text-white text-black transition-all shadow-xs"
                  title="Delete Pinpoint (Moderation)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Collapsible Side Drawer of All Pinpoints */}
      {showPinDrawer && (
        <div className="absolute top-22 w-98 right-4 bottom-20 z-30 w-80 sm:w-96 bg-white/95 backdrop-blur-md border-2 sm:border-4 border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#ffc900] border-2 border-black rounded-xl text-black">
                <Layers className="w-4 h-4 stroke-[3]" />
              </span>
              <h3 className="text-sm font-black text-black uppercase tracking-wider">
                All Pinpoints ({filteredPins.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowPinDrawer(false)}
              className="p-1 rounded-full hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-3 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="gumroad-input w-full text-xs font-bold pl-8 py-2"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
            {filteredPins.length === 0 ? (
              <div className="text-center py-10 text-xs font-extrabold text-gray-500">
                No matching notes found.
              </div>
            ) : (
              filteredPins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => handleCardClick(pin)}
                  className="p-3 bg-[#f4f4f0] hover:bg-[#fff1f3] border-2 border-black rounded-2xl cursor-pointer transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full border border-black shrink-0"
                        style={{ backgroundColor: pin.color || '#ffc900' }}
                      />
                      <span className="font-black text-xs text-black truncate group-hover:text-[#701a31]">
                        {pin.spot_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 shrink-0">
                      <span>❤️ {pin.likes_count}</span>
                      <span>💬 {commentsCountMap[pin.id] || 0}</span>
                      {(pin.author_id === currentUserId || isAdminUser) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMapPin(pin.id);
                            if (selectedPin?.id === pin.id) setSelectedPin(null);
                          }}
                          className="p-1 rounded bg-red-500 text-white hover:bg-red-600 border border-black transition-all"
                          title="Delete Pinpoint (Moderation)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-black/90 font-medium line-clamp-2 italic">
                    "{pin.message}"
                  </p>

                  <p className="text-[10px] text-gray-600 font-bold mt-1.5 flex items-center justify-between">
                    <span>by {pin.author_alias}</span>
                    <span>{pin.department.replace('College of ', '')}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. Drop Pinpoint Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border-2 sm:border-4 border-black rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setClickCoords(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-[#ff90e8] border-2 border-black rounded-xl text-black shadow-xs">
                <MapPin className="w-5 h-5 stroke-[3]" />
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-black">Drop Campus Pinpoint</h3>
                <p className="text-xs text-[#242423]">
                  Share why this location is special to you.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 rounded-xl text-xs font-bold text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">
                  Spot Name / Campus Landmark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spotName}
                  onChange={(e) => setSpotName(e.target.value)}
                  placeholder="e.g. Engineering Quad, Library 3rd Floor, Canteen Bench"
                  className="gumroad-input w-full text-sm font-bold"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">
                  Why is this place special? <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Where we first met during orientation week, or the quietest study nook for finals!"
                  className="gumroad-input w-full text-sm font-medium resize-none"
                  maxLength={240}
                />
              </div>

              {/* Pin Color Selector */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                  Pin Marker Color
                </label>
                <div className="flex items-center gap-3">
                  {PIN_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 border-black transition-all flex items-center justify-center ${
                        color === c.value ? 'scale-110 ring-2 ring-black shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {color === c.value && <span className="text-black font-black text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author Alias & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                    Your Name / Alias
                  </label>
                  <input
                    type="text"
                    value={authorAlias}
                    onChange={(e) => setAuthorAlias(e.target.value)}
                    placeholder="Anon Student"
                    className="gumroad-input w-full text-xs font-bold bg-[#f4f4f0]"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                    College / Dept
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                    className="gumroad-input w-full text-xs font-bold bg-[#f4f4f0] cursor-pointer"
                  >
                    {CU_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d.replace('College of ', '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border-2 border-black font-extrabold text-xs text-black bg-white hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gumroad-primary text-xs sm:text-sm px-5 py-2.5"
                >
                  <span>Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Persisted Comments Modal */}
      {showCommentsModal && activePinForComments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border-2 sm:border-4 border-black rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              type="button"
              onClick={() => {
                setShowCommentsModal(false);
                setActivePinForComments(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-black shrink-0 pr-8">
              <span className="p-2 bg-[#ffc900] border-2 border-black rounded-xl text-black">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-black truncate max-w-[280px]">
                  Comments
                </h3>
                <p className="text-xs text-[#242423] font-medium">
                  {commentsList.length} student comments
                </p>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 scrollbar-thin">
              {isFetchingComments ? (
                <div className="text-center py-8 text-xs font-bold text-gray-500">
                  Loading comments...
                </div>
              ) : commentsList.length === 0 ? (
                <div className="text-center py-8 text-xs font-extrabold text-gray-500">
                  No comments yet. Be the first student to leave a comment!
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="p-3 bg-[#f4f4f0] border-2 border-black rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-black text-xs text-black">{c.author_alias}</span>
                      <span className="text-[10px] font-bold text-gray-500">
                        {c.department?.replace('College of ', '')}
                      </span>
                    </div>
                    <p className="text-xs text-black font-medium leading-relaxed">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t-2 border-black shrink-0 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentAlias}
                  onChange={(e) => setCommentAlias(e.target.value)}
                  placeholder="Your Comment here"
                  className="gumroad-input text-xs font-bold w-1/3"
                  maxLength={20}
                />
                <button
                  type="submit"
                  className="btn-gumroad-primary text-xs px-3 py-2 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Reactors List Modal */}
      {showReactorsModal && activePinForReactors && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border-2 sm:border-4 border-black rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowReactorsModal(false);
                setActivePinForReactors(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-black">
              <span className="p-2 bg-rose-500 text-white border-2 border-black rounded-xl">
                <Heart className="w-5 h-5 fill-white" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-black">
                  Loved by
                </h3>
                <p className="text-xs text-gray-600 font-bold">
                  {activePinForReactors.likes_count} reactions
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {activePinForReactors.liked_by_profiles && Object.keys(activePinForReactors.liked_by_profiles).length > 0 ? (
                Object.entries(activePinForReactors.liked_by_profiles).map(([uid, prof]) => (
                  <div key={uid} className="p-2.5 bg-[#f4f4f0] border-2 border-black rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#ffc900] border border-black flex items-center justify-center font-black text-xs">
                        {prof.username.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-xs font-black text-black">{prof.username}</div>
                        <div className="text-[10px] font-semibold text-gray-600">{prof.department.replace('College of ', '')}</div>
                      </div>
                    </div>
                    <span className="text-xs text-rose-500">❤️</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs font-bold text-gray-500">
                  {activePinForReactors.likes_count} anonymous reactions registered.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
