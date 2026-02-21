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
import { UploadCloud, Leaf, Loader2, Camera, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
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

  const enableCamera = async () => {
    haptics.light();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
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
                <TabsTrigger value="camera" onClick={enableCamera}>
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

          <div className="space-y-2">
            <Label htmlFor="crop-type">Crop Type</Label>
            <Select value={cropType} onValueChange={setCropType}>
              <SelectTrigger id="crop-type" className="h-12 text-base">
                <SelectValue placeholder="Select a crop type" />
              </SelectTrigger>
              <SelectContent>
                 <SelectGroup>
                    <SelectLabel>Common Crops</SelectLabel>
                    <SelectItem value="tomato">Tomato</SelectItem>
                    <SelectItem value="potato">Potato</SelectItem>
                    <SelectItem value="corn">Corn (Maize)</SelectItem>
                    <SelectItem value="wheat">Wheat</SelectItem>
                    <SelectItem value="rice">Rice</SelectItem>
                    <SelectItem value="soybean">Soybean</SelectItem>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="grape">Grape</SelectItem>
                    <SelectItem value="strawberry">Strawberry</SelectItem>
                    <SelectItem value="bell-pepper">Bell Pepper</SelectItem>
                    <SelectItem value="cucumber">Cucumber</SelectItem>
                    <SelectItem value="lettuce">Lettuce</SelectItem>
                 </SelectGroup>
                 <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="other">Other</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
