import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { RestaurantGalleryImage } from '../../types';
import { uploadRestaurantImageToCloudinary } from '../../services/cloudinaryService';
import { useLanguage } from '../../hooks/useLanguage';

export interface RestaurantGalleryManagerProps {
  images: RestaurantGalleryImage[];
  onChange: (images: RestaurantGalleryImage[]) => void;
  restaurantSlug: string;
  restaurantName?: string;
  theme?: 'light' | 'dark';
  customSettings?: any;
  galleryAspectRatio?: '4:3' | '16:9';
  onGalleryAspectRatioChange?: (ratio: '4:3' | '16:9') => void;
  showGalleryCaptions?: boolean;
  onShowGalleryCaptionsChange?: (show: boolean) => void;
}

export const RestaurantGalleryManager: React.FC<RestaurantGalleryManagerProps> = ({
  images = [],
  onChange,
  restaurantSlug,
  restaurantName,
  theme = 'light',
  customSettings,
  galleryAspectRatio = '4:3',
  onGalleryAspectRatioChange,
  showGalleryCaptions = true,
  onShowGalleryCaptionsChange,
}) => {
  const { language } = useLanguage();
  const isDark = theme === 'dark';
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newTitlePt, setNewTitlePt] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawSlug = (restaurantSlug || 'restaurant').toLowerCase().trim();
  const cleanSlug = rawSlug === 'bela-italia' || rawSlug === 'bella-italia' 
    ? 'bela-italia' 
    : rawSlug.replace(/[^a-z0-9_-]/g, '-');
  const targetFolder = `restaurants/${cleanSlug}/gallery`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const addedImages: RestaurantGalleryImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadRestaurantImageToCloudinary({
          file,
          restaurantSlug: cleanSlug,
          restaurantName,
          field: 'gallery',
          subfolder: 'gallery',
          customSettings,
        });

        const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const newImg: RestaurantGalleryImage = {
          id: `img-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          url: res.secure_url,
          title: defaultTitle,
          titlePt: defaultTitle,
          titleEn: defaultTitle,
          folder: res.folder,
          cloudinaryPublicId: res.public_id,
          createdAt: new Date().toISOString(),
          isVisible: true,
        };

        addedImages.push(newImg);
      }

      onChange([...images, ...addedImages]);
      toast.success(
        addedImages.length === 1 
          ? (language === 'pt' ? 'Imagem carregada para a pasta do Cloudinary!' : `Image uploaded to Cloudinary folder!`)
          : `${addedImages.length} ${language === 'pt' ? 'imagens carregadas para o Cloudinary!' : 'images uploaded to Cloudinary!'}`
      );
    } catch (err: any) {
      console.error('[RestaurantGalleryManager] Upload error:', err);
      toast.error(err?.message || (language === 'pt' ? 'Erro ao carregar imagem para o Cloudinary.' : 'Failed to upload image to Cloudinary.'));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenAddUrl = () => {
    setEditingImageId(null);
    setNewUrl('');
    setNewTitlePt('');
    setNewTitleEn('');
    setIsAddingUrl(true);
  };

  const handleEditImage = (img: RestaurantGalleryImage) => {
    setEditingImageId(img.id);
    setNewUrl(img.url);
    setNewTitlePt(img.titlePt || img.title || '');
    setNewTitleEn(img.titleEn || img.title || '');
    setIsAddingUrl(true);
  };

  const handleAddOrUpdateFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast.error(language === 'pt' ? 'Por favor, insira o URL da imagem.' : 'Please enter an image URL.');
      return;
    }

    const resolvedTitle = language === 'pt' ? (newTitlePt.trim() || newTitleEn.trim() || 'Foto do Restaurante') : (newTitleEn.trim() || newTitlePt.trim() || 'Restaurant Photo');

    if (editingImageId) {
      const updated = images.map(img => img.id === editingImageId ? {
        ...img,
        url: newUrl.trim(),
        title: resolvedTitle,
        titlePt: newTitlePt.trim(),
        titleEn: newTitleEn.trim(),
      } : img);
      onChange(updated);
      toast.success(language === 'pt' ? 'Imagem atualizada com sucesso!' : 'Image updated successfully!');
    } else {
      const newImg: RestaurantGalleryImage = {
        id: `img-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        url: newUrl.trim(),
        title: resolvedTitle,
        titlePt: newTitlePt.trim(),
        titleEn: newTitleEn.trim(),
        folder: newUrl.includes('cloudinary.com') ? targetFolder : 'external',
        createdAt: new Date().toISOString(),
        isVisible: true,
      };
      onChange([...images, newImg]);
      toast.success(language === 'pt' ? 'Imagem adicionada à galeria!' : 'Image added to restaurant gallery!');
    }

    setNewUrl('');
    setNewTitlePt('');
    setNewTitleEn('');
    setEditingImageId(null);
    setIsAddingUrl(false);
  };

  const handleRemoveImage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(images.filter(img => img.id !== id));
    toast.success(language === 'pt' ? 'Imagem removida da galeria.' : 'Image removed from gallery.');
  };

  const handleCopyUrl = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(language === 'pt' ? 'URL da imagem copiado!' : 'Image URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={cn(
      "border rounded-2xl p-5 sm:p-6 space-y-5 transition-colors",
      isDark ? "bg-gray-800/40 border-gray-700/80" : "bg-white border-gray-200"
    )}>
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-500" />
            <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-gray-900")}>
              {language === 'pt' ? 'Galeria de Fotos do Restaurante e Multimédia' : 'Restaurant Photo Gallery & Media'}
            </h3>
            {images.length > 0 && (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                {images.length} {images.length === 1 ? (language === 'pt' ? 'Foto' : 'Photo') : (language === 'pt' ? 'Fotos' : 'Photos')}
              </span>
            )}
          </div>
          <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
            {language === 'pt' ? 'Gerencie fotos da galeria pública, rácio de aspeto e legendas.' : 'Manage public gallery photos, aspect ratio, and captions.'}
          </p>
        </div>

        {/* Aspect Ratio & Caption Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Aspect Ratio Toggle (Interactive Segmented Switch) */}
          <div className={cn(
            "flex items-center gap-1 p-1 rounded-xl border text-xs shadow-xs",
            isDark ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-300 text-gray-700"
          )}>
            <span className="text-[10px] font-bold px-2 text-gray-400 uppercase tracking-wider">
              {language === 'pt' ? 'Rácio:' : 'Ratio:'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onGalleryAspectRatioChange?.('4:3');
              }}
              className={cn(
                "px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer",
                galleryAspectRatio === '4:3'
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}
            >
              4:3
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onGalleryAspectRatioChange?.('16:9');
              }}
              className={cn(
                "px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer",
                galleryAspectRatio === '16:9'
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}
            >
              16:9
            </button>
          </div>

          {/* Show Captions Toggle (Interactive Slide Switch) */}
          <div className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs shadow-xs",
            isDark ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-300 text-gray-700"
          )}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {language === 'pt' ? 'Legenda' : 'Caption'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowGalleryCaptionsChange?.(!showGalleryCaptions);
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
                showGalleryCaptions ? "bg-amber-500" : (isDark ? "bg-gray-700" : "bg-gray-300")
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                showGalleryCaptions ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Add via URL toggle button */}
          <button
            type="button"
            onClick={handleOpenAddUrl}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs",
              isAddingUrl && !editingImageId
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                : isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
            )}
          >
            <Plus size={13} />
            <span>{language === 'pt' ? 'Adicionar via URL' : 'Add via URL'}</span>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={handleFileUpload}
          />

          {/* Upload to Cloudinary Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border",
              isUploading
                ? "opacity-60 cursor-not-allowed bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/10"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin text-slate-950" />
                <span>{language === 'pt' ? 'A carregar...' : 'Uploading...'}</span>
              </>
            ) : (
              <>
                <Cloud size={13} className="text-slate-950" />
                <span>{language === 'pt' ? 'Carregar para Cloudinary' : 'Upload to Cloudinary'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add / Edit via URL Form Expandable with Smooth Animation */}
      <AnimatePresence>
        {isAddingUrl && (
          <motion.form 
            initial={{ opacity: 0, height: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scaleY: 1 }}
            exit={{ opacity: 0, height: 0, scaleY: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            onSubmit={handleAddOrUpdateFromUrl} 
            className={cn(
              "p-4 rounded-xl border space-y-3 shadow-md overflow-hidden",
              isDark ? "bg-gray-900/90 border-gray-700" : "bg-gray-50 border-gray-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Plus size={13} />
                {editingImageId 
                  ? (language === 'pt' ? 'Editar Imagem via URL' : 'Edit Image via URL')
                  : (language === 'pt' ? 'Adicionar Imagem via URL' : 'Add Image from URL')
                }
              </span>
              <button
                type="button"
                onClick={() => { setIsAddingUrl(false); setEditingImageId(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'pt' ? 'URL da Imagem *' : 'Image URL *'}
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={cn(
                    "w-full px-3 py-1.5 text-xs rounded-lg border font-mono outline-none focus:ring-2 focus:ring-amber-500",
                    isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'pt' ? 'Legenda (PT)' : 'Caption (PT)'}
                  </label>
                  <input
                    type="text"
                    value={newTitlePt}
                    onChange={(e) => setNewTitlePt(e.target.value)}
                    placeholder="ex. Sala Principal"
                    className={cn(
                      "w-full px-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-amber-500",
                      isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'pt' ? 'Legenda (ENG)' : 'Caption (ENG)'}
                  </label>
                  <input
                    type="text"
                    value={newTitleEn}
                    onChange={(e) => setNewTitleEn(e.target.value)}
                    placeholder="e.g. Main Dining Room"
                    className={cn(
                      "w-full px-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-amber-500",
                      isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingImageId && (
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveImage(editingImageId);
                    setIsAddingUrl(false);
                    setEditingImageId(null);
                  }}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-rose-500/30"
                >
                  {language === 'pt' ? 'Eliminar' : 'Delete'}
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {editingImageId 
                  ? (language === 'pt' ? 'Atualizar Imagem' : 'Update Image')
                  : (language === 'pt' ? 'Adicionar à Galeria' : 'Add to Gallery')
                }
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className={cn(
          "p-8 rounded-xl border border-dashed text-center",
          isDark ? "bg-gray-900/40 border-gray-700" : "bg-gray-50/60 border-gray-200"
        )}>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 mb-3">
            <ImageIcon size={22} />
          </div>
          <p className={cn("text-xs font-semibold", isDark ? "text-gray-300" : "text-gray-700")}>
            {language === 'pt' ? 'Nenhuma foto na galeria ainda' : 'No gallery photos added yet'}
          </p>
          <p className={cn("text-[11px] max-w-sm mx-auto mt-1", isDark ? "text-gray-500" : "text-gray-500")}>
            {language === 'pt' ? 'Clique em "Carregar para Cloudinary" ou "Adicionar via URL" para começar.' : 'Click "Upload to Cloudinary" or "Add via URL" to add restaurant images.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {images.map((img) => {
            const isCloudinary = Boolean(img.url && img.url.includes('cloudinary.com'));
            const aspectClass = galleryAspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]';
            const displayTitle = language === 'pt' ? (img.titlePt || img.title || '') : (img.titleEn || img.title || '');

            return (
              <div
                key={img.id}
                onClick={() => handleEditImage(img)}
                className={cn(
                  "group relative rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-lg cursor-pointer",
                  isDark ? "bg-gray-900/70 border-gray-700/80 hover:border-amber-500/50" : "bg-white border-gray-200 hover:border-amber-400"
                )}
                title={language === 'pt' ? 'Clique para editar' : 'Click to edit'}
              >
                {/* Image Box */}
                <div className={cn(aspectClass, "w-full bg-slate-950 relative overflow-hidden flex items-center justify-center")}>
                  <img
                    src={img.url}
                    alt={displayTitle || 'Restaurant image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Visibility Checkbox */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={img.isVisible ?? true}
                      onChange={(e) => {
                        const updated = images.map(i => i.id === img.id ? { ...i, isVisible: e.target.checked } : i);
                        onChange(updated);
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-600 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-white">{language === 'pt' ? 'Mostrar' : 'Show'}</span>
                  </div>

                  {/* Cloudinary Badge overlay */}
                  <div className="absolute top-2 left-2">
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-md shadow-sm",
                      isCloudinary 
                        ? "bg-slate-950/80 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-950/80 text-blue-400 border border-blue-500/30"
                    )}>
                      {isCloudinary ? 'Cloudinary' : 'URL'}
                    </span>
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded bg-slate-950/80 text-gray-300 hover:text-white backdrop-blur-sm transition-colors"
                      title="Open full size"
                    >
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => handleCopyUrl(img.url, img.id, e)}
                      className="p-1 rounded bg-slate-950/80 text-gray-300 hover:text-white backdrop-blur-sm transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedId === img.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveImage(img.id, e)}
                      className="p-1 rounded bg-slate-950/80 text-rose-400 hover:text-rose-300 backdrop-blur-sm transition-colors cursor-pointer"
                      title="Delete photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Caption / Title */}
                {showGalleryCaptions && (
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <p className={cn(
                      "text-xs font-semibold truncate",
                      isDark ? "text-gray-200" : "text-gray-800"
                    )} title={displayTitle || img.url}>
                      {displayTitle || (language === 'pt' ? 'Sem legenda' : 'Untitled Photo')}
                    </p>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                      <span className="font-mono truncate max-w-[120px]">
                        {img.folder || targetFolder}
                      </span>
                      <span className="text-amber-500 font-medium group-hover:underline">
                        {language === 'pt' ? 'Editar' : 'Edit'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
