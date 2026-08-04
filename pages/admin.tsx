import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import imageCompression from 'browser-image-compression';
import cloudinary from '../utils/cloudinary';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'waiting' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

interface CloudinaryImage {
  public_id: string;
  format: string;
  width: number;
  height: number;
}

interface AdminPageProps {
  initialImages: CloudinaryImage[];
}

// Every upload is squeezed to a web master before it leaves the browser —
// the gallery serves nothing larger than 2560px, so storing more is waste.
const MAX_DIMENSION = 2560;
const MAX_SIZE_MB = 4;

async function compressImage(file: File) {
  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    initialQuality: 0.85,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    throw error;
  }
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
    case 'error':
      return <ExclamationCircleIcon className="h-5 w-5 text-[var(--accent)]" />;
    case 'uploading':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <ArrowPathIcon className="h-5 w-5 text-[var(--ink)]" />
        </motion.div>
      );
    default:
      return null;
  }
};

export default function AdminPage({ initialImages = [] }: AdminPageProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<CloudinaryImage[]>(initialImages);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const clearQueueTimeoutRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('adminAuth');
      if (authData) {
        try {
          const { timestamp } = JSON.parse(authData);
          const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
          if (Date.now() - timestamp < thirtyMinutes) {
            setIsAuthenticated(true);
            // Refresh the timestamp
            localStorage.setItem('adminAuth', JSON.stringify({ timestamp: Date.now() }));
            return;
          }
        } catch (e) {
          console.error('Error parsing auth data:', e);
        }
      }
      // Clear invalid or expired auth data
      localStorage.removeItem('adminAuth');
      setIsAuthenticated(false);
    };

    checkAuth();
    
    // Set up an interval to check auth status every minute
    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${router.basePath}/api/admin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        // Store auth state with timestamp
        localStorage.setItem('adminAuth', JSON.stringify({ timestamp: Date.now() }));
        setError('');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
  };

  // Cleanup effect for the timeout
  useEffect(() => {
    return () => {
      if (clearQueueTimeoutRef.current) {
        clearTimeout(clearQueueTimeoutRef.current);
      }
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'waiting' as const,
      preview: URL.createObjectURL(file)
    }));
    setUploadingFiles(prev => [...prev, ...newFiles]);
  }, []);

  useEffect(() => {
    return () => {
      uploadingFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadingFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    }
  });

  const handleDelete = async (publicId: string) => {
    if (isDeleting) return;
    
    setIsDeleting(publicId);
    try {
      const response = await fetch(`${router.basePath}/api/delete?public_id=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');
      
      setImages(prev => prev.filter(img => img.public_id !== publicId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpload = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      for (let i = 0; i < uploadingFiles.length; i++) {
        if (uploadingFiles[i].status === 'completed') continue;

        setUploadingFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], status: 'uploading', progress: 0 };
          return newFiles;
        });

        let fileToUpload = uploadingFiles[i].file;

        try {
          fileToUpload = await compressImage(fileToUpload);

          // Update the file size in the UI
          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = {
              ...newFiles[i],
              file: fileToUpload,
              status: 'uploading',
              progress: 0
            };
            return newFiles;
          });
        } catch (error) {
          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = {
              ...newFiles[i],
              status: 'error',
              error: 'Failed to compress image'
            };
            return newFiles;
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);

        try {
          const response = await fetch(`${router.basePath}/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Upload failed');
          }
          
          const result = await response.json();
          setImages(prev => [...prev, result]);

          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { ...newFiles[i], status: 'completed', progress: 100 };
            return newFiles;
          });
        } catch (error) {
          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { 
              ...newFiles[i], 
              status: 'error', 
              error: error.message || 'Upload failed'
            };
            return newFiles;
          });
        }
      }

      // Clear the upload queue after a delay if all files are completed or errored
      const allCompleted = uploadingFiles.every(file => 
        file.status === 'completed' || file.status === 'error'
      );
      
      if (allCompleted) {
        // Clear any existing timeout
        if (clearQueueTimeoutRef.current) {
          clearTimeout(clearQueueTimeoutRef.current);
        }
        // Set new timeout
        clearQueueTimeoutRef.current = setTimeout(() => {
          setUploadingFiles([]);
        }, 20000); // 20 seconds delay
      }

    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <div className="w-full max-w-md rounded-[1.5rem] border border-[var(--hairline)] bg-[var(--panel)] p-8">
          <div className="mb-8 text-center">
            <p className="mono-meta mb-3 text-[var(--accent)]">darkroom · admin</p>
            <h1 className="mb-2 text-3xl font-medium tracking-[-0.04em] text-[var(--ink)]">
              Admin Access
            </h1>
            <p className="text-[var(--ink-muted)]">Enter your password to manage photos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--ink-muted)]">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--hairline)] bg-[var(--paper)] px-4 py-2 text-[var(--ink)] transition focus:border-[var(--accent)] focus:outline-none"
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-[var(--accent)]/10 p-3">
                <p className="text-sm text-[var(--accent)]">{error}</p>
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-[var(--paper)] transition hover:brightness-110 focus:outline-none"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Photo Upload</title>
      </Head>
      <div className="min-h-screen bg-[var(--paper)] p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="mono-meta mb-2 text-[var(--accent)]">darkroom · admin</p>
              <h1 className="text-3xl font-medium tracking-[-0.04em] text-[var(--ink)]">
                Photo Management
              </h1>
              <p className="mt-1 text-[var(--ink-muted)]">Upload and manage your gallery photos</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--ink-muted)] transition hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Logout
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <div className="col-span-1">
              <div className="space-y-6">
                <div 
                  {...getRootProps()} 
                  className={`cursor-pointer rounded-[1.25rem] border-2 border-dashed p-8 text-center transition-colors ${
                    isDragActive
                      ? 'border-[var(--accent)] bg-[var(--paper-raised)]'
                      : 'border-[var(--hairline)] bg-[var(--panel)] hover:border-[var(--ink-muted)]'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-2">
                    <div className="mx-auto w-12 text-[var(--ink-muted)]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-[var(--ink)]">
                      {isDragActive
                        ? "Drop the files here..."
                        : "Drag 'n' drop photos here, or click to select"}
                    </p>
                    <p className="text-sm text-[var(--ink-muted)]">Supported: JPG, PNG, WebP</p>
                  </div>
                </div>

                {uploadingFiles.length > 0 && (
                  <div className="space-y-4 rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--panel)] p-4">
                    <h3 className="mono-meta">Upload Queue</h3>
                    <div className="space-y-3">
                      {uploadingFiles.map((file, index) => (
                        <div
                          key={file.file.name + index}
                          className="rounded-lg bg-[var(--paper-raised)] p-3"
                        >
                          <div className="flex items-center space-x-4">
                            {file.preview && (
                              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
                                <Image
                                  src={file.preview}
                                  alt="Preview"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="truncate text-sm text-[var(--ink)]">{file.file.name}</span>
                                <div className="ml-2 flex items-center gap-2">
                                  <StatusIcon status={file.status} />
                                  <span className="flex-shrink-0 text-xs text-[var(--ink-muted)]">
                                    {file.status === 'completed'
                                      ? 'Uploaded'
                                      : file.status === 'error'
                                      ? 'Failed'
                                      : file.status === 'uploading'
                                      ? 'Uploading...'
                                      : 'Waiting'}
                                  </span>
                                </div>
                              </div>
                              {file.status === 'error' && (
                                <p className="mt-1 text-xs text-[var(--accent)]">{file.error}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={isProcessing || uploadingFiles.length === 0}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        isProcessing || uploadingFiles.length === 0
                          ? 'cursor-not-allowed bg-[var(--paper-raised)] text-[var(--ink-muted)]'
                          : 'bg-[var(--accent)] text-[var(--paper)] hover:brightness-110'
                      }`}
                    >
                      {isProcessing ? 'Processing...' : 'Upload All'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-[var(--ink)]">Gallery Photos</h2>
                <p className="mono-meta">{images?.length} photos</p>
              </div>
              <div className="h-[75vh] space-y-2 overflow-y-auto rounded-[1.25rem] border border-[var(--hairline)] bg-[var(--panel)] p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {images?.length === 0 ? (
                    <p className="col-span-full text-center text-[var(--ink-muted)]">No photos uploaded yet</p>
                  ) : (
                    images?.map((image) => (
                      <div
                        key={image.public_id}
                        className="group relative overflow-hidden rounded-lg bg-[var(--paper-raised)] p-2"
                      >
                        <div className="relative aspect-[3/2] overflow-hidden rounded-md">
                          <Image
                            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_400,h_300,f_auto,q_auto/${image.public_id}.${image.format}`}
                            alt={image.public_id.split('/').pop() || 'Gallery photo'}
                            width={400}
                            height={300}
                            className="object-cover transition group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="truncate text-sm text-[var(--ink-muted)]">
                            {image.public_id.split('/').pop()}
                          </span>
                          <button
                            onClick={() => handleDelete(image.public_id)}
                            disabled={isDeleting === image.public_id}
                            className={`rounded p-1 text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 ${
                              isDeleting === image.public_id ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const results = await cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .sort_by('created_at', 'desc')
      .max_results(400)
      .execute();

    const images = results.resources.map((resource: any) => ({
      public_id: resource.public_id,
      format: resource.format,
      width: resource.width,
      height: resource.height,
    }));

    return {
      props: {
        initialImages: images,
      },
    };
  } catch (error) {
    console.error('Error fetching images:', error);
    return {
      props: {
        initialImages: [],
      },
    };
  }
}; 