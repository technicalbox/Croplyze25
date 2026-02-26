'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { findNearbySuppliers, FindNearbySuppliersOutput } from '@/ai/flows/find-nearby-suppliers-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, MapPin, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type Supplier = FindNearbySuppliersOutput['suppliers'][0];

function SuppliersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cropType = searchParams.get('cropType') || undefined;
    const diseaseName = searchParams.get('diseaseName') || undefined;

    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (err) => {
                    setError(`Error getting location: ${err.message}. Please enable location services.`);
                    setLoading(false);
                }
            );
        } else {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (location) {
            setLoading(true);
            setError(null);
            findNearbySuppliers({
                latitude: location.latitude,
                longitude: location.longitude,
                cropType,
                diseaseName,
            })
            .then((result) => {
                setSuppliers(result.suppliers);
            })
            .catch((err) => {
                console.error(err);
                setError('Could not find suppliers. The AI service may be temporarily unavailable.');
            })
            .finally(() => {
                setLoading(false);
            });
        }
    }, [location, cropType, diseaseName]);

    const handleSupplierSelect = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setShowMap(true);
    };

    const handleBackToList = () => {
        setShowMap(false);
    };

    const mapSrc = selectedSupplier
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedSupplier.longitude - 0.01},${selectedSupplier.latitude - 0.01},${selectedSupplier.longitude + 0.01},${selectedSupplier.latitude + 0.01}&layer=mapnik&marker=${selectedSupplier.latitude},${selectedSupplier.longitude}`
    : '';

    if (showMap && selectedSupplier) {
        return (
            <div className="flex flex-col h-screen bg-background">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold truncate">{selectedSupplier.name}</h1>
                    <div className="w-9 h-9"></div>
                </header>
                <main className="flex-1 flex flex-col">
                    <div className="flex-1 relative">
                        <iframe
                            width="100%"
                            height="100%"
                            className="absolute inset-0"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={mapSrc}>
                        </iframe>
                    </div>
                    <div className="p-4 bg-background border-t">
                        <Card>
                            <CardHeader className="p-4">
                                <CardTitle className="text-lg font-semibold">{selectedSupplier.name}</CardTitle>
                                <CardDescription className="text-sm">{selectedSupplier.address}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <h4 className="font-semibold mb-2 text-sm">Suggested Products:</h4>
                                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                                    {selectedSupplier.products.map(product => <li key={product}>{product}</li>)}
                                </ul>
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <span className="text-sm font-semibold text-primary flex items-center"><MapPin className="mr-2 h-4 w-4" />{selectedSupplier.distance} away</span>
                            </CardFooter>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold truncate">Nearby Suppliers</h1>
                <div className="w-9 h-9"></div>
            </header>

            <main className="flex-1 flex flex-col">
                {loading && (
                    <div className="flex flex-col items-center justify-center text-center gap-4 flex-1">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">{!location ? "Getting your location..." : "Searching for nearby suppliers..."}</p>
                    </div>
                )}

                {error && (
                     <div className="p-4">
                        <Alert variant="destructive" className="max-w-2xl mx-auto">
                            <AlertTitle>An Error Occurred</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                     </div>
                )}

                {!loading && !error && suppliers.length === 0 && (
                    <div className="p-4">
                        <Card className="max-w-2xl mx-auto text-center">
                            <CardHeader>
                                <CardTitle>No Suppliers Found</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">We couldn't find any suppliers near your location at the moment.</p>
                            </CardContent>
                        </Card>
                    </div>
                )}
                
                {!loading && !error && suppliers.length > 0 && (
                     <div className="overflow-y-auto p-4 space-y-4">
                        {suppliers.map((supplier, index) => (
                            <Card key={index}>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-lg font-semibold">{supplier.name}</CardTitle>
                                    <CardDescription className="text-sm">{supplier.address}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <h4 className="font-semibold mb-2 text-sm">Suggested Products:</h4>
                                    <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                                        {supplier.products.map(product => <li key={product}>{product}</li>)}
                                    </ul>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-primary flex items-center"><MapPin className="mr-2 h-4 w-4" />{supplier.distance} away</span>
                                    <Button onClick={() => handleSupplierSelect(supplier)} size="sm">
                                        View on Map
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}


export default function SuppliersPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center text-center gap-4 h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Suppliers...</p>
            </div>
        }>
            <SuppliersContent />
        </Suspense>
    )
}
