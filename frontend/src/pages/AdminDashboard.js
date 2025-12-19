import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Users, Image as ImageIcon, Clock, CheckCircle, RefreshCw, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDashboardData();
    }
  }, [isLoggedIn]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, usersRes, imagesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/images`)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setImages(imagesRes.data);
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, {
        email,
        password
      });

      if (response.data.success) {
        setIsLoggedIn(true);
        toast.success('Login successful!');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    toast.success(`${files.length} file(s) selected`);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(`${API}/admin/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success(`${response.data.uploaded_count} image(s) uploaded successfully!`);
        setSelectedFiles([]);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);

    try {
      const response = await axios.post(`${API}/admin/process`);

      if (response.data.success) {
        toast.success('Face recognition processing started!');
        setTimeout(() => {
          fetchDashboardData();
          setProcessing(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error('Processing failed');
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    toast.success('Logged out successfully');
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const response = await axios.delete(`${API}/admin/user/${userToDelete.id}`);

      if (response.data.success) {
        toast.success('User deleted successfully');
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FF006E' }}>
        <div className="max-w-md w-full border-4 border-black bg-white shadow-[12px_12px_0px_#000000]" data-testid="admin-login-card">
          <div className="bg-black text-white p-4 border-b-4 border-black">
            <h2 className="text-3xl font-black uppercase text-center">Admin Login</h2>
            <p className="text-center text-sm font-bold uppercase mt-2">
              Default: admin@event.com / admin123
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase">Email</label>
                <Input
                  data-testid="admin-email-input"
                  type="email"
                  placeholder="admin@event.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-3 border-black"
                  style={{ borderWidth: '3px' }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase">Password</label>
                <Input
                  data-testid="admin-password-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-3 border-black"
                  style={{ borderWidth: '3px' }}
                  required
                />
              </div>

              <Button
                data-testid="admin-login-btn"
                type="submit"
                className="w-full h-14 font-black uppercase border-3 border-black bg-[#FFE500] hover:bg-[#FFE500] text-black shadow-[6px_6px_0px_#000000] hover:shadow-[8px_8px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                style={{ borderWidth: '3px' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/"
                className="text-black font-black uppercase text-sm border-b-3 border-black hover:bg-black hover:text-[#FFE500] px-2 py-1 inline-block transition-all"
                data-testid="back-to-home-link"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>

        {/* Communique Tagline */}
        <div className="communique-tagline">
          Powered by Communique Marketing | AI Dept.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: '#00D9FF' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black uppercase" style={{ textShadow: '5px 5px 0px #FFE500' }}>Admin Dashboard</h1>
          <Button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="font-black uppercase border-3 border-black bg-white hover:bg-white text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] transition-all"
            style={{ borderWidth: '3px' }}
          >
            <LogOut className="mr-2 w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="border-4 border-black bg-white shadow-[6px_6px_0px_#000000]" data-testid="stat-total-users">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase">Total Users</p>
                    <p className="text-4xl font-black">{stats.total_users}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#00FF00] border-3 border-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
                    <Users className="w-7 h-7 text-black" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0px_#000000]" data-testid="stat-total-images">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase">Total Images</p>
                    <p className="text-4xl font-black">{stats.total_images}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#FF006E] border-3 border-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
                    <ImageIcon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0px_#000000]" data-testid="stat-processed-images">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase">Processed</p>
                    <p className="text-4xl font-black">{stats.processed_images}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#FFE500] border-3 border-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
                    <CheckCircle className="w-7 h-7 text-black" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-4 border-black bg-white shadow-[6px_6px_0px_#000000]" data-testid="stat-pending-images">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase">Pending</p>
                    <p className="text-4xl font-black">{stats.pending_images}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#00D9FF] border-3 border-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
                    <Clock className="w-7 h-7 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_#000000] mb-8" data-testid="upload-section">
          <div className="bg-black text-white p-4 border-b-4 border-black">
            <h2 className="text-2xl font-black uppercase">Upload Event Photos</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Input
                data-testid="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="h-12 border-3 border-black"
                style={{ borderWidth: '3px' }}
              />
              {selectedFiles.length > 0 && (
                <p className="text-sm font-bold mt-2 uppercase">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                data-testid="upload-btn"
                onClick={handleUpload}
                className="flex-1 h-12 font-black uppercase border-3 border-black bg-[#00FF00] hover:bg-[#00FF00] text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                style={{ borderWidth: '3px' }}
                disabled={loading || selectedFiles.length === 0}
              >
                <Upload className="mr-2 w-5 h-5" />
                {loading ? 'Uploading...' : 'Upload Images'}
              </Button>

              <Button
                data-testid="process-btn"
                onClick={handleProcess}
                className="flex-1 h-12 font-black uppercase border-3 border-black bg-[#FFE500] hover:bg-[#FFE500] text-black shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                style={{ borderWidth: '3px' }}
                disabled={processing || stats?.pending_images === 0}
              >
                <RefreshCw className={`mr-2 w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Processing...' : 'Process Images'}
              </Button>
            </div>
          </div>
        </div>

        {/* Registered Users */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_#000000] mb-8">
          <div className="bg-black text-white p-4 border-b-4 border-black">
            <h2 className="text-2xl font-black uppercase">Registered Users ({users.length})</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="users-table">
                <thead>
                  <tr className="border-b-3 border-black" style={{ borderBottomWidth: '3px' }}>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Name</th>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Email</th>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Phone</th>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Gallery ID</th>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Registered</th>
                    <th className="text-left py-3 px-4 font-black uppercase text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index} className="border-b-2 border-black hover:bg-[#FFE500] transition-colors" data-testid={`user-row-${index}`} style={{ borderBottomWidth: '2px' }}>
                      <td className="py-3 px-4 font-bold">{user.name}</td>
                      <td className="py-3 px-4 font-bold">{user.email}</td>
                      <td className="py-3 px-4 font-bold">{user.phone}</td>
                      <td className="py-3 px-4">
                        <code className="text-xs font-bold bg-[#00D9FF] px-2 py-1 border-2 border-black">{user.gallery_id}</code>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            data-testid={`view-gallery-${index}-btn`}
                            onClick={() => window.open(`/gallery/${user.gallery_id}`, '_blank')}
                            size="sm"
                            className="font-black uppercase border-2 border-black bg-[#00FF00] hover:bg-[#00FF00] text-black shadow-[3px_3px_0px_#000000] text-xs"
                            style={{ borderWidth: '2px' }}
                          >
                            View
                          </Button>
                          <Button
                            data-testid={`delete-user-${index}-btn`}
                            onClick={() => handleDeleteClick(user)}
                            size="sm"
                            className="border-2 border-black bg-[#FF006E] hover:bg-[#FF006E] text-white shadow-[3px_3px_0px_#000000]"
                            style={{ borderWidth: '2px' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center py-8 font-bold uppercase">No users registered yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Images */}
        <div className="border-4 border-black bg-white shadow-[8px_8px_0px_#000000]">
          <div className="bg-black text-white p-4 border-b-4 border-black">
            <h2 className="text-2xl font-black uppercase">Uploaded Images ({images.length})</h2>
          </div>
          <div className="p-6">
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="border-3 border-black bg-white shadow-[4px_4px_0px_#000000] hover:shadow-[6px_6px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all overflow-hidden"
                    data-testid={`image-card-${index}`}
                    style={{ borderWidth: '3px' }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-100 border-b-3 border-black" style={{ borderBottomWidth: '3px' }}>
                      <img
                        src={`${BACKEND_URL}/api/image/admin/${image.filename}`}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Preview%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-black uppercase border-2 border-black ${
                          image.processed 
                            ? 'bg-[#00FF00] text-black' 
                            : 'bg-[#FFE500] text-black'
                        }`} style={{ borderWidth: '2px' }}>
                          {image.processed ? 'Done' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold truncate" title={image.filename}>
                        {image.filename}
                      </p>
                      {image.user_matches.length > 0 && (
                        <span className="text-xs font-black text-black bg-[#00D9FF] px-1 border border-black mt-1 inline-block">
                          {image.user_matches.length} match{image.user_matches.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-bold uppercase">No images uploaded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border-4 border-black shadow-[12px_12px_0px_#000000]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="font-bold">
              Are you sure you want to delete <strong className="uppercase">{userToDelete?.name}</strong>?
              <br /><br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1 font-bold">
                <li>User account and registration data</li>
                <li>Their entire gallery folder</li>
                <li>All photos in their gallery</li>
              </ul>
              <br />
              <strong className="text-[#FF006E] font-black uppercase">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-btn" className="border-3 border-black font-black uppercase" style={{ borderWidth: '3px' }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm-btn"
              onClick={handleDeleteConfirm}
              className="border-3 border-black bg-[#FF006E] hover:bg-[#FF006E] text-white font-black uppercase shadow-[4px_4px_0px_#000000]"
              style={{ borderWidth: '3px' }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Communique Tagline */}
      <div className="communique-tagline">
        Powered by Communique Marketing | AI Dept.
      </div>
    </div>
  );
};

export default AdminDashboard;