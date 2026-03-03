'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, User as UserIcon, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { useNotification } from '@/providers/notification-provider';
import { setUserDoc } from '@/services/userService';
import type { UserDocument } from '@/lib/types';
import { haptics } from '@/lib/haptics';

// ── Validation schema ────────────────────────────────────────────────────────

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z
        .string()
        .min(10, 'Phone must be at least 10 digits')
        .regex(/^[+]?[\d\s-]{10,15}$/, 'Enter a valid phone number'),
    email: z.string().email(),
    farmName: z.string().optional(),
    state: z.string().min(1, 'Please select your state'),
    primaryCrop: z.string().optional(),
    landArea: z.string().optional(),
    soilType: z.string().optional(),
    language: z.string().min(1, 'Please select a language'),
    photoURL: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ── Indian states list ───────────────────────────────────────────────────────

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', label: 'മലയാളം (Malayalam)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'ur', label: 'اردو (Urdu)' },
];

const POPULAR_CROPS = [
    'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton',
    'Groundnut', 'Soybean', 'Mustard', 'Potato', 'Onion',
    'Tomato', 'Chilli', 'Turmeric', 'Tea', 'Coffee',
    'Banana', 'Mango', 'Coconut', 'Jute', 'Tobacco',
];

const SOIL_TYPES = [
    'Alluvial', 'Black (Regur)', 'Red', 'Laterite', 'Arid (Desert)',
    'Saline & Alkaline', 'Peaty & Marshy', 'Forest & Mountain',
    'Sandy', 'Clayey', 'Loamy', 'Silty',
];

// ── Component ────────────────────────────────────────────────────────────────

interface ProfileFormProps {
    uid: string;
    /** Pre-populated defaults (for edit mode). */
    defaultValues?: Partial<UserDocument>;
    /** Called after a successful save. */
    onSuccess?: () => void;
    /** Text for the submit button. Defaults to "Save Profile". */
    submitLabel?: string;
}

export default function ProfileForm({
    uid,
    defaultValues,
    onSuccess,
    submitLabel = 'Save Profile',
}: ProfileFormProps) {
    const [saving, setSaving] = useState(false);
    const addNotification = useNotification();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: defaultValues?.name ?? '',
            phone: defaultValues?.phone ?? '',
            email: defaultValues?.email ?? '',
            farmName: defaultValues?.farmName ?? '',
            state: defaultValues?.state ?? '',
            primaryCrop: defaultValues?.primaryCrop ?? '',
            landArea: defaultValues?.landArea ?? '',
            soilType: defaultValues?.soilType ?? '',
            language: defaultValues?.language ?? 'en',
            photoURL: defaultValues?.photoURL ?? '',
        },
    });

    const onSubmit = async (values: ProfileFormValues) => {
        setSaving(true);
        try {
            await setUserDoc(uid, values);
            haptics.success();
            addNotification({
                type: 'success',
                title: 'Profile Saved',
                message: 'Your profile has been updated successfully.',
            });
            onSuccess?.();
        } catch (error: any) {
            haptics.error();
            addNotification({
                type: 'error',
                title: 'Save Failed',
                message: error.message ?? 'Something went wrong.',
            });
        } finally {
            setSaving(false);
        }
    };

    const photoURL = form.watch('photoURL');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* ── Avatar preview ── */}
                <div className="flex justify-center">
                    <div className="relative group">
                        <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
                            <AvatarImage src={photoURL || undefined} alt="Profile photo" />
                            <AvatarFallback className="bg-muted">
                                <UserIcon className="h-8 w-8 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="h-5 w-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* ── Photo URL ── */}
                <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Photo URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/photo.jpg" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Name ── */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                                <Input placeholder="Your full name" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Phone ── */}
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                                <Input placeholder="+91 98765 43210" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Email (read-only) ── */}
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    readOnly
                                    disabled
                                    className="h-12 text-base bg-muted/50 cursor-not-allowed"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Farm Name ── */}
                <FormField
                    control={form.control}
                    name="farmName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Farm Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Green Valley Farms" className="h-12 text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── State ── */}
                <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>State / UT *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Select your state" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                    {INDIAN_STATES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Primary Crop ── */}
                <FormField
                    control={form.control}
                    name="primaryCrop"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Primary Crop</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Select your primary crop" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                    {POPULAR_CROPS.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Land Area ── */}
                <FormField
                    control={form.control}
                    name="landArea"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Land Area (Acres)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="e.g. 15"
                                    className="h-12 text-base"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Soil Type ── */}
                <FormField
                    control={form.control}
                    name="soilType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Soil Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Select soil type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                    {SOIL_TYPES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Language ── */}
                <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preferred Language *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {LANGUAGES.map((l) => (
                                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ── Submit ── */}
                <Button
                    type="submit"
                    className="w-full h-12 text-base rounded-xl font-semibold"
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </form>
        </Form>
    );
}
