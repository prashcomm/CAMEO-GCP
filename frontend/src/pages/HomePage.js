import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, User, Mail, Phone, Download, QrCode, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [galleryId, setGalleryId] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    toast.success('Photo captured!');
  }, [webcamRef]);

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !capturedImage) {
      toast.error('Please fill all fields and capture your photo');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/register`, {
        name,
        email,
        phone,
        face_image_data: capturedImage
      });

      if (response.data.success) {
        setGalleryId(response.data.gallery_id);
        setUserName(response.data.name);
        setStep(3);
        toast.success('Registration successful!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const qrUrl = `${API}/qrcode/${galleryId}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `gallery-${galleryId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded!');
  };

  const copyGalleryLink = () => {
    const link = `${window.location.origin}/gallery/${galleryId}`;
    navigator.clipboard.writeText(link);
    toast.success('Gallery link copied to clipboard!');
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#00D9FF' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-7xl font-black text-black mb-4" style={{ textShadow: '6px 6px 0px #FFE500' }}>
            EVENT PHOTO GALLERY
          </h1>
          <p className="text-xl font-bold text-black uppercase tracking-wide">
            Register your face → Get all your photos automatically
          </p>
        </div>

        {/* Main Content */}
        {step === 1 && (
          <div className="border-4 border-black bg-white shadow-[12px_12px_0px_#000000]" data-testid="registration-form">
            <div className="bg-black text-white p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase">Register Your Face</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  <Input
                    data-testid="name-input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 border-3 border-black focus:shadow-[4px_4px_0px_#000000] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all"
                    style={{ borderWidth: '3px' }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <Input
                    data-testid="email-input"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-3 border-black focus:shadow-[4px_4px_0px_#000000] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all"
                    style={{ borderWidth: '3px' }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <Input
                    data-testid="phone-input"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 border-3 border-black focus:shadow-[4px_4px_0px_#000000] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all"
                    style={{ borderWidth: '3px' }}
                  />
                </div>
              </div>

              <Button
                data-testid="continue-to-photo-btn"
                onClick={() => setStep(2)}
                className="w-full h-14 text-lg font-black uppercase border-3 border-black bg-[#FFE500] hover:bg-[#FFE500] text-black shadow-[6px_6px_0px_#000000] hover:shadow-[8px_8px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] transition-all"
                style={{ borderWidth: '3px' }}
                disabled={!name || !email || !phone}
              >
                Continue to Photo Capture
                <Camera className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="border-4 border-black bg-white shadow-[12px_12px_0px_#000000]" data-testid="photo-capture-card">
            <div className="bg-black text-white p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase">Capture Your Face</h2>
              <p className="text-sm font-bold uppercase mt-1">
                Make sure your face is clearly visible
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="border-4 border-black bg-gray-900 aspect-video">
                {!capturedImage ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    videoConstraints={{
                      facingMode: 'user',
                      width: 1280,
                      height: 720
                    }}
                    mirrored={true}
                  />
                ) : (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                )}
              </div>

              <div className="flex gap-4">
                {!capturedImage ? (
                  <>
                    <Button
                      data-testid="back-btn"
                      onClick={() => setStep(1)}
                      className="flex-1 h-14 font-black uppercase border-3 border-black bg-white hover:bg-white text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                      style={{ borderWidth: '3px' }}
                    >
                      Back
                    </Button>
                    <Button
                      data-testid="capture-photo-btn"
                      onClick={capturePhoto}
                      className="flex-1 h-14 font-black uppercase border-3 border-black bg-[#FF006E] hover:bg-[#FF006E] text-white shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                      style={{ borderWidth: '3px' }}
                    >
                      <Camera className="mr-2 w-5 h-5" />
                      Capture Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      data-testid="retake-photo-btn"
                      onClick={retakePhoto}
                      className="flex-1 h-14 font-black uppercase border-3 border-black bg-white hover:bg-white text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                      style={{ borderWidth: '3px' }}
                    >
                      Retake Photo
                    </Button>
                    <Button
                      data-testid="register-btn"
                      onClick={handleRegister}
                      className="flex-1 h-14 font-black uppercase border-3 border-black bg-[#00D9FF] hover:bg-[#00D9FF] text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                      style={{ borderWidth: '3px' }}
                      disabled={loading}
                    >
                      {loading ? 'Registering...' : 'Complete Registration'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && galleryId && (
          <div className="border-4 border-black bg-white shadow-[12px_12px_0px_#000000]" data-testid="success-card">
            <div className="bg-[#00FF00] text-black p-4 border-b-4 border-black">
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-10 h-10" />
                <h2 className="text-3xl font-black uppercase">Registration Success!</h2>
              </div>
              <p className="text-center font-bold uppercase mt-2">
                Welcome, {userName}!
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* QR Code */}
              <div className="flex justify-center p-8 bg-white border-4 border-black">
                <img
                  src={`${API}/qrcode/${galleryId}`}
                  alt="Gallery QR Code"
                  className="w-64 h-64 border-4 border-black"
                  data-testid="qr-code-image"
                />
              </div>

              <div className="space-y-4">
                <p className="text-center font-bold uppercase text-sm">
                  Scan QR code or use the link below
                </p>
                
                <div className="p-4 bg-[#FFE500] border-3 border-black">
                  <p className="text-sm font-mono font-bold break-all text-center" data-testid="gallery-link" style={{ borderWidth: '3px' }}>
                    {window.location.origin}/gallery/{galleryId}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    data-testid="download-qr-btn"
                    onClick={downloadQRCode}
                    className="flex-1 h-12 font-black uppercase border-3 border-black bg-white hover:bg-white text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    style={{ borderWidth: '3px' }}
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Download QR
                  </Button>
                  <Button
                    data-testid="copy-link-btn"
                    onClick={copyGalleryLink}
                    className="flex-1 h-12 font-black uppercase border-3 border-black bg-[#FF006E] hover:bg-[#FF006E] text-white shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                    style={{ borderWidth: '3px' }}
                  >
                    <QrCode className="mr-2 w-4 h-4" />
                    Copy Link
                  </Button>
                </div>

                <Button
                  data-testid="view-gallery-btn"
                  onClick={() => window.location.href = `/gallery/${galleryId}`}
                  className="w-full h-14 font-black uppercase border-3 border-black bg-[#FFE500] hover:bg-[#FFE500] text-black shadow-[6px_6px_0px_#000000] hover:shadow-[8px_8px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  style={{ borderWidth: '3px' }}
                >
                  View My Gallery
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Link */}
        <div className="text-center mt-8">
          <a
            href="/admin"
            className="text-black font-black uppercase text-sm border-b-3 border-black hover:bg-black hover:text-[#FFE500] px-3 py-1 inline-block transition-all"
            data-testid="admin-link"
          >
            Admin Dashboard
          </a>
        </div>
      </div>

      {/* Communique Tagline */}
      <div className="communique-tagline">
        Powered by Communique Marketing | AI Dept.
      </div>
    </div>
  );
};

export default HomePage;