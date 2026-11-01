import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  enqueueSurveyPhoto,
  getQueuedPhotos,
  removeQueuedPhoto,
  subscribeToPhotoQueue,
  QueuedSurveyPhoto,
  SurveyPhotoType,
  syncQueuedPhotos,
} from '../../lib/offline-photo-queue';
import { CustomSelect, SelectOption } from '../ui/CustomSelect';
import { toast } from '../../context/ToastContext';
import { apiUpload } from '../../lib/api';

interface SurveyPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  surveyId?: string;
}

const PHOTO_TYPE_OPTIONS: SelectOption[] = [
  { value: 'rooftop', label: 'Rooftop Structural Surface (RCC / Metal Shed)', hint: 'Primary PV mount' },
  { value: 'shadow', label: 'Shadow Obstruction (Parapet / Water Tank / Trees)', hint: 'Shading analysis' },
  { value: 'meter', label: 'Discom Energy Meter / Connection Service Line', hint: 'Sanctioned load audit' },
  { value: 'earthing', label: 'Earthing Pit & Grounding Electrode', hint: 'Safety verification' },
  { value: 'distribution_board', label: 'AC/DC Distribution Board & Inverter Spot', hint: 'Electrical conduit' },
  { value: 'site_overall', label: 'Overall Site View / Panorama', hint: 'Feasibility reference' },
];

export const SurveyPhotoCaptureModal: React.FC<SurveyPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  leadId,
  surveyId,
}) => {
  const [photoType, setPhotoType] = useState<SurveyPhotoType>('rooftop');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedSurveyPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const list = await getQueuedPhotos(leadId);
    setQueuedPhotos(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
      const unsubscribe = subscribeToPhotoQueue(loadPhotos);
      return unsubscribe;
    }
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid photo file (JPEG/PNG/WebP).');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) {
      toast.error('Please capture or select a photo first.');
      return;
    }

    setIsProcessing(true);
    try {
      const queued = await enqueueSurveyPhoto({
        leadId,
        surveyId,
        file: selectedFile,
        photoType,
        caption: caption.trim() || undefined,
      });

      toast.success(
        `Photo compressed & queued (${(queued.sizeBytes / 1024).toFixed(0)} KB)! Will auto-sync when online.`,
      );

      // Clean state
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCaption('');

      // If device is online, attempt immediate sync
      if (navigator.onLine) {
        handleTriggerSync();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to compress and save photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!navigator.onLine) {
      toast.info('Device is currently offline. Photos are stored safely in IndexedDB.');
      return;
    }

    setIsSyncing(true);
    try {
      const { synced, failed } = await syncQueuedPhotos(async (photo) => {
        const formData = new FormData();
        formData.append('file', photo.blob, photo.fileName);
        formData.append('leadId', photo.leadId);
        if (photo.surveyId) formData.append('surveyId', photo.surveyId);
        formData.append('photoType', photo.photoType);
        if (photo.caption) formData.append('caption', photo.caption);

        // Upload to API
        return apiUpload('/surveys/photos', formData);
      });

      if (synced > 0) {
        toast.success(`Successfully uploaded ${synced} survey photo(s) to cloud!`);
      }
      if (failed > 0) {
        toast.error(`${failed} photo(s) could not be uploaded. Will retry automatically.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      loadPhotos();
    }
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      await removeQueuedPhoto(id);
      toast.info('Queued photo removed');
      loadPhotos();
    } catch (err: any) {
      toast.error('Could not remove photo: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Site Survey Photo Capture</h2>
              {!navigator.onLine ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Wifi className="w-2.5 h-2.5" />
                  Online
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Offline IndexedDB queue with Canvas compression & BackgroundSync
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capture Buttons */}
        <div className="pt-4 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all min-h-[48px] cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Take Camera Photo</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[48px] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Choose from Gallery</span>
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Staged Photo Preview & Metadata Form */}
          {previewUrl && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                  <img
                    src={previewUrl}
                    alt="Capture preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <CustomSelect
                    label="Survey Photo Category"
                    options={PHOTO_TYPE_OPTIONS}
                    value={photoType}
                    onChange={(val) => setPhotoType(val as SurveyPhotoType)}
                    searchable={false}
                  />
                  <div>
                    <input
                      type="text"
                      placeholder="Add note (e.g. South-facing tin shed, 12 ft height)"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full text-xs min-h-[38px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={isProcessing}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compressing Canvas Image...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save to Offline Queue</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="px-3 min-h-[44px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Queued Photos List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Captured Photos ({queuedPhotos.length})</span>
              </h4>
              {queuedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>
              )}
            </div>

            {queuedPhotos.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                No photos captured yet. Use the camera button above to take rooftop or meter photos.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {queuedPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-2xs flex flex-col"
                  >
                    <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                      <img
                        src={item.dataUrl}
                        alt={item.caption || item.photoType}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs uppercase">
                        {item.photoType.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(item.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600/90 text-white hover:bg-rose-500 cursor-pointer shadow-sm transition-opacity"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <p className="text-[11px] font-medium text-slate-800 truncate" title={item.caption}>
                        {item.caption || 'No caption'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{(item.sizeBytes / 1024).toFixed(0)} KB</span>
                        <span
                          className={`font-semibold capitalize ${
                            item.status === 'synced'
                              ? 'text-emerald-600'
                              : item.status === 'failed'
                                ? 'text-rose-500'
                                : 'text-amber-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
