import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, Images as ImagesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const GalleryPage = () => {
  const { galleryId } = useParams();
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, [galleryId]);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/gallery/${galleryId}`);
      setGallery(response.data);
      setError(null);
    } catch (err) {
      console.error('Gallery fetch error:', err);
      setError(err.response?.data?.detail || 'Failed to load gallery');
      toast.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (imageUrl, filename) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFE500' }} data-testid="loading-spinner">
        <div className="text-center">
          <div className="w-20 h-20 border-6 border-black border-t-transparent animate-spin mb-4 mx-auto" style={{ borderWidth: '6px' }}></div>
          <p className="text-black text-2xl font-black uppercase">Loading Gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FF006E' }} data-testid="error-message">
        <div className="max-w-md w-full border-4 border-black bg-white shadow-[12px_12px_0px_#000000]">
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-[#FFE500] border-4 border-black flex items-center justify-center mx-auto mb-4">
              <ImagesIcon className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-3xl font-black uppercase mb-3">Gallery Not Found</h2>
            <p className="font-bold mb-6">{error}</p>
            <Button
              onClick={() => window.location.href = '/'}
              className="font-black uppercase border-3 border-black bg-[#00D9FF] hover:bg-[#00D9FF] text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              style={{ borderWidth: '3px' }}
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#2D2D2D' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            data-testid="back-to-home-btn"
            onClick={() => window.location.href = '/'}
            className="mb-4 font-black uppercase border-3 border-black bg-white hover:bg-white text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            style={{ borderWidth: '3px' }}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>

          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_#000000]">
            <div className="p-6">
              <h1 className="text-4xl sm:text-5xl font-black uppercase mb-2" data-testid="gallery-title" style={{ textShadow: '4px 4px 0px #FFE500' }}>
                {gallery?.user_name}'s Gallery
              </h1>
              <p className="font-bold uppercase text-sm">
                Gallery ID: <span className="bg-[#FFE500] px-2 py-1 border-2 border-black">{galleryId}</span>
              </p>
              <p className="font-bold uppercase text-sm mt-2">
                {gallery?.images?.length || 0} Photo(s) Found
              </p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {gallery?.images?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-grid">
            {gallery.images.map((image, index) => (
              <div
                key={index}
                className="group border-4 border-black bg-white shadow-[6px_6px_0px_#000000] hover:shadow-[10px_10px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all overflow-hidden"
                data-testid={`gallery-image-${index}`}
              >
                <div className="relative aspect-square overflow-hidden border-b-4 border-black">
                  <img
                    src={`${BACKEND_URL}${image.url}`}
                    alt={image.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      data-testid={`download-image-${index}-btn`}
                      onClick={() => downloadImage(`${BACKEND_URL}${image.url}`, image.filename)}
                      className="font-black uppercase border-3 border-white bg-[#FFE500] hover:bg-[#FFE500] text-black shadow-[4px_4px_0px_#FFFFFF]"
                      style={{ borderWidth: '3px' }}
                    >
                      <Download className="mr-2 w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-4 border-black bg-white shadow-[8px_8px_0px_#000000]" data-testid="no-photos-message">
            <div className="py-16 text-center">
              <div className="w-32 h-32 bg-[#FFE500] border-4 border-black flex items-center justify-center mx-auto mb-6">
                <ImagesIcon className="w-16 h-16 text-black" />
              </div>
              <h2 className="text-3xl font-black uppercase mb-3">No Photos Yet</h2>
              <p className="font-bold max-w-md mx-auto">
                Your photos will appear here once they're uploaded and processed by our face recognition system.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Communique Tagline */}
      <div className="communique-tagline">
        Powered by Communique Marketing | AI Dept.
      </div>
    </div>
  );
};

export default GalleryPage;