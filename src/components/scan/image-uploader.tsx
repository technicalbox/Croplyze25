'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, Leaf, Loader2, Camera, AlertTriangle, FlipHorizontal2, X } from 'lucide-react';
import Image from 'next/image';
import { CropSearchInput } from '@/components/crops/CropSearchInput';

import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { detectCropDisease } from '@/ai/flows/detect-crop-disease-flow';
import { useNotification } from '@/providers/notification-provider';
import { useUser, useFirestore } from '@/firebase';
import { saveDiagnosis } from '@/lib/firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { haptics } from '@/lib/haptics';

export default function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [cropType, setCropType] = useState<string>('');
  const addNotification = useNotification();
  const { user } = useUser();
  const firestore = useFirestore();

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // 'environment' = back camera (default), 'user' = front camera
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    // Cleanup stream on component unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const enableCamera = async (facing: 'environment' | 'user' = facingMode) => {
    haptics.light();
    // Stop any existing stream before starting a new one
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
      });
      setStream(mediaStream);
      setFacingMode(facing);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasCameraPermission(true);
    } catch (error) {
      haptics.error();
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      addNotification({
        type: 'error',
        title: 'Camera Access Denied',
        message: 'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  };

  const flipCamera = () => {
    haptics.light();
    const next = facingMode === 'environment' ? 'user' : 'environment';
    enableCamera(next);
  };

  const handleCapture = () => {
    haptics.heavy();
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPreview(dataUrl);

        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cropType || !preview || !user) return;
    haptics.heavy();
    setIsLoading(true);

    try {
      const diagnosisResult = await detectCropDisease({
        photoDataUri: preview,
        cropType: cropType,
      });

      const reportData = {
        userId: user.uid,
        diagnosis: diagnosisResult,
        image: preview,
        cropType: cropType,
        createdAt: new Date(), // Add JS date for session storage
      };

      const newDiagnosisId = await saveDiagnosis(firestore, reportData);

      sessionStorage.setItem(newDiagnosisId, JSON.stringify(reportData));
      haptics.success();
      router.push(`/scan/${newDiagnosisId}`);
    } catch (error) {
      haptics.error();
      console.error('Diagnosis failed:', error);
      addNotification({
        type: 'error',
        title: 'Diagnosis Failed',
        message:
          'There was an error while diagnosing the crop. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-2xl shadow-none border-none rounded-none flex-1 flex flex-col">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Diagnose Your Crop</CardTitle>
        <CardDescription>
          Upload or take a photo of the affected plant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          <div className="flex-1">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" onClick={() => haptics.light()}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload File
                </TabsTrigger>
                <TabsTrigger value="camera" onClick={() => enableCamera()}>
                  <Camera className="mr-2 h-4 w-4" /> Use Camera
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="picture" className="sr-only">Crop Image</Label>
                  <div className="relative flex h-64 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20 p-4 transition-colors hover:border-primary/50">
                    {preview ? (
                      <Image
                        src={preview}
                        alt="Image preview"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                        <UploadCloud className="mb-2 h-12 w-12" />
                        <p className="font-semibold">
                          Tap to upload
                        </p>
                        <p className="text-xs">PNG, JPG, or WEBP</p>
                      </div>
                    )}
                    <Input
                      id="picture"
                      type="file"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/webp"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="camera" className="mt-4">
                <div className="space-y-4">
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-black">
                    {hasCameraPermission === false && (
                      <Alert variant="destructive" className="w-auto">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>
                          Enable camera permissions.
                        </AlertDescription>
                      </Alert>
                    )}
                    {preview ? (
                      <Image
                        src={preview}
                        alt="Captured image"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    )}
                    {/* Flip camera button — shown while stream is live */}
                    {hasCameraPermission && !preview && (
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-colors active:scale-95"
                        title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
                      >
                        <FlipHorizontal2 className="h-4 w-4" />
                        {facingMode === 'environment' ? 'Front' : 'Back'}
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 text-base"
                    onClick={handleCapture}
                    disabled={!hasCameraPermission || isLoading || !!preview}
                  >
                    <Camera className="mr-2 h-4 w-4" /> Capture Image
                  </Button>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2 relative z-30">
            <Label htmlFor="crop-type">Crop Type</Label>
            {cropType ? (
              <div className="flex items-center justify-between p-3.5 border border-primary/30 rounded-2xl bg-primary/5 text-primary font-medium animate-in zoom-in-95">
                <span>{cropType}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCropType('')} className="h-7 w-7 rounded-full text-primary hover:bg-primary/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <CropSearchInput
                placeholder="Search crop type (e.g. Tomato, Rice)..."
                onSelect={(id, name) => setCropType(name)}
                className="z-50"
              />
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg"
            size="lg"
            disabled={isLoading || !preview || !cropType || !user}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Diagnosing...
              </>
            ) : (
              <>
                <Leaf className="mr-2 h-5 w-5" /> Start Diagnosis
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
