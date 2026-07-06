import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { 
  User, Shield, Phone, Mail, Key, ShieldAlert, Check,
  Camera, Trash2, ArrowUpRight, LogOut, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, logout, refreshUser, currentBusiness } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  
  // Password Edit
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Status
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setLoading(true);

    try {
      await api.put('/auth/profile', { fullName, phone });
      await refreshUser();
      setProfileSuccess('Profile details updated successfully!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setPasswordSuccess('Password changed successfully!');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password. Old password might be incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      await api.post('/auth/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      setProfileSuccess('Avatar image updated successfully!');
    } catch (err) {
      console.error('Image upload failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.')) {
      return;
    }

    try {
      await api.delete('/auth/delete-account');
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white">Account Settings</h2>
        <p className="text-zinc-500 text-xs">Manage your profile, passwords, and preferences</p>
      </div>

      {/* Missing Phone Number Alert Banner */}
      {!user?.phone && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">Missing Phone Number</p>
              <p className="text-xs text-amber-400/70">Add your phone number below to receive WhatsApp shift alerts and schedule notifications.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-panel rounded-card p-6 flex flex-col items-center text-center relative overflow-hidden h-fit">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full filter blur-2xl"></div>

          {/* Profile Picture Upload overlay */}
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-brand/40 overflow-hidden flex items-center justify-center font-bold text-3xl uppercase text-zinc-300">
              {user?.profileImage ? (
                <img 
                  src={user.profileImage.startsWith('/') ? `http://localhost:5000${user.profileImage}` : user.profileImage} 
                  alt="avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                user?.fullName.charAt(0)
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Camera className="h-6 w-6 text-brand" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleProfileImageUpload}
          />

          <h3 className="font-bold text-white text-lg mt-4">{user?.fullName}</h3>
          <p className="text-zinc-500 text-xs mt-0.5">@{user?.username}</p>

          <div className="w-full border-t border-zinc-850 mt-6 pt-4 space-y-3.5 text-left text-xs">
            <div className="flex items-center gap-2.5 text-zinc-400">
              <Mail className="h-4 w-4 text-brand shrink-0" />
              <span>{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2.5 text-zinc-400">
                <Phone className="h-4 w-4 text-brand shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-zinc-400">
              <Shield className="h-4 w-4 text-brand shrink-0" />
              <span>{user?.isSystemAdmin ? 'System Administrator' : currentBusiness ? `${currentBusiness.userRole} at ${currentBusiness.name}` : 'No active workspace'}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full mt-6 py-2.5 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-750 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>

        {/* Profile/Password Editing Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Edit details */}
          <div className="glass-panel rounded-card p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-4.5 w-4.5 text-brand" />
              Update Account Details
            </h4>
            
            {profileSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-inner flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Check className="h-4 w-4" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-850 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-850 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Password Reset details */}
          <div className="glass-panel rounded-card p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-4.5 w-4.5 text-brand" />
              Change Password
            </h4>

            {passwordError && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-inner flex items-center gap-2 text-red-400 text-xs">
                <ShieldAlert className="h-4 w-4" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-inner flex items-center gap-2 text-emerald-400 text-xs">
                <Check className="h-4 w-4" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Old Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-850 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-850 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {/* Delete Account Pane */}
          <div className="glass-panel rounded-card p-5 border-red-500/10 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Delete Account</h4>
              <p className="text-zinc-500 text-[10px] mt-0.5">Permanently delete your profile and assignments history</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-950/60 hover:bg-red-900 border border-red-500/20 text-red-400 font-bold text-xs rounded-inner flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
