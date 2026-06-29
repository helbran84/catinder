import { useState, useRef, useEffect } from 'react';
import { userService } from '../services/api';

function PhotoUploader({ currentPhoto, onPhotoUpdate }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imagenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maximo 5MB');
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await userService.uploadPhoto(formData);
      const newPhoto = response.data.photo_url || response.data.photo;
      onPhotoUpdate(newPhoto);
      setPreview(null);
    } catch (err) {
      setError('Error al subir foto');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayPhoto = preview || currentPhoto;

  return (
    <div className="photo-uploader" onClick={() => !uploading && fileRef.current?.click()}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {displayPhoto ? (
        <img src={displayPhoto} alt="Foto de perfil" className="photo-uploader-img" />
      ) : (
        <div className="photo-uploader-empty">
          <span className="photo-uploader-icon">📷</span>
          <span className="photo-uploader-text">Subir foto</span>
        </div>
      )}

      {uploading && (
        <div className="photo-uploader-overlay">
          <div className="photo-uploader-spinner"></div>
        </div>
      )}

      {!uploading && (
        <div className="photo-uploader-overlay">
          <span className="photo-uploader-icon">✏️</span>
          <span className="photo-uploader-text">
            {displayPhoto ? 'Cambiar foto' : 'Subir foto'}
          </span>
        </div>
      )}

      {error && <div className="photo-uploader-error">{error}</div>}
    </div>
  );
}

export default PhotoUploader;
