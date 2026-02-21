'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useTranslation, useTheme } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Edit, User as UserIcon, LogOut, Sun, Moon, Bell, Check, MapPin, Tractor, Droplets, Mountain } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { Diagnosis } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

type ProfileData = {
  farmName: string;
  location: string;
  farmType: string;
  landArea: string;
  irrigationType: string;
  soilType: string;
};

// Custom hook for simplified localStorage access
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.log(error);
            return initialValue;
        }
    });

    const setValue = (value: T) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.log(error);
        }
    };
    return [storedValue, setValue];
};


function AnimatedStat({ value, label }: { value: number; label: string }) {
    const controls = useAnimation();
    
    useEffect(() => {
        controls.start({
            scale: [1, 1.2, 1],
            transition: { duration: 0.5, ease: "easeOut" }
        });
    }, [value, controls]);

    return (
        <div className="text-center">
            <motion.p animate={controls} className="text-2xl font-bold text-primary">{Math.round(value)}</motion.p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function HealthScoreCircle({ score }: { score: number }) {
    const scoreColor = score > 80 ? 'hsl(var(--primary))' : score > 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
    return (
        <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="10"
                    className="stroke-secondary"
                    fill="transparent"
                />
                <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    stroke={scoreColor}
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - score / 100)}
                    transform="rotate(-90 50 50)"
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - score / 100) }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{Math.round(score)}%</span>
                <span className="text-xs text-muted-foreground">Health</span>
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { t, language, setLanguage, languages } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  
  const [profileData, setProfileData] = useLocalStorage<ProfileData>('croplyze-profile', {
      farmName: "Green Valley Farms",
      location: "Mandya, Karnataka",
      farmType: "Rice, Sugarcane",
      landArea: "15",
      irrigationType: "Drip Irrigation",
      soilType: "Alluvial"
  });

  const [tempProfileData, setTempProfileData] = useState<ProfileData>(profileData);

  const { data: pastDiagnoses, loading: diagnosesLoading } = useCollection<Diagnosis>(
      user ? `users/${user.uid}/cropDiagnoses` : undefined,
  );

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login');
    }
  }, [user, userLoading, router]);
  
  useEffect(() => {
      setTempProfileData(profileData);
  }, [profileData, isEditSheetOpen]);

  const handleLogout = async () => {
    haptics.heavy();
    await signOut(auth);
    router.push('/login');
  };

  const handleProfileSave = () => {
      setProfileData(tempProfileData);
      setIsEditSheetOpen(false);
      haptics.success();
  };

  const totalScans = pastDiagnoses?.length || 0;
  const diseasesDetected = pastDiagnoses?.filter(d => d.diagnosis.diseaseName !== 'Healthy' && d.diagnosis.diseaseName !== 'No disease detected').length || 0;
  const healthyScans = totalScans - diseasesDetected;
  const healthPercentage = totalScans > 0 ? (healthyScans / totalScans) * 100 : 100;

  if (userLoading || !user) {
    return <div className="flex-1 bg-background flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-center bg-background/80 backdrop-blur-sm px-4 border-b">
        <h1 className="text-xl font-bold">Profile</h1>
      </header>
      
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Profile Header */}
        <Card className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                    <h2 className="text-xl font-bold">{user.displayName}</h2>
                    <p className="text-sm text-muted-foreground">{profileData.location}</p>
                </div>
                <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon"><Edit className="h-5 w-5" /></Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl">
                        <SheetHeader className="text-left mb-4">
                            <SheetTitle>Edit Profile</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="farmName">Farm Name</Label>
                                <Input id="farmName" value={tempProfileData.farmName} onChange={(e) => setTempProfileData(d => ({...d, farmName: e.target.value}))} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" value={tempProfileData.location} onChange={(e) => setTempProfileData(d => ({...d, location: e.target.value}))} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="farmType">Farm Type</Label>
                                <Input id="farmType" value={tempProfileData.farmType} onChange={(e) => setTempProfileData(d => ({...d, farmType: e.target.value}))} />
                            </div>
                             <Button onClick={handleProfileSave} className="w-full h-12">Save Changes</Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>

        {/* Farm Summary */}
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Farm Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around items-center">
                <AnimatedStat value={totalScans} label="Total Scans" />
                <AnimatedStat value={diseasesDetected} label="Diseases Found" />
                <HealthScoreCircle score={healthPercentage} />
            </CardContent>
        </Card>

        {/* Farm Details */}
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Farm Details</CardTitle>
            </CardHeader>
             <CardContent className="space-y-3">
                <div className="flex items-center text-sm">
                    <Tractor className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span className="font-medium mr-2">Land Area:</span>
                    <span className="text-muted-foreground">{profileData.landArea} acres</span>
                </div>
                <div className="flex items-center text-sm">
                    <Droplets className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span className="font-medium mr-2">Irrigation:</span>
                    <span className="text-muted-foreground">{profileData.irrigationType}</span>
                </div>
                 <div className="flex items-center text-sm">
                    <Mountain className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span className="font-medium mr-2">Soil Type:</span>
                    <span className="text-muted-foreground">{profileData.soilType}</span>
                </div>
            </CardContent>
        </Card>
        
        {/* Settings */}
        <Card>
            <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode" className="flex items-center gap-2">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span>Dark Mode</span>
                    </Label>
                    <Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="language" className="flex items-center gap-2">Language</Label>
                     <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {languages.map(lang => (
                                <SelectItem key={lang.code} value={lang.code}>{lang.nativeName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="notifications" className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        <span>Push Notifications</span>
                    </Label>
                    <Switch id="notifications" />
                </div>
            </CardContent>
        </Card>
        
        <Button onClick={handleLogout} variant="outline" className="w-full h-12">
            <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </main>
    </div>
  );
}
