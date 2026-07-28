import React, { useState } from 'react';
import api from '../services/api';

const DatabaseManagement = () => {
    const [loadingBackup, setLoadingBackup] = useState(false);
    const [loadingRestore, setLoadingRestore] = useState(false);
    const [restoreFile, setRestoreFile] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleDownloadBackup = async () => {
        setLoadingBackup(true);
        setMessage({ text: '', type: '' });
        try {
            // Using api service with blob responseType to handle file download
            const response = await api.get('backup/', { responseType: 'blob' });
            
            // Create a blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Extract filename from Content-Disposition if possible, else fallback
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'database_backup.sql';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    fileName = fileNameMatch[1];
            }
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            setMessage({ text: 'Backup downloaded successfully.', type: 'success' });
        } catch (error) {
            console.error('Backup failed:', error);
            setMessage({ text: 'Failed to download backup.', type: 'error' });
        } finally {
            setLoadingBackup(false);
        }
    };

    const handleRestoreSubmit = async (e) => {
        e.preventDefault();
        if (!restoreFile) {
            setMessage({ text: 'Please select a file to restore.', type: 'error' });
            return;
        }

        const confirmRestore = window.confirm(
            "WARNING: Restoring a database will overwrite all existing data. This action cannot be undone. Are you sure you want to proceed?"
        );

        if (!confirmRestore) return;

        setLoadingRestore(true);
        setMessage({ text: 'Restoring database... This may take a moment.', type: 'info' });

        const formData = new FormData();
        formData.append('backup_file', restoreFile);

        try {
            const response = await api.post('restore/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ text: response.data.message || 'Database restored successfully!', type: 'success' });
            setRestoreFile(null);
            // Clear the file input
            e.target.reset();
        } catch (error) {
            console.error('Restore failed:', error);
            setMessage({ 
                text: error.response?.data?.error || 'Failed to restore database.', 
                type: 'error' 
            });
        } finally {
            setLoadingRestore(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-700/50">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        Database Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Download backups or restore your database from SQL files</p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 border ${message.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-300' : message.type === 'success' ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-blue-900/20 border-blue-800 text-blue-300'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Section */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                    <h2 className="text-lg font-bold text-white mb-2">Download Backup</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Download a complete snapshot of the database including schema and data in plain SQL format.
                    </p>
                    <button
                        onClick={handleDownloadBackup}
                        disabled={loadingBackup || loadingRestore}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${loadingBackup ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                    >
                        {loadingBackup ? 'Generating Backup...' : 'Download Database Backup'}
                    </button>
                </div>

                {/* Restore Section */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <h2 className="text-lg font-bold text-white mb-2">Restore Backup</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Upload a previously downloaded SQL backup file to restore the database. 
                        <span className="text-red-400 block mt-1">Warning: This will overwrite current data!</span>
                    </p>
                    
                    <form onSubmit={handleRestoreSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Select SQL File</label>
                            <input
                                type="file"
                                accept=".sql"
                                onChange={(e) => setRestoreFile(e.target.files[0])}
                                disabled={loadingRestore || loadingBackup}
                                className="block w-full text-sm text-slate-400
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-slate-700 file:text-white
                                    hover:file:bg-slate-600 cursor-pointer"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!restoreFile || loadingRestore || loadingBackup}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${(loadingRestore || !restoreFile) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                        >
                            {loadingRestore ? 'Restoring Database...' : 'Restore Database'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DatabaseManagement;
